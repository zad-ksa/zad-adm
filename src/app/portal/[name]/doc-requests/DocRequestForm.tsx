"use client";

import { useState } from "react";
import { Send, Wallet } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import DateField from "@/components/console/DateField";
import { Field, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { MAX_IDEA, MAX_NOTE, type DocRequestInput } from "@/lib/docRequests";

/**
 * نموذجُ طلب وثيقة مشروع — إنشاءً وتعديلاً.
 *
 * **والإلزاميُّ واحد**: فكرةُ المبادرة. وما عداها يُحسّن الوثيقةَ ولا يَلزمها،
 * فالحقلُ الفارغ لا يمنع الإرسال — وطلبٌ بفكرةٍ وحدَها أحسنُ من لا طلب.
 *
 * **والميزانيةُ تُضمَّن بقرار**: زرٌّ يُفتح به حقلُ المبلغ، فمن لا ميزانيةَ له
 * لا يُسأل عن رقم. وإطفاؤه ينسى المبلغَ ولا يحفظه معلَّقاً.
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
  const [programName, setProgramName] = useState(initial?.programName ?? "");
  const [programIdea, setProgramIdea] = useState(initial?.programIdea ?? "");
  const [beneficiariesCount, setBeneficiaries] = useState(initial?.beneficiariesCount ?? "");
  const [programDuration, setDuration] = useState(initial?.programDuration ?? "");
  const [targetCategory, setTarget] = useState(initial?.targetCategory ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [budgetInclude, setBudgetInclude] = useState(initial?.budgetInclude ?? false);
  const [budgetTotal, setBudgetTotal] = useState(initial?.budgetTotal ?? "");
  const [note, setNote] = useState(initial?.note ?? "");

  const ready = programIdea.trim().length > 0;

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
        onSubmit({
          programName,
          programIdea,
          beneficiariesCount,
          programDuration,
          targetCategory,
          startDate,
          endDate,
          budgetInclude,
          budgetTotal,
          note,
        });
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

        <Field id="dr-name" label="اسم المبادرة (اختياري)" hint="اتركه فارغا ليقترح فريق زاد اسما.">
          <input
            id="dr-name"
            value={programName ?? ""}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="مثال: مبادرة سقيا الماء"
            className={field}
          />
        </Field>

        <Field id="dr-idea" label="فكرة المبادرة أو البرنامج">
          <textarea
            id="dr-idea"
            value={programIdea ?? ""}
            onChange={(e) => setProgramIdea(e.target.value.slice(0, MAX_IDEA))}
            rows={5}
            placeholder="اشرح الفكرة: ما المشكلة التي تعالجها، وما الذي سينفذ…"
            className={cx(field, "h-auto resize-y py-2")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dr-benef" label="عدد المستفيدين (اختياري)">
            <input
              id="dr-benef"
              value={beneficiariesCount ?? ""}
              onChange={(e) => setBeneficiaries(e.target.value)}
              placeholder="مثال: 500 مستفيد"
              className={field}
            />
          </Field>

          <Field id="dr-duration" label="مدة البرنامج (اختياري)">
            <input
              id="dr-duration"
              value={programDuration ?? ""}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="مثال: ثلاثة أشهر"
              className={field}
            />
          </Field>
        </div>

        <Field id="dr-target" label="الفئة المستهدفة (اختياري)">
          <input
            id="dr-target"
            value={targetCategory ?? ""}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="مثال: الأسر المتعففة في المنطقة"
            className={field}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dr-start" label="تاريخ البداية (اختياري)">
            <DateField value={startDate ?? ""} onChange={setStartDate} />
          </Field>
          <Field id="dr-end" label="تاريخ النهاية (اختياري)">
            <DateField value={endDate ?? ""} onChange={setEndDate} />
          </Field>
        </div>

        {/* والميزانيةُ قرارٌ لا حقلٌ دائم: من لا ميزانيةَ له لا يُسأل عن رقم. */}
        <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setBudgetInclude((v) => !v)}
            aria-pressed={budgetInclude}
            className={budgetInclude ? btn.primary : btn.secondary}
          >
            <Wallet className="size-4" />
            {budgetInclude ? "الميزانية مضمنة" : "تضمين ميزانية في المشروع"}
          </button>

          {budgetInclude ? (
            <Field id="dr-budget" label="الميزانية التقديرية (اختياري)" hint="اتركها فارغة ليقدرها فريق زاد.">
              <input
                id="dr-budget"
                value={budgetTotal ?? ""}
                onChange={(e) => setBudgetTotal(e.target.value)}
                placeholder="مثال: 150000 ريال"
                className={field}
              />
            </Field>
          ) : (
            <p className="text-meta text-slate-500 dark:text-slate-400">
              بلا ميزانية لن يتضمن المشروع بند التكاليف.
            </p>
          )}
        </div>

        <Field id="dr-note" label="ملاحظات (اختياري)">
          <textarea
            id="dr-note"
            value={note ?? ""}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            rows={3}
            placeholder="أي شيء تريد أن يراعيه فريق زاد"
            className={cx(field, "h-auto resize-y py-2")}
          />
        </Field>
      </div>
    </Dialog>
  );
}
