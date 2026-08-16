import { toCivilDate, countBusinessDaysBetween } from "./businessDays";

export type DesignRequestColor = "green" | "yellow" | "red" | "neutral";

export type DesignRequestProgress = {
  color: DesignRequestColor;
  /** Business days elapsed since the request's scheduled start (0 on the start day). */
  businessDaysElapsed: number;
  /** Business days left until the expected completion date, clamped at 0. */
  daysRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
  /** Arabic label ready for display. */
  label: string;
};

/**
 * Colour thresholds across the 3-business-day window:
 *   0 days elapsed (first day)      → green
 *   1 day elapsed  (past 1/3)       → yellow
 *   2+ days elapsed (past 2/3, incl. overdue) → red
 *
 * Call this on the SERVER (inside the RSC page) and pass the result down as a
 * plain prop — calling it during client render would use the browser clock and
 * cause an SSR/CSR hydration mismatch.
 */
export function getDesignRequestProgress(args: {
  scheduledStartDate: Date | string;
  expectedCompletionDate: Date | string;
  status?: "PENDING" | "COMPLETED";
  /** Injectable for testing; defaults to now. */
  now?: Date;
}): DesignRequestProgress {
  if (args.status === "COMPLETED") {
    return {
      color: "neutral",
      businessDaysElapsed: 0,
      daysRemaining: 0,
      isOverdue: false,
      isCompleted: true,
      label: "منجز",
    };
  }

  const exactStart = typeof args.scheduledStartDate === "string" ? new Date(args.scheduledStartDate) : args.scheduledStartDate;
  const exactDue = typeof args.expectedCompletionDate === "string" ? new Date(args.expectedCompletionDate) : args.expectedCompletionDate;
  const exactToday = args.now ?? new Date();

  const start = toCivilDate(exactStart);
  const due = toCivilDate(exactDue);
  const today = toCivilDate(exactToday);

  const businessDaysElapsed = countBusinessDaysBetween(start, today);
  const daysRemaining = Math.max(0, countBusinessDaysBetween(today, due));
  const isOverdue = exactToday > exactDue;

  const color: DesignRequestColor =
    businessDaysElapsed === 0 ? "green" : businessDaysElapsed === 1 ? "yellow" : "red";

  let label: string;
  if (isOverdue) {
    const lateBy = countBusinessDaysBetween(due, today);
    label = lateBy === 1 ? "متأخر يوم عمل" : `متأخر ${lateBy} أيام عمل`;
  } else if (daysRemaining === 0) {
    label = "يُسلَّم اليوم";
  } else if (daysRemaining === 1) {
    label = "متبقي يوم عمل";
  } else {
    label = `متبقي ${daysRemaining} أيام عمل`;
  }

  return { color, businessDaysElapsed, daysRemaining, isOverdue, isCompleted: false, label };
}
