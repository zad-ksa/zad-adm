"use client";

import { useState } from "react";
import { Palette, Paperclip, Send, Trash2, X } from "lucide-react";
import { createDesignRequestFromPortal, resubmitDesignRequest } from "@/app/actions/designRequests";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { Dialog } from "@/components/console/Dialog";
import { Field, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import UploadProgress from "@/components/ui/UploadProgress";
import type { UploadProgress as Progress } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import { uploadDesignRequestFiles } from "@/components/design-requests/uploadDesignRequestFiles";
import DesignTypePicker, {

  type DesignTypeOption,
} from "@/components/design-requests/DesignTypePicker";

const DESIGN_MAX = maxBytesFor("design_request");
const DESIGN_MAX_LABEL = maxLabelFor("design_request");

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
  const [uploadProgress, setUploadProgress] = useState<Progress | null>(null);
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
        attachments = await uploadDesignRequestFiles(files, setUploadProgress);
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
          : "تم إرسال الطلب، وسيتم مراجعته خلال يوم عمل"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        size="lg"
        icon={<Palette className="size-5" />}
        title={isResubmit ? "إعادة رفع الطلب" : "طلب تصميم جديد"}
        description={isResubmit ? undefined : "يراجعه فريق زاد خلال يوم عمل، ثم يثبت موعد التسليم."}
        onClose={onClose}
        busy={isSubmitting}
        // نموذجٌ فيه كتابةٌ طويلةٌ ومرفقات: نقرةٌ طائشةٌ خارجَه لا تمحو ما كُتب.
        closeOnBackdrop={false}
        onSubmit={handleSubmit}
        footer={
          <button type="submit" disabled={isSubmitting} className={btn.primary}>
            {isSubmitting ? <Spinner tone="onPrimary" /> : <Send className="size-4" />}
            {isResubmit ? "إعادة رفع الطلب" : "إرسال الطلب"}
          </button>
        }
      >
        <div className="space-y-4">
          {/* Sets the expectation before submitting rather than after: the
              request now waits for a member of staff to confirm the timeline,
              so a charity that is not told this reads the silence as a fault. */}
          <Note tone="warn">
            <span className="font-semibold">سيراجع الطلب خلال يوم عمل.</span> بعد الاعتماد يثبت
            موعد التسليم ويأخذ الطلب دوره، وإن احتاج تعديلا ستجد ملاحظات فريق زاد في تبويب
            «المعادة للتعديل».
          </Note>

          {/* The reason it was turned down, kept in front of them while they fix
              it — it disappears from the record the moment this is resubmitted. */}
          {isResubmit && resubmit.rejectionReason && (
            <Note tone="danger">
              <span className="font-semibold">ملاحظات فريق زاد: </span>
              {resubmit.rejectionReason}
            </Note>
          )}

          <UploadProgress progress={uploadProgress} />

          {error && <Note tone="danger">{error}</Note>}

          <Field id="dr-title" label="عنوان الطلب">
            <input
              id="dr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تصميم بوستر توعوي"
              className={field}
            />
          </Field>

          <DesignTypePicker
            options={designTypes}
            selected={typeIds}
            onToggle={(id) =>
              setTypeIds((prev) =>
                prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
              )
            }
          />

          <Field id="dr-desc" label="تفاصيل إضافية (اختياري)">
            <textarea
              id="dr-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="اشرح ما تحتاج تصميمه بالتفصيل…"
              className={cx(field, "h-auto resize-none py-2")}
            />
          </Field>

          {isResubmit && resubmit.attachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-body font-medium text-slate-700 dark:text-slate-300">
                المرفقات السابقة
              </p>
              <ul className="space-y-1.5">
                {resubmit.attachments.map((att) => {
                  const isRemoved = removedAttachmentIds.includes(att.id);
                  return (
                    <li
                      key={att.id}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
                    >
                      <Paperclip aria-hidden className="size-3.5 shrink-0 text-slate-400" />
                      <span
                        className={cx(
                          "min-w-0 flex-1 truncate text-body",
                          isRemoved
                            ? "text-slate-400 line-through dark:text-slate-500"
                            : "text-slate-700 dark:text-slate-200"
                        )}
                      >
                        {att.fileName}
                      </span>
                      {/* والحذفُ يُنوى ولا يقع: يُطبَّق عند الإرسال، فالإلغاءُ
                          يُلغي حقّاً. */}
                      <button
                        type="button"
                        onClick={() =>
                          setRemovedAttachmentIds((prev) =>
                            isRemoved ? prev.filter((id) => id !== att.id) : [...prev, att.id]
                          )
                        }
                        className={isRemoved ? btn.ghost : btn.iconDanger}
                        title={isRemoved ? "تراجع عن الحذف" : "حذف عند الإرسال"}
                        aria-label={isRemoved ? "تراجع عن الحذف" : "حذف عند الإرسال"}
                      >
                        {isRemoved ? "تراجع" : <Trash2 className="size-3.5" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="space-y-1.5">
            {fileError && <Note tone="danger">{fileError}</Note>}
            <p className="text-body font-medium text-slate-700 dark:text-slate-300">المرفقات</p>
            <label
              className={cx(
                "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-body text-slate-500 transition-colors",
                "hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-400 dark:hover:text-teal-300"
              )}
            >
              <Paperclip aria-hidden className="size-4" />
              اختر الملفات…
              <input
                type="file"
                multiple
                accept={ACCEPT_ATTRIBUTE}
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  const tooBig = picked.filter((f) => f.size > DESIGN_MAX);
                  setFileError(
                    tooBig.length
                      ? "تجاوز الحد (" + DESIGN_MAX_LABEL + "): " + tooBig.map((f) => f.name).join("، ")
                      : null
                  );
                  setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= DESIGN_MAX)]);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-meta text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  >
                    <span className="max-w-[160px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={"إزالة " + f.name}
                      className="text-slate-400 transition-colors hover:text-red-500"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={isResubmit ? "إعادة رفع الطلب" : "إرسال الطلب"}
        message={
          isResubmit
            ? "سيعود الطلب إلى قائمة المراجعة لدى فريق زاد، وتُحذف الملاحظات السابقة. هل تريد المتابعة؟"
            : "سيُرسل الطلب إلى فريق زاد للمراجعة خلال يوم عمل. هل تريد المتابعة؟"
        }
        confirmLabel={isResubmit ? "إعادة الرفع" : "إرسال الطلب"}
        tone="primary"
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={runSubmit}
      />
    </>
  );
}
