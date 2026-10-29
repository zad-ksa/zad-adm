"use client";

import { Check } from "lucide-react";
import { cx } from "./ui";

/**
 * مسارُ أقسامٍ لنموذجٍ على صفحات.
 *
 * و`Tabs` لا تصلح له: التبويباتُ تنقل إلى أي تبويبٍ في أي وقت، وأقسامُ النموذج
 * مرتَّبةٌ يُشترط في اللاحق ما قبله. فالمسارُ يقول أين أنت وكم بقي، ويسمح
 * بالرجوع إلى ما تمّ لا بالقفز إلى ما لم يُبدأ.
 *
 * وعلى الشاشة الصغيرة يصير سطراً ورقمين وشريطَ تقدّم: عشرُ دوائرَ في عرض
 * الهاتف لا تُقرأ.
 */
export function StepTrail({
  steps,
  current,
  onJump,
}: {
  steps: string[];
  /** رقمُ القسم الحالي من صفر. */
  current: number;
  /** الرجوعُ إلى قسمٍ سابق — بلا هذه لا يُنقر المسار. */
  onJump?: (index: number) => void;
}) {
  const percent = Math.round(((current + 1) / steps.length) * 100);

  return (
    <nav aria-label="أقسام النموذج" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body font-medium text-slate-900 dark:text-slate-100">
          {steps[current]}
        </p>
        <p className="shrink-0 text-meta tabular-nums text-slate-500 dark:text-slate-400">
          القسم {current + 1} من {steps.length}
        </p>
      </div>

      {/* الشريطُ لكل المقاسات: هو ما يُقرأ بلمحةٍ أسرعَ من عدّ الدوائر. */}
      <div className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 dark:bg-teal-400"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="hidden flex-wrap items-center gap-1.5 sm:flex">
        {steps.map((step, i) => {
          const done = i < current;
          const here = i === current;
          const reachable = done && !!onJump;
          return (
            <li key={step}>
              <button
                type="button"
                onClick={reachable ? () => onJump(i) : undefined}
                disabled={!reachable}
                aria-current={here ? "step" : undefined}
                title={step}
                className={cx(
                  "grid size-7 place-items-center rounded-full border text-meta font-medium tabular-nums transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  here
                    ? "border-primary bg-primary text-white dark:border-teal-400 dark:bg-teal-400 dark:text-[#0A0A0A]"
                    : done
                      ? "border-primary/30 bg-primary/10 text-primary dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300"
                      : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500",
                  reachable && "cursor-pointer hover:bg-primary/20"
                )}
              >
                {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                <span className="sr-only">{step}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
