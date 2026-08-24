"use client";

import { useState } from "react";
import { X, Paperclip, Send, Loader2, AlertTriangle } from "lucide-react";
import { createDesignRequestByStaff } from "@/app/actions/designRequests";
import DesignTypePicker, {
  type DesignTypeOption,
} from "@/components/design-requests/DesignTypePicker";
import { uploadDesignRequestFiles } from "@/components/design-requests/uploadDesignRequestFiles";

export default function StaffNewDesignRequestModal({
  charities,
  designTypes,
  onClose,
  onSuccess,
}: {
  charities: { id: string; name: string }[];
  designTypes: DesignTypeOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [charityId, setCharityId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!charityId) return setError("يرجى اختيار الجمعية");
    if (!title.trim()) return setError("يرجى إدخال عنوان الطلب");
    if (typeIds.length === 0) return setError("يرجى اختيار نوع التصميم");

    setIsSubmitting(true);
    try {
      const attachments = await uploadDesignRequestFiles(files);
      const parsedStartDate = startDate ? new Date(startDate) : undefined;
      const res = await createDesignRequestByStaff({
        charityId,
        title,
        description,
        attachments,
        typeIds,
        startDate: parsedStartDate,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إضافة الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: "var(--dr-fs-title)" }}>
            طلب تصميم جديد
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
              الجمعية
            </label>
            <select
              value={charityId}
              onChange={(e) => setCharityId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none [&>option]:dark:bg-slate-800"
              style={{ fontSize: "var(--dr-fs-body)" }}
            >
              <option value="">اختر الجمعية...</option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              عنوان الطلب
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تصميم بوستر توعوي"
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              تاريخ ووقت بداية الطلب (اختياري - يترك فارغاً لاعتماد الوقت الحالي)
            </label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>

          <DesignTypePicker
            options={designTypes}
            selected={typeIds}
            onToggle={(id) =>
              setTypeIds((prev) =>
                prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
              )
            }
          />

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              تفاصيل إضافية (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              المرفقات
            </label>
            <label className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/40 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 transition-colors font-bold" style={{ fontSize: "var(--dr-fs-meta)" }}>
              <Paperclip className="w-4 h-4" />
              اختر الملفات...
              <input
                type="file"
                multiple
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-bold text-slate-700 dark:text-slate-200"
                    style={{ fontSize: "var(--dr-fs-meta)" }}
                  >
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-slate-400 dark:text-slate-500 hover:text-rose-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-11 px-6 flex items-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إضافة الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
