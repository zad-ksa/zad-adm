import { parseCivilDay } from "./attendanceTime.ts";

/**
 * حسابُ شبكةِ الشهر لمحدِّد التاريخ — نقيّاً، بلا شاشة.
 *
 * والتواريخُ كلُّها نصُّ «YYYY-MM-DD» لا كائناتُ `Date`: هذا عقدُ `input[type=date]`
 * الذي كان في الموقع، وهو ما يُخزَّن في القاعدة، وهو — وهذا الأهمّ — لا منطقةَ
 * زمنيّةَ له. فيومٌ يُختار في الرياض لا ينزلق إلى جاره لأنّ المتصفّحَ قرأه
 * منتصفَ ليلِ UTC.
 *
 * والأسبوعُ يبدأ **الأحد**: أسبوعُ العمل هنا الأحد إلى الخميس، فبدؤه بالاثنين
 * يُنزل الخميسَ والجمعةَ في طرفين متباعدين من الصفّ.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** «YYYY-MM-DD» من مرسى يومٍ (منتصف ليل UTC). */
export function toISODate(day: Date): string {
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
}

/** هل النصُّ تاريخٌ مقروء؟ */
export function isISODate(value: string | null | undefined): boolean {
  return !!value && parseCivilDay(value) !== null;
}

export type MonthKey = { year: number; month: number };

/** شهرُ تاريخٍ، أو شهرُ «اليوم» إن لم يكن ثَمّ تاريخ. */
export function monthOf(value: string | null | undefined, fallback: string): MonthKey {
  const day = parseCivilDay(value || "") ?? parseCivilDay(fallback);
  if (!day) return { year: 1970, month: 0 };
  return { year: day.getUTCFullYear(), month: day.getUTCMonth() };
}

/** شهرٌ مُزاحٌ بعددٍ من الأشهر — يلتفّ على السنة تلقائياً. */
export function shiftMonth({ year, month }: MonthKey, delta: number): MonthKey {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

export type DayCell = {
  /** «YYYY-MM-DD» */
  date: string;
  /** رقمُ اليوم في شهره. */
  day: number;
  /** من الشهر المعروض، أو من جاريه حشواً للصفّ. */
  inMonth: boolean;
};

/**
 * ستّةُ صفوفٍ × سبعةُ أيام، تبدأ من أحدِ الأسبوع الذي فيه أوّلُ الشهر.
 *
 * والعددُ ثابتٌ ستّةً عمداً: شهرٌ يحتاج خمسةَ صفوفٍ وآخرُ يحتاج ستّة، فلوحةٌ
 * يتغيّر طولُها بتغيّر الشهر تُقفز بما تحتها كلَّما ضُغط السهم.
 */
export function monthGrid({ year, month }: MonthKey): DayCell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const start = new Date(first.getTime() - first.getUTCDay() * 86_400_000);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start.getTime() + (w * 7 + d) * 86_400_000);
      week.push({
        date: toISODate(cell),
        day: cell.getUTCDate(),
        inMonth: cell.getUTCMonth() === month && cell.getUTCFullYear() === year,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * هل هذا اليومُ خارجَ المدى المسموح؟
 *
 * والمقارنةُ نصّيّة: «YYYY-MM-DD» مرتَّبٌ معجميّاً كترتيبه زمنيّاً، فلا حاجةَ
 * إلى تحويلٍ يُدخل منطقةً زمنيّة في حسابٍ لا دخلَ لها فيه.
 */
export function isOutOfRange(date: string, min?: string, max?: string): boolean {
  if (min && isISODate(min) && date < min) return true;
  if (max && isISODate(max) && date > max) return true;
  return false;
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

/** أحرفُ أيام الأسبوع في رأس الشبكة — مرتَّبةٌ من الأحد. */
export const WEEKDAY_INITIALS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

/** «نوفمبر ٢٠٢٦» — ميلاديٌّ دائماً، لا هجريّ. */
export function monthLabel({ year, month }: MonthKey): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

/**
 * «الاثنين ٩ نوفمبر ٢٠٢٦» — التاريخُ ومعه اسمُ يومه.
 *
 * واسمُ اليوم يُحسب من الأرقام لا من `new Date(value)`: ذاك يُقرأ منتصفَ ليل
 * UTC فيُعطي اسمَ الأمسِ لكلّ من كان غربَ غرينتش. وبُنيت بالأسماء لا بـ`Intl`
 * لأنّ `ar-SA` يُخرج الهجريَّ افتراضاً، والميلاديُّ هو ما يُكتب في الموقع.
 */
export function formatDateWithWeekday(value: string, weekdayLabels: readonly string[]): string {
  const day = parseCivilDay(value);
  if (!day) return value;
  return `${weekdayLabels[day.getUTCDay()]} ${day.getUTCDate()} ${MONTH_NAMES[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

/** «٩ نوفمبر ٢٠٢٦» — بلا اسم اليوم، لحيث يضيق الموضع. */
export function formatDateShort(value: string): string {
  const day = parseCivilDay(value);
  if (!day) return value;
  return `${day.getUTCDate()} ${MONTH_NAMES[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}
