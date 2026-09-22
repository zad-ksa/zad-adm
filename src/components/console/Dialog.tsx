"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { btn, cx } from "./ui";

/**
 * النافذة المنبثقة — واحدةٌ لكل لوحة زاد.
 *
 * كان في المشروع قرابة ثمانين نافذةً مبنيّةً باليد، كلٌّ بـ`fixed inset-0`
 * وخلفيةٍ وزوايا وظلٍّ من اختيار كاتبها. والأهمّ من الشكل أن أكثرها لا يُغلق
 * بـEscape، ولا يحبس التركيز فيمرّ Tab إلى الصفحة المحجوبة خلفها، ولا يعيد
 * التركيز إلى الزرّ الذي فتحها — فمستعمل لوحة المفاتيح يضيع بعد كل نافذة.
 *
 * والسلوك في `useModal` كي يشترك فيه حوار التأكيد واللوحة الجانبية.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

// عدّاد النوافذ المفتوحة: نافذةٌ فوق نافذة لا تُعيد التمرير حين تُغلق العليا.
let openCount = 0;
// والأعلى وحده يستجيب لـEscape وTab.
const stack: symbol[] = [];

export function useModal({
  open,
  onClose,
  busy = false,
  panelRef,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  // أحدث قيمٍ دون إعادة ربط المستمعين في كل رسم.
  const latest = useRef({ onClose, busy });
  useEffect(() => {
    latest.current = { onClose, busy };
  });

  useEffect(() => {
    if (!open) return;
    const id = Symbol("modal");
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;

    openCount++;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // التركيز الأول: ما طلبه المُنادي، وإلا أول حقلٍ (لا زرّ الإغلاق)، وإلا النافذة.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      if (initialFocusRef?.current) return initialFocusRef.current.focus();
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const field = items.find((el) => el.matches("input, textarea, select, [contenteditable='true']"));
      (field ?? items.find((el) => !el.dataset.dialogClose) ?? panel).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!latest.current.busy) latest.current.onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      openCount--;
      if (openCount === 0) document.body.style.overflow = prevOverflow;
      // يعود التركيز إلى الزرّ الذي فتحها — إن كان ما زال في الصفحة.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, panelRef, initialFocusRef]);
}

/** يُرسم في جذر الصفحة بعد التحميل: لا يقصّه أبٌ بـoverflow ولا يغطّيه شريطٌ علوي. */
export function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- علامة «رُكِّب في المتصفح» لا حالة مشتقّة
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

const SIZE = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl",
} as const;

export type DialogSize = keyof typeof SIZE;

export function Dialog({
  open = true,
  title,
  description,
  icon,
  size = "md",
  onClose,
  busy = false,
  footer,
  headerAction,
  children,
  onSubmit,
  role = "dialog",
  initialFocusRef,
  bodyClassName,
  closeOnBackdrop = true,
  scopeClassName,
  flush = false,
}: {
  /** يُترك فارغاً حين يتحكّم المُنادي بالعرض بشرطٍ خارجي. */
  open?: boolean;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  size?: DialogSize;
  onClose: () => void;
  /** أثناء عمليةٍ جارية: لا إغلاق بـEscape ولا بالنقر خارجها ولا بزرّ ×. */
  busy?: boolean;
  /** أزرار الأسفل — تُرتَّب في شريطٍ ثابتٍ لا يمرّ مع المحتوى. */
  footer?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
  /** حين تُمرَّر تصير النافذة نموذجاً: Enter يحفظ، وزرّ `type="submit"` في التذييل يعمل. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  role?: "dialog" | "alertdialog";
  initialFocusRef?: RefObject<HTMLElement | null>;
  bodyClassName?: string;
  /** نافذةٌ فيها إدخالٌ طويل: نقرةٌ طائشة خارجها لا تمحو ما كُتب. */
  closeOnBackdrop?: boolean;
  /**
   * صنف نطاقٍ يحمل متغيّرات CSS (`design-requests-ui`، `mail-ui`): النافذة تُرسم
   * في جذر الصفحة خارج غلاف شاشتها، فبدونه تضيع مقاسات الخطّ المعرَّفة عليه.
   */
  scopeClassName?: string;
  /** جسمٌ بلا حشوة — لمحتوى له تخطيطه الكامل العرض (مخطط، جدول). */
  flush?: boolean;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descId = useId();
  useModal({ open, onClose, busy, panelRef, initialFocusRef });

  if (!open) return null;

  const panelClass = cx(
    "relative flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl outline-none",
    "motion-safe:animate-[zad-pop-in_160ms_ease-out] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
    SIZE[size]
  );

  const inner = (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300">
              {icon}
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            <h2 id={titleId} className="text-[16px] font-semibold leading-6">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="إغلاق"
            data-dialog-close="true"
            className={btn.icon}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className={cx("min-h-0 flex-1 overflow-y-auto", !flush && "px-5 py-5", bodyClassName)}>{children}</div>

      {footer && (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          {footer}
        </footer>
      )}
    </>
  );

  const aria = {
    role,
    "aria-modal": true as const,
    "aria-labelledby": titleId,
    "aria-describedby": description ? descId : undefined,
    tabIndex: -1,
  };

  return (
    <Portal>
      <div className={cx("fixed inset-0 z-[100] flex items-center justify-center p-4", scopeClassName)} dir="rtl">
        <div
          aria-hidden
          className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] motion-safe:animate-[zad-fade-in_150ms_ease-out]"
          onClick={() => closeOnBackdrop && !busy && onClose()}
        />
        {onSubmit ? (
          <form
            {...aria}
            ref={panelRef as RefObject<HTMLFormElement>}
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit(e);
            }}
            className={panelClass}
          >
            {inner}
          </form>
        ) : (
          <section {...aria} ref={panelRef as RefObject<HTMLElement>} className={panelClass}>
            {inner}
          </section>
        )}
      </div>
    </Portal>
  );
}
