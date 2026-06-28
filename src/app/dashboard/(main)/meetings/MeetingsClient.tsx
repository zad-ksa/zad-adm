"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  FileText, Plus, X, Lock, Globe, Trash2, Edit2,
  Printer, Loader2, Sparkles, Eye, UserPlus, Check, ChevronDown,
  ChevronRight, AlertCircle, CheckCircle2, Clock, User, BookOpen,
  ClipboardList, LayoutTemplate,
} from "lucide-react";
import {
  createMeeting, updateMeeting, deleteMeeting,
  upsertMeetingTasks, toggleMeetingTask, createTasksFromMeeting,
} from "@/app/actions/meetings";
import { useRouter } from "next/navigation";

type MeetingTask = {
  id: string;
  title: string;
  assignedToId: string | null;
  assignedTo: { id: string; name: string } | null;
  dueDays: number | null;
  isDone: boolean;
};

type Meeting = {
  id: string;
  title: string;
  date: string | Date;
  meetingNumber: number | null;
  location: string | null;
  charityId: string | null;
  rawNotes: string;
  formattedContent: string;
  summary: string | null;
  attendees: string | null;
  isPrivate: boolean;
  createdById: string;
  createdBy: { id: string; name: string; role: string };
  charity: { name: string } | null;
  meetingTasks: MeetingTask[];
};

type Charity = { id: string; name: string };
type Employee = { id: string; name: string; role: string };

type Props = {
  meetings: Meeting[];
  charities: Charity[];
  employees: Employee[];
  sessionId: string;
  sessionRole: string;
  isTier1: boolean;
};

const TIER1 = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "إدارة تنفيذية",
  GENERAL_MANAGER: "مدير عام",
  ADMINISTRATIVE_SECRETARIAT: "إدارة تنفيذية",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
  GOVERNANCE: "الحوكمة",
};

function formatDate(d: string | Date) {
  const dt = new Date(d);
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${year}-${month}-${day}`;
}

function canEditMeeting(meeting: Meeting, sessionId: string, isTier1: boolean) {
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);
  if (creatorIsTier1 && !isTier1) return false;
  return meeting.createdById === sessionId || isTier1;
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inUl = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^\|(.+)\|$/.test(line)) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;
      if (!inTable) { out.push("<table>"); inTable = true; }
      if (inUl) { out.push("</ul>"); inUl = false; }
      const isHeader = out[out.length - 1] === "<table>";
      const tag = isHeader ? "th" : "td";
      out.push(`<tr>${cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join("")}</tr>`);
      continue;
    } else if (inTable) { out.push("</table>"); inTable = false; }

    if (/^[-•*] (.+)$/.test(line)) {
      const text = line.replace(/^[-•*] /, "");
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${applyInline(text)}</li>`);
      continue;
    } else if (inUl) { out.push("</ul>"); inUl = false; }

    if (/^# (.+)$/.test(line)) {
      continue;
    } else if (/^## (.+)$/.test(line)) {
      out.push(`<h2 class="sec-title">${applyInline(line.replace(/^## /, ""))}</h2>`);
    } else if (/^### (.+)$/.test(line)) {
      out.push(`<h3 class="sub-title">${applyInline(line.replace(/^### /, ""))}</h3>`);
    } else if (/^#{1,6} (.+)$/.test(line)) {
      out.push(`<h4 class="sub-title">${applyInline(line.replace(/^#{1,6} /, ""))}</h4>`);
    } else if (/^---+$/.test(line)) {
      out.push("<hr>");
    } else if (line === "") {
      out.push("<br>");
    } else if (/صدر هذا المحضر/.test(line)) {
      out.push(`<p class="footer-note"><em>صدر هذا المحضر عن شركة زاد للخدمات التنموية</em></p>`);
      out.push(`<p class="footer-note"><em>محضر إلكتروني عبر موقع زاد</em></p>`);
    } else {
      out.push(`<p>${applyInline(line)}</p>`);
    }
  }

  if (inTable) out.push("</table>");
  if (inUl) out.push("</ul>");
  return out.join("\n");
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

