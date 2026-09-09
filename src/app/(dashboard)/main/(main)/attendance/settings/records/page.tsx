export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  civilDaysOfMonth,
  currentRiyadhMonth,
  fallsWithin,
  toCivilDate,
} from "@/lib/attendanceTime";
import { loadEmployeeSchedule } from "@/lib/zadAttendance";
import SettingsShell from "../SettingsShell";
import RecordsClient from "./RecordsClient";

export const metadata: Metadata = { title: "تعديل التحضير | زاد التنموية" };

const DAY_MS = 86_400_000;

/**
 * One employee's month, day by day — including the days with no record.
 *
 * A correction screen that lists only existing rows can never fix the most
 * common fault, which is a day that has no row at all. So the month is built
 * from the calendar and the records are laid onto it.
 */
export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const { employee: employeeParam, month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentRiyadhMonth();
  const range = civilDaysOfMonth(month);
  if (!range) redirect("/main/attendance/settings/records");

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const selectedId =
    employeeParam && employees.some((e) => e.id === employeeParam)
      ? employeeParam
      : (employees[0]?.id ?? null);

  if (!selectedId) {
    return (
      <SettingsShell
        title="تعديل التحضير"
        canViewReports={hasPermission(
          session.role,
          session.permissions || [],
          "view_zad_attendance_reports"
        )}
      >
        <p className="text-[13px] text-slate-500 dark:text-slate-400">لا يوجد موظفون نشطون.</p>
      </SettingsShell>
    );
  }

  const [records, holidays, leaves, schedule, ownGroup, defaultGroup] = await Promise.all([
    prisma.zadAttendanceRecord.findMany({
      where: { employeeId: selectedId, workDate: { gte: range.start, lt: range.end } },
      orderBy: { workDate: "asc" },
    }),
    prisma.holiday.findMany({
      where: { startDate: { lt: range.end }, endDate: { gte: range.start } },
      select: { name: true, startDate: true, endDate: true },
    }),
    prisma.zadEmployeeLeave.findMany({
      where: {
        employeeId: selectedId,
        startDate: { lt: range.end },
        endDate: { gte: range.start },
      },
      select: { type: true, startDate: true, endDate: true },
    }),
    loadEmployeeSchedule(selectedId),
    // The schedule itself carries no name, and the name is what makes the
    // header useful: it says which group's hours these times are judged by.
    prisma.employee.findUnique({
      where: { id: selectedId },
      select: { shiftGroup: { select: { name: true } } },
    }),
    prisma.zadShiftGroup.findFirst({ where: { isDefault: true }, select: { name: true } }),
  ]);

  // Who made each correction, resolved once rather than per row.
  const editorIds = [...new Set(records.map((r) => r.manualById).filter(Boolean))] as string[];
  const editors = editorIds.length
    ? await prisma.employee.findMany({
        where: { id: { in: editorIds } },
        select: { id: true, name: true },
      })
    : [];
  const editorName = new Map(editors.map((e) => [e.id, e.name]));

  const today = toCivilDate(new Date());
  const byDate = new Map(records.map((r) => [r.workDate.toISOString(), r]));

  const days: {
    date: string;
    isWorkDay: boolean;
    isFuture: boolean;
    holidayName: string | null;
    leaveType: string | null;
    record: {
      status: string;
      checkInAt: string | null;
      checkOutAt: string | null;
      isRemote: boolean;
      autoClosedAt: string | null;
      isSuspicious: boolean;
      suspiciousReason: string | null;
      manualAt: string | null;
      manualReason: string | null;
      manualByName: string | null;
    } | null;
  }[] = [];

  for (let t = range.start.getTime(); t < range.end.getTime(); t += DAY_MS) {
    const day = new Date(t);
    const record = byDate.get(day.toISOString()) ?? null;
    const leave = leaves.find(
      (l) => t >= l.startDate.getTime() && t <= l.endDate.getTime()
    );
    const holiday = holidays.find(
      (h) => t >= h.startDate.getTime() && t <= h.endDate.getTime()
    );

    days.push({
      date: day.toISOString().slice(0, 10),
      isWorkDay: schedule.workDays.includes(day.getUTCDay()),
      isFuture: t > today.getTime(),
      holidayName: holiday?.name ?? null,
      leaveType: leave?.type ?? null,
      record: record
        ? {
            status: record.status,
            checkInAt: record.checkInAt?.toISOString() ?? null,
            checkOutAt: record.checkOutAt?.toISOString() ?? null,
            isRemote: record.isRemote,
            autoClosedAt: record.autoClosedAt?.toISOString() ?? null,
            isSuspicious: record.isSuspicious,
            suspiciousReason: record.suspiciousReason,
            manualAt: record.manualAt?.toISOString() ?? null,
            manualReason: record.manualReason,
            manualByName: record.manualById
              ? (editorName.get(record.manualById) ?? "مستخدم محذوف")
              : null,
          }
        : null,
    });
  }

  // Only holidays that actually land in this month matter to the note below.
  const monthHolidays = holidays.filter((h) =>
    fallsWithin(range.start, [{ startDate: h.startDate, endDate: h.endDate }])
  ).length;

  return (
    <SettingsShell
      title="تعديل التحضير"
      description="لتصحيح يوم نُسي فيه التسجيل أو سُجّل بالخطأ. كل تعديل يُوسم باسم من أجراه وسببه، ويبقى ظاهراً في التقارير وفي شاشة الموظف."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <RecordsClient
        employees={employees}
        selectedId={selectedId}
        month={month}
        days={days}
        schedule={{
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          groupName: ownGroup?.shiftGroup?.name ?? defaultGroup?.name ?? "الافتراضية",
        }}
        hasMonthHolidays={monthHolidays > 0}
      />
    </SettingsShell>
  );
}
