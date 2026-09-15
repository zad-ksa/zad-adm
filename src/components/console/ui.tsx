import type { ReactNode } from "react";
import { Check, Info, Minus, TriangleAlert } from "lucide-react";

// عناصر لوحات الإدارة المشتركة (الموظفون، الصلاحيات). الأحجام بالبكسل صراحةً:
// globals.css يجعل text-sm وtext-xs كليهما 11px في الموقع كله.

/** أرقام الجوال والعدّادات والمعرّفات: Geist Mono بأرقامٍ متساوية العرض. */
export const MONO = "[font-family:var(--font-geist-mono),ui-monospace,monospace] tabular-nums";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function toggleIn(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900";

export const btn = {
  primary: cx(
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-[13px] font-medium text-white",
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(15_118_110/0.3)] transition-colors hover:bg-[rgb(17_94_89)]",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing
  ),
  secondary: cx(
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-900",
    "shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors hover:bg-slate-50",
    "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing
  ),
  ghost: cx(
    "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-slate-500 transition-colors",
    "hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing
  ),
  danger: cx(
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-red-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing
  ),
  link: "text-[12.5px] font-medium text-primary hover:underline dark:text-teal-300",
};

export const field = cx(
  "block h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.04)]",
  "outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 hover:border-slate-300",
  "focus:border-primary/60 focus:ring-[3px] focus:ring-primary/15",
  "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:hover:border-slate-700",
  "disabled:cursor-not-allowed disabled:opacity-60"
);

/** مربّع اختيار مرسوم. locked = محدَّد بمصدرٍ آخر (مسمى أو اشتمال)، فلا يُنقر. */
export function CheckMark({ state, locked = false }: { state: "on" | "off" | "mixed"; locked?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
        state === "off"
          ? "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950"
          : locked
            ? "border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            : "border-primary bg-primary text-white"
      )}
    >
      {state === "on" && <Check className="size-3" strokeWidth={3} />}
      {state === "mixed" && <Minus className="size-3" strokeWidth={3} />}
    </span>
  );
}

const BADGE = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  brand: "border-primary/20 bg-primary/[0.06] text-primary dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300",
  gold: "border-secondary/25 bg-secondary/[0.08] text-[rgb(161_98_7)] dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
  warn: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium",
        BADGE[tone]
      )}
    >
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-teal-50 text-teal-700 ring-teal-700/10 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-300/15",
  "bg-amber-50 text-amber-700 ring-amber-700/10 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-300/15",
  "bg-slate-100 text-slate-600 ring-slate-600/10 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-300/10",
];

const AVATAR_SIZE = { sm: "size-6 text-[10px]", md: "size-8 text-[12px]", lg: "size-10 text-[14px]" } as const;

/** أول حرفين من الاسم، ولونٌ ثابت لكل اسم من ألوان الهوية. */
export function Avatar({ name, size = "md" }: { name: string; size?: keyof typeof AVATAR_SIZE }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  // فاصلٌ غير واصل بين الحرفين، وإلا اتّصلا فقُرئا كلمة.
  const initials = [words[0]?.[0], words[1]?.[0]].filter(Boolean).join("‌");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-1 ring-inset",
        AVATAR_SIZE[size],
        AVATAR_TONES[hash % AVATAR_TONES.length]
      )}
    >
      {initials || "؟"}
    </span>
  );
}

/** صورٌ متراكبة وعددها — لمن يحمل صلاحيةً أو مجموعة. */
export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  return (
    <span className="flex items-center gap-2" title={names.join("، ")}>
      <span className="flex items-center">
        {names.slice(0, max).map((n, i) => (
          <span key={`${n}-${i}`} className={cx("rounded-full ring-2 ring-white dark:ring-slate-900", i > 0 && "-ms-2")}>
            <Avatar name={n} size="sm" />
          </span>
        ))}
      </span>
      <span className={cx(MONO, "text-[12.5px] text-slate-500 dark:text-slate-400")}>{names.length}</span>
    </span>
  );
}

export function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && <p className="text-[12.5px] leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="shrink-0 pt-0.5">{action}</div>}
    </div>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** صفّ اختيار: مربّع ونصّ وسطر مصدر اختياري. */
export function OptionRow({
  label,
  checked,
  locked = false,
  note,
  onToggle,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
  note?: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      aria-pressed={checked}
      className={cx(
        "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        locked ? "cursor-default" : "hover:bg-slate-100 dark:hover:bg-slate-800/70"
      )}
    >
      <span className="mt-0.5">
        <CheckMark state={checked ? "on" : "off"} locked={locked} />
      </span>
      <span className="min-w-0">
        <span
          className={cx(
            "block text-[13px] leading-5",
            checked ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400"
          )}
        >
          {label}
        </span>
        {note && <span className="block text-[11.5px] leading-4 text-slate-500">{note}</span>}
      </span>
    </button>
  );
}

export function SelectAll({ count, total, allOn, onClick }: { count: number; total: number; allOn: boolean; onClick: () => void }) {
  return (
    <span className="flex items-center gap-3">
      <span className={cx(MONO, "text-[12px] text-slate-500")}>
        {count}/{total}
      </span>
      <button type="button" onClick={onClick} className="text-[12px] font-medium text-primary hover:underline dark:text-teal-300">
        {allOn ? "إلغاء الكل" : "تحديد الكل"}
      </button>
    </span>
  );
}

export function Note({ tone, children }: { tone: "brand" | "warn"; children: ReactNode }) {
  return (
    <p
      className={cx(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-[12.5px] leading-5",
        tone === "brand"
          ? "border-primary/15 bg-primary/[0.04] text-slate-700 dark:border-teal-400/15 dark:bg-teal-400/5 dark:text-slate-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      )}
    >
      {tone === "brand" ? (
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary dark:text-teal-300" />
      ) : (
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span>{children}</span>
    </p>
  );
}

/** قائمة أسماء للاطلاع — من يحمل صلاحيةً أو خدمةً أو مسمى. */
export function NameList({
  title,
  description,
  names,
  empty,
  action,
}: {
  title: string;
  description?: ReactNode;
  names: string[];
  empty: string;
  action?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title={title}
        description={description}
        action={action ?? <span className={cx(MONO, "text-[12px] text-slate-500")}>{names.length}</span>}
      />
      {names.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-[13px] text-slate-500 dark:border-slate-700">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
          {names.map((n, i) => (
            <li key={`${n}-${i}`} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
              <Avatar name={n} size="sm" />
              <span className="truncate text-[13px]">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Count({ n, unit }: { n: number; unit: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{n}</span> {unit}
    </span>
  );
}

export function Dot() {
  return <span aria-hidden className="size-0.5 rounded-full bg-slate-300 dark:bg-slate-600" />;
}
