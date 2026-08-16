"use client";

import { useState } from "react";
import { X, Calendar, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { rescheduleCharityQueue } from "@/app/actions/designRequests";

export default function StaffRescheduleCharityQueueModal({
  charityId,
  charityName,
  onClose,
  onSuccess,
}: {
  charityId: string;
  charityName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!startDate) return setError("يرجى إدخال تاريخ ووقت البدء");

    setIsSubmitting(true);
    try {
      const parsedStartDate = new Date(startDate);
      const res = await rescheduleCharityQueue(charityId, parsedStartDate);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الإجراء");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-md flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: "var(--dr-fs-title)" }}>
            إعادة جدولة طابور {charityName}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-400/20">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold" style={{ fontSize: "var(--dr-fs-body)" }}>
                تحذير: سيتم إعادة حساب تواريخ جميع الطلبات
              </p>
              <p className="text-amber-600/80 dark:text-amber-400/80" style={{ fontSize: "var(--dr-fs-meta)" }}>
                سيتم ترتيب جميع الطلبات "قيد التنفيذ" لهذه الجمعية كطابور متسلسل بناءً على التاريخ الذي تحدده أدناه. كل طلب سيستغرق 3 أيام عمل لينتهي ويبدأ الطلب الذي يليه مباشرة.
              </p>
            </div>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              تاريخ ووقت انطلاق الطابور
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-11 px-6 flex items-center gap-2 text-white bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 shadow-[var(--dr-shadow-warn)] hover:shadow-lg active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            إعادة جدولة الطابور بالكامل
          </button>
        </div>
      </div>
    </div>
  );
}
