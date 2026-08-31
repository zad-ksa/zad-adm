"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChartColumn, Settings, Users } from "lucide-react";
import { fs } from "./ui";
import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";

/**
 * Sub-navigation for the HR section.
 *
 * Purely cosmetic: which tabs appear is decided by the server
 * (resolveCharityPortal) and each page re-checks its own permission, so a hidden
 * tab is not a protection.
 *
 * The hover treatment is the `.hr-navlink` rule — an underline that grows from
 * the inline-start edge rather than fading in, so it reads as intentional
 * rather than as an accidental hover state.
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
      className="hr-rule flex flex-wrap gap-2 pb-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            style={fs.body}
            className={`hr-navlink flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${
              isActive
                ? "text-primary dark:text-teal-400 bg-primary/[0.06] dark:bg-teal-400/[0.06]"
                : "text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-400"
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
