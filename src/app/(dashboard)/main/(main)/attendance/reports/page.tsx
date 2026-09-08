export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  civilDaysOfMonth,
  currentRiyadhMonth,
  elapsedWorkDays,
  fallsWithin,
} from "@/lib/attendanceTime";
import { loadSchedulesFor } from "@/lib/zadAttendance";
import AttendanceTabs from "../AttendanceTabs";
import ReportClient from "./ReportClient";

export const metadata: Metadata = { title: "تقارير التحضير | زاد التنموية" };

/**
 * Everyone's month.
 *
 * The absence count is the only figure here that is computed rather than
 * recorded, so it is worth stating how: a working day is counted absent when it
 * has passed, falls on that employee's own working days, is not a holiday of
 * either scope, is not covered by their leave, and carries no record.
 *
 * Each of those exclusions is a real day someone did not owe. Leaving any one
 * out would invent absences — which is why the count is assembled here from all
 * of them rather than by asking the attendance table what is missing.
 */
export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "view_zad_attendance_reports")) {
    redirect("/main/attendance");
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentRiyadhMonth();
  const range = civilDaysOfMonth(month);
  if (!range) redirect("/main/attendance/reports");

  const [employees, records, holidays, leaves] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shiftGroup: { select: { name: true } } },
    }),
    prisma.zadAttendanceRecord.findMany({
      where: { workDate: { gte: range.start, lte: range.end } },
      orderBy: { workDate: "asc" },
      select: {
        employeeId: true,
        workDate: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        isRemote: true,
        isSuspicious: true,
        suspiciousReason: true,
        autoClosedAt: true,
      },
    }),
    // Both scopes: an official holiday and a Zad closure are equally days
    // nobody owed.
    prisma.holiday.findMany({
      where: { startDate: { lte: range.end }, endDate: { gte: range.start } },
      select: { startDate: true, endDate: true },
    }),
    prisma.zadEmployeeLeave.findMany({
      where: { startDate: { lte: range.end }, endDate: { gte: range.start } },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);

  const schedules = await loadSchedulesFor(employees.map((e) => e.id));

  const rows = employees.map((employee) => {
    const schedule = schedules.get(employee.id);
    const workDays = schedule?.workDays ?? [0, 1, 2, 3, 4];

    // Days already gone by — today is not yet an absence for anyone.
    const elapsed = elapsedWorkDays(range, workDays);

    const mine = records.filter((r) => r.employeeId === employee.id);
    const recorded = new Set(mine.map((r) => r.workDate.toISOString()));
    const myLeaves = leaves.filter((l) => l.employeeId === employee.id);

    const absent = elapsed.filter(
      (day) =>
        !recorded.has(day.toISOString()) &&
        !fallsWithin(day, holidays) &&
        !fallsWithin(day, myLeaves)
    ).length;

    return {
      employeeId: employee.id,
      name: employee.name,
      groupName: employee.shiftGroup?.name ?? "الافتراضية",
      present: mine.filter((r) => r.status === "PRESENT").length,
      late: mine.filter((r) => r.status === "LATE").length,
      earlyLeave: mine.filter((r) => r.status === "EARLY_LEAVE").length,
      remote: mine.filter((r) => r.isRemote).length,
      absent,
      suspicious: mine.filter((r) => r.isSuspicious).length,
      days: mine.map((r) => ({
        workDate: r.workDate.toISOString(),
        status: r.status,
        checkInAt: r.checkInAt?.toISOString() ?? null,
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        isRemote: r.isRemote,
        autoClosedAt: r.autoClosedAt?.toISOString() ?? null,
        suspiciousReason: r.suspiciousReason,
      })),
    };
  });

  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">التحضير</h1>
      </header>

      <AttendanceTabs
        canManage={hasPermission(session.role, session.permissions || [], "manage_zad_attendance")}
        canViewReports
      />

      <ReportClient month={month} rows={rows} />
    </main>
  );
}
