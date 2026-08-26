"use client";

import { useState } from "react";
import { X, Paperclip, Send, Loader2, AlertTriangle, Info, Trash2 } from "lucide-react";
import { createDesignRequestFromPortal, resubmitDesignRequest } from "@/app/actions/designRequests";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { ACCEPT_ATTRIBUTE, DESIGN_MAX_BYTES } from "@/lib/uploadLimits";
import { uploadDesignRequestFiles } from "@/components/design-requests/uploadDesignRequestFiles";
import DesignTypePicker, {
  type DesignTypeOption,
} from "@/components/design-requests/DesignTypePicker";

/** A rejected request being sent back for review, prefilled into this form. */
export type ResubmitTarget = {
  id: string;
  title: string;
  description: string | null;
  typeIds: string[];
  rejectionReason?: string | null;
  attachments: { id: string; fileName: string }[];
};

export default function NewDesignRequestForm({
  charityId,
  designTypes,
  resubmit,
  onClose,
  onSuccess,
}: {
  charityId: string;
  designTypes: DesignTypeOption[];
  /** When present the form edits and resubmits that request instead of creating one. */
  resubmit?: ResubmitTarget;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const isResubmit = !!resubmit;

  const [title, setTitle] = useState(resubmit?.title ?? "");
  const [description, setDescription] = useState(resubmit?.description ?? "");
  const [files, setFiles] = useState<File[]>([]);
  // Attachments already stored on the rejected request. Removal is staged and
  // only applied on submit, so cancelling really cancels.
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // Attachment problems get their own slot next to the file picker; the shared
  // `error` banner sits at the top of the form, out of view once the user has
  // scrolled down to attach something.
  const [fileError, setFileError] = useState<string | null>(null);
  const [typeIds, setTypeIds] = useState<string[]>(resubmit?.typeIds ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keptAttachments = (resubmit?.attachments ?? []).filter(
    (a) => !removedAttachmentIds.includes(a.id)
  );

  // Validation runs before the confirmation, so the dialog never asks about a
  // submission that was going to be refused anyway.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFileError(null);

    if (!title.trim()) return setError("يرجى إدخال عنوان الطلب");
    if (typeIds.length === 0) return setError("يرجى اختيار نوع التصميم");
    if (keptAttachments.length + files.length > 10) {
      return setFileError("الحد الأقصى 10 مرفقات لكل طلب");
    }

    setIsConfirmOpen(true);
  };

  const runSubmit = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      let attachments;
      try {
        attachments = await uploadDesignRequestFiles(files);
      } catch (uploadErr) {
        setFileError(uploadErr instanceof Error ? uploadErr.message : "تعذّر رفع المرفقات");
        return;
      }

      const res = isResubmit
        ? await resubmitDesignRequest({
            requestId: resubmit.id,
            title,
            description,
            typeIds,
            removeAttachmentIds: removedAttachmentIds,
            addAttachments: attachments,
          })
        : await createDesignRequestFromPortal({
            charityId,
            title,
            description,
            attachments,
            typeIds,
          });

      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess(
        isResubmit
          ? "تم إعادة رفع الطلب، وهو الآن قيد المراجعة"
          : "تم إرسال الطلب، وسيتم مراجعته خلال 24 ساعة"
      );
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-[#0A0A0A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h2 className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize: "var(--dr-fs-title)" }}>
            {isResubmit ? "إعادة رفع الطلب" : "طلب تصميم جديد"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Sets the expectation before submitting rather than after: the
              request now waits for a member of staff to confirm the timeline,
              so a charity that is not told this reads the silence as a fault. */}
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 leading-relaxed"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <span>
              <span className="font-bold">سيتم مراجعة الطلب خلال 24 ساعة.</span>{" "}
              بعد الاعتماد يُثبَّت موعد التسليم ويدخل الطلب الطابور، وإن لم يُقبل ستجد سبب الرفض في تبويب «المرفوضة».
            </span>
          </div>

          {/* The reason it was turned down, kept in front of them while they fix
              it — it disappears from the record the moment this is resubmitted. */}
          {isResubmit && resubmit.rejectionReason && (
            <div
              className="px-4 py-3 rounded-xl bg-rose-500/[0.06] text-rose-600 dark:text-rose-400 leading-relaxed"
              style={{ fontSize: "var(--dr-fs-meta)" }}
            >
              <span className="font-bold">سبب الرفض السابق: </span>
              {resubmit.rejectionReason}
            </div>
          )}

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
              عنوان الطلب
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تصميم بوستر توعوي"
              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
              placeholder="اشرح ما تحتاج تصميمه بالتفصيل..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>

          {isResubmit && resubmit.attachments.length > 0 && (
            <div>
              <label
                className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
                style={{ fontSize: "var(--dr-fs-meta)" }}
              >
                المرفقات السابقة
              </label>
              <div className="space-y-1.5">
                {resubmit.attachments.map((att) => {
                  const isRemoved = removedAttachmentIds.includes(att.id);
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
                          setRemovedAttachmentIds((prev) =>
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
              المرفقات
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
                  const tooBig = picked.filter((f) => f.size > DESIGN_MAX_BYTES);
                  setFileError(
                    tooBig.length
                      ? `تجاوز الحد (100 ميجابايت): ${tooBig.map((f) => f.name).join("، ")}`
                      : null
                  );
                  setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= DESIGN_MAX_BYTES)]);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg font-bold text-slate-700 dark:text-slate-200"
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
            {isResubmit ? "إعادة رفع الطلب" : "إرسال الطلب"}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title={isResubmit ? "إعادة رفع الطلب" : "إرسال الطلب"}
        message={
          isResubmit
            ? "سيعود الطلب إلى قائمة المراجعة لدى فريق زاد، ويُحذف سبب الرفض السابق. هل تريد المتابعة؟"
            : "سيُرسل الطلب إلى فريق زاد للمراجعة خلال 24 ساعة. هل تريد المتابعة؟"
        }
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={runSubmit}
      />
    </div>
  );
}
