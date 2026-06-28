"use client";

import { useState, useTransition } from "react";
import {
  FileText, Plus, X, Lock, Globe, Trash2, Edit2,
  Printer, Loader2, Sparkles, Eye, UserPlus, Check, ChevronDown
} from "lucide-react";
import { createMeeting, updateMeeting, deleteMeeting, createTasksFromMeeting } from "@/app/actions/meetings";
import { useRouter } from "next/navigation";

type Meeting = {
  id: string;
  title: string;
  date: string | Date;
  location: string | null;
  charityId: string | null;
  rawNotes: string;
  formattedContent: string;
  attendees: string | null;
  isPrivate: boolean;
  createdById: string;
  createdBy: { id: string; name: string; role: string };
  charity: { name: string } | null;
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
  ADMINISTRATIVE_SECRETARIAT: "سكرتارية إدارية",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
};

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatDateHijri(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
}

function canEdit(meeting: Meeting, sessionId: string, isTier1: boolean) {
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);
  if (creatorIsTier1 && !isTier1) return false;
  return meeting.createdById === sessionId || isTier1;
}

// ── Markdown → HTML converter ─────────────────────────────────────────────────
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inUl = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // Markdown table row
    if (/^\|(.+)\|$/.test(line)) {
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      // Skip separator rows like |---|---|
      if (cells.every(c => /^[-: ]+$/.test(c))) continue;
      if (!inTable) { out.push("<table>"); inTable = true; }
      if (inUl) { out.push("</ul>"); inUl = false; }
      const isHeader = out[out.length - 1] === "<table>";
      const tag = isHeader ? "th" : "td";
      out.push(`<tr>${cells.map(c => `<${tag}>${applyInline(c)}</${tag}>`).join("")}</tr>`);
      continue;
    } else if (inTable) {
      out.push("</table>");
      inTable = false;
    }

    // List item
    if (/^[-•*] (.+)$/.test(line)) {
      const text = line.replace(/^[-•*] /, "");
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${applyInline(text)}</li>`);
      continue;
    } else if (inUl) {
      out.push("</ul>");
      inUl = false;
    }

    // Headings (strip ## / ### prefix)
    if (/^## (.+)$/.test(line)) {
      out.push(`<h2 class="sec-title">${applyInline(line.replace(/^## /, ""))}</h2>`);
    } else if (/^### (.+)$/.test(line)) {
      out.push(`<h3 class="sub-title">${applyInline(line.replace(/^### /, ""))}</h3>`);
    } else if (/^---+$/.test(line)) {
      out.push("<hr>");
    } else if (line === "") {
      out.push("<br>");
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

// ── Letterhead print ──────────────────────────────────────────────────────────
function handlePrint(m: Meeting) {
  const win = window.open("", "_blank");
  if (!win) return;

  const body = mdToHtml(m.formattedContent);
  const dateStr = formatDate(m.date);
  const letterheadUrl = `${window.location.origin}/assets/letterhead.png`;

  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${m.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /*
   * نموذج الطباعة:
   * - الكليشة تظهر كـ @page background في كل صفحة
   * - هامش علوي كبير يترك مساحة لرأس الكليشة (الشعار + الخط الأزرق)
   * - هامش سفلي يترك مساحة لفوتر الكليشة
   */
  @page {
    size: A4;
    margin-top: 52mm;
    margin-bottom: 42mm;
    margin-right: 17mm;
    margin-left: 17mm;
    background-image: url('${letterheadUrl}');
    background-size: 210mm 297mm;
    background-position: top left;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    text-align: right;
    color: #1a1a1a;
    font-size: 11pt;
    line-height: 1.55;
    background-image: url('${letterheadUrl}');
    background-size: 210mm 297mm;
    background-repeat: no-repeat;
    background-position: top left;
    background-attachment: fixed;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding-top: 52mm;
    padding-bottom: 42mm;
    padding-right: 17mm;
    padding-left: 17mm;
  }

  /* التاريخ في مكانه على الكليشة — أعلى يسار */
  .date-overlay {
    position: fixed;
    top: 29mm;
    left: 17mm;
    font-size: 9pt;
    color: #333;
    direction: rtl;
    text-align: right;
  }

  .meeting-title {
    text-align: center;
    font-size: 16pt;
    font-weight: 700;
    color: #1a7a8a;
    margin-bottom: 10px;
  }

  /* المحتوى */
  h2.sec-title {
    color: #1a7a8a;
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    margin: 10px 0 5px;
    padding-bottom: 3px;
    border-bottom: 1.5px solid #c8e8ed;
  }
  h3.sub-title {
    color: #1a7a8a;
    font-size: 11pt;
    font-weight: 700;
    text-align: center;
    margin: 8px 0 4px;
  }
  p { margin: 3px 0; }
  br { display: block; margin: 1px 0; }
  ul {
    list-style-position: inside;
    padding: 0;
    margin: 3px 0 6px;
    text-align: right;
  }
  li { margin-bottom: 2px; line-height: 1.5; text-align: right; }
  hr { border: none; border-top: 1px solid #ddd; margin: 6px 0; }
  strong { font-weight: 700; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 10pt;
    direction: rtl;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #a8d8e0;
    padding: 5px 10px;
    text-align: right;
    vertical-align: top;
  }
  th {
    background-color: #ddf0f4;
    font-weight: 700;
    color: #1a7a8a;
    text-align: center;
  }
  tr:nth-child(even) td { background-color: #f4fbfc; }
</style>
</head>
<body>

  <div class="date-overlay">${dateStr}</div>

  <div class="meeting-title">محضر اجتماع</div>

  ${body}

</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 900);
}

// ── Task assignment modal ─────────────────────────────────────────────────────
type PendingTask = { title: string; assignedToId: string };

function TaskAssignModal({
  employees,
  initialTasks,
  onClose,
  onSave,
}: {
  employees: Employee[];
  initialTasks: { title: string }[];
  onClose: () => void;
  onSave: (tasks: PendingTask[]) => Promise<void>;
}) {
  const [tasks, setTasks] = useState<PendingTask[]>(
    initialTasks.length > 0
      ? initialTasks.map(t => ({ title: t.title, assignedToId: "" }))
      : [{ title: "", assignedToId: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function addRow() { setTasks(t => [...t, { title: "", assignedToId: "" }]); }
  function removeRow(i: number) { setTasks(t => t.filter((_, idx) => idx !== i)); }
  function update(i: number, field: keyof PendingTask, val: string) {
    setTasks(t => t.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  async function handleSave() {
    const valid = tasks.filter(t => t.title.trim() && t.assignedToId);
    if (valid.length === 0) { setErr("أضف مهمة واحدة على الأقل وحدد الموظف"); return; }
    setSaving(true);
    try { await onSave(valid); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">تكليف مهام من المحضر</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 dark:text-slate-500">ستُحفظ المهام في قسم المهام وتظهر للموظف المعني.</p>
            {initialTasks.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                <Sparkles className="w-3 h-3" /> مستخلصة بالذكاء الاصطناعي
              </span>
            )}
          </div>
          {tasks.map((task, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <input
                  value={task.title}
                  onChange={e => update(i, "title", e.target.value)}
                  placeholder="عنوان المهمة..."
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={task.assignedToId}
                  onChange={e => update(i, "assignedToId", e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— اختر الموظف —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({ROLE_LABELS[e.role] || e.role})</option>
                  ))}
                </select>
              </div>
              {tasks.length > 1 && (
                <button onClick={() => removeRow(i)} className="mt-2 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold mt-1">
            <Plus className="w-3.5 h-3.5" /> إضافة مهمة أخرى
          </button>
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">إلغاء</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            إنشاء المهام
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MeetingsClient({ meetings, charities, employees, sessionId, sessionRole, isTier1 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [assignMeeting, setAssignMeeting] = useState<Meeting | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<{ title: string }[]>([]);
  const [extracting, setExtracting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
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
    setTitle(""); setDate(new Date().toISOString().slice(0, 10));
    setLocation(""); setCharityId(""); setAttendees("");
    setRawNotes(""); setIsPrivate(false);
    setFormattedContent(""); setStep(1); setAiError(""); setError("");
    setEditingId(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(m: Meeting) {
    setTitle(m.title); setDate(new Date(m.date).toISOString().slice(0, 10));
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
        if (editingId) {
          await updateMeeting(editingId, { title, formattedContent, isPrivate });
        } else {
          await createMeeting({ title, date, location, charityId, rawNotes, formattedContent, attendees, isPrivate });
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

  async function openAssign(m: Meeting) {
    setExtracting(true);
    setExtractedTasks([]);
    setAssignMeeting(m);
    try {
      const res = await fetch("/api/meetings/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formattedContent: m.formattedContent }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.tasks)) setExtractedTasks(data.tasks);
    } catch { /* show modal anyway with empty tasks */ }
    finally { setExtracting(false); }
  }

  async function handleAssignTasks(tasks: PendingTask[]) {
    await createTasksFromMeeting(tasks);
    router.refresh();
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
            <div key={m.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
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
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setViewingMeeting(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors" title="عرض">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => handlePrint(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors" title="طباعة">
                  <Printer className="w-4 h-4" />
                </button>
                {isTier1 && (
                  <button
                    onClick={() => openAssign(m)}
                    disabled={extracting && assignMeeting?.id === m.id}
                    className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    title="تكليف مهام"
                  >
                    {extracting && assignMeeting?.id === m.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <UserPlus className="w-4 h-4" />}
                  </button>
                )}
                {canEdit(m, sessionId, isTier1) && (
                  <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors" title="تعديل">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canEdit(m, sessionId, isTier1) && (
                  <button onClick={() => handleDelete(m.id)} disabled={isPending} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {viewingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">{viewingMeeting.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(viewingMeeting.date)}{viewingMeeting.location ? ` · ${viewingMeeting.location}` : ""}</p>
              </div>
              <div className="flex gap-2">
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
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">عنوان الاجتماع *</label>
                      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: اجتماع فريق زاد الأسبوعي"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">المحضر المنسق — يمكنك التعديل مباشرة</span>
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

      {/* Task Assign Modal */}
      {assignMeeting && !extracting && (
        <TaskAssignModal
          employees={employees}
          initialTasks={extractedTasks}
          onClose={() => { setAssignMeeting(null); setExtractedTasks([]); }}
          onSave={handleAssignTasks}
        />
      )}
    </div>
  );
}
