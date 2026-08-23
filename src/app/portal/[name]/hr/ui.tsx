import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Presentational primitives for the HR scope.
 *
 * Deliberately free of server-only imports so the same components can be
 * rendered from an RSC page and from inside a client component.
 *
 * Two rules hold everywhere in here:
 *  - spacing comes only from the 8pt steps (p-2/4/6/8, gap-2/4/6) — no 12px,
 *    no 20px, no half-steps;
 *  - type sizes come only from the --hr-fs-* clamp() scale, never from a
 *    Tailwind text-* class, so the hierarchy stays fluid and consistent.
 */

export const fs = {
  eyebrow: { fontSize: "var(--hr-fs-eyebrow)" } as CSSProperties,
  meta: { fontSize: "var(--hr-fs-meta)" } as CSSProperties,
  body: { fontSize: "var(--hr-fs-body)" } as CSSProperties,
  h3: { fontSize: "var(--hr-fs-h3)" } as CSSProperties,
  h2: { fontSize: "var(--hr-fs-h2)" } as CSSProperties,
  h1: { fontSize: "var(--hr-fs-h1)", letterSpacing: "var(--hr-tracking-h1)" } as CSSProperties,
  stat: { fontSize: "var(--hr-fs-stat)", letterSpacing: "var(--hr-tracking-stat)" } as CSSProperties,
};

/** Shared input skin — one focus treatment for every control on the page. */
export const inputClass =
  "w-full px-4 py-2 rounded-xl bg-white/60 dark:bg-white/[0.02] text-slate-800 dark:text-slate-100 " +
  "shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.14)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.14)] " +
  "outline-none transition-shadow duration-300 placeholder:text-slate-400";

export function HrCard({
  children,
  className = "",
  interactive = false,
  sunk = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  sunk?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`hr-card ${interactive ? "hr-card--interactive" : ""} ${sunk ? "hr-card--sunk" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Page masthead: eyebrow → title → context, with the section glyph alongside. */
export function HrPageHeader({
  icon: Icon,
  eyebrow,
  title,
  context,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  context: string;
}) {
  return (
    <header className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                   bg-gradient-to-b from-primary/10 to-primary/[0.04]
                   dark:from-teal-400/10 dark:to-teal-400/[0.02]
                   shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.16)]
                   dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.18)]"
      >
        <Icon className="w-6 h-6 text-primary dark:text-teal-400" />
      </div>
      <div className="min-w-0">
        <p className="hr-eyebrow text-primary/60 dark:text-teal-400/60" style={fs.eyebrow}>
          {eyebrow}
        </p>
        <h1 className="font-bold text-slate-900 dark:text-slate-50 truncate" style={fs.h1}>
          {title}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 truncate" style={fs.meta}>
          {context}
        </p>
      </div>
    </header>
  );
}

/** Card heading. `action` sits opposite the title on the same baseline. */
export function SectionHead({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-4 h-4 text-primary dark:text-teal-400 shrink-0" />}
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 truncate" style={fs.h2}>
            {title}
          </h2>
          {hint && (
            <p className="text-slate-400 dark:text-slate-500 mt-2" style={fs.meta}>
              {hint}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Stat tile. The number carries the weight, the label stays quiet — the reverse
 * of the usual dashboard habit of shouting both.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "primary" | "warn" | "danger";
}) {
  const toneClass = {
    neutral: "text-slate-800 dark:text-slate-100",
    primary: "text-primary dark:text-teal-400",
    warn: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <HrCard interactive className="p-4 flex flex-col justify-between gap-4 h-full">
      <p className="hr-eyebrow text-slate-400 dark:text-slate-500" style={fs.eyebrow}>
        {label}
      </p>
      <div>
        <p className={`font-bold tabular-nums leading-none ${toneClass}`} style={fs.stat}>
          {value}
        </p>
        {hint && (
          <p className="text-slate-400 dark:text-slate-500 mt-2" style={fs.meta}>
            {hint}
          </p>
        )}
      </div>
    </HrCard>
  );
}

/** Inline status message. Tone drives the tinted ring, never a hard border. */
export function Banner({
  tone,
  icon: Icon,
  children,
}: {
  tone: "ok" | "warn" | "danger";
  icon: LucideIcon;
  children: ReactNode;
}) {
  const skin = {
    ok: "bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300 shadow-[var(--hr-shadow-ok)]",
    warn: "bg-amber-500/[0.06] text-amber-700 dark:text-amber-300 shadow-[var(--hr-shadow-warn)]",
    danger: "bg-rose-500/[0.06] text-rose-700 dark:text-rose-300 shadow-[var(--hr-shadow-danger)]",
  }[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-2 p-4 rounded-xl ${skin}`}
      style={fs.body}
    >
      <span className="hr-icon-lead">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Label + control pair. */
export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span
        className="block hr-eyebrow text-slate-400 dark:text-slate-500 mb-2"
        style={fs.eyebrow}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-slate-400 dark:text-slate-500 mt-2" style={fs.meta}>
          {hint}
        </span>
      )}
    </label>
  );
}

/** Small neutral chip used for titles, states and counts. */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "warn" | "danger";
}) {
  const skin = {
    neutral:
      "text-slate-500 dark:text-slate-400 shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.20)]",
    primary:
      "text-primary dark:text-teal-400 bg-primary/[0.06] shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.20)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.22)]",
    warn: "text-amber-600 dark:text-amber-400 bg-amber-500/[0.06] shadow-[inset_0_0_0_1px_rgb(202_138_4_/_.24)]",
    danger:
      "text-rose-600 dark:text-rose-400 bg-rose-500/[0.06] shadow-[inset_0_0_0_1px_rgb(225_29_72_/_.24)]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-2 px-2 h-6 rounded-lg font-medium whitespace-nowrap ${skin}`}
      style={fs.eyebrow}
    >
      {children}
    </span>
  );
}

/** Primary action. The inset top highlight is what makes it read as a raised key. */
export const ctaClass =
  "inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-semibold text-white " +
  "bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] " +
  "shadow-[var(--hr-shadow-cta)] hover:shadow-[var(--hr-shadow-cta-hover)] " +
  "active:translate-y-px disabled:opacity-50 disabled:pointer-events-none " +
  "transition-[box-shadow,transform] duration-300";

/** Secondary action — a tinted ring instead of a filled surface. */
export const ghostClass =
  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium " +
  "text-slate-600 dark:text-slate-300 " +
  "shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.20)] " +
  "hover:text-primary dark:hover:text-teal-400 " +
  "hover:shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.30)] " +
  "dark:hover:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.30)] " +
  "disabled:opacity-40 disabled:pointer-events-none " +
  "transition-[box-shadow,color] duration-300";
