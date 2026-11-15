"use client";

import { Spinner, cx } from "./ui";

/**
 * مفتاحُ تشغيلٍ وإطفاء — لحالةٍ تُكتب بمجرّد لمسِه، لا لحقلٍ في نموذجٍ يُحفظ.
 *
 * **ولمَ مفتاحٌ لا مربَّعُ اختيار**: المربَّعُ يقول «مُحدَّدٌ أو لا» في نموذجٍ
 * ينتظر «حفظ»، والمفتاحُ يقول «شغّالٌ أو مُطفأ» الآن. فحيث يُكتب الأثرُ فوراً
 * يُرسم مفتاحاً — وإلّا انتظر صاحبُه زرَّ حفظٍ لا وجود له.
 *
 * و`role="switch"` مع `aria-checked`: قارئُ الشاشة يقول «مفتاح، مشتغل» لا
 * «زرّ». والانتظارُ يُعرض في المفتاح نفسِه ويُقفله، فلا يُلمس مرّتين فيُكتب
 * أمرانِ متعاكسان.
 */
export default function Switch({
  checked,
  onChange,
  label,
  hint,
  busy = false,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** وسمٌ يُقرأ بجوار المفتاح — وهو أيضاً اسمُه لقارئ الشاشة. */
  label: string;
  /** سطرٌ صغيرٌ يقول ما يفعله الإشعالُ، حيث يلزم البيان. */
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const locked = busy || disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={locked}
      onClick={() => onChange(!checked)}
      className={cx(
        "group inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
        locked ? "cursor-default opacity-70" : "hover:bg-slate-100 dark:hover:bg-slate-800/70",
        className
      )}
    >
      <span
        aria-hidden
        className={cx(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
        )}
      >
        {/* المقبضُ يتحرّك بـ`start`: في RTL يبدأ يميناً ويمضي يساراً بلا مقاسٍ
            معكوسٍ يدويّاً. */}
        <span
          className={cx(
            "absolute grid size-4 place-items-center rounded-full bg-white shadow-sm transition-[inset-inline-start]",
            checked ? "start-[1.125rem]" : "start-0.5"
          )}
        >
          {busy && <Spinner size={10} />}
        </span>
      </span>
      <span className="min-w-0">
        <span
          className={cx(
            "block truncate text-meta font-medium",
            checked ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
          )}
        >
          {label}
        </span>
        {hint && <span className="block text-caption leading-4 text-slate-500 dark:text-slate-400">{hint}</span>}
      </span>
    </button>
  );
}
