/**
 * Business-day math for the design-requests feature (and anything else that
 * needs it): work week is Sunday–Thursday, Friday/Saturday are off.
 *
 * All calculations happen on the Riyadh *civil* date, not raw UTC. Saudi
 * Arabia is a fixed UTC+3 with no DST, so a plain offset is exact. Without
 * this, `new Date().getUTCDay()` computed close to midnight Riyadh time can
 * land on the wrong side of midnight in UTC (e.g. 02:00 Sunday in Riyadh is
 * still Saturday 23:00 UTC) and silently misclassify the day.
 *
 * Every function here operates on "civil anchors" — UTC-midnight Date
 * objects representing a Riyadh calendar day — produced by `toCivilDate`.
 * Always convert with `toCivilDate` before passing a raw timestamp in.
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Instant → UTC-midnight anchor of the Riyadh calendar day it falls in. */
export function toCivilDate(input: Date | string): Date {
  const instant = typeof input === "string" ? new Date(input) : input;
  const shifted = new Date(instant.getTime() + RIYADH_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

/** Sunday(0)–Thursday(4) are business days; Friday(5)/Saturday(6) are not. */
export function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 5 && day !== 6;
}

/** Returns d unchanged if it's already a business day, otherwise the next Sunday. */
export function nextBusinessDay(d: Date): Date {
  const result = new Date(d);
  while (!isBusinessDay(result)) {
    result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

/** Steps forward one calendar day at a time, counting only business days. */
export function addBusinessDays(d: Date, n: number): Date {
  if (n <= 0) return new Date(d);
  const result = new Date(d);
  let added = 0;
  while (added < n) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDay(result)) added++;
  }
  return result;
}

/**
 * Business days in the half-open interval (from, to] — i.e. the count of
 * business days you'd cross walking forward from `from` up to and including
 * `to`. Returns 0 when `to` is on or before `from`. Both args must already
 * be civil anchors (pass them through `toCivilDate` first).
 */
export function countBusinessDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(cursor)) count++;
  }
  return count;
}

/** Formats a civil anchor as a Gregorian date for display (never Hijri). */
export function formatCivilDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

/**
 * Duration used only when a caller does not name one.
 *
 * No submission path relies on this any more — choosing a design type is
 * required, and the duration comes from the types themselves. It stays as the
 * parameter default so that the arithmetic below has a defined shape, and it
 * matches what every request created before design types existed was given.
 */
export const DEFAULT_DESIGN_WORKING_DAYS = 3;

/**
 * Adds `days` business days to a start instant, in Riyadh terms.
 *
 * Extracted from computeDesignRequestDates so that extending an existing
 * request re-runs the *same* arithmetic from the *same* start — the whole point
 * of an extension is that only the duration moves.
 */
export function addDesignBusinessDays(scheduledStartDate: Date, days: number): Date {
  const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
  const startRiyadh = new Date(scheduledStartDate.getTime() + RIYADH_OFFSET_MS);

  const completionRiyadh = new Date(startRiyadh);
  let added = 0;
  while (added < Math.max(1, days)) {
    completionRiyadh.setUTCDate(completionRiyadh.getUTCDate() + 1);
    if (completionRiyadh.getUTCDay() !== 5 && completionRiyadh.getUTCDay() !== 6) {
      added++;
    }
  }

  // Landing exactly on 10:00 means the work would finish at the START of the
  // following day; pull it back to 18:00 of the previous business day so the
  // promise reads as "end of the Nth day".
  if (completionRiyadh.getUTCHours() === 10 && completionRiyadh.getUTCMinutes() === 0) {
    completionRiyadh.setUTCDate(completionRiyadh.getUTCDate() - 1);
    while (completionRiyadh.getUTCDay() === 5 || completionRiyadh.getUTCDay() === 6) {
      completionRiyadh.setUTCDate(completionRiyadh.getUTCDate() - 1);
    }
    completionRiyadh.setUTCHours(18, 0, 0, 0);
  }

  return new Date(completionRiyadh.getTime() - RIYADH_OFFSET_MS);
}

export function computeDesignRequestDates(
  submittedAt: Date,
  baseTailDate?: Date,
  workingDays: number = DEFAULT_DESIGN_WORKING_DAYS
): { scheduledStartDate: Date; expectedCompletionDate: Date } {
  const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
  
  let scheduledStartDateRiyadh: Date;

  if (baseTailDate) {
    scheduledStartDateRiyadh = new Date(baseTailDate.getTime() + RIYADH_OFFSET_MS);
  } else {
    // Convert submittedAt to Riyadh time for easier hour inspection
    const riyadhTime = new Date(submittedAt.getTime() + RIYADH_OFFSET_MS);
    const hour = riyadhTime.getUTCHours();
    
    // Check if it's a business day (Sunday=0 to Thursday=4)
    const isBizDay = riyadhTime.getUTCDay() >= 0 && riyadhTime.getUTCDay() <= 4;
    
    // Working hours are 10:00 to 18:00 (10 to 18)
    const isWorkingHours = hour >= 10 && hour < 18;
    
    if (isBizDay && isWorkingHours) {
      // Exact same time
      scheduledStartDateRiyadh = new Date(riyadhTime);
    } else {
      // Move to next business day start (10:00 AM)
      let startDayRiyadh = new Date(riyadhTime);
      if (isBizDay && hour < 10) {
        // Today at 10 AM
      } else {
        // Advance to next business day
        startDayRiyadh.setUTCDate(startDayRiyadh.getUTCDate() + 1);
        while (startDayRiyadh.getUTCDay() === 5 || startDayRiyadh.getUTCDay() === 6) {
          startDayRiyadh.setUTCDate(startDayRiyadh.getUTCDate() + 1);
        }
      }
      startDayRiyadh.setUTCHours(10, 0, 0, 0);
      scheduledStartDateRiyadh = startDayRiyadh;
    }
  }
  
  const scheduledStartDate = new Date(scheduledStartDateRiyadh.getTime() - RIYADH_OFFSET_MS);

  // The duration now comes from the request's design types rather than a fixed
  // three; addDesignBusinessDays holds the arithmetic so an extension later
  // reproduces it exactly.
  const expectedCompletionDate = addDesignBusinessDays(scheduledStartDate, workingDays);

  return { scheduledStartDate, expectedCompletionDate };
}

export function formatCivilDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}
