"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Sparkles, Loader2, Lock, FileClock } from "lucide-react";
import { checkDateConflict } from "@/app/actions/meetings";
import { timeAgoArabic } from "@/lib/dateUtils";
import { Charity, Employee } from "../MeetingsClient";

// مسودة محضر جديد لم يُحفظ بعد — محلية في متصفح هذا المستخدم فقط (لا خادم، لا
// جدول جديد). تُحفظ تلقائياً عند إغلاق النافذة (بالزر أو بإغلاق التبويب/تحديث
// الصفحة) طالما كُتب فيها شيء، وتُقرأ عند فتح "محضر اجتماع جديد" التالي.
// لا تُستخدم أبداً عند تعديل محضر موجود — لذلك لا خطر من استرجاعها فوق تعديل جارٍ.
const DRAFT_STORAGE_KEY = "zad_meeting_draft_v1";

type MeetingDraft = {
  title: string;
  date: string;
  location: string;
  charityId: string;
  attendees: string;
  rawNotes: string;
  meetingContext: string;
  isPrivate: boolean;
  formattedContent: string;
  step: 1 | 2;
  savedAt: number;
};

function readMeetingDraft(): MeetingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.title === "string" ? (parsed as MeetingDraft) : null;
  } catch {
    return null;
  }
}

function hasMeaningfulContent(d: { title: string; rawNotes: string; formattedContent: string }) {
  return !!(d.title.trim() || d.rawNotes.trim() || d.formattedContent.trim());
}

type Props = {
  editingId: string | null;
  charities: Charity[];
  departments: { value: string; label: string }[];
  isTier1: boolean;
  initialData?: {
    title: string;
    date: string;
    location: string;
    charityId: string;
    attendees: string;
    rawNotes: string;
    meetingContext: string;
    isPrivate: boolean;
    formattedContent: string;
  };
  onClose: () => void;
  onSave: (data: {
    title: string;
    date: string;
    location: string;
    charityId: string;
    attendees: string;
    rawNotes: string;
    meetingContext: string;
    isPrivate: boolean;
    formattedContent: string;
  }) => Promise<void>;
};

