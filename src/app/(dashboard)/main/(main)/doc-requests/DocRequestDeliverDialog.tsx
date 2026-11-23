"use client";

import { useState } from "react";
import { FileDown, Paperclip, Upload, X } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { Field, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import UploadProgress from "@/components/ui/UploadProgress";
import { uploadFiles, type UploadProgress as Progress } from "@/lib/clientUpload";
import { buildProjectDocx } from "@/lib/exportProjectDocx";
import { loadLetterhead } from "../project-builder/DocPreview";
import type { StaffDocRequest } from "./DocRequestsStaffClient";

/**
 * إنهاءُ الطلب: الملفُّ النهائيُّ إلى الجمعية للمراجعة والتعميد.
 *
 * **وطريقان لا واحد**: الوثيقةُ المنشأةُ تُبنى ملفَّ Word على كليشة الجمعية
 * بضغطة، ومن عدّلها في Word خارج النظام يرفع ملفَّه. والأوّلُ هو الغالب،
 * والثاني هو الذي لا يُستغنى عنه — فمن بنى الأوّلَ وحدَه أجبر الموظّفَ على
 * إرسال وثيقةٍ لم يراجعها أحد.
 */
export default function DocRequestDeliverDialog({
  request,
  onClose,
  onDone,
}: {
  request: StaffDocRequest;
  onClose: () => void;
  onDone: (
    file: { fileUrl: string; fileName: string; fileSize: number | null },
    note: string | null
  ) => void;
}) {
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<File | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const fileNameOf = () =>
    `${(request.programName || "وثيقة مشروع").replace(/[\\/:*?"<>|]/g, "")} — ${request.charityName}.docx`;

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      let toUpload: File;
      if (picked) {
        toUpload = picked;
      } else {
        if (!request.docContent?.trim()) {
          setError("لا وثيقة منشأة — أنشئها أولا أو ارفع ملفا.");
          return;
        }
        const letterhead = await loadLetterhead(request.charityId);
        const blob = await buildProjectDocx(request.docContent, letterhead);
        toUpload = new File([blob], fileNameOf(), {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
      }

      const [uploaded] = await uploadFiles([toUpload], "doc_request_file", setProgress);
      if (!uploaded) {
        setError("تعذر رفع الملف");
        return;
      }
      onDone(
        { fileUrl: uploaded.url, fileName: uploaded.name, fileSize: uploaded.size ?? null },
        note.trim() || null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسليم الطلب");
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  return (
    <Dialog
      size="lg"
      icon={<Upload className="size-5" />}
      title="إنهاء الطلب وتسليمه"
      description={`${request.charityName} — يصل الملف للمراجعة والتعميد.`}
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      footer={
        <button type="button" onClick={send} disabled={busy} className={btn.primary}>
          {busy ? <Spinner tone="onPrimary" /> : <Upload className="size-4" />}
          تسليم للجمعية
        </button>
      }
    >
      <div className="space-y-4">
        {error && <Note tone="danger">{error}</Note>}
        <UploadProgress progress={progress} />

        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className="flex items-center gap-2 text-body font-medium text-slate-700 dark:text-slate-300">
            <FileDown aria-hidden className="size-4 text-slate-400" />
            {picked ? "سيرسل الملف الذي اخترته" : "سترسل الوثيقة المنشأة ملف Word على كليشة الجمعية"}
          </p>

          {picked ? (
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <Paperclip aria-hidden className="size-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-body text-slate-700 dark:text-slate-200">
                {picked.name}
              </span>
              <button
                type="button"
                onClick={() => setPicked(null)}
                aria-label="إزالة الملف"
                className={btn.icon}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label
              className={cx(
                "flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 text-body text-slate-500 transition-colors",
                "hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-400 dark:hover:text-teal-300"
              )}
            >
              <Paperclip aria-hidden className="size-4" />
              أو ارفع ملفا عدلته بنفسك
              <input
                type="file"
                accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  setPicked(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        <Field id="dr-delivery-note" label="ملاحظة مع التسليم (اختياري)">
          <textarea
            id="dr-delivery-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="ما تحب أن تقرأه الجمعية قبل التعميد"
            className={cx(field, "h-auto resize-y py-2")}
          />
        </Field>
      </div>
    </Dialog>
  );
}
