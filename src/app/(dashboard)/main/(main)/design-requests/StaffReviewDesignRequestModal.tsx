"use client";

import { useState } from "react";
import { Loader2, AlertTriangle, Check, Undo2 } from "lucide-react";
import { approveDesignRequest, rejectDesignRequest } from "@/app/actions/designRequests";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

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
    if (reason.trim().length < 5) return setError("يرجى كتابة الملاحظات (5 أحرف على الأقل)");
    setIsConfirmOpen(true);
  };

  const runReject = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      const res = await rejectDesignRequest(requestId, reason);
      if (res.error) return setError(res.error);
      onDone("أُعيد الطلب إلى الجمعية مع الملاحظات");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إعادة الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
<Dialog
scopeClassName="design-requests-ui"
title="مراجعة الطلب"
description={<>{charityName} —  {title}</>}
onClose={onClose}
closeOnBackdrop={false}
footer={
<>
<button type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={btn.secondary}
            
          >
            إلغاء
          </button>
          {mode === "approve" ? (
            <button type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className={btn.primary}
              
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {daysChanged ? `اعتماد بـ${parsedDays || "?"} أيام` : "اعتماد وتأكيد الموعد"}
            </button>
          ) : (
            <button type="button"
              onClick={handleReject}
              disabled={isSubmitting}
              className={btn.primary}
              
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              إعادة مع ملاحظات
            </button>
          )}
</>
}
>
<div className="space-y-4">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-1">
            {([
              { key: "approve" as const, label: "اعتماد", Icon: Check },
              { key: "reject" as const, label: "إعادة مع ملاحظات", Icon: Undo2 },
            ]).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  setError(null);
                }}
                className={`flex-1 h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
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
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-semibold"
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
                  className="block font-semibold text-slate-500 dark:text-slate-400 mb-2"
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
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  style={{ fontSize: "var(--dr-fs-body)" }}
                />
              </div>

              <p
                className="rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3 leading-relaxed"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                الموعد الظاهر للجمعية الآن تقديري — الطلب لا يحجز دوره قبل الاعتماد.
                عند الاعتماد يُحسب الموعد على ترتيب التنفيذ كما هو الآن ويصبح مؤكداً.
              </p>
            </>
          ) : (
            <div>
              <label
                className="block font-semibold text-slate-500 dark:text-slate-400 mb-2"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                ملاحظات الإعادة
                <span className="font-normal text-slate-400 mr-1">— تقرؤها الجمعية</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="اكتب ما يلزم تعديله في الطلب قبل إعادة رفعه..."
                className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                style={{ fontSize: "var(--dr-fs-body)" }}
              />
            </div>
          )}
        </div>
</Dialog>
<ConfirmDialog
        isOpen={isConfirmOpen}
        title={mode === "approve" ? "اعتماد الطلب" : "إعادة الطلب مع ملاحظات"}
        message={
          mode === "approve"
            ? `سيأخذ الطلب دوره بـ${parsedDays} من أيام العمل، ويُثبَّت موعد التسليم ويظهر للجمعية. هل تريد المتابعة؟`
            : "سيعود الطلب إلى الجمعية مع ملاحظاتك في تبويب «المُعادة للتعديل»، ويمكنها تعديله وإعادة رفعه. هل تريد المتابعة؟"
        }
        confirmLabel={mode === "approve" ? "اعتماد الطلب" : "إعادة مع ملاحظات"}
        tone="primary"
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={mode === "approve" ? runApprove : runReject}
      />
</>
  );
}
