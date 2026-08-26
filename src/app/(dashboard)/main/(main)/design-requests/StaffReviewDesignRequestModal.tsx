"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, Check, Ban } from "lucide-react";
import { approveDesignRequest, rejectDesignRequest } from "@/app/actions/designRequests";
import ConfirmModal from "@/components/ui/ConfirmModal";

/**
 * The review step a charity's request passes through before it enters the queue.
 *
 * Two outcomes, deliberately given equal weight in the UI rather than making
 * rejection a small secondary link: a request that should not proceed is as
 * valid an answer as one that should, and burying it produces approvals by
 * default.
 *
 * Approving recomputes the schedule server-side. The date shown here while the
 * request waits is an estimate — the row holds no place in the queue until this
 * moment — so the modal says so instead of implying the date is already fixed.
 */
export default function StaffReviewDesignRequestModal({
  requestId,
  title,
  charityName,
  suggestedDays,
  onClose,
  onDone,
}: {
  requestId: string;
  title: string;
  charityName: string;
  /** Total implied by the chosen design types. */
  suggestedDays: number;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [days, setDays] = useState(String(suggestedDays));
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const parsedDays = Number(days);
  const daysChanged = parsedDays !== suggestedDays;

  const handleApprove = () => {
    setError(null);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return setError("عدد الأيام يجب أن يكون رقماً صحيحاً بين 1 و365");
    }
    setIsConfirmOpen(true);
  };

  const runApprove = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      // Only sent when actually changed, so an untouched field cannot silently
      // overwrite the total the design types imply.
      const res = await approveDesignRequest(requestId, daysChanged ? parsedDays : undefined);
      if (res.error) return setError(res.error);
      onDone("تم اعتماد الطلب وتأكيد موعده");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الاعتماد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = () => {
    setError(null);
    if (reason.trim().length < 5) return setError("يرجى كتابة سبب الرفض (5 أحرف على الأقل)");
    setIsConfirmOpen(true);
  };

  const runReject = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const res = await rejectDesignRequest(requestId, reason);
      if (res.error) return setError(res.error);
      onDone("تم رفض الطلب وإبلاغ الجمعية بالسبب");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الرفض");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-[#0A0A0A] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full sm:max-w-lg max-h-[92dvh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2
              className="font-bold text-slate-900 dark:text-slate-100 truncate"
              style={{ fontSize: "var(--dr-fs-title)" }}
            >
              مراجعة الطلب
            </h2>
            <p className="text-slate-500 dark:text-slate-400 truncate" style={{ fontSize: "var(--dr-fs-meta)" }}>
              {charityName} — {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-1">
            {([
              { key: "approve" as const, label: "اعتماد", Icon: Check },
              { key: "reject" as const, label: "رفض", Icon: Ban },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  setError(null);
                }}
                className={`flex-1 h-9 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === key
                    ? key === "approve"
                      ? "bg-white dark:bg-[#222] text-primary dark:text-teal-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                      : "bg-white dark:bg-[#222] text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50"
                    : "text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {error && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          {mode === "approve" ? (
            <>
              <div>
                <label
                  className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
                  style={{ fontSize: "var(--dr-fs-meta)" }}
                >
                  عدد أيام العمل
                  <span className="font-normal text-slate-400 mr-1">
                    — المقترح حسب نوع التصميم: {suggestedDays}
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  style={{ fontSize: "var(--dr-fs-body)" }}
                />
              </div>

              <p
                className="rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3 leading-relaxed"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                الموعد الظاهر للجمعية الآن تقديري — الطلب لا يحجز مكاناً في الطابور قبل الاعتماد.
                عند الاعتماد يُحسب الموعد على الطابور كما هو الآن ويصبح مؤكداً.
              </p>
            </>
          ) : (
            <div>
              <label
                className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                سبب الرفض
                <span className="font-normal text-slate-400 mr-1">— تقرؤه الجمعية</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="اشرح للجمعية سبب الرفض وما الذي يلزم لإعادة الرفع..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                style={{ fontSize: "var(--dr-fs-body)" }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 px-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            إلغاء
          </button>
          {mode === "approve" ? (
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="h-11 px-6 flex items-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {daysChanged ? `اعتماد بـ${parsedDays || "?"} أيام` : "اعتماد وتأكيد الموعد"}
            </button>
          ) : (
            <button
              onClick={handleReject}
              disabled={isSubmitting}
              className="h-11 px-6 flex items-center gap-2 text-white bg-rose-600 hover:bg-rose-700 active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              رفض الطلب
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={mode === "approve" ? "اعتماد الطلب" : "رفض الطلب"}
        message={
          mode === "approve"
            ? `سيدخل الطلب الطابور بـ${parsedDays} من أيام العمل، ويُثبَّت موعد التسليم ويظهر للجمعية. هل تريد المتابعة؟`
            : "سيُرفض الطلب ويظهر السبب للجمعية في تبويب «المرفوضة». هل تريد المتابعة؟"
        }
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={mode === "approve" ? runApprove : runReject}
      />
    </div>
  );
}
