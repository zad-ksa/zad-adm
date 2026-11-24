"use client";

import { Wallet } from "lucide-react";
import DateField from "@/components/console/DateField";
import { Field, btn, cx, field } from "@/components/console/ui";
import { MAX_IDEA, MAX_NOTE, type DocRequestInput } from "@/lib/docRequests";

export type DocFieldValues = {
  programName: string;
  programIdea: string;
  beneficiariesCount: string;
  programDuration: string;
  targetCategory: string;
  startDate: string;
  endDate: string;
  budgetInclude: boolean;
  budgetTotal: string;
  note: string;
};

export const EMPTY_DOC_FIELDS: DocFieldValues = {
  programName: "",
  programIdea: "",
  beneficiariesCount: "",
  programDuration: "",
  targetCategory: "",
  startDate: "",
  endDate: "",
  budgetInclude: false,
  budgetTotal: "",
  note: "",
};

/** قيمُ الطلب كما جاءت من القاعدة — تُملأ بها الحقول في الشاشتين. */
export function docFieldsFrom(source: Partial<DocRequestInput> | null | undefined): DocFieldValues {
  return {
    programName: source?.programName ?? "",
    programIdea: source?.programIdea ?? "",
    beneficiariesCount: source?.beneficiariesCount ?? "",
    programDuration: source?.programDuration ?? "",
    targetCategory: source?.targetCategory ?? "",
    startDate: source?.startDate ?? "",
    endDate: source?.endDate ?? "",
    budgetInclude: source?.budgetInclude ?? false,
    budgetTotal: source?.budgetTotal ?? "",
    note: source?.note ?? "",
  };
}

/**
 * حقولُ طلب وثيقة المشروع — واحدةٌ لشاشتين.
 *
 * **والجمعيةُ تكتبها ابتداءً، وموظّفُ زادٍ يحرّرها قبل الإنشاء**: فما أرسلته
 * قد ينقص أو يُكتب على عجل، والموظّفُ أعلمُ بما يحتاجه المنشئ. فلو كانت
 * نسختين لافترقتا عند أوّل حقلٍ يُضاف.
 *
 * **و`idPrefix` لازم**: الشاشتان قد تُرسمان معاً، ومعرّفان متكرّران يجعلان
 * التسميةَ تؤشّر إلى حقلٍ غير حقلها.
 */
