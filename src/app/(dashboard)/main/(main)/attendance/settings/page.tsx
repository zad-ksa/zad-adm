export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin, PenLine, Users, Wifi } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { civilDaysOfMonth, currentRiyadhMonth } from "@/lib/attendanceTime";
import { loadSettings } from "@/lib/zadAttendance";
import AttendanceTabs from "../AttendanceTabs";
import GateCard from "./GateCard";

export const metadata: Metadata = { title: "إعدادات التحضير | زاد التنموية" };

/**
 * The hub. Six settings used to share one scroll; now each has its own route
 * and this page is the map.
 *
 * Every card carries a live count rather than a static blurb — the number is
 * the reason you would open that screen, so it belongs on the card that leads
 * there.
 */
export default async function AttendanceSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));

  const monthRange = civilDaysOfMonth(currentRiyadhMonth(now));

  const [
    settings,
    siteCount,
    groupCount,
    employeeCount,
    holidayCount,
    leaveCount,
    correctedThisMonth,
  ] = await Promise.all([
    loadSettings(),
    prisma.zadWorkSite.count({ where: { isActive: true } }),
    prisma.zadShiftGroup.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.holiday.count({ where: { endDate: { gte: yearStart } } }),
    prisma.zadEmployeeLeave.count({
      where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
    }),
    // Hand-entered days are worth a number on the card: a month full of them
    // says the automatic path is failing somewhere.
    prisma.zadAttendanceRecord.count({
      where: {
        manualAt: { not: null },
        ...(monthRange ? { workDate: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
    }),
  ]);

  const cards = [
    {
      href: "/main/attendance/settings/sites",
      icon: MapPin,
      title: "مواقع العمل",
      body: "النطاق الجغرافي الذي يُقبل التحضير من داخله.",
      count: siteCount === 0 ? "لا مواقع بعد" : `${siteCount} موقع`,
      tone: "text-blue-600 dark:text-blue-400",
      tile: "bg-blue-50 dark:bg-blue-900/20",
      warn: siteCount === 0,
    },
    {
      href: "/main/attendance/settings/groups",
      icon: Clock,
      title: "مجموعات الدوام",
      body: "أوقات كل مجموعة وأيام عملها، وإسناد الموظفين إليها.",
      count: `${groupCount} مجموعة · ${employeeCount} موظف`,
      tone: "text-primary",
      tile: "bg-primary/5 dark:bg-primary/10",
    },
    {
      href: "/main/attendance/settings/calendar",
      icon: CalendarDays,
      title: "التقويم",
      body: "العطل الرسمية وعطل زاد الخاصة — لا تُحسب غياباً ولا تُخصم.",
      count: holidayCount === 0 ? "التقويم فارغ" : `${holidayCount} مناسبة`,
      tone: "text-amber-600 dark:text-amber-400",
      tile: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      href: "/main/attendance/settings/leaves",
      icon: Users,
      title: "الإجازات والأرصدة",
      body: "رصيد كل موظف وما استهلكه، وإذن العمل عن بُعد.",
      count: leaveCount === 0 ? "لا إجازات هذا العام" : `${leaveCount} إجازة`,
      tone: "text-purple-600 dark:text-purple-400",
      tile: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      href: "/main/attendance/settings/records",
      icon: PenLine,
      title: "تعديل التحضير",
      body: "تصحيح يوم نُسي فيه التسجيل أو سُجّل بالخطأ.",
      count:
        correctedThisMonth === 0
          ? "لا تعديلات هذا الشهر"
          : `${correctedThisMonth} تعديل هذا الشهر`,
      tone: "text-slate-600 dark:text-slate-300",
      tile: "bg-slate-100 dark:bg-slate-800",
    },
    {
      href: "/main/attendance/settings/network",
      icon: Wifi,
      title: "شبكة المكتب",
      body: "طبقة اختيارية فوق الموقع الجغرافي، لمن له عنوان IP ثابت.",
      count:
        settings.ipEnforcement === "OFF"
          ? "معطّلة"
          : settings.ipEnforcement === "WARN"
            ? "تنبيه فقط"
            : "منع من خارجها",
      tone: "text-rose-600 dark:text-rose-400",
      tile: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">التحضير</h1>
      </header>

      <AttendanceTabs
        canManage
        canViewReports={hasPermission(
          session.role,
          session.permissions || [],
          "view_zad_attendance_reports"
        )}
      />

      <div className="space-y-5">
        <GateCard isOpen={settings.attendanceOpenedAt !== null} siteCount={siteCount} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all overflow-hidden relative"
            >
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
              <div
                className={`w-11 h-11 ${card.tile} ${card.tone} rounded-2xl flex items-center justify-center mb-3.5 group-hover:scale-110 group-hover:-rotate-3 transition-transform shadow-inner`}
              >
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                {card.title}
              </h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                {card.body}
              </p>
              <div className="flex items-center justify-between gap-2 relative">
                <span
                  className={`text-[11px] font-bold tabular-nums ${
                    card.warn ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {card.count}
                </span>
                <ArrowLeft
                  className={`w-4 h-4 ${card.tone} group-hover:-translate-x-1 transition-transform`}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
