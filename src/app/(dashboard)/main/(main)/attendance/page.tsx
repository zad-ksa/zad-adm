export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCivilDate, civilDaysOfMonth, currentRiyadhMonth } from "@/lib/attendanceTime";
import { loadAttendanceGate, loadEmployeeSchedule } from "@/lib/zadAttendance";
import { hasPermission } from "@/lib/permissions";
import AttendanceTabs from "./AttendanceTabs";
import MyAttendanceClient from "./MyAttendanceClient";

export const metadata: Metadata = { title: "التحضير | زاد التنموية" };

/**
 * Every Zad employee sees this — recording your own attendance is not a
 * privilege. What sits behind a permission is configuring the system and
 * reading other people's days, and those live on their own routes.
 */
export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");

  const now = new Date();
  const workDate = toCivilDate(now);
  const monthRange = civilDaysOfMonth(currentRiyadhMonth(now));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));

  const [openedAt, schedule, employee, records, leaves, siteCount, group] = await Promise.all([
    loadAttendanceGate(),
    loadEmployeeSchedule(session.id),
    prisma.employee.findUnique({
      where: { id: session.id },
      select: { remoteWorkAllowed: true },
    }),
    prisma.zadAttendanceRecord.findMany({
      where: {
        employeeId: session.id,
        ...(monthRange ? { workDate: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
      orderBy: { workDate: "desc" },
      select: {
        workDate: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        isRemote: true,
        autoClosedAt: true,
        manualAt: true,
        manualReason: true,
        workSite: { select: { name: true } },
      },
    }),
    prisma.zadEmployeeLeave.findMany({
      where: { employeeId: session.id, startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
      orderBy: { startDate: "asc" },
      select: { type: true, startDate: true, endDate: true },
    }),
    prisma.zadWorkSite.count({ where: { isActive: true } }),
    prisma.employee.findUnique({
      where: { id: session.id },
      select: { shiftGroup: { select: { name: true } } },
    }),
  ]);

  const rows = records.map((r) => ({
    workDate: r.workDate.toISOString(),
    status: r.status,
    checkInAt: r.checkInAt?.toISOString() ?? null,
    checkOutAt: r.checkOutAt?.toISOString() ?? null,
    siteName: r.workSite?.name ?? null,
    isRemote: r.isRemote,
    autoClosedAt: r.autoClosedAt?.toISOString() ?? null,
    // The employee is the person with the most right to know that a day of
    // theirs was written by someone else, and on what grounds.
    manualAt: r.manualAt?.toISOString() ?? null,
    manualReason: r.manualReason,
  }));

  const today = rows.find((r) => r.workDate === workDate.toISOString()) ?? null;

  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <header className="mb-5">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">التحضير</h1>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
          حضورك وانصرافك هذا الشهر
        </p>
      </header>

      <AttendanceTabs
        canManage={hasPermission(session.role, session.permissions || [], "manage_zad_attendance")}
        canViewReports={hasPermission(
          session.role,
          session.permissions || [],
          "view_zad_attendance_reports"
        )}
      />

      <MyAttendanceClient
        isOpen={openedAt !== null}
        schedule={{ ...schedule, groupName: group?.shiftGroup?.name ?? "الدوام الافتراضي" }}
        today={today}
        month={rows}
        myLeaves={leaves.map((l) => ({
          type: l.type,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
        }))}
        remoteAllowed={employee?.remoteWorkAllowed ?? false}
        hasSites={siteCount > 0}
      />
    </main>
  );
}
