"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Clock, Settings2 } from "lucide-react";

/**
 * The three attendance screens.
 *
 * Cosmetic only: each page re-checks its own permission on the server, so a tab
 * missing here hides a link rather than closing a door.
 */
export default function AttendanceTabs({
  canManage,
  canViewReports,
}: {
  canManage: boolean;
  canViewReports: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/main/attendance", label: "حضوري", icon: Clock, show: true, exact: true },
    { href: "/main/attendance/reports", label: "التقارير", icon: BarChart3, show: canViewReports },
    { href: "/main/attendance/settings", label: "الإعدادات", icon: Settings2, show: canManage },
  ].filter((t) => t.show);

  if (tabs.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 mb-5 overflow-x-auto no-scrollbar" dir="rtl">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 h-9 px-4 rounded-xl text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors ${
              active
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
