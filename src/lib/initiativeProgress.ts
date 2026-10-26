/**
 * حساب تقدّم المبادرات التشغيلية — دالّاتٌ خالصة لا تمسّ قاعدة البيانات.
 *
 * ولا شيء من مخرجاتها يُخزَّن: الحالة والأيام المتبقية والالتزام والانحراف
 * ونسبة الإنجاز كلّها تُشتقّ في العرض. وفي ملف Excel المصدر صفوفٌ تحمل
 * «متعثرة» منسوخةً ساكنة لا تتغيّر بتغيّر البيانات، وهذا ما أردنا اجتنابه.
 *
 * والمعادلتان الأُولى والثانية مستنبطتان من أرقام ملف الجمعية لا مفترضتين:
 * «أرشفة الملفات» سبع خطوات واحدةٌ منها بإنجاز تام، فالكشاف يقول ١٤٢٨٥٧,٠
 * وهو ١÷٧ — أي متوسطٌ بسيط، والمرجَّح بالتكلفة يعطي ٠٨٥٢,٠ فلا يطابق. ثم
 * «إدارة التحول الرقمي» مبادرتان إحداهما ١÷٧ والأخرى صفر، فلوحة المعلومات
 * تقول ٠٧١٤٢٨٥٧,٠ — أي متوسطٌ بسيط على مستوى الإدارة كذلك.
 */

export type StepInput = {
  /** نسبة إنجاز الخطوة ٠-١٠٠، وهي المُدخل الوحيد. */
  progress: number;
  cost?: number | null;
  actualCost?: number | null;
  /** أسبوعٌ نسبيٌّ إلى بداية الخطة، يبدأ من ١. */
  planStartWeek?: number | null;
  planWeeks?: number | null;
  actualStartWeek?: number | null;
  actualWeeks?: number | null;
};

export type InitiativeStatus = "NOT_STARTED" | "RUNNING" | "DONE" | "AT_RISK";

export const STATUS_LABEL: Record<InitiativeStatus, string> = {
  NOT_STARTED: "لم تبدأ",
  RUNNING: "جارية",
  DONE: "منتهية",
  AT_RISK: "متعثرة",
};

/** نبرة الشارة لكل حالة — بأسماء نبرات `Badge` نفسها، فلا لونَ جديد. */
export const STATUS_TONE: Record<InitiativeStatus, "good" | "warn" | "danger" | "neutral"> = {
  NOT_STARTED: "neutral",
  RUNNING: "warn",
  DONE: "good",
  AT_RISK: "danger",
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: number | null | undefined) => (Number.isFinite(v as number) ? (v as number) : 0);

/** نسبة إنجاز المبادرة: متوسطٌ بسيط لنسب خطواتها، لا مرجَّحاً بالتكلفة. */
export function initiativePercent(steps: StepInput[]): number | null {
  if (steps.length === 0) return null;
  const sum = steps.reduce((acc, s) => acc + num(s.progress), 0);
  return round1(sum / steps.length);
}

/** نسبة إنجاز مجموعةٍ من المبادرات (إدارة، أو الخطة كلّها): متوسطٌ بسيط كذلك. */
export function groupPercent(percents: Array<number | null>): number | null {
  const counted = percents.filter((p): p is number => p !== null);
  if (counted.length === 0) return null;
  return round1(counted.reduce((a, b) => a + b, 0) / counted.length);
}

const DAY = 86_400_000;

/** تجريدُ الوقت من التاريخ كي يكون الفرق أياماً كاملة لا كسوراً. */
const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/**
 * الأيام المتبقية إلى نهاية المبادرة. سالبٌ إن انقضى الموعد، و`null` إن لم
 * يكن لها تاريخ نهاية.
 */
export function daysRemaining(endDate: Date | null | undefined, today: Date): number | null {
  if (!endDate) return null;
  return Math.round((startOfDay(endDate) - startOfDay(today)) / DAY);
}

/**
 * النسبة التي كان يُفترض بلوغها اليوم لو سار التنفيذ على الجدول: ما مضى من
 * مدّة المبادرة. وهي أساسُ الحكم بالتعثّر.
 */
export function expectedPercent(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
  today: Date
): number | null {
  if (!startDate || !endDate) return null;
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const now = startOfDay(today);
  if (end <= start) return now >= end ? 100 : 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return round1(((now - start) / (end - start)) * 100);
}

/**
 * الالتزام بالجدول: المنجَز على المتوقَّع. مئةٌ أو أكثر يعني على الجدول أو
 * متقدّماً عليه، وأقلّ منها تأخّر.
 */
export function scheduleAdherence(
  actual: number | null,
  expected: number | null
): number | null {
  if (actual === null || expected === null) return null;
  if (expected === 0) return actual > 0 ? 100 : null;
  return round1((actual / expected) * 100);
}

/**
 * حالة المبادرة محسوبةً لا مخزَّنة:
 * - منتهية: بلغ الإنجاز مئة.
 * - لم تبدأ: الإنجاز صفر ولم يحلّ موعد البداية.
 * - متعثرة: الإنجاز دون المتوقَّع بأكثر من هامشٍ مسموح، أو انقضى الموعد ولم تكتمل.
 * - جارية: ما عدا ذلك.
 *
 * والهامش `tolerance` ١٠٪ افتراضاً: لا يُوسَم عملٌ متأخّرٌ يوماً بالتعثّر.
 */
