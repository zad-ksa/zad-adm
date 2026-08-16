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

export function computeDesignRequestDates(submittedAt: Date, baseTailDate?: Date): { scheduledStartDate: Date; expectedCompletionDate: Date } {
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
  
  // expectedCompletionDate is exactly 3 business days later from scheduledStartDateRiyadh.
  let expectedCompletionRiyadh = new Date(scheduledStartDateRiyadh);
  let daysAdded = 0;
  while (daysAdded < 3) {
    expectedCompletionRiyadh.setUTCDate(expectedCompletionRiyadh.getUTCDate() + 1);
    if (expectedCompletionRiyadh.getUTCDay() !== 5 && expectedCompletionRiyadh.getUTCDay() !== 6) {
      daysAdded++;
    }
  }

  // If the calculated completion time is exactly 10:00 AM, shift it back to the end of the PREVIOUS business day (18:00 PM).
  // This satisfies the requirement: "if pushed to next day morning, finish at the end of the 3rd day, not start of 4th day".
  if (expectedCompletionRiyadh.getUTCHours() === 10 && expectedCompletionRiyadh.getUTCMinutes() === 0) {
    // shift back 1 business day
    expectedCompletionRiyadh.setUTCDate(expectedCompletionRiyadh.getUTCDate() - 1);
    while (expectedCompletionRiyadh.getUTCDay() === 5 || expectedCompletionRiyadh.getUTCDay() === 6) {
      expectedCompletionRiyadh.setUTCDate(expectedCompletionRiyadh.getUTCDate() - 1);
    }
    // Set to 18:00 PM
    expectedCompletionRiyadh.setUTCHours(18, 0, 0, 0);
  }
  
  // Convert back to UTC by subtracting the offset
  const scheduledStartDate = new Date(scheduledStartDateRiyadh.getTime() - RIYADH_OFFSET_MS);
  const expectedCompletionDate = new Date(expectedCompletionRiyadh.getTime() - RIYADH_OFFSET_MS);
  
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
