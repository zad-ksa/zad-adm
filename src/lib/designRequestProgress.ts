import { toCivilDate, countBusinessDaysBetween } from "./businessDays";
import { addWorkingMinutes, workingMinutesBetween, WORK_DAY_MINUTES } from "./workingHours";

/**
 * "yellow" and "red" are gone rather than left unused: the delivery day now
 * reads the same green as the days before it, and a passed deadline is black.
 * Keeping variants nothing can produce only invites someone to style them.
 */

/**
 * What a request with no charity is called wherever a name is shown.
 *
 * Lives here, not beside the actions that use it: a "use server" file may only
 * export async functions, and a plain const in one breaks the whole module —
 * with an error naming some unrelated export, which is a genuinely misleading
 * way to find out.
 */
export const ZAD_COMPANY_LABEL = "شركة زاد";

/**
 * مهلة الردّ على تسليم — للجمعية أن تعتمد أو تُبدي ملاحظاتها، ولزاد أن تردّ
 * على الملاحظات. وهي **يوم عمل واحد** في الحالتين.
 *
 * كانت ٢٤ ساعةً تقويمية من لحظة التسليم، فتمضي في الليل وفي الجمعة والسبت:
 * تسليمٌ الخميس الساعة ٣م تنقضي مهلته الجمعة ٣م فيُعتمد تلقائياً قبل أن
 * يفتحه أحد. والعدّاد الآن يجري في الدوام وحده ويتوقف خارجه.
 */
export const REVIEW_WINDOW_WORK_MINUTES = WORK_DAY_MINUTES;

/** متى تنقضي مهلة الردّ على تسليمٍ سُلّم في هذه اللحظة. */
export function reviewDeadline(started: Date | string): Date {
  const from = typeof started === "string" ? new Date(started) : started;
  return addWorkingMinutes(from, REVIEW_WINDOW_WORK_MINUTES);
}

export type DesignRequestColor = "green" | "black" | "neutral";

export type DesignRequestProgress = {
  color: DesignRequestColor;
  /**
   * Business days elapsed since the request's scheduled start (0 on the start
   * day). No longer drives the colour — kept because it describes the request
   * truthfully and callers may want it.
   */
  businessDaysElapsed: number;
  /** Business days left until the expected completion date, clamped at 0. */
  daysRemaining: number;
  /**
   * True once the delivery DAY itself has passed — not merely once the stored
   * timestamp has. A request due today is not late at any hour of today.
   */
  isOverdue: boolean;
  isCompleted: boolean;
  /** Arabic label ready for display. */
  label: string;
};

/**
 * Colour follows time REMAINING, not time elapsed:
 *   any working days left, the delivery day included → green
 *   after the delivery day                           → black
 *
 * The previous scheme keyed off days elapsed against a fixed three-day window,
 * which went red two days in regardless of the deadline. That was wrong once
 * design types set their own durations: a ten-day request turned red on day
 * three with a week still to run.
 *
 * Lateness is deliberately not quantified. "Two working days late" invites
 * reading the number as progress when the only fact that matters is that the
 * date passed — so the red state says that and stops.
 *
 * Call this on the SERVER (inside the RSC page) and pass the result down as a
 * plain prop — calling it during client render would use the browser clock and
 * cause an SSR/CSR hydration mismatch.
 */
/**
 * Arabic counts days by four cases, not two: one, a dual, a small plural for
 * 3–10, and a singular again from 11. "متبقي 2 أيام عمل" is simply wrong.
 */
/** الباقي من مهلة الردّ، بساعات العمل. */
function remainingWorkLabel(hours: number): string {
  if (hours <= 1) return "أقل من ساعة عمل";
  if (hours === 2) return "متبقي ساعتا عمل";
  if (hours <= 10) return `متبقي ${hours} ساعات عمل`;
  return `متبقي ${hours} ساعة عمل`;
}

function remainingLabel(days: number): string {
  if (days === 1) return "متبقي يوم عمل";
  if (days === 2) return "متبقي يومان";
  if (days <= 10) return `متبقي ${days} أيام عمل`;
  return `متبقي ${days} يوم عمل`;
}

