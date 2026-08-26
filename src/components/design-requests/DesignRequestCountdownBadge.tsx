"use client";

import type { DesignRequestProgress } from "@/lib/designRequestProgress";

const COLOR_CLASSES: Record<DesignRequestProgress["color"], string> = {
  green:
    "bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  // Solid rather than tinted like the others: this is the one state that has
  // to stop the eye. In dark mode a black fill would sink into the card, so the
  // weight moves to a light ring and white text instead of to the background.
  black:
    "bg-slate-900 text-white ring-1 ring-slate-900/20 dark:bg-black dark:text-white dark:ring-white/30",
  neutral:
    "bg-slate-50 text-slate-500 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
};

const SHADOW_VARS: Record<DesignRequestProgress["color"], string> = {
  green: "var(--dr-shadow-ok)",
  black: "var(--dr-shadow-past)",
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
