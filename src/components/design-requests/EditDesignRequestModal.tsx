"use client";

import { useState } from "react";
import { X, Paperclip, Loader2, AlertTriangle, Save, Trash2 } from "lucide-react";
import { updateDesignRequestDetails } from "@/app/actions/designRequests";
import { uploadDesignRequestFiles } from "./uploadDesignRequestFiles";

export type EditableRequest = {
  id: string;
  title: string;
  description: string | null;
  attachments: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
};

/**
 * Edits a pending request's brief — its description and its attachments.
 *
 * Used by both the charity portal and the Zad dashboard, because the rules are
 * the same on both sides; only the server decides who may call it.
 *
 * Removals are staged, not applied on click: a file is only detached when the
 * whole edit is saved. Deleting from Cloudinary the moment someone taps a bin
 * icon would make "cancel" a lie.
 */
export default function EditDesignRequestModal({
  request,
  onClose,
  onSuccess,
}: {
  request: EditableRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [description, setDescription] = useState(request.description ?? "");
  const [removed, setRemoved] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kept = request.attachments.filter((a) => !removed.includes(a.id));
  const totalAfter = kept.length + files.length;

  const descriptionChanged = description.trim() !== (request.description ?? "").trim();
  const hasChanges = descriptionChanged || removed.length > 0 || files.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (totalAfter > 10) return setError("الحد الأقصى 10 مرفقات لكل طلب");

    setIsSubmitting(true);
    try {
      // Uploaded only on save, so an abandoned edit leaves nothing behind.
      const uploaded = files.length ? await uploadDesignRequestFiles(files) : [];
      const res = await updateDesignRequestDetails({
        requestId: request.id,
        description: descriptionChanged ? description : undefined,
        removeAttachmentIds: removed,
        addAttachments: uploaded,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديل");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-[#0A0A0A] rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2
            className="font-bold text-slate-900 dark:text-slate-100 truncate"
            style={{ fontSize: "var(--dr-fs-title)" }}
          >
            تعديل: {request.title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p
            className="rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            التعديل لا يغيّر نوع التصميم ولا موعد التسليم ولا ترتيب الطلب في الطابور.
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

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              تفاصيل الطلب
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="اشرح ما تحتاج تصميمه بالتفصيل..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              المرفقات الحالية
            </label>

            {request.attachments.length === 0 ? (
              <p
                className="text-slate-400 dark:text-slate-600"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                لا توجد مرفقات.
              </p>
            ) : (
              <div className="space-y-1.5">
                {request.attachments.map((att) => {
                  const isRemoved = removed.includes(att.id);
                  return (
                    <div
                      key={att.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        isRemoved
                          ? "border-rose-200 dark:border-rose-900/40 bg-rose-500/[0.05]"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111]"
                      }`}
                      style={{ fontSize: "var(--dr-fs-meta)" }}
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex-1 truncate font-bold ${
                          isRemoved
                            ? "line-through text-rose-500 dark:text-rose-400"
                            : "text-slate-700 dark:text-slate-300 hover:text-primary"
                        }`}
                      >
                        {att.fileName}
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          setRemoved((prev) =>
                            isRemoved ? prev.filter((id) => id !== att.id) : [...prev, att.id]
                          )
                        }
                        className={`shrink-0 font-bold ${
                          isRemoved
                            ? "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            : "text-slate-400 hover:text-rose-500"
                        }`}
                        title={isRemoved ? "تراجع عن الحذف" : "حذف عند الحفظ"}
                      >
                        {isRemoved ? "تراجع" : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              إضافة مرفقات
              <span className="font-normal text-slate-400 mr-1">
                — {totalAfter} من 10
              </span>
            </label>
            <label
              className="flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/40 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 transition-colors font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
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
                {files.map((file, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/[0.06] text-primary dark:text-teal-300"
                    style={{ fontSize: "var(--dr-fs-eyebrow)" }}
                  >
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-primary/60 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges || totalAfter > 10}
            className="h-11 px-6 flex items-center gap-2 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--dr-shadow-cta)] hover:shadow-[var(--dr-shadow-cta-hover)] active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديل
          </button>
        </div>
      </div>
    </div>
  );
}
