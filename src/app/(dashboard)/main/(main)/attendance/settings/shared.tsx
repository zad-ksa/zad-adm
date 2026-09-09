"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";

/**
 * The pieces every settings screen needs.
 *
 * These lived once inside a single 575-line component. Splitting that screen
 * into five routes would have copied the save-and-refresh dance five times, so
 * it moved here instead — one place where a mutation cannot forget to refresh
 * the page it just changed.
 */

export const CARD =
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
export const INPUT =
  "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none";
export const BTN =
  "h-9 px-4 rounded-xl text-[12px] font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5";
export const GHOST =
  "h-9 px-3 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5";

export const day = (iso: string) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" })
    .format(new Date(iso));

export type ActionResult = { success: boolean; error?: string };

export function useSettingsAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Every mutation goes through here, so none of them can forget to refresh. */
  const run = async (fn: () => Promise<ActionResult>, ok: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "تعذّر الحفظ");
        return false;
      }
      setNotice(ok);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, notice, run };
}

export function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  if (error) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-3 text-[13px] font-bold mb-4">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }
  if (notice) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-[13px] font-bold mb-4">
        <Check className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{notice}</span>
      </div>
    );
  }
  return null;
}