export function initiativeStatus(opts: {
  percent: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  today: Date;
  tolerance?: number;
}): InitiativeStatus {
  const { percent, startDate, endDate, today, tolerance = 10 } = opts;
  const done = percent ?? 0;

  if (done >= 100) return "DONE";

  // انقضاء الموعد قبل الاكتمال تعثّرٌ أيّاً كانت النسبة.
  if (endDate && startOfDay(today) > startOfDay(endDate)) return "AT_RISK";

  // ثم التخلّف عن المتوقَّع فوق الهامش — وهو ما يسبق الحكم بأنها «لم تبدأ»،
  // فمبادرةٌ مضى نصفُ مدّتها وإنجازها صفر متعثرةٌ لا متوقّفةٌ عند البداية.
  const expected = expectedPercent(startDate, endDate, today);
  if (expected !== null && done + tolerance < expected) return "AT_RISK";

  if (done === 0) return "NOT_STARTED";
  return "RUNNING";
}

export type BudgetSummary = {
  budget: number;
  /** مجموع تكاليف الخطوات — يُقارن بالموازنة المعتمدة لكشف فرقِ التوزيع. */
  planned: number;
  spent: number;
  /** المتبقي من الموازنة المعتمدة. سالبٌ يعني تجاوزاً. */
  variance: number;
  /** نسبة الصرف من الموازنة المعتمدة. */
  spentPercent: number | null;
};

export function budgetSummary(steps: StepInput[], budget: number | null | undefined): BudgetSummary {
  const approved = num(budget);
  const planned = steps.reduce((acc, s) => acc + num(s.cost), 0);
  const spent = steps.reduce((acc, s) => acc + num(s.actualCost), 0);
  return {
    budget: approved,
    planned,
    spent,
    variance: approved - spent,
    spentPercent: approved === 0 ? null : round1((spent / approved) * 100),
  };
}

export type ScheduleFlags = {
  /** أسابيعُ خطةٍ مضت ولم يُسجَّل فيها إنجاز. */
  plannedWithoutProgress: number;
  /** خطواتٌ نُفِّذت في غير أسابيعها المجدولة. */
  offPlanSteps: number;
  /** خطواتٌ بدأ تنفيذها قبل أسبوع خطتها أو بعده. */
  shiftedSteps: number;
};

/**
 * الشارات التحليلية الثلاث التي يعرضها ملف المبادرة. وتُحسب بأسابيعَ نسبيّة
 * إلى بداية الخطة: رقمُ أسبوعٍ بلا تاريخِ بدايةٍ لا معنى له، فتُمرَّر
 * `currentWeek` محسوبةً من `OperationalPlan.startDate`.
 */
export function scheduleFlags(steps: StepInput[], currentWeek: number): ScheduleFlags {
  let plannedWithoutProgress = 0;
  let offPlanSteps = 0;
  let shiftedSteps = 0;

  for (const s of steps) {
    const planStart = s.planStartWeek ?? null;
    const planWeeks = s.planWeeks ?? null;
    const actualStart = s.actualStartWeek && s.actualStartWeek > 0 ? s.actualStartWeek : null;

    if (planStart !== null && planWeeks !== null) {
      const planEnd = planStart + planWeeks - 1;
      if (planEnd < currentWeek && num(s.progress) === 0) plannedWithoutProgress++;
    }

    if (actualStart !== null && planStart !== null) {
      if (actualStart !== planStart) shiftedSteps++;
      const actualWeeks = s.actualWeeks ?? 0;
      const planEnd = planStart + (planWeeks ?? 1) - 1;
      const actualEnd = actualStart + Math.max(actualWeeks, 1) - 1;
      if (actualStart < planStart || actualEnd > planEnd) offPlanSteps++;
    }
  }

  return { plannedWithoutProgress, offPlanSteps, shiftedSteps };
}

/**
 * رقم الأسبوع الحالي نسبةً إلى بداية الخطة، يبدأ من ١. يُرجع صفراً قبل بداية
 * الخطة، و`weekCount + 1` بعد نهايتها — فيُعرف أن الخطة انقضت.
 */
export function currentPlanWeek(planStart: Date, today: Date, weekCount: number): number {
  const diff = Math.floor((startOfDay(today) - startOfDay(planStart)) / (7 * DAY));
  if (diff < 0) return 0;
  return Math.min(diff + 1, weekCount + 1);
}

/** تاريخُ بداية أسبوعٍ نسبيٍّ إلى بداية الخطة — لمحور مخطّط جانت. */
export function weekStartDate(planStart: Date, week: number): Date {
  return new Date(startOfDay(planStart) + (week - 1) * 7 * DAY);
}

const MONTH_NAMES = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export type PlanMonth = {
  /** مفتاحُ الشهر في `monthlyBudget`: «2026-08». */
  key: string;
  label: string;
  year: number;
};

/**
 * أشهر الخطة من تاريخيها — بها تُبنى أعمدةُ توزيع الموازنة.
 *
 * ومفتاحُ الشهر تاريخٌ لا اسم: «2026-08» لا «أغسطس». فخطةٌ تمتدّ على سنتين
 * فيها أغسطسان، واسمٌ وحده يجمعهما في عمودٍ واحد.
 */
export function planMonths(startDate: Date, endDate: Date): PlanMonth[] {
  const months: PlanMonth[] = [];
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth();
  const lastYear = endDate.getUTCFullYear();
  const lastMonth = endDate.getUTCMonth();

  // حدٌّ أعلى يمنع حلقةً لا تنتهي لو جاء تاريخُ نهايةٍ قبل بدايته.
  while (months.length < 120 && (year < lastYear || (year === lastYear && month <= lastMonth))) {
    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      label: MONTH_NAMES[month],
      year,
    });
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return months;
}

/** عددُ أسابيع فترةٍ ما، بحدٍّ أدنى أسبوعٌ واحد. */
export function weeksBetween(startDate: Date, endDate: Date): number {
  const days = Math.round((startOfDay(endDate) - startOfDay(startDate)) / DAY) + 1;
  return Math.max(1, Math.ceil(days / 7));
}
