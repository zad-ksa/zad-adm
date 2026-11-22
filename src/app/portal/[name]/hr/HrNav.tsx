"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChartColumn, Settings, Users } from "lucide-react";

import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";

/**
 * Sub-navigation for the HR section.
 *
 * Purely cosmetic: which tabs appear is decided by the server
 * (resolveCharityPortal) and each page re-checks its own permission, so a hidden
 * tab is not a protection.
 *
 * وشكلُه شكلُ `Tabs` من العدّة — خطٌّ تحت المُفعَّل — غير أنّ حلقاته روابطُ
 * صفحاتٍ لا أزرارُ عرضٍ في الصفحة نفسها، فلا تصلح `Tabs` نفسُها.
 */
export default function HrNav({
  charityName,
  canManageUsers,
  canManageAttendance,
  canViewReports,
}: {
  charityName: string;
  canManageUsers: boolean;
  canManageAttendance: boolean;
  canViewReports: boolean;
}) {
  const pathname = decodeURIComponent(usePathname());
  const base = decodeURIComponent(`/portal/${encodeURIComponent(charityName)}/hr`);

  // Attendance, its reports and its settings are one feature and go together;
  // the employees tab is a different job that happens to share this screen.
  const tabs = [
    {
      href: `${base}/attendance`,
      label: "تسجيل الحضور",
      icon: CalendarCheck,
      show: CHARITY_ATTENDANCE_ENABLED,
    },
    { href: base, label: "الموظفون", icon: Users, show: canManageUsers, exact: true },
    {
      href: `${base}/reports`,
      label: "التقارير",
      icon: ChartColumn,
      show: CHARITY_ATTENDANCE_ENABLED && canViewReports,
    },
    {
      href: `${base}/settings`,
      label: "الإعدادات",
      icon: Settings,
      show: CHARITY_ATTENDANCE_ENABLED && canManageAttendance,
    },
  ].filter((t) => t.show);

  if (tabs.length <= 1) return null;

  return (
    <nav
      aria-label="أقسام الموارد البشرية"
      className="flex flex-wrap gap-6 border-b border-slate-200 dark:border-slate-800"
    >
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 text-body font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isActive
                ? "border-primary text-slate-900 dark:border-teal-400 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            <tab.icon className="size-4 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