export default function DocRequestFields({
  values,
  onChange,
  idPrefix,
  /** سطرٌ صغيرٌ تحت الحقل يقول ما أرسلته الجمعية حين يحرّره الموظّف. */
  original,
  disabled = false,
  showNote = true,
}: {
  values: DocFieldValues;
  onChange: (next: DocFieldValues) => void;
  idPrefix: string;
  original?: DocFieldValues;
  disabled?: boolean;
  showNote?: boolean;
}) {
  const set = <K extends keyof DocFieldValues>(key: K, value: DocFieldValues[K]) =>
    onChange({ ...values, [key]: value });

  /** ما أرسلته الجمعيةُ إن خالفَ المكتوبَ الآن — وإلّا فلا سطر. */
  const was = (key: keyof DocFieldValues): string | undefined => {
    if (!original) return undefined;
    const before = original[key];
    if (typeof before !== "string" || before === values[key]) return undefined;
    return before.trim() ? `أرسلت الجمعية: ${before}` : "أرسلته الجمعية فارغا";
  };

  return (
    <div className="space-y-4">
      <Field
        id={`${idPrefix}-name`}
        label="اسم المبادرة (اختياري)"
        hint={was("programName") ?? "اتركه فارغا ليقترح اسما."}
      >
        <input
          id={`${idPrefix}-name`}
          value={values.programName}
          onChange={(e) => set("programName", e.target.value)}
          placeholder="مثال: مبادرة سقيا الماء"
          disabled={disabled}
          className={field}
        />
      </Field>

      <Field id={`${idPrefix}-idea`} label="فكرة المبادرة أو البرنامج" hint={was("programIdea")}>
        <textarea
          id={`${idPrefix}-idea`}
          value={values.programIdea}
          onChange={(e) => set("programIdea", e.target.value.slice(0, MAX_IDEA))}
          rows={5}
          placeholder="اشرح الفكرة: ما المشكلة التي تعالجها، وما الذي سينفذ…"
          disabled={disabled}
          className={cx(field, "h-auto resize-y py-2")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-benef`}
          label="عدد المستفيدين (اختياري)"
          hint={was("beneficiariesCount")}
        >
          <input
            id={`${idPrefix}-benef`}
            value={values.beneficiariesCount}
            onChange={(e) => set("beneficiariesCount", e.target.value)}
            placeholder="مثال: 500 مستفيد"
            disabled={disabled}
            className={field}
          />
        </Field>

        <Field
          id={`${idPrefix}-duration`}
          label="مدة البرنامج (اختياري)"
          hint={was("programDuration")}
        >
          <input
            id={`${idPrefix}-duration`}
            value={values.programDuration}
            onChange={(e) => set("programDuration", e.target.value)}
            placeholder="مثال: ثلاثة أشهر"
            disabled={disabled}
            className={field}
          />
        </Field>
      </div>

      <Field id={`${idPrefix}-target`} label="الفئة المستهدفة (اختياري)" hint={was("targetCategory")}>
        <input
          id={`${idPrefix}-target`}
          value={values.targetCategory}
          onChange={(e) => set("targetCategory", e.target.value)}
          placeholder="مثال: الأسر المتعففة في المنطقة"
          disabled={disabled}
          className={field}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-start`} label="تاريخ البداية (اختياري)" hint={was("startDate")}>
          <DateField
            id={`${idPrefix}-start`}
            value={values.startDate}
            onChange={(v) => set("startDate", v)}
            disabled={disabled}
          />
        </Field>
        <Field id={`${idPrefix}-end`} label="تاريخ النهاية (اختياري)" hint={was("endDate")}>
          <DateField
            id={`${idPrefix}-end`}
            value={values.endDate}
            onChange={(v) => set("endDate", v)}
            disabled={disabled}
          />
        </Field>
      </div>

      {/* والميزانيةُ قرارٌ لا حقلٌ دائم: من لا ميزانيةَ له لا يُسأل عن رقم. */}
      <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => set("budgetInclude", !values.budgetInclude)}
          aria-pressed={values.budgetInclude}
          disabled={disabled}
          className={values.budgetInclude ? btn.primary : btn.secondary}
        >
          <Wallet className="size-4" />
          {values.budgetInclude ? "الميزانية مضمنة" : "تضمين ميزانية في المشروع"}
        </button>

        {values.budgetInclude ? (
          <Field
            id={`${idPrefix}-budget`}
            label="الميزانية التقديرية (اختياري)"
            hint={was("budgetTotal") ?? "اتركها فارغة لتقدر في الوثيقة."}
          >
            <input
              id={`${idPrefix}-budget`}
              value={values.budgetTotal}
              onChange={(e) => set("budgetTotal", e.target.value)}
              placeholder="مثال: 150000 ريال"
              disabled={disabled}
              className={field}
            />
          </Field>
        ) : (
          <p className="text-meta text-slate-500 dark:text-slate-400">
            بلا ميزانية لن يتضمن المشروع بند التكاليف.
          </p>
        )}
      </div>

      {showNote && (
        <Field id={`${idPrefix}-note`} label="ملاحظات (اختياري)" hint={was("note")}>
          <textarea
            id={`${idPrefix}-note`}
            value={values.note}
            onChange={(e) => set("note", e.target.value.slice(0, MAX_NOTE))}
            rows={3}
            placeholder="أي شيء يراعى عند الكتابة"
            disabled={disabled}
            className={cx(field, "h-auto resize-y py-2")}
          />
        </Field>
      )}
    </div>
  );
}
