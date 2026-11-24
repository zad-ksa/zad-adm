"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { Note, Spinner, btn } from "@/components/console/ui";
import DocRequestFields, {
  docFieldsFrom,
  type DocFieldValues,
} from "@/components/doc-requests/DocRequestFields";
import type { DocRequestInput } from "@/lib/docRequests";

/**
 * نموذجُ طلب وثيقة مشروع عند الجمعية — إنشاءً وتعديلاً.
 *
 * **والإلزاميُّ واحد**: فكرةُ المبادرة. وما عداها يُحسّن الوثيقةَ ولا يَلزمها،
 * فالحقلُ الفارغ لا يمنع الإرسال — وطلبٌ بفكرةٍ وحدَها أحسنُ من لا طلب.
 *
 * **والحقولُ من `DocRequestFields`**: هي بعينها ما يراه موظّفُ زادٍ في نافذة
 * الإنشاء، فلا تفترق نسختان عند أوّل حقلٍ يُضاف.
 */
export default function DocRequestForm({
  title,
  initial,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: Partial<DocRequestInput>;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: DocRequestInput) => void;
}) {
  const [values, setValues] = useState<DocFieldValues>(() => docFieldsFrom(initial));
  const ready = values.programIdea.trim().length > 0;

  return (
    <Dialog
      size="lg"
      icon={<Send className="size-5" />}
      title={title}
      description="املأ ما تعرفه، والفكرة وحدها مطلوبة."
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      footer={
        <>
          {!ready && <span className="me-auto text-meta text-slate-400">اكتب فكرة المبادرة أولا</span>}
          <button type="submit" disabled={busy || !ready} className={btn.primary}>
            {busy ? <Spinner tone="onPrimary" /> : <Send className="size-4" />}
            إرسال الطلب
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Note tone="danger">{error}</Note>}
        <DocRequestFields values={values} onChange={setValues} idPrefix="dr" disabled={busy} />
      </div>
    </Dialog>
  );
}
