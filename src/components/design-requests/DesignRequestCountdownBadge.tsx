"use client";

import { cx } from "@/components/console/ui";
import type { DesignRequestProgress } from "@/lib/designRequestProgress";

/**
 * ما بقي على التسليم — شارةٌ تُقرأ بلمحة.
 *
 * **وهي ليست `Badge` من العدّة**: تلك تقول حالاً، وهذه تقول وقتاً، والأسودُ
 * فيها ليس في ألوان العدّة ولا ينبغي أن يكون — موضعٌ واحدٌ في الموقع يحتاج
 * أن يوقف العين: موعدٌ مضى.
 *
 * **واللونُ ثلاثةٌ لا أكثر**: أخضرُ لما في وقته، وأسودُ لما تأخّر، ورماديٌّ
 * لما لا موعدَ له. وكان لكلٍّ ظلٌّ ملوَّنٌ من متغيّراتٍ خاصّةٍ بالقسم
 * (`--dr-shadow-*`) — وظلٌّ ملوَّنٌ ليس في لوحة الموقع.
 */
const TONE: Record<DesignRequestProgress["color"], string> = {
  green:
    "border-emerald-600/15 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  // مملوءةٌ لا مظلَّلة: هي الحالُ الوحيدةُ التي يجب أن تُوقف العين. وفي
  // الوضع الداكن يغرق الأسودُ في البطاقة، فيُحمل الثقلُ على حلقةٍ فاتحة.
  black: "border-slate-900/20 bg-slate-900 text-white dark:border-white/30 dark:bg-black",
  neutral:
    "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
};

export default function DesignRequestCountdownBadge({ progress }: { progress: DesignRequestProgress }) {
  return (
    <span
      className={cx(
        "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-meta font-medium",
        TONE[progress.color]
      )}
    >
      {progress.label}
    </span>
  );
}
