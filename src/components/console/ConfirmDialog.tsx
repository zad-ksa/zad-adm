"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";
import { Spinner, btn, cx } from "./ui";

/**
 * حوار التأكيد — واحدٌ لكل الموقع، بصيغتين.
 *
 * كان في المشروع حواران: واحدٌ في `ui/ConfirmModal` تستعمله ثلاث عشرة شاشة
 * بأيقونةٍ وأزرارٍ متساوية العرض، وآخر في عُدّة اللوحة تستعمله ستّ شاشاتٍ
 * بأزرارٍ في شريطٍ سفلي. مظهران لسلوكٍ واحد، وواجهتان تختلفان في أسماء
 * الحقول وحدها (`message`/`body`، `isPending`/`busy`).
 *
 * فالمنطق هنا واحد، والفرق صيغةٌ تُمرَّر: `soft` للشاشات المريحة، و`console`
 * للوحات الإدارة الكثيفة. وهو نفس ما فعلناه في `Select`.
 *
 * ولا يُغلق بالنقر خارجه أثناء التنفيذ: إغلاقٌ في منتصف عمليةٍ جارية يترك
 * المستخدم لا يدري أتمّت أم أُلغيت.
 */
export function ConfirmDialog({
  isOpen = true,
  title,
  message,
  confirmLabel = "تأكيد الحذف",
  tone = "danger",
  variant = "soft",
  isPending = false,
  onConfirm,
  onCancel,
}: {
  /** تُترك فارغة حين يتحكّم المُنادي بالعرض بشرطٍ خارجي. */
  isOpen?: boolean;
  title: string;
  /** تفصيلٌ تحت العنوان. يُترك فارغاً حين يكون السؤال كافياً بنفسه. */
  message?: string;
  confirmLabel?: string;
  /** `danger` أحمر ويُنذر، و`primary` لون الفعل العادي. */
  tone?: "danger" | "primary";
  variant?: "soft" | "console";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  const isDanger = tone === "danger";

  if (variant === "console") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
        <div
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] motion-safe:animate-[zad-fade-in_150ms_ease-out]"
          onClick={() => !isPending && onCancel()}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl motion-safe:animate-[zad-pop-in_160ms_ease-out] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="space-y-2 p-5">
            <h2 className="text-[16px] font-semibold">{title}</h2>
            {message && <p className="text-[13.5px] leading-6 text-slate-500 dark:text-slate-400">{message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            <button type="button" onClick={onCancel} disabled={isPending} className={btn.secondary}>
              إلغاء
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className={isDanger ? btn.danger : btn.primary}
            >
              {isPending && <Spinner size={16} tone="onPrimary" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity"
        onClick={() => !isPending && onCancel()}
      />

      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-center font-sans shadow-2xl dark:border-slate-700/50 dark:bg-slate-800"
        dir="rtl"
      >
        <div
          className={cx(
            "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
            isDanger ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10 dark:bg-primary/20"
          )}
        >
          {isDanger ? (
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
          ) : (
            <HelpCircle className="h-6 w-6 text-primary dark:text-teal-300" />
          )}
        </div>

        <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
        {message && <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{message}</p>}

        <div className="flex w-full items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50",
              isDanger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            )}
          >
            {isPending && <Spinner size={16} tone="onPrimary" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
