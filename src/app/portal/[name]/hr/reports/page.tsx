import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartColumn } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  civilDaysOfMonth,
  currentRiyadhMonth,
  elapsedWorkDays,
  fallsWithin,
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

  // The leave year is the calendar year the viewed month sits in — balance is
  // an annual figure, so it must not be recomputed per month.
  const yearStart = new Date(Date.UTC(Number(month.slice(0, 4)), 0, 1));
  const yearEnd = new Date(Date.UTC(Number(month.slice(0, 4)) + 1, 0, 1));

  const [records, staff, scheduleRow, holidays, leaves] = await Promise.all([
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
      select: {
        assignedAt: true,
        annualLeaveDays: true,
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.charityWorkSchedule.findUnique({ where: { charityId: charity.id } }),
    // Holidays overlapping the viewed month.
    prisma.charityHoliday.findMany({
      where: { charityId: charity.id, startDate: { lt: range.end }, endDate: { gte: range.start } },
      orderBy: { startDate: "asc" },
    }),
    // The whole leave year, because the balance spans it — the month is filtered
    // out of this set below for the per-month counts.
    prisma.employeeLeave.findMany({
      where: { charityId: charity.id, startDate: { lt: yearEnd }, endDate: { gte: yearStart } },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const defaultAllowance = scheduleRow?.annualLeaveDays ?? 21;

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
      /** Working days in the viewed month covered by this person's leave. */
      leaveDays: number;
      /** Annual allowance for this person in this charity. */
      leaveAllowance: number;
      /** ANNUAL leave days used across the whole leave year. */
      leaveUsedThisYear: number;
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
      leaveDays: 0,
      leaveAllowance: s.annualLeaveDays ?? defaultAllowance,
      leaveUsedThisYear: 0,
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
        leaveDays: 0,
        leaveAllowance: defaultAllowance,
        leaveUsedThisYear: 0,
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

  // Attendance closed means nothing to be absent from: nobody could have checked
  // in, so nobody failed to. This is also what clears the absences that had
  // accumulated for every working day before the charity switched attendance on.
  const openedAt = scheduleRow?.attendanceOpenedAt ?? null;

  // Charity-wide holidays drop out of the working days entirely, for everyone.
  // Nobody was expected in, so nobody is absent — and the day is not leave
  // either, so it must not draw down anyone's balance.
  const holidayRanges = holidays.map((h) => ({ startDate: h.startDate, endDate: h.endDate }));

  const workingDays = openedAt
    ? elapsedWorkDays(range, workDays)
        .filter((day) => day >= toCivilDate(openedAt))
        .filter((day) => !fallsWithin(day, holidayRanges))
    : [];

  // Leave grouped by person, split into what the balance counts (ANNUAL, across
  // the whole year) and what merely excuses absence (every type, this month).
  const leaveByUser = new Map<string, typeof leaves>();
  for (const l of leaves) {
    const list = leaveByUser.get(l.charityUserId) ?? [];
    list.push(l);
    leaveByUser.set(l.charityUserId, list);
  }

  // Working days of the whole leave year, used for the annual balance. Holidays
  // are excluded here too: leave that lands on Eid should not be charged.
  const yearWorkingDays = elapsedWorkDays({ start: yearStart, end: yearEnd }, workDays, new Date(yearEnd))
    .filter((day) => !fallsWithin(day, holidayRanges));

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

    const myLeave = leaveByUser.get(s.user.id) ?? [];
    const leaveRanges = myLeave.map((l) => ({ startDate: l.startDate, endDate: l.endDate }));

    // Days on leave are neither present nor absent — they are accounted for.
    const countable = workingDays.filter(
      (day) => day.getTime() >= firstCountedDay && !filed.has(day.getTime())
    );
    entry.leaveDays = countable.filter((day) => fallsWithin(day, leaveRanges)).length;
    entry.absent = countable.length - entry.leaveDays;

    // Only ANNUAL leave draws down the balance; sick and unpaid excuse the day
    // without consuming the entitlement.
    const annualRanges = myLeave
      .filter((l) => l.type === "ANNUAL")
      .map((l) => ({ startDate: l.startDate, endDate: l.endDate }));
    entry.leaveUsedThisYear = yearWorkingDays.filter((day) =>
      fallsWithin(day, annualRanges)
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
        currentMonth={currentRiyadhMonth()}
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
