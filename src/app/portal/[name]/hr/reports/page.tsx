import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartColumn } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  civilDaysOfMonth,
  currentRiyadhMonth,
  elapsedWorkDays,
  toCivilDate,
  DEFAULT_SCHEDULE,
} from "@/lib/attendanceTime";
import { resolveCharityPortal } from "@/lib/portalAccess";
import HrNav from "../HrNav";
import AttendanceReportClient from "./AttendanceReportClient";
import { HrPageHeader } from "../ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `تقارير الحضور | ${decodeURIComponent(name)}` };
}

export default async function AttendanceReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { name } = await params;
  const { month: monthParam } = await searchParams;
  const { charity, can } = await resolveCharityPortal(name);

  if (!can("view_attendance_reports")) notFound();

  // Falls back to the current month rather than erroring on a hand-edited query
  // string — the URL is user-controlled and a bad value is not worth a 500.
  const month = monthParam && civilDaysOfMonth(monthParam) ? monthParam : currentRiyadhMonth();
  const range = civilDaysOfMonth(month)!;

  const [records, staff, scheduleRow] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { charityId: charity.id, workDate: { gte: range.start, lt: range.end } },
      include: {
        user: { select: { id: true, name: true } },
        workSite: { select: { name: true } },
      },
      orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }],
    }),
    prisma.charityUserCharity.findMany({
      where: { charityId: charity.id, isActive: true },
      select: { assignedAt: true, user: { select: { id: true, name: true } } },
    }),
    prisma.charityWorkSchedule.findUnique({ where: { charityId: charity.id } }),
  ]);

  const summary = new Map<
    string,
    {
      id: string;
      name: string;
      present: number;
      late: number;
      earlyLeave: number;
      absent: number;
      suspicious: number;
    }
  >();
  for (const s of staff) {
    summary.set(s.user.id, {
      id: s.user.id,
      name: s.user.name,
      present: 0,
      late: 0,
      earlyLeave: 0,
      absent: 0,
      suspicious: 0,
    });
  }
  for (const r of records) {
    // Someone deactivated mid-month still has attendance worth reporting, so
    // rows are added for people who are no longer in the active staff list.
    const entry =
      summary.get(r.charityUserId) ?? {
        id: r.charityUserId,
        name: r.user.name,
        present: 0,
        late: 0,
        earlyLeave: 0,
        absent: 0,
        suspicious: 0,
      };
    if (r.status === "LATE") entry.late += 1;
    else if (r.status === "EARLY_LEAVE") entry.earlyLeave += 1;
    else if (r.status === "PRESENT") entry.present += 1;
    if (r.isSuspicious) entry.suspicious += 1;
    summary.set(r.charityUserId, entry);
  }

  // Absence is derived, never stored: a person who does not come leaves no row
  // at all, so it is the elapsed working days minus the days they filed.
  //
  // Counted only for people still on the active roster, and only from the day
  // they joined this charity. A membership that has since been deactivated is
  // skipped entirely — the row carries no record of WHEN it was switched off,
  // so every day since their last check-in would otherwise be reported as an
  // absence for someone who had already left.
  const workDays = scheduleRow?.workDays ?? DEFAULT_SCHEDULE.workDays;
  const workingDays = elapsedWorkDays(range, workDays);

  const filedDays = new Map<string, Set<number>>();
  for (const r of records) {
    const set = filedDays.get(r.charityUserId) ?? new Set<number>();
    set.add(r.workDate.getTime());
    filedDays.set(r.charityUserId, set);
  }

  for (const s of staff) {
    const entry = summary.get(s.user.id);
    if (!entry) continue;
    const filed = filedDays.get(s.user.id) ?? new Set<number>();

    // Counting starts the day AFTER they were added. Someone enrolled at 4pm
    // cannot have checked in that morning, and reporting their first afternoon
    // as an absence would be the system's error, not theirs.
    const firstCountedDay = toCivilDate(s.assignedAt).getTime() + 24 * 60 * 60 * 1000;

    entry.absent = workingDays.filter(
      (day) => day.getTime() >= firstCountedDay && !filed.has(day.getTime())
    ).length;
  }

  return (
    <>
      <HrPageHeader
        icon={ChartColumn}
        eyebrow="الموارد البشرية"
        title="تقارير الحضور"
        context={charity.name}
      />

      <HrNav
        charityName={charity.name}
        canManageUsers={can("manage_charity_users")}
        canManageAttendance={can("manage_attendance")}
        canViewReports
      />

      <AttendanceReportClient
        charityName={charity.name}
        month={month}
        summary={Array.from(summary.values())}
        records={records.map((r) => ({
          id: r.id,
          userName: r.user.name,
          workDate: r.workDate.toISOString(),
          status: r.status as string,
          checkInAt: r.checkInAt?.toISOString() ?? null,
          checkOutAt: r.checkOutAt?.toISOString() ?? null,
          checkInDistance: r.checkInDistance,
          checkInAccuracy: r.checkInAccuracy,
          siteName: r.workSite?.name ?? null,
          ipAddress: r.ipAddress,
          isSuspicious: r.isSuspicious,
          suspiciousReason: r.suspiciousReason,
          manualAt: r.manualAt?.toISOString() ?? null,
          manualReason: r.manualReason,
          autoClosedAt: r.autoClosedAt?.toISOString() ?? null,
        }))}
        staff={staff.map((s) => ({ id: s.user.id, name: s.user.name }))}
        canCorrect={can("manage_attendance")}
        charityId={charity.id}
      />
    </>
  );
}
