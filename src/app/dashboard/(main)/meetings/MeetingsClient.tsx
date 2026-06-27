"use client";

import { useState, useTransition, useRef } from "react";
import {
  FileText, Plus, X, Lock, Globe, Trash2, Edit2,
  Printer, Loader2, Sparkles, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { createMeeting, updateMeeting, deleteMeeting } from "@/app/actions/meetings";
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

type Props = {
  meetings: Meeting[];
  charities: Charity[];
  sessionId: string;
  sessionRole: string;
  isTier1: boolean;
};

const TIER1 = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

function canEdit(meeting: Meeting, sessionId: string, isTier1: boolean) {
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);
  if (creatorIsTier1 && !isTier1) return false;
  return meeting.createdById === sessionId || isTier1;
}

function canDelete(meeting: Meeting, sessionId: string, isTier1: boolean) {
  return canEdit(meeting, sessionId, isTier1);
}

export default function MeetingsClient({ meetings, charities, sessionId, sessionRole, isTier1 }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [charityId, setCharityId] = useState("");
  const [attendees, setAttendees] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Step 2
  const [step, setStep] = useState<1 | 2>(1);
  const [formattedContent, setFormattedContent] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Error
  const [error, setError] = useState("");

  function resetForm() {
    setTitle(""); setDate(new Date().toISOString().slice(0, 10));
    setLocation(""); setCharityId(""); setAttendees("");
    setRawNotes(""); setIsPrivate(false);
    setFormattedContent(""); setStep(1); setAiError(""); setError("");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(m: Meeting) {
    setTitle(m.title);
    setDate(new Date(m.date).toISOString().slice(0, 10));
    setLocation(m.location || "");
    setCharityId(m.charityId || "");
    setAttendees(m.attendees || "");
    setRawNotes(m.rawNotes);
    setIsPrivate(m.isPrivate);
    setFormattedContent(m.formattedContent);
    setStep(2);
    setAiError(""); setError("");
    setEditingId(m.id);
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
    } catch (e: any) {
      setAiError(e.message || "حدث خطأ");
    } finally {
      setAiLoading(false);
    }
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
        setShowModal(false);
        resetForm();
        router.refresh();
      } catch (e: any) {
        setError(e.message || "حدث خطأ");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا المحضر؟")) return;
    startTransition(async () => {
      try {
        await deleteMeeting(id);
        router.refresh();
      } catch (e: any) {
        alert(e.message);
      }
    });
  }

  function handlePrint(m: Meeting) {
    const win = window.open("", "_blank");
    if (!win) return;
    const content = m.formattedContent
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
      .replace(/\n/g, "<br>");
    win.document.write(`
      <!DOCTYPE html><html dir="rtl"><head>
      <meta charset="utf-8"><title>${m.title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #222; direction: rtl; }
        h2 { color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
        h3 { color: #2563eb; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: right; }
        th { background: #f0f4ff; }
        .footer { margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      ${content}
      <div class="footer">صدر عن مؤسسة زاد التنموية — ${formatDate(m.date)}</div>
      </body></html>
    `);
    win.document.close();
    win.print();
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
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
        >
          <Plus className="w-4 h-4" />
          محضر جديد
        </button>
      </div>

      {/* Meetings list */}
      {meetings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">لا توجد محاضر بعد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {meetings.map(m => (
            <div
              key={m.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                {m.isPrivate
                  ? <Lock className="w-5 h-5 text-amber-500" />
                  : <Globe className="w-5 h-5 text-blue-500" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{m.title}</span>
                  {m.isPrivate && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">خاص</span>
                  )}
                  {m.charity && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{m.charity.name}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>{formatDate(m.date)}</span>
                  {m.location && <span>· {m.location}</span>}
                  <span>· {m.createdBy.name}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setViewingMeeting(m)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                  title="عرض"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePrint(m)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
                  title="طباعة"
                >
                  <Printer className="w-4 h-4" />
                </button>
                {canEdit(m, sessionId, isTier1) && (
                  <button
                    onClick={() => openEdit(m)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                    title="تعديل"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {canDelete(m, sessionId, isTier1) && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="حذف"
                  >
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
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {viewingMeeting.formattedContent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h2 className="font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? "تعديل المحضر" : "محضر اجتماع جديد"}
                </h2>
                {/* Step indicator */}
                {!editingId && (
                  <div className="flex items-center gap-1 mr-2">
                    <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 1 ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-600"}`}>١</div>
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
              {/* Step 1: Basic info + raw notes */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">عنوان الاجتماع *</label>
                      <input
                        value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="مثال: اجتماع فريق زاد الأسبوعي"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">التاريخ *</label>
                      <input
                        type="date" value={date} onChange={e => setDate(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">المكان</label>
                      <input
                        value={location} onChange={e => setLocation(e.target.value)}
                        placeholder="مكتب زاد / أونلاين"
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الحضور</label>
                      <input
                        value={attendees} onChange={e => setAttendees(e.target.value)}
                        placeholder="محمد، أحمد، سارة..."
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الجمعية (اختياري)</label>
                      <select
                        value={charityId} onChange={e => setCharityId(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— اجتماع داخلي —</option>
                        {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                      ملاحظات الاجتماع الخام *
                      <span className="font-normal text-slate-400 mr-1">— اكتب بحرية وبالعامية، سيقوم الذكاء الاصطناعي بتنظيمها</span>
                    </label>
                    <textarea
                      value={rawNotes} onChange={e => setRawNotes(e.target.value)}
                      rows={8}
                      placeholder="اكتب ملاحظاتك هنا بأي طريقة... مثلاً: ناقشنا موضوع الميزانية وقرر المدير زيادتها، واحمد راح يتابع مع الجمعية..."
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                </>
              )}

              {/* Step 2: Formatted content editor */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">المحضر المنسق — يمكنك التعديل مباشرة</span>
                  </div>
                  <textarea
                    value={formattedContent} onChange={e => setFormattedContent(e.target.value)}
                    rows={14}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  />
                  {isTier1 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">خاص بالإدارة التنفيذية فقط</span>
                    </label>
                  )}
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              {step === 2 && !editingId ? (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  ← العودة للملاحظات
                </button>
              ) : <div />}

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  إلغاء
                </button>
                {step === 1 && (
                  <button
                    onClick={handleFormat}
                    disabled={aiLoading || !rawNotes.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? "جاري الصياغة..." : "صياغة بالذكاء الاصطناعي"}
                  </button>
                )}
                {step === 2 && (
                  <button
                    onClick={handleSave}
                    disabled={isPending || !formattedContent.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
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