export function getDesignRequestProgress(args: {
  scheduledStartDate: Date | string;
  expectedCompletionDate: Date | string;
  status?:
    | "UNDER_REVIEW"
    | "PENDING"
    | "COMPLETED"
    | "REJECTED"
    | "AWAITING_REVIEW"
    | "REVISION_REQUESTED";
  /** For AWAITING_REVIEW: when it was delivered. */
  deliveredAt?: Date | string | null;
  /** For REVISION_REQUESTED: when the charity sent it back. */
  revisionRequestedAt?: Date | string | null;
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

  // A request that has not been approved holds no place in the queue, so its
  // stored dates are a provisional estimate. Running the countdown on them
  // would show a deadline nobody has committed to — and an overdue badge on a
  // request that has not even started.
  if (args.status === "UNDER_REVIEW") {
    return {
      color: "neutral",
      businessDaysElapsed: 0,
      daysRemaining: 0,
      isOverdue: false,
      isCompleted: false,
      label: "قيد المراجعة",
    };
  }

  // المهلتان تُقاسان بساعات **العمل** من لحظةٍ بعينها، لا بأيام العمل من جدول.
  // فتُعالجان هنا لا في حساب الأيام أدناه، لأنه يجيب عن سؤالٍ آخر.
  if (args.status === "AWAITING_REVIEW" || args.status === "REVISION_REQUESTED") {
    const startedRaw =
      args.status === "AWAITING_REVIEW" ? args.deliveredAt : args.revisionRequestedAt;
    const started = startedRaw ? new Date(startedRaw) : null;
    const now = args.now ?? new Date();

    const isReview = args.status === "AWAITING_REVIEW";
    const waiting = isReview ? "بانتظار مراجعة الجمعية" : "قيد التعديل";

    if (!started) {
      return { color: "neutral", businessDaysElapsed: 0, daysRemaining: 0, isOverdue: false, isCompleted: false, label: waiting };
    }

    const deadline = reviewDeadline(started);

    if (now >= deadline) {
      // Past the window. For a delivery this is a gap of at most an hour before
      // the cron settles it; for a revision it is genuinely late, and reads the
      // same as any other overdue request.
      return {
        color: isReview ? "neutral" : "black",
        businessDaysElapsed: 0,
        daysRemaining: 0,
        isOverdue: !isReview,
        isCompleted: false,
        label: isReview ? "انتهت مهلة المراجعة" : "مضى وقت التسليم",
      };
    }

    // الباقي بساعات العمل لا بساعات الساعة: مساء الخميس لا يبقى منه شيء،
    // والرقم المعروض هو ما يملكه الطرف فعلاً قبل الانقضاء.
    const minutesLeft = workingMinutesBetween(now, deadline);
    const hoursLeft = Math.ceil(minutesLeft / 60);

    return {
      color: "green",
      businessDaysElapsed: 0,
      daysRemaining: 0,
      isOverdue: false,
      isCompleted: false,
      label: `${waiting} — ${remainingWorkLabel(hoursLeft)}`,
    };
  }

  if (args.status === "REJECTED") {
    return {
      color: "neutral",
      businessDaysElapsed: 0,
      daysRemaining: 0,
      isOverdue: false,
      isCompleted: false,
      label: "مُعاد للتعديل",
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

  // Compared as civil days, not as timestamps. Against `exactDue` a request due
  // at 14:00 flipped to late at 14:01 the same afternoon — while it is still
  // its delivery day, which is meant to read yellow.
  const isOverdue = today > due;

  let color: DesignRequestColor;
  let label: string;

  if (isOverdue) {
    color = "black";
    label = "مضى وقت التسليم";
  } else if (daysRemaining === 0) {
    color = "green";
    label = "يُسلَّم اليوم";
  } else {
    color = "green";
    label = remainingLabel(daysRemaining);
  }

  return { color, businessDaysElapsed, daysRemaining, isOverdue, isCompleted: false, label };
}