export default function MeetingFormModal({
  editingId, charities, departments, isTier1, initialData, onClose, onSave
}: Props) {
  const [isPending, startTransition] = useTransition();

  // لا مسودة إطلاقاً عند تعديل محضر موجود — editingId و initialData يُضبطان معاً
  // دائماً في الصفحة الأم (انظر openEdit)، فقراءتها هنا تخصّ "محضر جديد" فقط.
  const [draft] = useState<MeetingDraft | null>(() => (editingId ? null : readMeetingDraft()));
  const [draftDismissed, setDraftDismissed] = useState(false);
  const showDraftBanner = !editingId && !!draft && !draftDismissed;

  const [title, setTitle] = useState(initialData?.title || draft?.title || "");
  const [date, setDate] = useState(initialData?.date || draft?.date || new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initialData?.location || draft?.location || "");
  const [charityId, setCharityId] = useState(initialData?.charityId || draft?.charityId || "");
  const [attendees, setAttendees] = useState(initialData?.attendees || draft?.attendees || "");
  const [rawNotes, setRawNotes] = useState(initialData?.rawNotes || draft?.rawNotes || "");
  const [meetingContext, setMeetingContext] = useState(initialData?.meetingContext || draft?.meetingContext || "");
  const [isPrivate, setIsPrivate] = useState(initialData?.isPrivate || draft?.isPrivate || false);
  const [step, setStep] = useState<1 | 2>(draft?.step || 1);
  const [formattedContent, setFormattedContent] = useState(initialData?.formattedContent || draft?.formattedContent || "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [error, setError] = useState("");

  // مرجع بآخر قيم النموذج، يُحدَّث كل تصيير — لتجنّب قراءة قيم قديمة (stale
  // closure) داخل مستمعي beforeunload/pagehide ودالة تنظيف useEffect أدناه.
  const latestRef = useRef({
    title, date, location, charityId, attendees, rawNotes, meetingContext, isPrivate, formattedContent, step,
  });
  useEffect(() => {
    latestRef.current = {
      title, date, location, charityId, attendees, rawNotes, meetingContext, isPrivate, formattedContent, step,
    };
  });

  // يصير true بمجرد أن يضغط المستخدم "حفظ" فعلياً — فلا تُكتب مسودة فوق محضر
  // بصدد الحفظ، ولا تبقى مسودة قديمة تظهر من جديد في المرة القادمة.
  const savingRef = useRef(false);

  useEffect(() => {
    if (editingId) return; // لا مسودات أثناء التعديل

    function persistDraft() {
      if (savingRef.current) {
        try {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
          /* تجاهل */
        }
        return;
      }
      const s = latestRef.current;
      try {
        if (hasMeaningfulContent(s)) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch {
        /* localStorage غير متاح — لا شيء يُفعل */
      }
    }

    // يغطي إغلاق التبويب أو تحديث الصفحة، حيث لا يُضمَن تشغيل دالة تنظيف
    // useEffect العادية.
    window.addEventListener("pagehide", persistDraft);
    window.addEventListener("beforeunload", persistDraft);

    return () => {
      window.removeEventListener("pagehide", persistDraft);
      window.removeEventListener("beforeunload", persistDraft);
      // يغطي إغلاق النافذة من داخل التطبيق (زر X أو "إلغاء" أو نجاح الحفظ).
      persistDraft();
    };
  }, [editingId]);

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* تجاهل */
    }
    setDraftDismissed(true);
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setLocation("");
    setCharityId("");
    setAttendees("");
    setRawNotes("");
    setMeetingContext("");
    setIsPrivate(false);
    setFormattedContent("");
    setStep(1);
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
      if (data.truncated) {
        setAiError("الملاحظات طويلة جداً وتم قطع المحضر — راجع النص وأكمل الناقص قبل الحفظ");
      }
      setStep(2);
    } catch (e: any) { setAiError(e.message || "حدث خطأ"); }
    finally { setAiLoading(false); }
  }

  async function handleSaveClick() {
    if (!title.trim()) { setError("العنوان مطلوب"); return; }
    if (!date) { setError("التاريخ مطلوب"); return; }
    if (!formattedContent.trim()) { setError("المحضر المنسق مطلوب"); return; }
    setError("");

    // فحص تعارض التاريخ
    const dateConflicts = await checkDateConflict(date, editingId || undefined);
    if (dateConflicts.length > 0) {
      const names = dateConflicts.map(c => `"${c.title}"`).join("، ");
      const proceed = confirm(
        `تنبيه: يوجد ${dateConflicts.length > 1 ? "محاضر أخرى" : "محضر آخر"} في نفس هذا التاريخ:\n${names}\n\nهل تريد المتابعة وحفظ المحضر على أي حال؟`
      );
      if (!proceed) return;
    }

    // يُعلَّم قبل الحفظ الفعلي لا بعده: onSave يستدعي startTransition في الأصل
    // ويعيد التحكم فوراً، فانتظار نتيجتها هنا لا يضمن اكتمال الحفظ في القاعدة
    // بعد. المهم عملياً أن المستخدم ضغط "حفظ" فلا تُقترح عليه مسودته القديمة
    // مجدداً حتى لو تأخر الحفظ أو فشل لاحقاً.
    savingRef.current = true;

    startTransition(async () => {
      try {
        await onSave({
          title, date, location, charityId, attendees, rawNotes, meetingContext, isPrivate, formattedContent
        });
      } catch (e: any) {
        savingRef.current = false;
        setError(e.message || "حدث خطأ أثناء الحفظ");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {editingId ? "تعديل المحضر" : "محضر اجتماع جديد"}
            </h2>
            {!editingId && (
              <div className="flex items-center gap-1 mr-2">
                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 1 ? "bg-primary text-white" : "bg-primary/10 text-primary"}`}>١</div>
                <div className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${step === 2 ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>٢</div>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {showDraftBanner && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
              <FileClock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="flex-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                تم استرجاع مسودة محضر لم تُحفظ{draft?.savedAt ? ` (${timeAgoArabic(new Date(draft.savedAt))})` : ""}
              </p>
              <button
                type="button"
                onClick={discardDraft}
                className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
              >
                تجاهل وابدأ من جديد
              </button>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">عنوان الاجتماع *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: اجتماع فريق زاد الأسبوعي"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">التاريخ *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">المكان</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="مكتب زاد / أونلاين"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الحضور</label>
                  <input value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="محمد، أحمد، سارة..."
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">نوع / سياق الاجتماع</label>
                  <select value={meetingContext} onChange={e => setMeetingContext(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">— اختر النوع —</option>
                    <option value="زاد">إدارة زاد</option>
                    <option disabled>── الأقسام ──</option>
                    {departments.map(d => <option key={d.value} value={`service:${d.value}`}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">الجمعية (اختياري)</label>
                  <select value={charityId} onChange={e => setCharityId(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">— بدون جمعية —</option>
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
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              {aiError && <p className="text-xs text-red-500 font-bold">{aiError}</p>}

              {editingId && (
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">المحضر المنسق</span>
                    <button
                      onClick={handleFormat}
                      disabled={aiLoading || !rawNotes.trim()}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/90 border border-primary/20 hover:bg-primary/5 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 mr-auto"
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      إعادة الصياغة
                    </button>
                  </div>
                  <textarea value={formattedContent} onChange={e => setFormattedContent(e.target.value)} rows={10}
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed" dir="rtl" />
                  {isTier1 && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">خاص بالإدارة التنفيذية فقط</span>
                    </label>
                  )}
                </div>
              )}
              {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
            </>
          )}

          {step === 2 && !editingId && (
            <>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">المحضر المنسق — يمكنك التعديل مباشرة</span>
                <button
                  onClick={handleFormat}
                  disabled={aiLoading || !rawNotes.trim()}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/90 border border-primary/20 hover:bg-primary/5 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-40 mr-auto"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  إعادة الصياغة
                </button>
              </div>
              <textarea value={formattedContent} onChange={e => setFormattedContent(e.target.value)} rows={15}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary resize-none leading-relaxed" dir="rtl" />
              {aiError && <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">{aiError}</p>}
              {isTier1 && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">خاص بالإدارة التنفيذية فقط</span>
                </label>
              )}
              {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          {step === 2 && !editingId
            ? <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">← العودة للملاحظات</button>
            : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">إلغاء</button>
            {step === 1 && !editingId && (
              <button onClick={handleFormat} disabled={aiLoading || !rawNotes.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? "جاري الصياغة..." : "صياغة بالذكاء الاصطناعي"}
              </button>
            )}
            {(step === 2 || editingId) && (
              <button onClick={handleSaveClick} disabled={isPending || !formattedContent.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? "حفظ التعديلات" : "حفظ المحضر"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
