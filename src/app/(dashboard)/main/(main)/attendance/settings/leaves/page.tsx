export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { toCivilDate } from "@/lib/attendanceTime";
import { isDeductible } from "@/lib/zadAttendance";
import SettingsShell from "../SettingsShell";
import LeavesClient from "./LeavesClient";

export const metadata: Metadata = { title: "الإجازات والأرصدة | زاد التنموية" };

const DAY_MS = 86_400_000;

/** Whole days in an inclusive range, counted the way a person counts them. */
function daysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

/** How far ahead the team strip looks. A month is what a manager plans over. */
const HORIZON_DAYS = 30;

export default async function LeavesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const now = new Date();
  const today = toCivilDate(now);
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
  const horizonEnd = new Date(today.getTime() + (HORIZON_DAYS - 1) * DAY_MS);

  const [employees, leaves, holidays, defaultGroup] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        annualLeaveDays: true,
        remoteWorkAllowed: true,
        zadLeaves: {
          where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
          select: { type: true, startDate: true, endDate: true },
        },
      },
    }),
    // The whole year, so the log and the strip come from one fetch. Anything
    // touching the horizon is inside this window already.
    prisma.zadEmployeeLeave.findMany({
      where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
      orderBy: { startDate: "desc" },
      include: { employee: { select: { name: true } } },
    }),
    prisma.holiday.findMany({
      where: { startDate: { lte: horizonEnd }, endDate: { gte: today } },
      select: { name: true, startDate: true, endDate: true },
    }),
    prisma.zadShiftGroup.findFirst({
      where: { isDefault: true },
      select: { workDays: true },
    }),
  ]);

  return (
    <SettingsShell
      title="الإجازات والأرصدة"
      description="رصيد كل موظف وما استهلكه هذا العام، ومن سيكون خارج الدوام في الشهر القادم."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <LeavesClient
        todayIso={today.toISOString()}
        horizonDays={HORIZON_DAYS}
        workDays={defaultGroup?.workDays ?? [0, 1, 2, 3, 4]}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          annualLeaveDays: e.annualLeaveDays,
          remoteWorkAllowed: e.remoteWorkAllowed,
          // Only the deductible kinds spend the balance — see zadAttendance.ts.
          usedLeaveDays: e.zadLeaves
            .filter((l) => isDeductible(l.type))
            .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate), 0),
        }))}
        leaves={leaves.map((l) => ({
          id: l.id,
          employeeId: l.employeeId,
          employeeName: l.employee.name,
          type: l.type,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          days: daysInclusive(l.startDate, l.endDate),
          deducts: isDeductible(l.type),
        }))}
        holidays={holidays.map((h) => ({
          name: h.name,
          startDate: h.startDate.toISOString(),
          endDate: h.endDate.toISOString(),
        }))}
      />
    </SettingsShell>
  );
}
