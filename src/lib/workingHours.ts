/**
 * حسابُ الوقت **داخل الدوام** — لا الوقت المنصرم على الساعة.
 *
 * مهلة مراجعة التصاميم كانت ٢٤ ساعة تقويمية من لحظة التسليم، فتلتهم الليل
 * والعطلة: تسليمٌ يوم الخميس الساعة ٣م تنتهي مهلته الجمعة ٣م، فيُعتمد تلقائياً
 * قبل أن يفتحه أحد. والمهلة الآن **يوم عمل واحد** يجري عدّاده في الدوام وحده
 * ويتوقف خارجه.
 *
 * الدوام المرجعي هنا ثابت — الأحد إلى الخميس، ٨:٠٠ إلى ١٦:٠٠ بتوقيت الرياض —
 * وهو نفسه افتراضُ مجموعات الدوام في تحضير موظفي زاد. ولم يُقرأ من قاعدة
 * البيانات عمداً: الطرفان في المهلة جمعيةٌ وشركة، ولكلٍّ دوامها، فقراءة دوام
 * أحدهما تجعل المهلة تختلف باختلاف من يُسأل.
 *
 * والحساب كله على «ساعة الحائط» في الرياض: السعودية على UTC+3 ثابتاً بلا توقيت
 * صيفي، فإزاحةٌ ثابتة تكفي وتُغني عن مكتبة مناطق زمنية.
 */

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/** بداية الدوام ونهايته بالدقائق من منتصف الليل. */
export const WORK_START_MINUTES = 8 * 60;
export const WORK_END_MINUTES = 16 * 60;

/** ساعات اليوم الواحد عملاً: ٤٨٠ دقيقة. */
export const WORK_DAY_MINUTES = WORK_END_MINUTES - WORK_START_MINUTES;

/** لحظة → نفس اللحظة مقروءةً بساعة الرياض عبر دوال UTC. */
function toWall(instant: Date): Date {
  return new Date(instant.getTime() + RIYADH_OFFSET_MS);
}

function fromWall(wall: Date): Date {
  return new Date(wall.getTime() - RIYADH_OFFSET_MS);
}

/** الأحد(٠)–الخميس(٤) عمل، والجمعة(٥) والسبت(٦) عطلة. */
function isWorkDay(wall: Date): boolean {
  const day = wall.getUTCDay();
  return day !== 5 && day !== 6;
}

function minutesOfDay(wall: Date): number {
  return wall.getUTCHours() * 60 + wall.getUTCMinutes() + wall.getUTCSeconds() / 60;
}

/** أول الدوام في اليوم التالي لهذه اللحظة. */
function nextDayOpening(wall: Date): Date {
  const next = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + 1)
  );
  return new Date(next.getTime() + WORK_START_MINUTES * 60_000);
}

function sameDayOpening(wall: Date): Date {
  const day = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()));
  return new Date(day.getTime() + WORK_START_MINUTES * 60_000);
}

/**
 * أقرب لحظة عملٍ من هذه اللحظة فصاعداً.
 *
 * لحظةٌ داخل الدوام تعود كما هي. وما قبل الدوام يُدفع إلى بدايته، وما بعده أو
 * في العطلة يُدفع إلى بداية أول يوم عملٍ تالٍ.
 */
export function nextWorkingInstant(instant: Date): Date {
  let wall = toWall(instant);

  // حدٌّ أعلى للدوران يمنع أي احتمال لحلقةٍ لا تنتهي لو تغيّرت الثوابت يوماً.
  for (let guard = 0; guard < 400; guard++) {
    if (!isWorkDay(wall)) {
      wall = nextDayOpening(wall);
      continue;
    }
    const m = minutesOfDay(wall);
    if (m < WORK_START_MINUTES) {
      wall = sameDayOpening(wall);
      continue;
    }
    if (m >= WORK_END_MINUTES) {
      wall = nextDayOpening(wall);
      continue;
    }
    return fromWall(wall);
  }

  return fromWall(wall);
}

/**
 * اللحظة التي تكتمل عندها `minutes` دقيقةً من وقت العمل ابتداءً من `start`.
 *
 * تسليمٌ الخميس ٣:٠٠م ومهلةُ يوم عمل: ساعةٌ يوم الخميس، ثم تتوقف الجمعة والسبت،
 * ثم سبع ساعاتٍ من صباح الأحد — فالانتهاء الأحد ٣:٠٠م.
 */
export function addWorkingMinutes(start: Date, minutes: number): Date {
  let wall = toWall(nextWorkingInstant(start));
  let remaining = Math.max(0, minutes);

  for (let guard = 0; guard < 400; guard++) {
    const available = WORK_END_MINUTES - minutesOfDay(wall);
    if (remaining <= available) {
      return fromWall(new Date(wall.getTime() + remaining * 60_000));
    }
    remaining -= available;
    wall = toWall(nextWorkingInstant(fromWall(nextDayOpening(wall))));
  }

  return fromWall(wall);
}

/** دقائق العمل الواقعة بين لحظتين — صفرٌ إن لم يكن بينهما دوام. */
export function workingMinutesBetween(from: Date, to: Date): number {
  if (to <= from) return 0;

  let wall = toWall(nextWorkingInstant(from));
  const end = toWall(to);
  let total = 0;

  for (let guard = 0; guard < 400 && wall < end; guard++) {
    const closing = new Date(
      Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) +
        WORK_END_MINUTES * 60_000
    );
    const stop = end < closing ? end : closing;
    total += Math.max(0, (stop.getTime() - wall.getTime()) / 60_000);
    if (end <= closing) break;
    wall = toWall(nextWorkingInstant(fromWall(nextDayOpening(wall))));
  }

  return total;
}
