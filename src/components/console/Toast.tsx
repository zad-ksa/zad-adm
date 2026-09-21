"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, X } from "lucide-react";
import { cx } from "./ui";

/**
 * التنبيه — واحدٌ لكل الموقع.
 *
 * كان في المشروع تنبيهان: `SuccessToast` للنجاح وحده في خمس شاشات، و`Toast`
 * في عُدّة اللوحة بنبرتين في خمسٍ أخرى. ومعهما مسارٌ ثالث أسوأ منهما:
 * **٣٤ نداءً لـ`alert()`** — نافذة نظام التشغيل، تُوقف الصفحة حتى تُغلق،
 * بخطٍّ ليس خطّ الموقع وزرٍّ قد يكون بالإنجليزية.
 *
 * فصار واحداً بثلاث نبرات: النجاح، والخطأ، والخبر المحايد. والخطأ **لا
 * يختفي وحده**: رسالة النجاح تُقرأ بطرف العين، أما سبب الفشل فيُقرأ ويُفهم
 * ثم يُغلقه صاحبه.
 */

export type ToastTone = "ok" | "error" | "info";
export type ToastMessage = { tone: ToastTone; text: string } | null;

const TONE = {
  ok: {
    icon: CircleCheck,
    ring: "border-emerald-200 dark:border-emerald-500/30",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: TriangleAlert,
    ring: "border-red-200 dark:border-red-500/30",
    color: "text-red-600 dark:text-red-400",
  },
  info: {
    icon: CircleCheck,
    ring: "border-slate-200 dark:border-slate-700",
    color: "text-primary dark:text-teal-300",
  },
} as const;

/**
 * حالة التنبيه ومؤقّته.
 *
 * `show(tone, text)` أوضح من تمرير كائنٍ في كل نداء، و`show("error", …)`
 * تبقى معروضة حتى تُغلق — ولهذا لا يُعاد المؤقّت إلا للنبرات الأخرى.
 */
export function useToast(duration = 4000) {
  const [toast, setToast] = useState<ToastMessage>(null);

  const show = useCallback((tone: ToastTone, text: string) => setToast({ tone, text }), []);
  const dismiss = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return { toast, show, dismiss, setToast } as const;
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss?: () => void }) {
  if (!toast) return null;

  const { icon: Icon, ring, color } = TONE[toast.tone];

  return (
    <div
      role="status"
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      dir="rtl"
      // فوق النوافذ (z-50): رسالةٌ تُرفع مع إغلاق حوارٍ يجب ألّا تختبئ خلفه
      // في إطار الإغلاق.
      className={cx(
        "fixed bottom-4 inset-x-4 z-[110] flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-slate-900",
        "sm:inset-x-auto sm:right-6 sm:max-w-sm motion-safe:animate-[zad-pop-in_160ms_ease-out]",
        ring
      )}
    >
      <Icon className={cx("mt-px size-5 shrink-0", color)} />
      <span className="flex-1 text-[13.5px] font-bold leading-relaxed text-slate-800 dark:text-slate-100">
        {toast.text}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق"
          className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export default Toast;
