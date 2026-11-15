"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/app/actions/auth";
import PortalNotices from "./PortalNotices";
import type { CharityNotice } from "@/app/actions/charityNotifications";

/**
 * شريطُ البوّابة الأعلى — جرسٌ، ومظهرٌ، وحسابُ القارئ.
 *
 * وهو شريطُ لوحة زادٍ نفسُه (`FloatingHeader`) ترتيباً وقياساً: الجرسُ ثمّ
 * المظهرُ ثمّ الحساب. ولم يُستعمل ذاك كما هو: يقرأ وسومَ الأدوار من
 * `RoleLabelsProvider` ويُفضي إلى `/main/profile` — وكلاهما من لوحة زاد لا من
 * البوّابة. فالمعروضُ واحدٌ والمقصدُ مختلف.
 *
 * **والمظهرُ هنا لا في الشريط الجانبيّ**: كان زرُّه داخل بطاقة الجمعية في
 * الشريط، `div` بـ`onClick` داخل زرٍّ آخر — فنقرةٌ واحدةٌ تفتح قائمةَ الجمعية
 * وتُبدِّل المظهرَ معاً عند من يقرأ بلوحة المفاتيح. وموضعُه في زادٍ أعلى
 * الصفحة، فصار كذلك.
 */
export default function PortalTopBar({
  charityName,
  accountName,
  accountTitle,
  notices,
  className,
}: {
  charityName: string;
  accountName?: string | null;
  accountTitle?: string | null;
  notices: { notices: CharityNotice[]; unread: number };
  className?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={className ?? "flex items-center gap-2"}>
      <PortalNotices initial={notices} />

      {/* الأيقونتان مرسومتان كلتاهما، وتُظهر إحداهما CSS بحسب المظهر الجاري —
          لا حالةُ «رُكِّب» تُضبط في `useEffect` (وهي ممنوعةٌ في هذا المستودع:
          `react-hooks/set-state-in-effect`). والخادمُ لا يعرف مظهرَ المتصفّح،
          فلو اختِيرت الأيقونةُ في جواسكربت لرُسمت شمسٌ لمن هو في الداكن حتى
          أوّل تفاعل. */}
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        title="تبديل الوضع الداكن/الفاتح"
        aria-label="تبديل الوضع الداكن/الفاتح"
        className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-500 outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:bg-slate-800 dark:text-slate-400"
      >
        <Moon className="size-4 dark:hidden" />
        <Sun className="hidden size-4 dark:block" />
      </button>

      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          title="الحساب"
          className="group flex items-center gap-2 px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
        >
          {/* الاسمُ من الشاشات الكبيرة فقط: في رأس الجوّال يُزاحم اسمَ الجمعية
              وزرَّ القائمة، كما في شريط لوحة زاد. */}
          <span className="me-1 hidden max-w-[160px] flex-col items-start lg:flex">
            <span className="w-full truncate text-caption font-semibold text-slate-800 dark:text-slate-100">
              {accountName || "الحساب"}
            </span>
            {accountTitle && (
              <span className="w-full truncate text-caption text-slate-500 dark:text-slate-400">{accountTitle}</span>
            )}
          </span>
          <span className="grid size-9 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary transition group-hover:ring-2 group-hover:ring-primary/40">
            <User className="size-4" />
          </span>
        </button>

        {open && (
          <div
            role="menu"
            dir="rtl"
            className="absolute top-full left-0 z-[60] mt-2 flex w-48 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            <Link
              href={`/portal/${encodeURIComponent(charityName)}/profile`}
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-caption font-semibold text-slate-700 outline-none transition hover:bg-slate-50 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              <User className="size-4 text-slate-400" />
              الملف الشخصي
            </Link>
            <div className="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-700/50" />
            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-caption font-semibold text-red-500 outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-400/40 dark:hover:bg-red-900/20"
              >
                <LogOut className="size-4 text-red-400" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
