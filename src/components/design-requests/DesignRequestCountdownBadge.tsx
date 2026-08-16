"use client";

import type { DesignRequestProgress } from "@/lib/designRequestProgress";

const COLOR_CLASSES: Record<DesignRequestProgress["color"], string> = {
  green:
    "bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  yellow:
    "bg-amber-50/80 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
  red: "bg-rose-50/80 text-rose-700 ring-1 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
  neutral:
    "bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
};

const SHADOW_VARS: Record<DesignRequestProgress["color"], string> = {
  green: "var(--dr-shadow-ok)",
  yellow: "var(--dr-shadow-warn)",
  red: "var(--dr-shadow-late)",
  neutral: "none",
};

export default function DesignRequestCountdownBadge({ progress }: { progress: DesignRequestProgress }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full font-bold whitespace-nowrap shrink-0 ${COLOR_CLASSES[progress.color]}`}
      style={{ fontSize: "var(--dr-fs-meta)", boxShadow: SHADOW_VARS[progress.color] }}
    >
      {progress.label}
    </span>
  );
}
