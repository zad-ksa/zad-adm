import { isBusinessDay } from "./businessDays.ts";

/**
 * حساب «منذ» في «آخر المستجدات» ولونه.
 *
 * كل التواريخ هنا مراسٍ مدنية (منتصف ليل UTC يمثّل يوماً بتقويم الرياض)، كما
 * في businessDays.ts — فيومٌ يُكتب قرب منتصف الليل لا ينزلق إلى جاره.
 *
 * ليس ملف "use server": دوالٌّ صافية تُختبر وحدها، وتستدعيها الصفحة.
 */

export type CivilRange = { startDate: Date; endDate: Date };

/** درجة تقادم آخر حدثٍ في الخلية. `fresh` = لم يمضِ يوما عملٍ بعد، فلا لون. */
export type Staleness = "fresh" | "green" | "yellow" | "red";

const DAY_MS = 24 * 60 * 60 * 1000;

/** أيامٌ تقويمية من يوم الحدث إلى اليوم — هذا الرقم المعروض بعد «منذ». */
export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

function inAnyRange(d: Date, ranges: CivilRange[]): boolean {
  return ranges.some((r) => d >= r.startDate && d <= r.endDate);
}

/**
 * أيام العمل في (from, to] — الأحد إلى الخميس، بلا العطل الرسمية وإغلاقات زاد.
 *
 * يوم الحدث نفسه لا يُعدّ: حدثٌ أمس يومَ عمل مضى عليه يومٌ واحد لا يومان.
 */
export function workingDaysBetween(from: Date, to: Date, holidays: CivilRange[] = []): number {
  if (to <= from) return 0;
  let count = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(cursor) && !inAnyRange(cursor, holidays)) count++;
  }
  return count;
}

/** يومان أخضر، وأربعة أصفر، وستة أحمر — بأيام العمل. */
export function stalenessOf(workingDays: number): Staleness {
  if (workingDays >= 6) return "red";
  if (workingDays >= 4) return "yellow";
  if (workingDays >= 2) return "green";
  return "fresh";
}

/** «منذ …» بصيغة العدد العربية. */
export function sinceLabel(days: number): string {
  if (days <= 0) return "اليوم";
  if (days === 1) return "منذ يوم";
  if (days === 2) return "منذ يومين";
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوماً`;
}

/** "YYYY-MM-DD" من حقل التاريخ → مرسى مدني، أو null إن لم يكن تاريخاً صحيحاً. */
export function parseCivilDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // 2026-02-31 يصير 3 مارس بصمت؛ والرفض أصدق من تاريخٍ لم يقصده أحد.
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

/** مرسى مدني → "YYYY-MM-DD" لحقل التاريخ. */
export function toCivilDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
