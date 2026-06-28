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
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateHijri(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
}

function canEdit(meeting: Meeting, sessionId: string, isTier1: boolean) {
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);
  if (creatorIsTier1 && !isTier1) return false;
  return meeting.createdById === sessionId || isTier1;
}

// ── Letterhead print ──────────────────────────────────────────────────────────
function handlePrint(m: Meeting) {
  const win = window.open("", "_blank");
  if (!win) return;

  // Convert markdown-ish to HTML with RTL table support
  let body = m.formattedContent
    // headers
    .replace(/^## (.+)$/gm, '<h2 class="sec-title">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="sub-title">$3<span>$1</span></h3>'.replace('$3',''))
    .replace(/^### (.+)$/gm, '<h3 class="sub-title">$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // table rows
    .replace(/^\|(.+)\|$/gm, (row) => {
      const cells = row.split("|").slice(1, -1).map(c => c.trim());
      const isHeader = false;
      return `<tr>${cells.map(c => `<td>${c}</td>`).join("")}</tr>`;
    })
    // separator rows (|----|)
    .replace(/<tr>(<td>[-: ]+<\/td>)+<\/tr>/g, "")
    // list items
    .replace(/^[-•] (.+)$/gm, "<li>$1</li>")
    // hr
    .replace(/^---$/gm, "<hr>")
    // line breaks
    .replace(/\n/g, "<br>");

  // Wrap consecutive <tr> into <table>
  body = body
    .split(/(?=<tr>)|(?<=<\/tr>)/)
    .reduce((acc: string[], part) => {
      if (part.startsWith("<tr>")) {
        const last = acc[acc.length - 1];
        if (last && last.startsWith("<table>")) {
          acc[acc.length - 1] = last.slice(0, -8) + part.replace(/<br>/g, "") + "</table>";
        } else {
          acc.push("<table>" + part.replace(/<br>/g, "") + "</table>");
        }
      } else {
        acc.push(part);
      }
      return acc;
    }, [])
    .join("");

  // Wrap consecutive <li> into <ul>
  body = body
    .split(/(?=<li>)|(?<=<\/li>)/)
    .reduce((acc: string[], part) => {
      if (part.startsWith("<li>")) {
        const last = acc[acc.length - 1];
        if (last && last.startsWith("<ul>")) {
          acc[acc.length - 1] = last.slice(0, -5) + part.replace(/<br>/g, "") + "</ul>";
        } else {
          acc.push("<ul>" + part.replace(/<br>/g, "") + "</ul>");
        }
      } else {
        acc.push(part);
      }
      return acc;
    }, [])
    .join("");

  const dateStr = formatDate(m.date);

  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${m.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl; text-align: right;
    color: #222;
    padding: 0;
    background: white;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 0;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* ── Header / Letterhead ── */
  .letterhead {
    padding: 18mm 18mm 0 18mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .letterhead-left {
    font-size: 10pt;
    color: #1a7a8a;
    line-height: 1.9;
    text-align: right;
  }
  .letterhead-left span { color: #333; }
  .letterhead-logo {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .letterhead-logo img { height: 55px; }
  .letterhead-logo .tagline {
    font-size: 8pt;
    color: #888;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  /* ── Divider ── */
  .header-divider {
    margin: 10mm 18mm 0 18mm;
    border: none;
    border-top: 1.5px solid #1a7a8a;
  }

  /* ── Content area ── */
  .content {
    flex: 1;
    padding: 10mm 18mm;
    font-size: 11pt;
    line-height: 1.85;
  }

  h2.sec-title {
    color: #1a7a8a;
    font-size: 13pt;
    font-weight: 700;
    margin: 14px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #e0f0f2;
  }
  h3.sub-title {
    color: #2c5f6b;
    font-size: 11.5pt;
    font-weight: 700;
    margin: 12px 0 6px;
  }
  p, br { line-height: 1.85; }
  ul { padding-right: 20px; margin: 6px 0; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
  strong { font-weight: 700; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10.5pt;
    direction: rtl;
  }
  th, td {
    border: 1px solid #b0d8de;
    padding: 7px 12px;
    text-align: right;
    vertical-align: top;
  }
  tr:first-child td { background: #e8f6f8; font-weight: 700; color: #1a7a8a; }
  tr:nth-child(even) td { background: #f6fcfd; }

  /* ── Footer ── */
  .footer {
    padding: 8mm 18mm 12mm 18mm;
    border-top: 1.5px solid #1a7a8a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    color: #555;
  }
  .footer-logo { opacity: 0.15; height: 60px; }
  .footer-info { text-align: left; color: #1a7a8a; line-height: 1.7; font-size: 8pt; }
  .footer-info a { color: #1a7a8a; text-decoration: none; }

  @media print {
    body { margin: 0; }
    .page { page-break-after: always; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="letterhead-left">
      الـرقـم : <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>
      التـاريـخ : <span>${dateStr}</span><br>
      المرفقات : <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
    </div>
    <div class="letterhead-logo">
      <svg width="160" height="55" viewBox="0 0 400 130" xmlns="http://www.w3.org/2000/svg">
        <!-- Zad logo text approximation -->
        <text x="200" y="55" font-family="Cairo,sans-serif" font-size="42" font-weight="700"
          fill="url(#lg)" text-anchor="middle">زاد التـنـمـويـة</text>
        <text x="200" y="80" font-family="Cairo,sans-serif" font-size="18" fill="#888"
          text-anchor="middle">Zad Development Services</text>
        <text x="200" y="105" font-family="Cairo,sans-serif" font-size="14" fill="#aaa"
          text-anchor="middle">─── لأثر مستدام ───</text>
        <defs>
          <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#1a7a8a"/>
            <stop offset="100%" style="stop-color:#4daf62"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>

  <hr class="header-divider">

  <!-- Body -->
  <div class="content">
    ${body}
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-info" style="text-align:right">
      📞 7053414848 &nbsp;|&nbsp; 0555 493 583<br>
      ✉ zad.adm.ksa@gmail.com<br>
      📍 المملكة العربية السعودية - جدة - أبرق الرغامة
    </div>
    <svg width="50" height="50" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="opacity:0.12">
      <ellipse cx="38" cy="60" rx="22" ry="38" fill="none" stroke="#1a7a8a" stroke-width="8"/>
      <ellipse cx="82" cy="60" rx="22" ry="38" fill="none" stroke="#4daf62" stroke-width="8"/>
    </svg>
  </div>

</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Task assignment modal ─────────────────────────────────────────────────────
type PendingTask = { title: string; assignedToId: string };

function TaskAssignModal({
  employees,
  onClose,
  onSave,
}: {
  employees: Employee[];
  onClose: () => void;
  onSave: (tasks: PendingTask[]) => Promise<void>;
}) {
  const [tasks, setTasks] = useState<PendingTask[]>([{ title: "", assignedToId: "" }]);
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
          <p className="text-xs text-slate-400 dark:text-slate-500">ستُحفظ المهام في قسم المهام وتظهر للموظف المعني.</p>
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
                  <button onClick={() => setAssignMeeting(m)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 transition-colors" title="تكليف مهام">
                    <UserPlus className="w-4 h-4" />
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
      {assignMeeting && (
        <TaskAssignModal
          employees={employees}
          onClose={() => setAssignMeeting(null)}
          onSave={handleAssignTasks}
        />
      )}
    </div>
  );
}
