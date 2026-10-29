"use client";

import { useId } from "react";
import { Star } from "lucide-react";
import { cx } from "./ui";

/**
 * تقييمٌ بالنجوم من ١ إلى ٥.
 *
 * وهو مجموعةُ أزرارِ اختيارٍ لا صفٌّ من أيقونات: من يتنقّل بلوحة المفاتيح
 * يصل إليه بـTab ويختار بالأسهم، ومن يقرأ بقارئ شاشةٍ يسمع «٤ من ٥: موافق».
 * وصفُّ أيقوناتٍ تُنقر يبدو مثلَه ولا يُستعمل إلا بالفأرة.
 *
 * واللونُ الذهبيُّ هنا قيمةٌ لا زينة: النجمةُ الممتلئة تقول درجةً، والفارغةُ
 * تقول ما لم يُختر.
 */
const SIZE = { sm: "size-5", md: "size-7" } as const;

export function StarRating({
  value,
  onChange,
  label,
  labels,
  max = 5,
  size = "md",
  disabled = false,
}: {
  value: number | null;
  onChange: (value: number) => void;
  /** اسمُ العبارة المُقيَّمة — لقارئ الشاشة. */
  label: string;
  /** تسميةُ كل درجة: `labels[5] = "موافق بشدة"`. */
  labels?: Record<number, string>;
  max?: number;
  size?: keyof typeof SIZE;
  disabled?: boolean;
}) {
  const name = useId();
  const stars = Array.from({ length: max }, (_, i) => max - i); // ٥ ← ١، والواجهة RTL

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-2">
      <span className="inline-flex flex-row-reverse items-center gap-0.5">
        {stars.map((n) => {
          const on = value !== null && n <= value;
          const text = labels?.[n] ? `${n} — ${labels[n]}` : String(n);
          return (
            <label
              key={n}
              title={text}
              className={cx(
                "grid cursor-pointer place-items-center rounded-md p-0.5 transition-colors",
                "focus-within:ring-2 focus-within:ring-primary/40",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                disabled={disabled}
                aria-label={text}
                className="sr-only"
              />
              <Star
                aria-hidden
                className={cx(
                  SIZE[size],
                  "transition-colors",
                  on
                    ? "fill-secondary text-secondary dark:fill-amber-400 dark:text-amber-400"
                    : "fill-transparent text-slate-300 dark:text-slate-600"
                )}
              />
            </label>
          );
        })}
      </span>
      {/* الدرجةُ مكتوبةً إلى جانبها: النجومُ وحدها تُعدّ بالعين، والرقمُ لا يُعدّ. */}
      <span className="min-w-[88px] text-meta text-slate-500 dark:text-slate-400">
        {value === null ? "لم يُختر" : (labels?.[value] ?? String(value))}
      </span>
    </div>
  );
}
