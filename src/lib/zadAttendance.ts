import { prisma } from "@/lib/db";
import { DEFAULT_SCHEDULE, type ScheduleShape } from "@/lib/attendanceTime";

/**
 * The Zad side's answers to the three questions every attendance calculation
 * asks: which hours does this person work, is attendance switched on, and is
 * this day a holiday.
 *
 * Deliberately thin. The arithmetic — geofencing, Riyadh time, classifying a
 * late arrival, counting working days — already exists in `geo.ts` and
 * `attendanceTime.ts` and is not charity-specific, so none of it is repeated
 * here. This file only knows where the Zad-side rows live.
 */

export const SETTINGS_ID = "singleton";

/**
 * The hours this employee works.
 *
 * An employee with no group falls back to the default group, and if even that
 * is missing to DEFAULT_SCHEDULE — so a half-seeded database degrades to
 * sensible hours rather than throwing at whoever is trying to check in.
 */
export async function loadEmployeeSchedule(employeeId: string): Promise<ScheduleShape> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      shiftGroup: {
        select: {
          startTime: true,
          endTime: true,
          lateAfterMinutes: true,
          earlyLeaveBeforeMinutes: true,
          workDays: true,
        },
      },
    },
  });

  if (employee?.shiftGroup) return employee.shiftGroup;

  const fallback = await prisma.zadShiftGroup.findFirst({
    where: { isDefault: true },
    select: {
      startTime: true,
      endTime: true,
      lateAfterMinutes: true,
      earlyLeaveBeforeMinutes: true,
      workDays: true,
    },
  });

  return fallback ?? DEFAULT_SCHEDULE;
}

/** The same, for a whole list at once — reports read every employee's hours. */
export async function loadSchedulesFor(
  employeeIds: string[]
): Promise<Map<string, ScheduleShape>> {
  const [employees, fallback] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: {
        id: true,
        shiftGroup: {
          select: {
            startTime: true,
            endTime: true,
            lateAfterMinutes: true,
            earlyLeaveBeforeMinutes: true,
            workDays: true,
          },
        },
      },
    }),
    prisma.zadShiftGroup.findFirst({
      where: { isDefault: true },
      select: {
        startTime: true,
        endTime: true,
        lateAfterMinutes: true,
        earlyLeaveBeforeMinutes: true,
        workDays: true,
      },
    }),
  ]);

  const base = fallback ?? DEFAULT_SCHEDULE;
  return new Map(employees.map((e) => [e.id, e.shiftGroup ?? base]));
}

/**
 * When attendance was switched on, or null if it never was.
 *
 * Nothing may be recorded before it. A system that starts marking people absent
 * the moment its tables exist would generate a month of fictional absences
 * before anyone had been told it was live.
 */
export async function loadAttendanceGate(): Promise<Date | null> {
  const settings = await prisma.zadAttendanceSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { attendanceOpenedAt: true },
  });
  return settings?.attendanceOpenedAt ?? null;
}

export async function loadSettings() {
  return prisma.zadAttendanceSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export type CivilRange = { startDate: Date; endDate: Date };

/**
 * Every day the company is closed, in a window.
 *
 * Both scopes count: an official holiday and a Zad-only closure are equally
 * non-working days. The scope decides who SEES the entry, never whether it
 * counts — see the note on the model.
 */
export async function loadHolidays(range: {
  start: Date;
  end: Date;
}): Promise<CivilRange[]> {
  return prisma.holiday.findMany({
    where: { startDate: { lte: range.end }, endDate: { gte: range.start } },
    select: { startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });
}

/** One employee's approved leave overlapping a window. */
export async function loadLeaves(
  employeeId: string,
  range: { start: Date; end: Date }
): Promise<(CivilRange & { type: string })[]> {
  return prisma.zadEmployeeLeave.findMany({
    where: {
      employeeId,
      startDate: { lte: range.end },
      endDate: { gte: range.start },
    },
    select: { startDate: true, endDate: true, type: true },
    orderBy: { startDate: "asc" },
  });
}

/**
 * Days off the annual balance.
 *
 * ONLY personal leave of type ANNUAL is deducted. Sick, unpaid and other leave
 * are recorded but cost nothing, and a holiday of either scope costs nothing
 * either — nobody spends their own days on a day the whole company is closed.
 */
export function isDeductible(type: string): boolean {
  return type === "ANNUAL";
}
