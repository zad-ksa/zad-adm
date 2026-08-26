"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * A brief confirmation that an action actually happened.
 *
 * Design-request actions used to succeed in silence — the dialog closed and the
 * list refreshed, which is indistinguishable from a click that did nothing.
 * Errors were already surfaced; only success wasn't.
 *
 * Deliberately not a queue or a provider: one message at a time is all these
 * flows produce, and the state lives in whichever client owns the action.
 */
export default function SuccessToast({
  message,
  onDismiss,
  duration = 4000,
}: {
  message: string | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      // Above the modals (z-50) so a message raised as a dialog closes is not
      // hidden behind it during the closing frame.
      className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:max-w-sm z-[110] flex items-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-px" />
      <span className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
        {message}
      </span>
      <button
        onClick={onDismiss}
        aria-label="إغلاق"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
