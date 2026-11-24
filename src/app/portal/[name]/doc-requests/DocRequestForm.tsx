"use client";

import { useState } from "react";
import { FileSearch, Send } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { Field, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import DocRequestFields, {
  docFieldsFrom,
  type DocFieldValues,
} from "@/components/doc-requests/DocRequestFields";
import DocAttachmentsField from "@/components/doc-requests/DocAttachmentsField";
import {
  MAX_NOTE,
  docAttachmentsOf,
  type DocAttachment,
  type DocRequestInput,
  type DocRequestKind,
} from "@/lib/docRequests";

/**
 * نموذجُ طلب وثيقة مشروع عند الجمعية — إنشاءً وتعديلاً، ولنوعَي الطلب.
 *
 * **طلبُ الإنشاء إلزاميُّه واحد**: فكرةُ المبادرة. وما عداها — والمرفقُ في
 * آخره — يُحسّن الوثيقةَ ولا يَلزمها، فطلبٌ بفكرةٍ وحدَها أحسنُ من لا طلب.
 *
 * **وطلبُ المراجعة إلزاميُّه المرفق**: الوثيقةُ موضوعُه، والملاحظاتُ اختياريّة.
 *
 * **والحقولُ من `DocRequestFields`**: هي بعينها ما يراه موظّفُ زادٍ في نافذة
 * الإنشاء، فلا تفترق نسختان عند أوّل حقلٍ يُضاف.
 */
export default function DocRequestForm({
  kind,
  title,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  kind: DocRequestKind;
  title: string;
  initial?: Partial<DocRequestInput>;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: DocRequestInput) => void;
}) {
  const [values, setValues] = useState<DocFieldValues>(() => docFieldsFrom(initial));
  const [attachments, setAttachments] = useState<DocAttachment[]>(() => docAttachmentsOf(initial?.attachments));
  const [uploading, setUploading] = useState(false);

  const review = kind === "REVIEW";
  const missing = review
    ? attachments.length === 0 ? "أرفق الوثيقة المراد مراجعتها" : null
    : values.programIdea.trim() ? null : "اكتب فكرة المبادرة أولا";
  const ready = !missing && !uploading;

  return (
    <Dialog
      size="lg"
      icon={review ? <FileSearch className="size-5" /> : <Send className="size-5" />}
      title={title}
      onClose={onClose}
      busy={busy || uploading}
      closeOnBackdrop={false}
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSubmit(review ? { kind, attachments, note: values.note } : { ...values, kind, attachments });
      }}
      footer={
        <>
          {missing && <span className="me-auto text-meta text-slate-400">{missing}</span>}
          <button type="submit" disabled={busy || !ready} className={btn.primary}>
            {busy ? <Spinner tone="onPrimary" /> : <Send className="size-4" />}
            إرسال الطلب
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Note tone="danger">{error}</Note>}

        {review ? (
          <>
            <DocAttachmentsField
              label="الوثيقة المراد مراجعتها"
              required
              value={attachments}
              onChange={setAttachments}
              onUploadingChange={setUploading}
              disabled={busy}
            />
            <Field id="dr-review-note" label="ملاحظات (اختياري)">
              <textarea
                id="dr-review-note"
                value={values.note}
                onChange={(e) => setValues({ ...values, note: e.target.value.slice(0, MAX_NOTE) })}
                rows={4}
                disabled={busy}
                className={cx(field, "h-auto resize-y py-2")}
              />
            </Field>
          </>
        ) : (
          <>
            <DocRequestFields values={values} onChange={setValues} idPrefix="dr" disabled={busy} />
            <DocAttachmentsField
              label="مرفقات"
              value={attachments}
              onChange={setAttachments}
              onUploadingChange={setUploading}
              disabled={busy}
            />
          </>
        )}
      </div>
    </Dialog>
  );
}
