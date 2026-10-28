"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy as CopyIcon, Eye, EyeOff } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { cx, MONO } from "./ui";

/**
 * زرُّ النسخ — واحدٌ للموقع كلِّه.
 *
 * كان في اللوحة ثلاثُ هيئاتٍ له: `CopyTextButton` عامٌّ يأخذ قائمةَ نصوص،
 * و`CopyTextButton` آخرُ معرَّفٌ داخل صفحة الاعتمادات بالاسم نفسه وخصائصَ
 * أخرى، و`CopyLinkButton` للروابط — وسبعةُ ملفاتٍ تنادي `navigator.clipboard`
 * بيدها. فاختلف شكلُ «تم النسخ» ومدّتُه وأيقونتُه من شاشةٍ إلى شاشة.
 *
 * وبلا `label` يكون أيقونةً وحدها (خلايا الجداول)، ومعه زرّاً بنصّه.
 * والنجاحُ يُقال في العنصر نفسه لا في تنبيهٍ عابر: النسخُ فعلٌ صغيرٌ جوابُه
 * عنده، وتنبيهٌ في زاوية الشاشة لكل نسخةٍ ضجيج.
 */
const DONE_MS = 1600;

export function CopyButton({
  value,
  label,
  title,
  disabled = false,
  className,
}: {
  value: string;
  /** نصُّ الزرّ. بلا هذا يكون أيقونةً وحدها. */
  label?: string;
  /** ما يُقال في `title` وفي `aria-label` — افتراضُه «نسخ». */
  title?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // المؤقّتُ يُلغى عند الإزالة: زرٌّ في صفٍّ يُحذف بعد النسخ كان يُحدِّث حالةً
  // لعنصرٍ زال.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    if (timer.current) clearTimeout(timer.current);
    // `copyToClipboard` فيها بديلُ السياق غير الآمن (http)، وتُرجع هل نُسخ
    // فعلاً — فلا يُقال «تم النسخ» لما لم يُنسخ.
    setState((await copyToClipboard(value)) ? "done" : "failed");
    timer.current = setTimeout(() => setState("idle"), DONE_MS);
  };

  const name = state === "failed" ? "تعذّر النسخ" : state === "done" ? "تم النسخ" : (title ?? "نسخ");
  const icon = state === "done" ? <Check className="size-3.5" /> : <CopyIcon className="size-3.5" />;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={disabled || !value}
        title={name}
        aria-label={label ? undefined : name}
        className={cx(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border text-caption font-medium transition-colors",
          "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:pointer-events-none disabled:opacity-40",
          label ? "h-8 px-2.5" : "size-8",
          state === "done"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            : state === "failed"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-teal-300",
          className
        )}
      >
        {icon}
        {label && <span>{state === "done" ? "تم النسخ" : label}</span>}
      </button>
      {/* قارئُ الشاشة لا يرى تغيُّرَ الأيقونة، فيُقال له الخبر. */}
      <span aria-live="polite" className="sr-only">
        {state === "idle" ? "" : name}
      </span>
    </>
  );
}

/**
 * قيمةٌ سِرّيّة: مُغطّاةٌ تُكشف وتُنسخ.
 *
 * وكلماتُ المرور في جدول حسابات الجهات المانحة تُفتح على شاشةٍ في مكتب، فالعرضُ
 * بالكشف اختياراً لا بالعرض ابتداءً. والنسخُ لا يحتاج كشفاً: من أراد لصقَها في
 * بوّابة الجهة نسخَها مُغطّاةً.
 */
export function SecretValue({
  value,
  emptyLabel = "—",
  title = "كلمة المرور",
}: {
  value: string | null;
  /** ما يُعرض حين لا قيمة. */
  emptyLabel?: string;
  title?: string;
}) {
  const [shown, setShown] = useState(false);

  if (!value) return <span className="text-slate-400 dark:text-slate-500">{emptyLabel}</span>;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx(MONO, "text-body text-slate-700 dark:text-slate-200")}>
        {shown ? value : "•".repeat(Math.min(value.length, 10))}
      </span>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        title={shown ? `إخفاء ${title}` : `كشف ${title}`}
        aria-label={shown ? `إخفاء ${title}` : `كشف ${title}`}
        aria-pressed={shown}
        className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors outline-none hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-teal-300"
      >
        {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
      <CopyButton value={value} title={`نسخ ${title}`} />
    </span>
  );
}
