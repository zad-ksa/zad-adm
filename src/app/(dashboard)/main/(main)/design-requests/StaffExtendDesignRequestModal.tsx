"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, CalendarPlus } from "lucide-react";
import { extendDesignRequestDays } from "@/app/actions/designRequests";

/**
 * Adds business days to a request's deadline without moving its start.
 *
 * Distinct from "إعادة جدولة", which moves the start date and drags the
 * deadline with it. That is the right tool when the queue shifts; this one is
 * for when the work simply turned out bigger than its type predicted, and the
 * charity has already been told when work begins.
 */
export default function StaffExtendDesignRequestModal({
  requestId,
  currentDays,
  expectedCompletionDate,
  onClose,
  onSuccess,
}: {
  requestId: string;
  currentDays: number;
  expectedCompletionDate: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [extraDays, setExtraDays] = useState("1");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(extraDays);
  const daysValid = Number.isFinite(parsed) && parsed >= 1 && parsed <= 60;
  const reasonValid = reason.trim().length >= 3;
  const isValid = daysValid && reasonValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!daysValid) return setError("عدد الأيام يجب أن يكون بين 1 و 60");
    if (!reasonValid) return setError("يرجى كتابة سبب التمديد");

    setIsSubmitting(true);
    try {
      const res = await extendDesignRequestDays(requestId, parsed, reason);
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الإجراء");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-sm flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2
            className="font-bold text-slate-900 dark:text-slate-100"
            style={{ fontSize: "var(--dr-fs-title)" }}
          >
            إضافة أيام على الموعد
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-6 py-4 space-y-4">
          <p
            className="rounded-xl bg-primary/5 dark:bg-primary/10 text-primary dark:text-teal-300 px-4 py-3"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            تاريخ البدء لا يتغيّر — تُضاف الأيام إلى المدة فقط، ويُعاد حساب موعد التسليم من
            البداية نفسها. السبب الذي تكتبه <strong>يظهر للجمعية</strong> في صفحة طلباتها.
          </p>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            <span className="text-slate-500 dark:text-slate-400">المدة الحالية</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {currentDays} يوم عمل
            </span>
          </div>
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            <span className="text-slate-500 dark:text-slate-400">وقت التسليم الحالي</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {expectedCompletionDate}
            </span>
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              أيام العمل المضافة
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={extraDays}
              onChange={(e) => setExtraDays(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none tabular-nums"
              style={{ fontSize: "var(--dr-fs-body)" }}
              dir="ltr"
            />
            {daysValid && (
              <p
                className="mt-2 text-slate-500 dark:text-slate-400"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                المدة بعد الإضافة: {currentDays + parsed} يوم عمل
              </p>
            )}
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              سبب التمديد <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="مثال: طُلبت تعديلات إضافية على التصميم بعد المراجعة"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="h-11 px-6 flex items-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarPlus className="w-4 h-4" />
            )}
            اعتماد التمديد
          </button>
        </div>
      </div>
    </div>
  );
}
