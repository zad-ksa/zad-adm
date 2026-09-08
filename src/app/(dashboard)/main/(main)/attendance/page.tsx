export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCivilDate, civilDaysOfMonth, currentRiyadhMonth } from "@/lib/attendanceTime";
import { loadAttendanceGate, loadEmployeeSchedule, isDeductible } from "@/lib/zadAttendance";
import MyAttendanceClient from "./MyAttendanceClient";

export const metadata: Metadata = { title: "التحضير | زاد التنموية" };

/** Whole days in an inclusive range, counted the way a person counts them. */
function daysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

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
      select: { annualLeaveDays: true, remoteWorkAllowed: true },
    }),
    prisma.zadAttendanceRecord.findMany({
      where: {
        employeeId: session.id,
        ...(monthRange ? { workDate: { gte: monthRange.start, lte: monthRange.end } } : {}),
      },
      orderBy: { workDate: "desc" },
      select: {
        workDate: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
        isRemote: true,
        autoClosedAt: true,
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
  }));

  const today = rows.find((r) => r.workDate === workDate.toISOString()) ?? null;

  // Only ANNUAL spends the balance. Sick and unpaid leave are recorded and cost
  // nothing, and a holiday of either scope belongs to nobody, so it cannot be
  // charged to anybody — see zadAttendance.ts.
  const used = leaves
    .filter((l) => isDeductible(l.type))
    .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate), 0);

  const total = employee?.annualLeaveDays ?? 21;

  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <header className="mb-5">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">التحضير</h1>
        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
          حضورك وانصرافك ورصيد إجازاتك
        </p>
      </header>

      <MyAttendanceClient
        isOpen={openedAt !== null}
        schedule={{ ...schedule, groupName: group?.shiftGroup?.name ?? "الدوام الافتراضي" }}
        today={today}
        month={rows}
        leaveBalance={{
          total,
          used,
          remaining: Math.max(0, total - used),
          entries: leaves.map((l) => ({
            type: l.type,
            startDate: l.startDate.toISOString(),
            endDate: l.endDate.toISOString(),
          })),
        }}
        remoteAllowed={employee?.remoteWorkAllowed ?? false}
        hasSites={siteCount > 0}
      />
    </main>
  );
}
