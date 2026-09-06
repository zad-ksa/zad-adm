"use client";

import { useState } from "react";
import { X, Paperclip, Loader2, AlertTriangle, Trash2, Send, Plus } from "lucide-react";
import { requestDesignRevision } from "@/app/actions/designRequests";
import { uploadDesignRequestFiles } from "./uploadDesignRequestFiles";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import ConfirmModal from "@/components/ui/ConfirmModal";
import UploadProgress from "@/components/ui/UploadProgress";
import type { UploadProgress as Progress } from "@/lib/clientUpload";

const MAX_BYTES = maxBytesFor("design_request");
const MAX_LABEL = maxLabelFor("design_request");

/**
 * The charity sends a delivery back with notes — once.
 *
 * This is a re-brief, not a comment box: alongside the notes the charity can
 * drop attachments that no longer apply and add new ones, because "change this"
 * usually comes with a new reference file.
 *
 * The modal states plainly that this is the only round. After Zad delivers
 * again the request is approved outright, so a charity that saves half its
 * notes for "next time" would never get to give them.
 */
export default function RequestRevisionModal({
  requestId,
  title,
  attachments,
  onClose,
  onSuccess,
}: {
  requestId: string;
  title: string;
  attachments: { id: string; fileName: string }[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  // Three short notes rather than one long one: a numbered list of separate
  // points is easier to act on than a paragraph, and 180 characters keeps
  // each point to roughly what fits without scrolling. Starts with one field;
  // "إضافة ملاحظة أخرى" reveals the next, up to three, then hides itself.
  const [noteFields, setNoteFields] = useState<string[]>([""]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Progress | null>(null);

  const kept = attachments.filter((a) => !removed.includes(a.id));

  // Joined into one string for the server, which stores and shows it as a
  // single note — the three-field split is an input convenience, not a
  // structural change to what gets saved.
  const combinedNotes = noteFields.map((n) => n.trim()).filter(Boolean).join("\n\n");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFileError(null);
    if (combinedNotes.length < 5) return setError("يرجى كتابة ملاحظات التعديل (5 أحرف على الأقل)");
    if (kept.length + files.length > 10) return setFileError("الحد الأقصى 10 مرفقات لكل طلب");
    setIsConfirmOpen(true);
  };

  const runSubmit = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      let uploaded;
      try {
        uploaded = files.length ? await uploadDesignRequestFiles(files, setUploadProgress) : [];
      } catch (uploadErr) {
        setFileError(uploadErr instanceof Error ? uploadErr.message : "تعذّر رفع المرفقات");
        return;
      }

      const res = await requestDesignRevision({
        requestId,
        notes: combinedNotes,
        removeAttachmentIds: removed,
        addAttachments: uploaded,
      });
      if (res.error) return setError(res.error);
      onSuccess("تم إرسال الملاحظات، وأمام زاد 24 ساعة للتعديل");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الملاحظات");
    } finally {
      setUploadProgress(null);
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
          <h2
            className="font-bold text-slate-900 dark:text-slate-100 truncate"
            style={{ fontSize: "var(--dr-fs-title)" }}
          >
            ملاحظات على: {title}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <p
            className="rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold px-4 py-3 leading-relaxed"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            يمكنكم طلب حتى ثلاث تعديلات كحد أقصى، يجب أن تكون محددة وواضحة لنتمكن من
            تنفيذها.
          </p>

          <UploadProgress progress={uploadProgress} />

          {error && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {["الملاحظة الأولى", "الملاحظة الثانية", "الملاحظة الثالثة"].slice(0, noteFields.length).map((label, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className="block font-bold text-slate-500 dark:text-slate-400"
                    style={{ fontSize: "var(--dr-fs-meta)" }}
                  >
                    {label}
                  </label>
                  {/* At least one field must stay — there is no "no notes" state
                      for a revision request. */}
                  {noteFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNoteFields((prev) => prev.filter((_, idx) => idx !== i))}
                      title="حذف هذه الملاحظة"
                      className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <textarea
                  value={noteFields[i]}
                  onChange={(e) =>
                    setNoteFields((prev) => prev.map((v, idx) => (idx === i ? e.target.value.slice(0, 180) : v)))
                  }
                  rows={2}
                  maxLength={180}
                  placeholder={
                    i === 0
                      ? "اشرح التعديل المطلوب بالتفصيل..."
                      : "تعديل إضافي..."
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  style={{ fontSize: "var(--dr-fs-body)" }}
                />
              </div>
            ))}

            {/* Reveals the next field, up to three, then hides — there is no
                fourth note. */}
            {noteFields.length < 3 && (
              <button
                type="button"
                onClick={() => setNoteFields((prev) => [...prev, ""])}
                className="flex items-center gap-1.5 text-primary dark:text-teal-400 hover:underline font-bold"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة ملاحظة أخرى
              </button>
            )}
          </div>

          {attachments.length > 0 && (
            <div>
              <label
                className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                مرفقات الطلب الحالية
              </label>
              <div className="space-y-1.5">
                {attachments.map((att) => {
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
                      <span
                        className={`flex-1 truncate font-bold ${
                          isRemoved
                            ? "line-through text-rose-500 dark:text-rose-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRemoved((prev) =>
                            isRemoved ? prev.filter((id) => id !== att.id) : [...prev, att.id]
                          )
                        }
                        className={`shrink-0 font-bold ${
                          isRemoved ? "text-slate-500 hover:text-slate-700" : "text-slate-400 hover:text-rose-500"
                        }`}
                        title={isRemoved ? "تراجع عن الحذف" : "حذف عند الإرسال"}
                      >
                        {isRemoved ? "تراجع" : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            {fileError && (
              <div
                className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 font-bold"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{fileError}</span>
              </div>
            )}
            <label
              className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              إضافة مرفقات
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
                accept={ACCEPT_ATTRIBUTE}
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  const tooBig = picked.filter((f) => f.size > MAX_BYTES);
                  setFileError(
                    tooBig.length
                      ? `تجاوز الحد (${MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`
                      : null
                  );
                  setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_BYTES)]);
                  e.target.value = "";
                }}
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
            disabled={isSubmitting}
            className="h-11 px-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-11 px-6 flex items-center gap-2 text-white bg-amber-600 hover:bg-amber-700 active:translate-y-px rounded-xl font-bold transition-all disabled:opacity-50"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال الملاحظات
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="إرسال الملاحظات"
        message="سيعود الطلب إلى فريق زاد للتعديل خلال 24 ساعة، وبعد تسليمه يُعتمد نهائياً. التعديل متاح مرة واحدة فقط — هل تريد المتابعة؟"
        confirmLabel="إرسال الملاحظات"
        tone="primary"
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={runSubmit}
      />
    </div>
  );
}
