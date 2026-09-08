export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { loadSettings } from "@/lib/zadAttendance";
import SettingsClient from "./SettingsClient";
import AttendanceTabs from "../AttendanceTabs";

export const metadata: Metadata = { title: "إعدادات التحضير | زاد التنموية" };

function daysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/**
 * Configuring the system. Checked here on the server, not merely hidden from
 * the tab strip — a hidden link is not a lock.
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

  const [settings, sites, groups, employees, holidays, leaves] = await Promise.all([
    loadSettings(),
    prisma.zadWorkSite.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.zadShiftGroup.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      include: { _count: { select: { members: true } } },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        shiftGroupId: true,
        annualLeaveDays: true,
        remoteWorkAllowed: true,
        zadLeaves: {
          where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
          select: { type: true, startDate: true, endDate: true },
        },
      },
    }),
    prisma.holiday.findMany({ orderBy: { startDate: "desc" }, take: 50 }),
    prisma.zadEmployeeLeave.findMany({
      where: { startDate: { lte: yearEnd }, endDate: { gte: yearStart } },
      orderBy: { startDate: "desc" },
      include: { employee: { select: { name: true } } },
    }),
  ]);

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

      <SettingsClient
        isOpen={settings.attendanceOpenedAt !== null}
        sites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          radiusMeters: s.radiusMeters,
        }))}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          startTime: g.startTime,
          endTime: g.endTime,
          lateAfterMinutes: g.lateAfterMinutes,
          earlyLeaveBeforeMinutes: g.earlyLeaveBeforeMinutes,
          workDays: g.workDays,
          isDefault: g.isDefault,
          memberCount: g._count.members,
        }))}
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          shiftGroupId: e.shiftGroupId,
          annualLeaveDays: e.annualLeaveDays,
          remoteWorkAllowed: e.remoteWorkAllowed,
          // Only ANNUAL spends the balance — see zadAttendance.ts.
          usedLeaveDays: e.zadLeaves
            .filter((l) => l.type === "ANNUAL")
            .reduce((sum, l) => sum + daysInclusive(l.startDate, l.endDate), 0),
        }))}
        holidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          startDate: h.startDate.toISOString(),
          endDate: h.endDate.toISOString(),
          scope: h.scope,
        }))}
        leaves={leaves.map((l) => ({
          id: l.id,
          employeeId: l.employeeId,
          employeeName: l.employee.name,
          type: l.type,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
        }))}
        ipRanges={settings.allowedIpRanges}
        ipMode={settings.ipEnforcement}
      />
    </main>
  );
}
