"use client";

import { useEffect, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { Ellipsis, TriangleAlert, X } from "lucide-react";
import { btn, cx } from "./ui";

// الطبقات العائمة لصفحات الإدارة: اللوحة الجانبية، والتأكيد، والإشعار، وقائمة الصف.

/**
 * لوحة جانبية تنزلق من طرف الصفحة. المحتوى داخل <form> دائماً، فيحفظ Enter،
 * ويُغلق Esc ما لم يكن حفظٌ جارياً.
 */
export function Sheet({
  title,
  subtitle,
  leading,
  headerAction,
  tabs,
  footer,
  children,
  onClose,
  onSubmit,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  headerAction?: ReactNode;
  tabs?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onSubmit?: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] motion-safe:animate-[zad-fade-in_150ms_ease-out]"
        onClick={() => !busy && onClose()}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        className="absolute inset-y-0 left-0 flex w-full flex-col border-r border-slate-200 bg-white text-slate-900 shadow-[0_0_60px_rgb(15_23_42/0.18)] sm:max-w-[640px] motion-safe:animate-[zad-sheet-in_240ms_cubic-bezier(0.16,1,0.3,1)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className={cx("flex items-start justify-between gap-4 px-6 pt-5", tabs ? "pb-3" : "border-b border-slate-200 pb-4 dark:border-slate-800")}>
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold tracking-tight">{title}</h2>
              {subtitle && <p className="truncate text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button type="button" onClick={onClose} disabled={busy} aria-label="إغلاق" className={cx(btn.ghost, "size-8 px-0")}>
              <X className="size-4" />
            </button>
          </div>
        </div>
        {tabs}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-3 dark:border-slate-800 dark:bg-slate-950/40">
            {footer}
          </div>
        )}
      </form>
    </div>
  );
}

/** يسار التذييل: الخطأ إن وُجد، وإلا ملخّص ما سيُحفظ. */
export function FooterStatus({ error, children }: { error: string | null; children: ReactNode }) {
  return error ? (
    <p role="alert" className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-red-600 dark:text-red-400">
      <TriangleAlert className="size-4 shrink-0" />
      <span className="truncate" title={error}>
        {error}
      </span>
    </p>
  ) : (
    <p className="min-w-0 truncate text-[12.5px] text-slate-500 dark:text-slate-400">{children}</p>
  );
}

// ConfirmDialog انتقل إلى console/ConfirmDialog.tsx: حوارٌ واحدٌ بصيغتين
// بدل تطبيقين متوازيين.

// التنبيه انتقل إلى console/Toast.tsx: واحدٌ بثلاث نبرات بدل تطبيقين.

export type MenuAnchor = { id: string; top: number; left: number };

/**
 * قائمة إجراءات الصف. تُرسم ثابتة الموضع خارج الجدول، فلا يقصّها تمريره
 * الأفقي، وتُغلق بالنقر خارجها أو بالتمرير أو بـEsc.
 */
export function useRowMenu() {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  const toggle = (event: MouseEvent<HTMLElement>, id: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchor((current) => (current?.id === id ? null : { id, top: rect.bottom + 6, left: Math.max(8, rect.left) }));
  };

  return { anchor, toggle, close: () => setAnchor(null) };
}

export function RowMenuTrigger({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      // يمنع مستمع النقر الخارجي من إغلاق القائمة قبل أن يقلبها هذا الزر.
      onMouseDown={(e) => e.stopPropagation()}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={expanded}
      className={cx(btn.ghost, "size-8 px-0")}
    >
      <Ellipsis className="size-4" />
    </button>
  );
}

export function RowMenu({ anchor, children }: { anchor: MenuAnchor | null; children: ReactNode }) {
  if (!anchor) return null;
  return (
    <div
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ top: anchor.top, left: anchor.left }}
      className="fixed z-40 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-[0_8px_30px_rgb(15_23_42/0.12)] motion-safe:animate-[zad-pop-in_120ms_ease-out] dark:border-slate-800 dark:bg-slate-900"
    >
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-right text-[13px] transition-colors outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        tone === "danger"
          ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      )}
    >
      <span className={tone === "danger" ? "" : "text-slate-400"}>{icon}</span>
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />;
}
