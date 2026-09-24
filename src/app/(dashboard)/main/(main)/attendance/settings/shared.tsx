"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { btn, card, cx, field } from "@/components/console/ui";

/**
 * The pieces every settings screen needs.
 *
 * These lived once inside a single 575-line component. Splitting that screen
 * into five routes would have copied the save-and-refresh dance five times, so
 * it moved here instead — one place where a mutation cannot forget to refresh
 * the page it just changed.
 */

// نسخة التحضير من البطاقة والحقل والزرّين — صارت تشير إلى العُدّة، فتتوحّد كل
// استعمالاتها في شاشات الإعدادات دون لمس مواضعها.
export const CARD = cx(card.static, "p-5");
export const INPUT = field;
/** للحقل الذي يأخذ عرض محتواه — بدل `${INPUT} w-auto` الذي يُعارض w-full في field. */
export const INPUT_AUTO = field.replace(/\bw-full\b/, "w-auto");
export const BTN = btn.primary;
export const GHOST = btn.secondary;

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
      <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-3 text-body font-semibold mb-4">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }
  if (notice) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-body font-semibold mb-4">
        <Check className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{notice}</span>
      </div>
    );
  }
  return null;
}
