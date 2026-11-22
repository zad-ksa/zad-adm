"use client";

import { Note, OptionRow } from "@/components/console/ui";

export type DesignTypeOption = { id: string; name: string; workingDays: number };

/**
 * Multi-select for design types, with the resulting duration shown as it
 * changes.
 *
 * The total is surfaced here rather than only after submitting because the
 * duration is the part the charity actually cares about — picking a second type
 * silently pushing the deadline out by a week is the kind of surprise that
 * makes a queue feel arbitrary. Days are summed; the server sums them again
 * from its own copy of the catalogue, so this display can never talk the
 * backend into a shorter promise.
 *
 * There is no default duration any more. A request has to name its type, so
 * until one is chosen there is no honest number to show and the panel says so
 * instead of quoting a figure the request may never get.
 */
/**
 * Wording rule for the execution queue, applied across all design-request UI:
 *
 *   "دور"           — one request's own slot   ("يأخذ الطلب دوره")
 *   "ترتيب التنفيذ" — the whole ordered set    ("إعادة ترتيب التنفيذ")
 *
 * They are not synonyms; they name the part and the whole. Neither reads well
 * in the other's sentences — "إعادة جدولة الدور" and "يدخل الطلب ترتيب
 * التنفيذ" are both wrong — which is exactly why the split holds.
 *
 * The English identifiers (queue, rescheduleCharityQueue) are left alone: they
 * are correct technical terms and no user reads them.
 */
export default function DesignTypePicker({
  options,
  selected,
  onToggle,
}: {
  options: DesignTypeOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const chosen = options.filter((o) => selected.includes(o.id));
  const totalDays = Math.max(1, chosen.reduce((sum, o) => sum + o.workingDays, 0));

  // Nothing to pick from means nobody can submit — say why, rather than
  // rendering an empty box the user will read as a broken form.
  if (options.length === 0) {
    return (
      <Note tone="warn">
        لم تضف أنواع التصاميم بعد، ولا يمكن رفع طلب قبل تحديد نوعه. يرجى التواصل مع فريق زاد.
      </Note>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-body font-medium text-slate-700 dark:text-slate-300">
        نوع التصميم <span className="text-red-500">*</span>
        <span className="ms-1 font-normal text-slate-400">— يمكن اختيار أكثر من نوع</span>
      </p>

      {/* وكلُّ نوعٍ يقول مدّته بجانبه: اختيارُ نوعٍ ثانٍ يزيد الموعد، فلا
          يُعرف ذلك بعد الإرسال. */}
      <div className="grid gap-1 sm:grid-cols-2">
        {options.map((option) => (
          <OptionRow
            key={option.id}
            label={option.name}
            checked={selected.includes(option.id)}
            count={option.workingDays}
            onToggle={() => onToggle(option.id)}
          />
        ))}
      </div>

      {chosen.length === 0 ? (
        <p className="text-meta text-slate-500 dark:text-slate-400">
          اختر نوع التصميم لتظهر مدة التنفيذ. والرقم بجانب كل نوع أيام عمله.
        </p>
      ) : (
        <Note tone="brand">
          مدة التنفيذ: {totalDays} {totalDays === 1 ? "يوم عمل" : "أيام عمل"} (الأحد – الخميس) من
          بداية دور الطلب.
        </Note>
      )}
    </div>
  );
}
