"use client";

// مرفقاتُ طلب الوثيقة: تُرفع لحظةَ اختيارها لا عند الإرسال، فالملفُّ المرفوضُ
// (حجماً أو نوعاً) يُقال عنه والجمعيةُ ما زالت في النافذة.

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { btn } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { uploadFile } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE } from "@/lib/uploadPurposes";
import { MAX_ATTACHMENTS, type DocAttachment } from "@/lib/docRequests";

export default function DocAttachmentsField({
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  onUploadingChange,
}: {
  value: DocAttachment[];
  onChange: (next: DocAttachment[]) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
  /** النافذةُ تمنع الإرسالَ ما دام ملفٌّ يُرفع. */
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const room = MAX_ATTACHMENTS - value.length;

  const pick = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, Math.max(0, room));
    if (!list.length) return;
    setUploading((n) => n + list.length);
    onUploadingChange?.(true);
    const added: DocAttachment[] = [];
    for (const file of list) {
      try {
        const up = await uploadFile(file, "doc_request_attachment");
        added.push({ url: up.url, name: file.name, size: file.size });
      } catch (e) {
        notify("error", `${file.name}: ${e instanceof Error && e.message ? e.message : "تعذر رفع الملف"}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    onUploadingChange?.(false);
    if (added.length) onChange([...value, ...added].slice(0, MAX_ATTACHMENTS));
  };

  return (
    <div className="space-y-2">
      <div className="text-body font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required ? (
          <span aria-hidden className="ms-0.5 text-rose-600">*</span>
        ) : (
          <span className="font-normal text-slate-400"> (اختياري)</span>
        )}
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((a) => (
            <li
              key={a.url}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-meta text-primary hover:underline"
              >
                {a.name}
              </a>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((x) => x.url !== a.url))}
                className={btn.icon}
                title="إزالة المرفق"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {room > 0 && (
        <button
          type="button"
          disabled={disabled || uploading > 0}
          onClick={() => inputRef.current?.click()}
          className={btn.secondary}
        >
          {uploading > 0 ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
          {uploading > 0 ? "جار الرفع…" : value.length ? "إضافة مرفق آخر" : "إرفاق ملف"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
