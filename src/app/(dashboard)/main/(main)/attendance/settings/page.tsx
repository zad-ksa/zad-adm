export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PageHeader } from "@/components/console/layout";
import { NavCard } from "@/components/console/ui";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin, PenLine, Users, Wifi } from "lucide-react";
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
      warn: siteCount === 0,
    },
    {
      href: "/main/attendance/settings/groups",
      icon: Clock,
      title: "مجموعات الدوام",
      body: "أوقات كل مجموعة وأيام عملها، وإسناد الموظفين إليها.",
      count: `${groupCount} مجموعة · ${employeeCount} موظف`,
    },
    {
      href: "/main/attendance/settings/calendar",
      icon: CalendarDays,
      title: "التقويم",
      body: "العطل الرسمية وعطل زاد الخاصة — لا تُحسب غياباً ولا تُخصم.",
      count: holidayCount === 0 ? "التقويم فارغ" : `${holidayCount} مناسبة`,
    },
    {
      href: "/main/attendance/settings/leaves",
      icon: Users,
      title: "الإجازات والأرصدة",
      body: "رصيد كل موظف وما استهلكه، وإذن العمل عن بُعد.",
      count: leaveCount === 0 ? "لا إجازات هذا العام" : `${leaveCount} إجازة`,
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
    },
  ];

  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <div className="mb-4">
        <PageHeader
          crumbs={[{ label: "التحضير", href: "/main/attendance" }, { label: "الإعدادات" }]}
          title="الإعدادات"
          description="الدوام ومجموعاته، ومواقع العمل، والإجازات والعطل، وسجلات الحضور."
        />
      </div>

      <AttendanceTabs
        canManage
        canViewReports={hasPermission(
          session.role,
          session.permissions || [],
          "manage_zad_attendance"
        )}
      />

      <div className="space-y-5">
        <GateCard isOpen={settings.attendanceOpenedAt !== null} siteCount={siteCount} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <NavCard
              key={card.href}
              href={card.href}
              icon={<card.icon className="size-5" />}
              title={card.title}
              description={card.body}
              meta={card.count}
              metaWarn={!!card.warn}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
