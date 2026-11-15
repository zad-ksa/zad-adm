"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { cx } from "./ui";

/**
 * جرسُ الإشعارات — عدّادٌ ولوحةٌ تُفتح، بلا علمٍ بمصدر الإشعارات.
 *
 * ولمَ في العدة: بوّابةُ الجمعية تحتاجه كما تحتاجه لوحةُ زاد، ولكلٍّ جدولُه
 * وأفعالُه (`CharityNotification` و`AppNotification`). فالمعروضُ واحدٌ
 * والمصدرُ محقونٌ: `items` و`onOpen` و`onPick` و`onClearAll`.
 *
 * **والفتحُ يسمُ المقروءَ ولا يحذفه**: الحذفُ فعلٌ يُطلب بزرّه. وكان جرسُ زاد
 * يحذف الإشعارَ بالنقر عليه ثمّ ينقل القارئَ إلى رابطه — فمن نقر ليقرأ فقد
 * الإشعارَ ولم يبقَ له أثرٌ يرجع إليه.
 */

export type BellNotice = {
  id: string;
  title: string;
  message?: string | null;
  link?: string | null;
  isRead?: boolean;
  /** ISO — يُعرض نسبيّاً إن أُعطيت `relativeTime`. */
  at?: string | null;
};

export default function NotificationBell({
  items,
  unread,
  label = "الإشعارات",
  emptyText = "لا إشعارات",
  relativeTime,
  onOpen,
  onPick,
  onDelete,
  onClearAll,
  className,
}: {
  items: BellNotice[];
  unread: number;
  label?: string;
  emptyText?: string;
  /** صياغةُ «قبل ساعة» — تُمرَّر لأنّ العدةَ لا تفرض تقويماً. */
  relativeTime?: (iso: string) => string;
  /** يُنادى عند أوّل فتحٍ وفيه غيرُ مقروء — وسمُ الكلِّ مقروءاً. */
  onOpen?: () => void;
  onPick?: (notice: BellNotice) => void;
  onDelete?: (notice: BellNotice) => void;
  onClearAll?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // العدّادُ ليس حالةً هنا بل خبرٌ من المنادي: نسخةٌ محليّةٌ تُزامَن بـ`useEffect`
  // تُراكم التصييرَ (`react-hooks/set-state-in-effect` يمنعها)، وتفترق عن
  // الحقيقة إن وصل إشعارٌ جديدٌ وهي مصفَّرة. فالفتحُ يُخبر المنادي، وهو يُصفِّر
  // ويُعيد الجلب.
  useEffect(() => {
    if (!open) return;
    const onAway = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) onOpen?.();
  };

  return (
    <div className={cx("relative", className)} ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        title={label}
        className="relative grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-800 dark:text-slate-400"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-slate-900">
            {unread > 9 ? "٩+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          dir="rtl"
          className="absolute top-full left-0 z-[60] mt-2 flex max-h-[22rem] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="text-caption font-semibold text-slate-700 dark:text-slate-200">{label}</span>
            {items.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-caption font-semibold text-red-500 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-red-400/40"
              >
                مسح الكل
              </button>
            )}
          </div>

          <ul className="flex-1 overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-caption text-slate-400">{emptyText}</li>
            ) : (
              items.map((notice) => (
                <li key={notice.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => {
                      onPick?.(notice);
                      setOpen(false);
                    }}
                    className={cx(
                      "block w-full rounded-lg border px-2.5 py-2 pe-8 text-start outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40",
                      notice.isRead
                        ? "border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        : "border-primary/15 bg-primary/5 hover:bg-primary/10"
                    )}
                  >
                    <span className="block text-caption font-semibold text-slate-800 dark:text-slate-100">
                      {notice.title}
                    </span>
                    {notice.message && (
                      <span className="mt-0.5 block text-caption leading-5 text-slate-500 dark:text-slate-400">
                        {notice.message}
                      </span>
                    )}
                    {notice.at && relativeTime && (
                      <span className="mt-0.5 block text-caption text-slate-400">{relativeTime(notice.at)}</span>
                    )}
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(notice)}
                      aria-label={`حذف الإشعار: ${notice.title}`}
                      className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-md text-slate-300 opacity-0 outline-none transition hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-red-400/40 group-hover:opacity-100 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
