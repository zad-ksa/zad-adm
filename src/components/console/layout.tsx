import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { MONO, cx, field } from "./ui";

// هيكل صفحات الإدارة: الترويسة، والأرقام، والتبويبات، والجداول، والحالات الفارغة.

/**
 * حلقةٌ في مسار التنقّل. `href` لصفحةٍ أب، و`onClick` لعرضٍ أبٍ داخل الصفحة
 * نفسها (قسمٌ اختير من شبكة بطاقات مثلاً) — فالعودة في الحالين من المكان نفسه
 * وبالشكل نفسه. والأخيرة بلا أيٍّ منهما: هي الصفحة الحالية.
 */
export type Crumb = { label: string; href?: string; onClick?: () => void };

const crumbLinkClass =
  "rounded-sm transition-colors outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:text-slate-100";

/**
 * ترويسة الصفحة — عنوانٌ واحدٌ بمقاسٍ واحد في كل أقسام اللوحة.
 *
 * كان في المشروع سبعة مقاساتٍ لهذا العنصر نفسه (من `text-base` إلى
 * `clamp(2rem,3vw,2.5rem)`) وثلاثة أوزان. والمقاس هنا ٢٦ بكسل، وهو
 * `--fs-page` في سُلّم الخطّ المُعلَن.
 *
 * `crumbs` اختياري: صفحةٌ بلا أبٍ لا تُخترع لها مسارٌ وهمي.
 * `icon` للأقسام التي تُعرِّف نفسها بأيقونة، و`actions` لأزرار اليمين.
 */
export function PageHeader({
  crumbs,
  icon,
  title,
  description,
  actions,
}: {
  crumbs?: Crumb[];
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="مسار التنقل" className="flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden className="text-slate-300 dark:text-slate-700">
                    /
                  </span>
                )}
                {c.href ? (
                  <Link href={c.href} className={crumbLinkClass}>
                    {c.label}
                  </Link>
                ) : c.onClick ? (
                  <button type="button" onClick={c.onClick} className={crumbLinkClass}>
                    {c.label}
                  </button>
                ) : (
                  <span className="text-slate-900 dark:text-slate-100">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="flex items-center gap-2.5 text-[26px] font-semibold leading-tight tracking-tight">
          {icon && (
            <span aria-hidden className="shrink-0 text-primary dark:text-teal-300">
              {icon}
            </span>
          )}
          <span className="min-w-0">{title}</span>
        </h1>
        {description && <p className="max-w-2xl text-[14px] leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * رقمٌ في شريط الملخّص.
 *
 * اللون هنا حالةٌ لا زينة: `dot` أخضر للمنجز/النشط، وكهرماني لما ينتظر،
 * وأحمر لما تأخّر — ولا لون لرقمٍ لا يقول شيئاً عن حالة. و`unit` وحدةٌ صغيرة
 * بجانب الرقم («ريال») كي لا تُكتب بمقاس الرقم نفسه.
 */
export type Stat = {
  label: string;
  value: number | string;
  unit?: string;
  hint?: ReactNode;
  dot?: "active" | "muted" | "warn" | "danger";
  selected?: boolean;
  onClick?: () => void;
  href?: string;
};

const STAT_DOT = {
  active: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  muted: "bg-slate-400",
} as const;

// الأعمدة تتبع عدد الأرقام: خمسةٌ في شبكةٍ من أربعة تترك رقماً يتيماً في سطر.
const STAT_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

const statCellClass =
  "p-4 text-right transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40";

export function StatStrip({ items, label = "ملخص" }: { items: Stat[]; label?: string }) {
  return (
    <section
      aria-label={label}
      className={cx(
        "grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800",
        STAT_COLS[items.length] ?? STAT_COLS[4]
      )}
    >
      {items.map((s) => {
        const body = (
          <>
            <span className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
              {s.dot && <span className={cx("size-1.5 shrink-0 rounded-full", STAT_DOT[s.dot])} />}
              {s.label}
            </span>
            <span className="mt-1 flex items-baseline gap-1.5">
              <span className={cx(MONO, "text-[28px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100")}>
                {s.value}
              </span>
              {s.unit && <span className="text-[13px] text-slate-500 dark:text-slate-400">{s.unit}</span>}
            </span>
            {s.hint && <span className="mt-2 block text-[12px] text-slate-500">{s.hint}</span>}
          </>
        );
        if (s.href) {
          return (
            <Link
              key={s.label}
              href={s.href}
              className={cx(statCellClass, "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60")}
            >
              {body}
            </Link>
          );
        }
        return s.onClick ? (
          <button
            key={s.label}
            type="button"
            onClick={s.onClick}
            aria-pressed={!!s.selected}
            className={cx(
              statCellClass,
              s.selected
                ? "bg-slate-50 dark:bg-slate-800/70"
                : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
            )}
          >
            {body}
          </button>
        ) : (
          <div key={s.label} className="bg-white p-4 dark:bg-slate-900">
            {body}
          </div>
        );
      })}
    </section>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  inset = false,
  label,
}: {
  tabs: { id: T; label: string; count?: number | string }[];
  value: T;
  onChange: (id: T) => void;
  /** داخل اللوحة الجانبية: حشوة جانبية مطابقة لمحتواها. */
  inset?: boolean;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cx("flex gap-6 border-b border-slate-200 dark:border-slate-800", inset && "px-6")}>
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={cx(
              "-mb-px flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 text-[13px] font-medium transition-colors outline-none",
              on
                ? "border-primary text-slate-900 dark:border-teal-400 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-900 focus-visible:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cx(
                  MONO,
                  "rounded-full px-1.5 text-[11px] leading-[18px]",
                  on
                    ? "bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cx(
            "h-full whitespace-nowrap rounded-[5px] px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            value === o.id
              ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cx("relative", className)}>
      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cx(field, "pr-9")}
      />
    </div>
  );
}

export const theadRowClass = "border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900";
export const tbodyClass = "divide-y divide-slate-100 dark:divide-slate-800";
export const rowClass = "cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40";

export function TableShell({ children, empty, footer }: { children: ReactNode; empty?: ReactNode; footer?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-right">{children}</table>
      </div>
      {empty}
      {footer && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-[12.5px] text-slate-500 dark:border-slate-800">{footer}</div>
      )}
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cx("h-10 whitespace-nowrap px-4 text-[12.5px] font-medium text-slate-500 dark:text-slate-400", className)}>
      {children}
    </th>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
        {icon}
      </span>
      <p className="mt-3 text-[14px] font-medium text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-md text-[13px] leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
