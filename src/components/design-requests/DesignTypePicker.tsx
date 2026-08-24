"use client";

import { Check } from "lucide-react";

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
      <p
        className="rounded-xl bg-amber-500/[0.08] text-amber-700 dark:text-amber-400 px-4 py-3 font-bold"
        style={{ fontSize: "var(--dr-fs-meta)" }}
      >
        لم تُضَف أنواع التصاميم بعد، ولا يمكن رفع طلب قبل تحديد نوعه. يرجى التواصل مع فريق
        زاد.
      </p>
    );
  }

  return (
    <div>
      <label
        className="block font-bold text-slate-500 dark:text-slate-400 mb-2"
        style={{ fontSize: "var(--dr-fs-meta)" }}
      >
        نوع التصميم <span className="text-rose-500">*</span>
        <span className="font-normal text-slate-400 dark:text-slate-500 mr-1">
          — يمكن اختيار أكثر من نوع
        </span>
      </label>

      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={checked}
              style={{ fontSize: "var(--dr-fs-body)" }}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-right border transition-colors ${
                checked
                  ? "border-primary/40 bg-primary/[0.06] text-primary dark:text-teal-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary/30"
              }`}
            >
              <span
                className={`w-4 h-4 shrink-0 rounded flex items-center justify-center ${
                  checked
                    ? "bg-primary dark:bg-teal-400"
                    : "border border-slate-300 dark:border-slate-600"
                }`}
              >
                {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
              </span>
              <span className="truncate flex-1">{option.name}</span>
              <span
                className="shrink-0 text-slate-400 dark:text-slate-500 tabular-nums"
                style={{ fontSize: "var(--dr-fs-eyebrow)" }}
              >
                {option.workingDays} يوم
              </span>
            </button>
          );
        })}
      </div>

      {chosen.length === 0 ? (
        <p
          className="mt-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 px-4 py-3"
          style={{ fontSize: "var(--dr-fs-meta)" }}
        >
          اختر نوع التصميم لتظهر مدة التنفيذ.
        </p>
      ) : (
        <p
          className="mt-2 rounded-xl bg-primary/5 dark:bg-primary/10 text-primary dark:text-teal-300 px-4 py-3 font-bold"
          style={{ fontSize: "var(--dr-fs-meta)" }}
        >
          مدة التنفيذ: {totalDays} {totalDays === 1 ? "يوم عمل" : "أيام عمل"} (الأحد – الخميس)
          من بداية دور الطلب في الطابور
        </p>
      )}
    </div>
  );
}