// ── مهام المحضر في المحتوى المعروض ───────────────────────────────────────────
function injectTasksIntoHtml(html: string, tasks: MeetingTask[]): string {
  if (tasks.length === 0) return html;
  const rows = tasks.map(t => {
    const assignee = t.assignedTo?.name || "—";
    const status = t.isDone ? "✓ مكتملة" : "قيد التنفيذ";
    const due = t.dueDays ? `${t.dueDays} يوم` : "—";
    return `<tr><td>${t.title}</td><td>${assignee}</td><td>${due}</td><td style="color:${t.isDone ? "#10b981" : "#f59e0b"}">${status}</td></tr>`;
  }).join("");
  const table = `<h3 class="sub-title">المهام والتكليفات</h3><table><tr><th>المهمة</th><th>المكلف</th><th>المدة</th><th>الحالة</th></tr>${rows}</table>`;
  // أضف الجدول قبل الفوتر أو في النهاية
  if (html.includes('footer-note')) {
    return html.replace(/(<p class="footer-note">)/, table + '\n$1');
  }
  return html + '\n' + table;
}

// ── Letterhead CSS (مشترك) ────────────────────────────────────────────────────
const LETTERHEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #888; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; direction: rtl; }
  .page { position: relative; width: 210mm; height: 297mm; margin: 8mm auto; overflow: hidden; background: white; }
  .page .letterhead { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }
  .page .number-area { position: absolute; top: 14mm; left: 12mm; font-size: 8.5pt; color: #111; z-index: 2; direction: ltr; letter-spacing: 1px; font-family: 'Courier New', monospace; }
  .page .date-area { position: absolute; top: 19mm; left: 12mm; font-size: 8.5pt; color: #111; z-index: 2; direction: ltr; letter-spacing: 1px; font-family: 'Courier New', monospace; }
  .page .content-area { position: absolute; top: 50mm; right: 17mm; left: 17mm; bottom: 40mm; z-index: 2; overflow: hidden; direction: rtl; text-align: right; font-size: 10.5pt; line-height: 1.55; color: #1a1a1a; }
  .meeting-label { text-align: center; font-size: 9pt; font-weight: 600; color: #1a7a8a; margin-bottom: 2px; letter-spacing: 0.5px; }
  .meeting-title { text-align: center; font-size: 13pt; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; border-bottom: 1.5px solid #c8e8ed; padding-bottom: 6px; }
  h2.sec-title { color: #1a7a8a; font-size: 12pt; font-weight: 700; text-align: center; margin: 8px 0 4px; padding-bottom: 2px; border-bottom: 1.5px solid #c8e8ed; }
  h3.sub-title { color: #1a7a8a; font-size: 10.5pt; font-weight: 700; text-align: center; margin: 6px 0 3px; }
  h4.sub-title { color: #1a7a8a; font-size: 10pt; font-weight: 700; margin: 5px 0 2px; }
  p { margin: 2px 0; } br { display: block; margin: 1px 0; }
  ul { list-style: disc; padding-right: 16px; margin: 2px 0 5px; }
  li { margin-bottom: 2px; line-height: 1.45; }
  hr { border: none; border-top: 1px solid #ddd; margin: 5px 0; }
  p.footer-note { text-align: center; color: #64748b; font-size: 9pt; margin: 2px 0; }
  strong { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9.5pt; direction: rtl; }
  th, td { border: 1px solid #a8d8e0; padding: 4px 8px; text-align: right; vertical-align: top; }
  th { background-color: #ddf0f4; font-weight: 700; color: #1a7a8a; text-align: center; }
  tr:nth-child(even) td { background-color: #f4fbfc; }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: white !important; } .page { margin: 0 !important; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page:last-child { page-break-after: avoid; } }
`;

function buildLetterheadDoc(m: Meeting, forPrint: boolean): string {
  // حذف أي جداول مهام أضافها AI من formattedContent لتجنب التكرار مع injectTasksIntoHtml
  const rawHtml = mdToHtml(m.formattedContent);
  const cleanHtml = rawHtml.replace(/<h[23][^>]*>.*?(?:مهام|توصيات|تكليفات).*?<\/h[23]>\s*(<table[\s\S]*?<\/table>)/gi, "").replace(/<table[\s\S]*?<\/table>/gi, "");
  const body = `<div class="meeting-label">محضر اجتماع</div><div class="meeting-title">${m.title}</div>\n` + injectTasksIntoHtml(cleanHtml, m.meetingTasks);
  const dateStr = formatDate(m.date);
  const numStr = m.meetingNumber ? `ZAD_M_${String(m.meetingNumber).padStart(3, "0")}` : "";
  const letterheadUrl = `${window.location.origin}/assets/letterhead.png`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${m.title}</title>
<style>${LETTERHEAD_CSS}</style>
</head>
<body>
<div id="root"></div>
<script>
(function() {
  var letterheadUrl = ${JSON.stringify(letterheadUrl)};
  var dateStr = ${JSON.stringify(dateStr)};
  var numStr = ${JSON.stringify(numStr)};
  var shouldPrint = ${forPrint};
  var tmp = document.createElement('div');
  tmp.innerHTML = ${JSON.stringify(body)};
  var nodes = Array.from(tmp.childNodes);
  var PAGE_H = 1123, TOP_OFFSET = 189, BOT_OFFSET = 151;
  var USABLE = PAGE_H - TOP_OFFSET - BOT_OFFSET;
  var root = document.getElementById('root');

  function newPage() {
    var page = document.createElement('div');
    page.className = 'page';
    var img = document.createElement('img');
    img.className = 'letterhead'; img.src = letterheadUrl;
    page.appendChild(img);
    if (numStr) {
      var numDiv = document.createElement('div');
      numDiv.className = 'number-area'; numDiv.textContent = numStr;
      page.appendChild(numDiv);
    }
    var dateDiv = document.createElement('div');
    dateDiv.className = 'date-area'; dateDiv.textContent = dateStr;
    page.appendChild(dateDiv);
    var ca = document.createElement('div');
    ca.className = 'content-area';
    page.appendChild(ca);
    root.appendChild(page);
    return ca;
  }

  var currentArea = newPage();
  var usedHeight = 0;

  function getHeight(el) {
    currentArea.appendChild(el);
    var h = el.offsetHeight || el.getBoundingClientRect().height || 20;
    currentArea.removeChild(el);
    return h;
  }

  function appendToPage(el) {
    var h = getHeight(el);
    if (usedHeight + h > USABLE && usedHeight > 0) {
      currentArea = newPage(); usedHeight = 0;
    }
    currentArea.appendChild(el);
    usedHeight += h;
  }

  nodes.forEach(function(node) {
    if (node.nodeType === 3) {
      if (node.textContent.trim()) {
        var p = document.createElement('p');
        p.textContent = node.textContent;
        appendToPage(p);
      }
    } else if (node.nodeType === 1) {
      appendToPage(node);
    }
  });

  if (shouldPrint) {
    setTimeout(function() { window.print(); }, 1200);
  }
})();
</script>
</body></html>`;
}

// ── Letterhead actions ────────────────────────────────────────────────────────
function handlePrint(m: Meeting) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildLetterheadDoc(m, true));
  win.document.close();
}

function handlePreview(m: Meeting) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildLetterheadDoc(m, false));
  win.document.close();
}

// ── Summary accordion on meeting card ────────────────────────────────────────
function MeetingSummaryPanel({
  meeting, isTier1, employees,
}: {
  meeting: Meeting;
  isTier1: boolean;
  employees: Employee[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState<MeetingTask[]>(meeting.meetingTasks);
  const [editing, setEditing] = useState(false);
  const [editTasks, setEditTasks] = useState<(Omit<MeetingTask, "assignedTo"> & { assignedTo: { id: string; name: string } | null })[]>([]);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  // حالة التحميل الأولي للملخص والمهام
  const [summary, setSummary] = useState(meeting.summary || "");
  const [extracted, setExtracted] = useState(false);

  const unassigned = localTasks.filter(t => !t.assignedToId).length;
  const done = localTasks.filter(t => t.isDone).length;
  const total = localTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function loadSummary() {
    if (extracted || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/meetings/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formattedContent: meeting.formattedContent }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
      if (data.tasks?.length > 0 && localTasks.length === 0) {
        // اقتراح مهام من الذكاء — لا تحفظ تلقائياً، أعرض للتعديل
        const suggested: MeetingTask[] = (data.tasks as { title: string; assigneeName: string | null }[]).map((t, i) => ({
          id: `tmp_${i}`,
          title: t.title,
          assignedToId: null,
          assignedTo: null,
          dueDays: null,
          isDone: false,
        }));
        setLocalTasks(suggested);
      }
      // حفظ الملخص في DB
      if (data.summary) {
        await updateMeeting(meeting.id, { summary: data.summary });
      }
      setExtracted(true);
    } catch { setExtracted(true); }
    finally { setLoading(false); }
  }

  function openEdit() {
    setEditTasks(localTasks.map(t => ({ ...t })));
    setEditing(true);
  }

  function updateEditTask(i: number, field: string, val: any) {
    setEditTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const toSave = editTasks.map(t => ({
        id: t.id.startsWith("tmp_") ? undefined : t.id,
        title: t.title,
        assignedToId: t.assignedToId || null,
        dueDays: t.dueDays || null,
        isDone: t.isDone,
      }));
      await upsertMeetingTasks(meeting.id, toSave);
      // تحديث محلي
      const updated = editTasks.map(t => ({
        ...t,
        assignedTo: t.assignedToId
          ? (employees.find(e => e.id === t.assignedToId) ? { id: t.assignedToId, name: employees.find(e => e.id === t.assignedToId)!.name } : null)
          : null,
      }));
      setLocalTasks(updated);
      setEditing(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  function addEditRow() {
    setEditTasks(prev => [...prev, { id: `tmp_${Date.now()}`, title: "", assignedToId: null, assignedTo: null, dueDays: null, isDone: false }]);
  }

  async function handleToggle(task: MeetingTask) {
    if (task.id.startsWith("tmp_")) return; // مهمة غير محفوظة بعد
    const updated = localTasks.map(t => t.id === task.id ? { ...t, isDone: !t.isDone } : t);
    setLocalTasks(updated);
    startTransition(async () => {
      try { await toggleMeetingTask(task.id, !task.isDone); } catch {}
    });
  }

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !extracted && !loading) loadSummary();
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-700/50 mt-2">
      {/* شريط الملخص الصغير — يظهر دائماً */}
      <div className="flex items-center gap-2 pt-2 px-1">
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-primary transition-colors"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>الملخص والمهام</span>
        </button>

        {/* مؤشرات سريعة */}
        <div className="flex items-center gap-2 flex-1">
          {total > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{pct}%</span>
              </div>
              <span className="text-[10px] text-slate-400">{done}/{total}</span>
            </>
          )}
          {unassigned > 0 && !open && (
            <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
              <AlertCircle className="w-3 h-3" /> {unassigned} غير مكلفة
            </span>
          )}
        </div>
      </div>

      {/* المحتوى المنسدل */}
      {open && (
        <div className="mt-2 space-y-3 pb-1">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري تحليل المحضر بالذكاء الاصطناعي...</span>
            </div>
          )}

          {/* الملخص */}
          {summary && (
            <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-blue-700 dark:text-blue-400">
                <BookOpen className="w-3.5 h-3.5" /> الملخص التنفيذي
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* قائمة المهام */}
          {!editing ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> المهام والتوصيات
                </span>
                {isTier1 && (
                  <button onClick={openEdit} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> تعديل التكليفات
                  </button>
                )}
              </div>

              {localTasks.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">
                  {extracted ? "لا توجد مهام مسجلة" : "اضغط لتحليل المحضر"}
                </p>
              ) : (
                <div className="space-y-1">
                  {localTasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs border ${task.isDone ? "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/20" : task.assignedToId ? "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700" : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20"}`}>
                      <button
                        onClick={() => isTier1 && handleToggle(task)}
                        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${task.isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"} ${isTier1 ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {task.isDone && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold leading-snug ${task.isDone ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {task.assignedTo ? (
                            <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                              <User className="w-3 h-3" /> {task.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> غير مكلف
                            </span>
                          )}
                          {task.dueDays && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-3 h-3" /> {task.dueDays} يوم
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* وضع التعديل */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-blue-500" /> تعديل التكليفات
                </span>
                <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400 hover:text-slate-600">إلغاء</button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {editTasks.map((t, i) => (
                  <div key={t.id} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={t.title}
                        onChange={e => updateEditTask(i, "title", e.target.value)}
                        placeholder="عنوان المهمة"
                        className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <div className="flex gap-1.5">
                        <select
                          value={t.assignedToId || ""}
                          onChange={e => updateEditTask(i, "assignedToId", e.target.value || null)}
                          className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">— المكلف —</option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({ROLE_LABELS[e.role] || e.role})</option>
                          ))}
                        </select>
                        <input
                          type="number" min="1" max="365"
                          value={t.dueDays || ""}
                          onChange={e => updateEditTask(i, "dueDays", e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="أيام"
                          className="w-20 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          title="عدد أيام الإنجاز"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={t.isDone} onChange={e => updateEditTask(i, "isDone", e.target.checked)} className="accent-emerald-500" />
                        مكتملة
                      </label>
                    </div>
                    <button onClick={() => setEditTasks(prev => prev.filter((_, idx) => idx !== i))} className="mt-1 p-1 text-slate-300 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={addEditRow} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold">
                <Plus className="w-3.5 h-3.5" /> إضافة مهمة
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                حفظ التكليفات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MeetingsClient({ meetings, charities, employees, sessionId, sessionRole, isTier1 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  // Inline number editing
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [editingNumberVal, setEditingNumberVal] = useState("");

  // Form fields
  const [title, setTitle] = useState("");
  const [meetingNumber, setMeetingNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [charityId, setCharityId] = useState("");
  const [attendees, setAttendees] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [formattedContent, setFormattedContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [error, setError] = useState("");

  function resetForm() {
    setTitle(""); setMeetingNumber(""); setDate(new Date().toISOString().slice(0, 10));
    setLocation(""); setCharityId(""); setAttendees("");
    setRawNotes(""); setIsPrivate(false);
    setFormattedContent(""); setStep(1); setAiError(""); setError("");
    setEditingId(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(m: Meeting) {
    setTitle(m.title); setMeetingNumber(m.meetingNumber ? String(m.meetingNumber) : "");
    setDate(new Date(m.date).toISOString().slice(0, 10));
    setLocation(m.location || ""); setCharityId(m.charityId || "");
    setAttendees(m.attendees || ""); setRawNotes(m.rawNotes);
    setIsPrivate(m.isPrivate); setFormattedContent(m.formattedContent);
    setStep(2); setAiError(""); setError(""); setEditingId(m.id);
    setShowModal(true);
  }

  async function handleFormat() {
    if (!rawNotes.trim()) { setAiError("أدخل الملاحظات أولاً"); return; }
    setAiLoading(true); setAiError("");
    try {
      const res = await fetch("/api/meetings/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, title, date, attendees, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الطلب");
      setFormattedContent(data.formatted);
      setStep(2);
    } catch (e: any) { setAiError(e.message || "حدث خطأ"); }
    finally { setAiLoading(false); }
  }

  async function handleSave() {
    if (!title.trim()) { setError("العنوان مطلوب"); return; }
    if (!formattedContent.trim()) { setError("المحضر المنسق مطلوب"); return; }
    setError("");
    startTransition(async () => {
      try {
        const numVal = meetingNumber ? parseInt(meetingNumber) : null;
        if (editingId) {
          await updateMeeting(editingId, { title, formattedContent, isPrivate, meetingNumber: numVal });
        } else {
          await createMeeting({ title, meetingNumber: numVal, date, location, charityId, rawNotes, formattedContent, attendees, isPrivate });
        }
        setShowModal(false); resetForm(); router.refresh();
      } catch (e: any) { setError(e.message || "حدث خطأ"); }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا المحضر؟")) return;
    startTransition(async () => {
      try { await deleteMeeting(id); router.refresh(); }
      catch (e: any) { alert(e.message); }
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">محاضر الاجتماعات</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{meetings.length} محضر</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" /> محضر جديد
        </button>
      </div>

      {/* List */}
      {meetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد محاضر بعد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map(m => (
            <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 hover:shadow-sm transition-shadow">
              {/* صف المعلومات الرئيسية */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  {m.isPrivate ? <Lock className="w-5 h-5 text-amber-500" /> : <Globe className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{m.title}</span>
                    {m.isPrivate && <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">خاص</span>}
                    {m.charity && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{m.charity.name}</span>}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>{formatDate(m.date)}</span>
                    {m.location && <span>· {m.location}</span>}
                    <span>· {m.createdBy.name}</span>
                    {/* رقم الاجتماع */}
                    {editingNumberId === m.id ? (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">ZAD_M_</span>
                        <input
                          type="number" min="1" autoFocus
                          value={editingNumberVal}
                          onChange={e => setEditingNumberVal(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter") {
                              const n = editingNumberVal ? parseInt(editingNumberVal) : null;
                              await updateMeeting(m.id, { meetingNumber: n });
                              setEditingNumberId(null); router.refresh();
                            } else if (e.key === "Escape") setEditingNumberId(null);
                          }}
                          className="w-14 text-xs border border-primary/40 rounded px-1.5 py-0.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary"
                          placeholder="001"
                        />
                        <button onClick={async () => {
                          const n = editingNumberVal ? parseInt(editingNumberVal) : null;
                          await updateMeeting(m.id, { meetingNumber: n });
                          setEditingNumberId(null); router.refresh();
                        }} className="text-primary hover:text-primary/80"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingNumberId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                      </span>
                    ) : (
                      <button
                        onClick={() => { setEditingNumberId(m.id); setEditingNumberVal(m.meetingNumber ? String(m.meetingNumber) : ""); }}
                        className="flex items-center gap-1 text-[11px] font-mono bg-slate-100 dark:bg-slate-700 hover:bg-primary/10 hover:text-primary px-2 py-0.5 rounded transition-colors"
                      >
                        {m.meetingNumber ? `ZAD_M_${String(m.meetingNumber).padStart(3, "0")}` : <span className="text-slate-300 dark:text-slate-600">+ رقم</span>}
                      </button>
                    )}
                  </div>
                </div>
                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewingMeeting(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors" title="عرض النص">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePreview(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 transition-colors" title="عرض بالكليشة">
                    <LayoutTemplate className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePrint(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors" title="طباعة">
                    <Printer className="w-4 h-4" />
                  </button>
                  {canEditMeeting(m, sessionId, isTier1) && (
                    <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors" title="تعديل">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canEditMeeting(m, sessionId, isTier1) && (
                    <button onClick={() => handleDelete(m.id)} disabled={isPending} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* لوحة الملخص والمهام */}
              <MeetingSummaryPanel
                meeting={m}
                isTier1={isTier1}
                employees={employees}
              />
            </div>
          ))}
        </div>
      )}

      {/* View Modal — عرض نص المحضر */}
      {viewingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">{viewingMeeting.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(viewingMeeting.date)}{viewingMeeting.location ? ` · ${viewingMeeting.location}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePreview(viewingMeeting)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-600 transition-colors" title="عرض بالكليشة">
                  <LayoutTemplate className="w-4 h-4" />
                </button>
                <button onClick={() => handlePrint(viewingMeeting)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors" title="طباعة">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => setViewingMeeting(null)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-200 text-right" dir="rtl">
                {viewingMeeting.formattedContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? "تعديل المحضر" : "محضر اجتماع جديد"}
                </h2>
                {!editingId && (
                  <div className="flex items-center gap-1 mr-2">
                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 1 ? "bg-blue-600 text-white" : "bg-blue-100 dark:bg-blue-900/40 text-blue-600"}`}>١</div>
                    <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 2 ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>٢</div>
                  </div>
                )}
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">عنوان الاجتماع *</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: اجتماع فريق زاد الأسبوعي"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">رقم الاجتماع</label>
                      <div className="relative">
                        <input type="number" min="1" value={meetingNumber} onChange={e => setMeetingNumber(e.target.value)} placeholder="1"
                          className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {meetingNumber && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                            {`ZAD_M_${String(meetingNumber).padStart(3, "0")}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">التاريخ *</label>
                      <input type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">المكان</label>
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="مكتب زاد / أونلاين"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الحضور</label>
                      <input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="محمد، أحمد، سارة..."
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الجمعية (اختياري)</label>
                      <select value={charityId} onChange={e => setCharityId(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— اجتماع داخلي —</option>
                        {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                      ملاحظات الاجتماع الخام *
                      <span className="font-normal text-slate-400 mr-1">— اكتب بحرية وبالعامية</span>
                    </label>
                    <textarea value={rawNotes} onChange={e => setRawNotes(e.target.value)} rows={8}
                      placeholder="اكتب ملاحظاتك هنا بأي طريقة... مثلاً: ناقشنا موضوع الميزانية وقرر المدير زيادتها، واحمد راح يتابع مع الجمعية..."
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">المحضر المنسق — يمكنك التعديل مباشرة</span>
                    <button
                      onClick={handleFormat}
                      disabled={aiLoading || !rawNotes.trim()}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 mr-auto"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      إعادة الصياغة
                    </button>
                  </div>
                  <textarea value={formattedContent} onChange={e => setFormattedContent(e.target.value)} rows={15}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed" dir="rtl" />
                  {isTier1 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">خاص بالإدارة التنفيذية فقط</span>
                    </label>
                  )}
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              {step === 2 && !editingId
                ? <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">← العودة للملاحظات</button>
                : <div />}
              <div className="flex gap-2">
                <button onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">إلغاء</button>
                {step === 1 && (
                  <button onClick={handleFormat} disabled={aiLoading || !rawNotes.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? "جاري الصياغة..." : "صياغة بالذكاء الاصطناعي"}
                  </button>
                )}
                {step === 2 && (
                  <button onClick={handleSave} disabled={isPending || !formattedContent.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    حفظ المحضر
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
