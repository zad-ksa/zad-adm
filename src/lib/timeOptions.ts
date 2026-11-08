/**
 * منطقُ اختيار الوقت — نقيّاً، بلا شاشة.
 *
 * والوقتُ نصُّ «HH:MM» بأربعٍ وعشرين ساعة: هذا ما يُخزَّن في القاعدة (دوامُ
 * المجموعات، وأوقاتُ الحضور، ومواعيدُ الجداول)، وهو عقدُ `input[type=time]`
 * الذي كان في الموقع. **ولا منطقةَ زمنيّةَ له**: هو ساعةُ حائطٍ لا لحظة، فلا
 * يُحوَّل إلى `Date` في الطريق — تحويلٌ كهذا يُدخل إزاحةَ ثلاثِ ساعاتٍ في رقمٍ
 * لا دخلَ لها فيه.
 *
 * والعرضُ باثنتي عشرة ساعةً و«ص/م»: هكذا يقرأ الناسُ الوقتَ هنا، وهكذا كتبته
 * `formatClock12` في الحضور من قبل.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** «HH:MM» → دقائقُ من منتصف الليل، و`null` لما لا يُقرأ. */
export function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** دقائقُ من منتصف الليل → «HH:MM». */
export function minutesToTime(minutes: number): string {
  const clamped = Math.min(24 * 60 - 1, Math.max(0, Math.round(minutes)));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function isTimeString(value: string | null | undefined): boolean {
  return timeToMinutes(value) !== null;
}

export type Meridiem = "AM" | "PM";

export const MERIDIEM_LABEL: Record<Meridiem, string> = { AM: "صباحاً", PM: "مساءً" };
export const MERIDIEM_SHORT: Record<Meridiem, string> = { AM: "ص", PM: "م" };

export type TimeParts = { hour12: number; minute: number; meridiem: Meridiem };

/** «١٧:٣٠» → {٥، ٣٠، مساءً}. */
export function splitTime(value: string): TimeParts | null {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  const h24 = Math.floor(minutes / 60);
  return {
    hour12: h24 % 12 === 0 ? 12 : h24 % 12,
    minute: minutes % 60,
    meridiem: h24 < 12 ? "AM" : "PM",
  };
}

/** {٥، ٣٠، مساءً} → «١٧:٣٠». ومنتصفُ الليل ١٢ صباحاً، والظهرُ ١٢ مساءً. */
export function joinTime({ hour12, minute, meridiem }: TimeParts): string {
  const base = hour12 % 12;
  const h24 = meridiem === "PM" ? base + 12 : base;
  return `${pad(h24)}:${pad(Math.min(59, Math.max(0, minute)))}`;
}

/** «٥:٣٠ م» — للعرض في الحقل وفي الجداول. */
export function formatTime12(value: string): string {
  const parts = splitTime(value);
  if (!parts) return value;
  return `${parts.hour12}:${pad(parts.minute)} ${MERIDIEM_SHORT[parts.meridiem]}`;
}

/**
 * ساعاتُ عمود الساعة: ١٢ ثم ١ إلى ١١ — ترتيبُ وجه الساعة لا ترتيبُ الأرقام.
 * فمن يبحث عن «١٢ م» يجدها أوّلَ العمود حيث يبدأ النصفُ الذي اختاره.
 */
export const HOUR_OPTIONS: readonly number[] = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * دقائقُ عمود الدقيقة بحسب الخطوة.
 *
 * خطوةٌ لا تقسم الستّين (كسبعٍ) تُعطي عموداً ينتهي عند ٥٦ ويبدأ الصفَّ التالي
 * من صفر — وهو غلطُ من كتب الخطوة لا غلطُ العمود، فيُقبل كما هو ولا يُصحَّح
 * تخميناً.
 */
export function minuteOptions(step: number): number[] {
  const safe = Number.isFinite(step) && step >= 1 ? Math.floor(step) : 5;
  const out: number[] = [];
  for (let m = 0; m < 60; m += safe) out.push(m);
  return out;
}

/** خارجَ المدى المسموح؟ والمقارنةُ بالدقائق لا بالنصّ، لأنّ «٩:٠٠» و«٠٩:٠٠» واحد. */
export function isTimeOutOfRange(value: string, min?: string, max?: string): boolean {
  const v = timeToMinutes(value);
  if (v === null) return false;
  const lo = timeToMinutes(min);
  const hi = timeToMinutes(max);
  if (lo !== null && v < lo) return true;
  if (hi !== null && v > hi) return true;
  return false;
}

/**
 * الوقتُ مُقرَّباً إلى أقرب مضاعفٍ للخطوة — ولأعلى عند التساوي.
 *
 * يُستعمل حين تُفتح اللوحةُ على قيمةٍ خارجةٍ عن الخطوة (قيمةٌ قديمةٌ في
 * القاعدة، أو خطوةٌ تغيّرت): فالعمودُ يُظهر دقيقةً مختارةً بدل أن يُظهر
 * عموداً لا شيء فيه محدَّد.
 */
export function roundToStep(value: string, step: number): string {
  const minutes = timeToMinutes(value);
  if (minutes === null) return value;
  const safe = Number.isFinite(step) && step >= 1 ? Math.floor(step) : 5;
  const rounded = Math.round(minutes / safe) * safe;
  return minutesToTime(Math.min(24 * 60 - 1, rounded));
}

/**
 * مدّةٌ بين وقتين بالدقائق — وما بعدَ منتصف الليل يُحسب على اليوم التالي.
 *
 * فدوامٌ من ٢٢:٠٠ إلى ٠٦:٠٠ ثمانُ ساعاتٍ لا سالبُ ستّةَ عشرة.
 */
export function timeSpanMinutes(from: string, to: string): number | null {
  const a = timeToMinutes(from);
  const b = timeToMinutes(to);
  if (a === null || b === null) return null;
  return b >= a ? b - a : b + 24 * 60 - a;
}
