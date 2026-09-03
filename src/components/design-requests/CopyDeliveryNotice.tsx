"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

/**
 * Copies the delivery notice for one request, ready to paste into WhatsApp or
 * email.
 *
 * The wording is the media team's own, kept verbatim; only the charity name and
 * the request title are filled in. It is deliberately a template here rather
 * than something the sender retypes each time — the 24-hour clause has to match
 * what the platform actually does, and a hand-typed message drifts from it.
 */

export function deliveryNoticeText(charityName: string, requestTitle: string): string {
  return [
    `السادة / ${charityName} المحترمين`,
    "السلام عليكم ورحمة الله وبركاته،،",
    "",
    `نفيدكم بأنه قد تم إنجاز التصميم الخاص بطلبكم: (${requestTitle}).`,
    "",
    "نأمل منكم التكرم بالاطلاع عليه من خلال المنصة واعتماده، أو سيتم اعتماده تلقائياً بعد مضي 24 ساعة.",
    "",
    "شاكرين لكم حسن تعاونكم.",
    "",
    "الفريق الإعلامي",
    "شركة زاد التنموية",
  ].join("\n");
}

export default function CopyDeliveryNotice({
  charityName,
  requestTitle,
  className = "",
}: {
  charityName: string;
  requestTitle: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The label reverts on a timer, which must not fire into an unmounted card —
  // switching tabs unmounts these while the timer is still running.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(deliveryNoticeText(charityName, requestTitle));
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  };

  const label =
    state === "copied" ? "تم النسخ" : state === "failed" ? "تعذّر النسخ" : "نسخ رسالة الإشعار";

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="نسخ نص إشعار التسليم لإرساله للجمعية"
      aria-live="polite"
      className={`w-full h-9 rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 ${
        state === "copied"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : state === "failed"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "bg-slate-100 text-slate-600 dark:bg-[#111] dark:text-slate-400 border border-transparent dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      } ${className}`}
      style={{ fontSize: "var(--dr-fs-meta)" }}
    >
      {state === "copied" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
