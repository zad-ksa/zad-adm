/**
 * Riyadh-clock helpers for attendance.
 *
 * Every value here is derived on the SERVER from the server's own clock. The
 * browser's date, timezone and locale are never consulted: a phone whose clock
 * is rolled back would otherwise be able to file attendance for a past day, and
 * a phone in another timezone would land on the wrong civil day near midnight.
 *
 * Saudi Arabia is a fixed UTC+3 with no DST, so a constant offset is exact —
 * the same assumption `lib/businessDays.ts` already relies on.
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

import { toCivilDate } from "./businessDays";

export { toCivilDate };

/** Minutes since midnight, Riyadh local, for an instant. */
export function riyadhMinutesOfDay(instant: Date): number {
  const shifted = new Date(instant.getTime() + RIYADH_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Day of week in Riyadh: Sunday = 0 ... Saturday = 6. */
export function riyadhDayOfWeek(instant: Date): number {
  const shifted = new Date(instant.getTime() + RIYADH_OFFSET_MS);
  return shifted.getUTCDay();
}

/** "HH:MM" (24h) in Riyadh local time. */
export function riyadhTimeString(instant: Date): string {
  const m = riyadhMinutesOfDay(instant);
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Parses "HH:MM" to minutes since midnight; null when malformed. */
export function parseTimeToMinutes(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isValidTimeString(value: string): boolean {
  return parseTimeToMinutes(value) !== null;
}

export const WEEKDAY_LABELS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export type ScheduleShape = {
  startTime: string;
  endTime: string;
  lateAfterMinutes: number;
  earlyLeaveBeforeMinutes: number;
  workDays: number[];
};

export const DEFAULT_SCHEDULE: ScheduleShape = {
  startTime: "08:00",
  endTime: "16:00",
  lateAfterMinutes: 15,
  earlyLeaveBeforeMinutes: 15,
  workDays: [0, 1, 2, 3, 4],
};

/** PRESENT until the grace period after startTime has elapsed, then LATE. */
export function classifyCheckIn(
  instant: Date,
  schedule: ScheduleShape
): "PRESENT" | "LATE" {
  const start = parseTimeToMinutes(schedule.startTime);
  if (start === null) return "PRESENT";
  const now = riyadhMinutesOfDay(instant);
  return now > start + schedule.lateAfterMinutes ? "LATE" : "PRESENT";
}

/**
 * Whether leaving now counts as an early departure. A LATE check-in is not
 * overwritten by an on-time departure — being late is the more significant
 * fact and the report needs to keep showing it.
 */
export function isEarlyLeave(instant: Date, schedule: ScheduleShape): boolean {
  const end = parseTimeToMinutes(schedule.endTime);
  if (end === null) return false;
  return riyadhMinutesOfDay(instant) < end - schedule.earlyLeaveBeforeMinutes;
}

export function isWorkDay(instant: Date, schedule: ScheduleShape): boolean {
  return schedule.workDays.includes(riyadhDayOfWeek(instant));
}

/** UTC-midnight anchors of every Riyadh calendar day in a "YYYY-MM" month. */
export function civilDaysOfMonth(month: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

/**
 * The working days of a month that have already happened, as UTC-midnight
 * anchors.
 *
 * Absence is derived from this rather than stored. Nothing writes an ABSENT
 * row — a person who does not come simply leaves no record — so "who was
 * absent" is the working days in range minus the days they filed. Deriving it
 * needs no scheduled job, cannot drift out of step with the schedule, and
 * answers correctly for past months too.
 *
 * `until` excludes today: a day still in progress is not an absence, it is a
 * day someone may yet check in on.
 */
export function elapsedWorkDays(
  range: { start: Date; end: Date },
  workDays: number[],
  now: Date = new Date()
): Date[] {
  const today = toCivilDate(now);
  const days: Date[] = [];

  for (
    let day = new Date(range.start);
    day < range.end && day < today;
    day = new Date(day.getTime() + 24 * 60 * 60 * 1000)
  ) {
    // workDate anchors are UTC midnight of the Riyadh day, so getUTCDay() is
    // already the Riyadh weekday.
    if (workDays.includes(day.getUTCDay())) days.push(new Date(day));
  }

  return days;
}

/** Current Riyadh civil month as "YYYY-MM". */
export function currentRiyadhMonth(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + RIYADH_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: "حاضر",
  LATE: "متأخر",
  EARLY_LEAVE: "انصراف مبكر",
  ABSENT: "غائب",
};
