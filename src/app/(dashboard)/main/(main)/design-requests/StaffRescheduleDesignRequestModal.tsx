"use client";

import { useState } from "react";
import { Calendar, Loader2, AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";
import { rescheduleDesignRequest } from "@/app/actions/designRequests";

export default function StaffRescheduleDesignRequestModal({
  requestId,
  onClose,
  onSuccess,
}: {
  requestId: string;
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
      const res = await rescheduleDesignRequest(requestId, parsedStartDate);
      if (res.error) {
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
    <Dialog
      size="sm"
      scopeClassName="design-requests-ui"
      title="إعادة جدولة الطلب"
      onClose={onClose}
      busy={isSubmitting}
      onSubmit={handleSubmit}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isSubmitting} className={btn.secondary}>
            إلغاء
          </button>
          <button type="submit"
            disabled={isSubmitting}
           className={btn.primary}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
            اعتماد التاريخ
          </button>
        </>
      }
    >
        <div className="space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-semibold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label
              className="block font-semibold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              تاريخ ووقت البدء الجديد
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>
        </div>
    </Dialog>
  );
}
