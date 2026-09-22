"use client";

import { useState } from "react";
import { Paperclip, Loader2, AlertTriangle, Save, Trash2 } from "lucide-react";
import { updateDesignRequestDetails } from "@/app/actions/designRequests";
import { uploadDesignRequestFiles } from "./uploadDesignRequestFiles";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import UploadProgress from "@/components/ui/UploadProgress";
import type { UploadProgress as Progress } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

const DESIGN_MAX = maxBytesFor("design_request");
const DESIGN_MAX_LABEL = maxLabelFor("design_request");

export type EditableRequest = {
  id: string;
  title: string;
  description: string | null;
  attachments: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
};

/**
 * Edits a pending request's brief — its name, description and attachments.
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
  onSuccess: (message: string) => void;
}) {
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description ?? "");
  const [removed, setRemoved] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Progress | null>(null);
  // Attachment problems render beside the picker rather than in the banner at
  // the top of the modal, which scrolls out of view.
  const [fileError, setFileError] = useState<string | null>(null);

  const kept = request.attachments.filter((a) => !removed.includes(a.id));
  const totalAfter = kept.length + files.length;

  const titleChanged = title.trim() !== request.title.trim();
  const descriptionChanged = description.trim() !== (request.description ?? "").trim();
  const hasChanges = titleChanged || descriptionChanged || removed.length > 0 || files.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFileError(null);
    if (totalAfter > 10) return setFileError("الحد الأقصى 10 مرفقات لكل طلب");
    setIsConfirmOpen(true);
  };

  const runSubmit = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    try {
      // Uploaded only on save, so an abandoned edit leaves nothing behind.
      let uploaded;
      try {
        uploaded = files.length ? await uploadDesignRequestFiles(files, setUploadProgress) : [];
      } catch (uploadErr) {
        setFileError(uploadErr instanceof Error ? uploadErr.message : "تعذّر رفع المرفقات");
        return;
      }
      const res = await updateDesignRequestDetails({
        requestId: request.id,
        title: titleChanged ? title : undefined,
        description: descriptionChanged ? description : undefined,
        removeAttachmentIds: removed,
        addAttachments: uploaded,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSuccess("تم حفظ التعديل");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حفظ التعديل");
    } finally {
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };

  return (
    <>
<Dialog
scopeClassName="design-requests-ui"
title={<>تعديل:  {request.title}</>}
onClose={onClose}
closeOnBackdrop={false}
onSubmit={handleSubmit}
footer={
<>
<button type="submit"
            onClick={onClose}
            className={btn.secondary}
            
          >
            إلغاء
          </button>
          <button type="button"
            
            disabled={isSubmitting || !hasChanges || totalAfter > 10}
            className={btn.primary}
            
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديل
          </button>
</>
}
>
<div className="space-y-4">
<p
            className="rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3"
            style={{ fontSize: "var(--dr-fs-meta)" }}
          >
            التعديل لا يغيّر نوع التصميم ولا موعد التسليم ولا دور الطلب في التنفيذ.
          </p>
<UploadProgress progress={uploadProgress} />
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
              اسم الطلب
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="مثال: تصميم هوية الحملة الشتوية"
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              style={{ fontSize: "var(--dr-fs-body)" }}
            />
          </div>
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
              className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
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
                accept={ACCEPT_ATTRIBUTE}
                onChange={(e) => {
                  const picked = Array.from(e.target.files || []);
                  const tooBig = picked.filter((f) => f.size > DESIGN_MAX);
                  setFileError(
                    tooBig.length
                      ? `تجاوز الحد (${DESIGN_MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`
                      : null
                  );
                  setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= DESIGN_MAX)]);
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
</div>
</Dialog>
<ConfirmDialog
        isOpen={isConfirmOpen}
        title="حفظ التعديل"
        message={
          removed.length > 0
            ? `سيتم حفظ التعديل وحذف ${removed.length} من المرفقات نهائياً. هل تريد المتابعة؟`
            : "سيتم حفظ التعديل على الطلب. هل تريد المتابعة؟"
        }
        confirmLabel="حفظ التعديل"
        tone="primary"
        isPending={isSubmitting}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={runSubmit}
      />
</>
  );
}
