import { instantOn, parseCivilDay } from "./attendanceTime.ts";

/**
 * قواعدُ جدول المواعيد: متى يُغلق الحجز، وما يحلّ بالموعد الملاصق حين يُحجز
 * جاره.
 *
 * **ومكانُها هنا لا في الشاشة**، لأنّ الحاكمَ بها طرفان: صفحةُ الحجز العامّة
 * تُظهر المتاح، والخادمُ يقبل أو يردّ. وصفحةُ الحجز بيدِ من يفتحها — يُعطِّل
 * الزرَّ المُقفَل أو يُرسل الطلبَ بيده — فلو كانت القاعدةُ في الواجهة وحدَها
 * لكان الإغلاقُ زينةً لا حكماً. فهي دالّةٌ واحدةٌ نقيّة يسأل كلا الطرفين
 * عنها، و`now` مُمرَّرٌ لا مقروءٌ من الساعة: الخادمُ يختم اللحظة، والشاشةُ
 * ترسم ما خُتم، فلا يختلف ما رأى الحاجزُ عمّا حكم به الخادم.
 */

/** ما يحلّ بالموعد الذي يلي موعداً محجوزاً. */
export type AfterSlotAction = "NONE" | "BLOCK" | "DELAY";

export const AFTER_SLOT_ACTIONS: readonly { value: AfterSlotAction; label: string }[] = [
  { value: "NONE", label: "يبقى متاحاً" },
  { value: "BLOCK", label: "يُغلق" },
  { value: "DELAY", label: "يتأجّل" },
];

export type MeetingRules = {
  /** مدّة الاجتماع بالدقائق — وهي سقفُ التأجيل. */
  duration: number;
  /** يُغلق الحجز قبل الموعد بهذه الدقائق. صفرٌ: يبقى مفتوحاً حتى بدايته. */
  cutoffMinutes: number;
  /** ويُغلق مع بداية يوم الموعد: من دخل عليه اليومُ لا يحجز فيه. */
  cutoffDayStart: boolean;
  /** حين يُحجز موعد، يُغلق الملاصقُ الذي قبله. */
  blockBefore: boolean;
  afterAction: AfterSlotAction;
  /** دقائقُ التأجيل حين تكون `afterAction` تأجيلاً. */
  afterDelayMinutes: number;
};

export const DEFAULT_MEETING_RULES: MeetingRules = {
  duration: 30,
  cutoffMinutes: 0,
  cutoffDayStart: false,
  blockBefore: false,
  afterAction: "NONE",
  afterDelayMinutes: 0,
};

/** أسبوعان — سقفٌ للإغلاق المسبق يمنع رقماً يُدخَل سهواً فيُقفل الجدولَ كلَّه. */
export const MAX_CUTOFF_MINUTES = 14 * 24 * 60;

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/**
 * صفُّ الجدول كما يأتي من القاعدة → قواعدُ موثوقة.
 *
 * والتطهيرُ ليس احتياطاً زائداً: الجداولُ المُنشأةُ قبل هذه الإعدادات لا تحمل
 * أعمدتَها، و`afterSlotAction` نصٌّ في القاعدة لا تعدادٌ محروس. فما لا يُفهم
 * يصير «لا شيء» — وهو سلوكُ الجدول قبل أن توجد القاعدة.
 */
export function parseMeetingRules(row: {
  duration?: number | null;
  bookingCutoffMinutes?: number | null;
  bookingCutoffDayStart?: boolean | null;
  blockSlotBefore?: boolean | null;
  afterSlotAction?: string | null;
  afterSlotDelayMinutes?: number | null;
}): MeetingRules {
  const duration = clampInt(row.duration, 5, 24 * 60, DEFAULT_MEETING_RULES.duration);
  const action = AFTER_SLOT_ACTIONS.some((a) => a.value === row.afterSlotAction)
    ? (row.afterSlotAction as AfterSlotAction)
    : "NONE";
  // التأجيلُ محدودٌ بمدّة الاجتماع: تأجيلٌ أطولُ منها يدفع الموعدَ فوق الذي
  // يليه، فيصير في اليوم موعدان في وقتٍ واحد.
  const delay = action === "DELAY" ? clampInt(row.afterSlotDelayMinutes, 1, duration, duration) : 0;

  return {
    duration,
    cutoffMinutes: clampInt(row.bookingCutoffMinutes, 0, MAX_CUTOFF_MINUTES, 0),
    cutoffDayStart: !!row.bookingCutoffDayStart,
    blockBefore: !!row.blockSlotBefore,
    afterAction: action,
    afterDelayMinutes: delay,
  };
}

export type SlotState =
  /** متاحٌ للحجز. */
  | "OPEN"
  /** حجزته جمعيةٌ أخرى. */
  | "BOOKED"
  /** مضى وقتُ الحجز (الإغلاق المسبق أو الموعدُ نفسه). */
  | "CLOSED"
  /** أُغلق لأنّ ملاصقَه محجوز. */
  | "BLOCKED";

export type OfferedSlot = {
  /** الوقتُ كما كُتب في الجدول. */
  time: string;
  /** الوقتُ المعروضُ فعلاً — يخالف `time` حين يتأجّل. */
  offerTime: string;
  state: SlotState;
  /** دقائقُ التأجيل، صفرٌ لمن لم يتأجّل. */
  delayMinutes: number;
};

const toMinutes = (time: string): number | null => {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const fromMinutes = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** وقتٌ مُزاحٌ بدقائق — و`null` إن تجاوز منتصفَ الليل، فلا يومٌ يَسَعُه. */
export function shiftTime(time: string, minutes: number): string | null {
  const base = toMinutes(time);
  if (base === null) return null;
  const shifted = base + minutes;
  return shifted >= 24 * 60 ? null : fromMinutes(shifted);
}

/**
 * اللحظةُ التي يُغلق عندها حجزُ موعدٍ بعينه.
 *
 * والقاعدتان تتزاحمان فتغلب الأضيق: من اشترط «قبله بساعة» و«مع بداية اليوم»
 * أراد أن يُقفل الموعدُ في أبعدِ الوقتين عن بدايته.
 */
export function slotCloseInstant(date: string, time: string, rules: MeetingRules): Date | null {
  const day = parseCivilDay(date);
  if (!day) return null;
  const start = instantOn(day, time);
  if (!start) return null;

  const relative = new Date(start.getTime() - rules.cutoffMinutes * 60_000);
  if (!rules.cutoffDayStart) return relative;

  const dayStart = instantOn(day, "00:00");
  if (!dayStart) return relative;
  return dayStart < relative ? dayStart : relative;
}

/**
 * حالةُ كلِّ موعدٍ في يومٍ واحد: ما يُعرض، وبأيّ وقت، ولماذا أُقفل.
 *
 * والمرورُ من أوّل اليوم إلى آخره مرّةً واحدة: تأجيلُ موعدٍ لا يُعرف إلا بعد
 * معرفة حال الذي قبله، وحالُ الذي قبله لا تتوقف على ما بعده — فترتيبُ الحساب
 * هو ترتيبُ الساعة نفسُه. ثم مرّةٌ ثانيةٌ لإقفال «الذي قبل محجوزاً»، لأنّها
 * وحدَها تنظر إلى الوراء.
 */
export function dayOfferedSlots(
  slots: string[],
  rules: MeetingRules,
  bookedTimes: readonly string[],
  now: Date,
  date: string
): OfferedSlot[] {
  const booked = new Set(bookedTimes);
  const ordered = [...slots].filter((t) => toMinutes(t) !== null).sort((a, b) => toMinutes(a)! - toMinutes(b)!);

  // ١) الوقتُ المعروض، ومن المحجوز — يميناً إلى يسار الساعة.
  const rows: { time: string; offerTime: string; delayMinutes: number; isBooked: boolean }[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const time = ordered[i];
    const previousBooked = i > 0 && rows[i - 1].isBooked;

    let offerTime = time;
    let delayMinutes = 0;
    if (previousBooked && rules.afterAction === "DELAY") {
      const shifted = shiftTime(time, rules.afterDelayMinutes);
      if (shifted) {
        offerTime = shifted;
        delayMinutes = rules.afterDelayMinutes;
      }
    }

    // ويُسأل عن الوقتين: من حَجَز موعداً مؤجَّلاً حُفظ له الوقتُ المعروض، فلو
    // سُئل عن الأصليّ وحدَه لعُرض الموعدُ متاحاً مرّةً أخرى.
    const isBooked = booked.has(time) || (offerTime !== time && booked.has(offerTime));
    rows.push({ time, offerTime, delayMinutes, isBooked });
  }

  // ٢) الحالة. والترتيبُ مقصود: «محجوز» يسبق كلَّ شيءٍ فهو واقعٌ لا حكم، ثمّ
  // «مضى وقتُ الحجز» فهو أصدقُ ما يُقال لمن جاء متأخّراً، ثمّ المُقفَلُ لجاره.
  return rows.map((row, i) => {
    const closeAt = slotCloseInstant(date, row.offerTime, rules);
    const nextBooked = i + 1 < rows.length && rows[i + 1].isBooked;
    const previousBooked = i > 0 && rows[i - 1].isBooked;

    let state: SlotState = "OPEN";
    if (row.isBooked) state = "BOOKED";
    else if (!closeAt || now >= closeAt) state = "CLOSED";
    else if (rules.blockBefore && nextBooked) state = "BLOCKED";
    else if (rules.afterAction === "BLOCK" && previousBooked) state = "BLOCKED";

    return { time: row.time, offerTime: row.offerTime, state, delayMinutes: row.delayMinutes };
  });
}

export type AvailableDay = { date: string; slots: string[] };

/** أيامُ الجدول كما خُزِّنت → أيامٌ موثوقة، بلا ما لا يُقرأ. */
export function parseAvailableDays(raw: unknown): AvailableDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((day) => {
      if (!day || typeof day !== "object") return null;
      const { date, slots } = day as { date?: unknown; slots?: unknown };
      if (typeof date !== "string" || !parseCivilDay(date)) return null;
      const times = Array.isArray(slots) ? slots.filter((t): t is string => typeof t === "string") : [];
      return { date, slots: times };
    })
    .filter((day): day is AvailableDay => day !== null);
}

export type SlotLookup =
  | { ok: true; slot: OfferedSlot }
  | { ok: false; reason: string };

/**
 * هل يجوز حجزُ هذا الوقت بعينه؟ — حكمُ الخادم.
 *
 * ويُطلب بالوقت **المعروض**: من حجز موعداً مؤجَّلاً أرسل ١٠:٤٥ لا ١٠:٣٠،
 * فالمطابقةُ على `offerTime` هي التي تجعل الذي رآه هو الذي يُحفَظ له.
 */
export function findOpenSlot(
  availableDays: unknown,
  rules: MeetingRules,
  bookings: readonly { date: string; startTime: string }[],
  date: string,
  startTime: string,
  now: Date
): SlotLookup {
  const day = parseAvailableDays(availableDays).find((d) => d.date === date);
  if (!day) return { ok: false, reason: "هذا اليوم ليس من أيام هذا الجدول" };

  const bookedTimes = bookings.filter((b) => b.date === date).map((b) => b.startTime);
  const slot = dayOfferedSlots(day.slots, rules, bookedTimes, now, date).find((s) => s.offerTime === startTime);

  if (!slot) return { ok: false, reason: "هذا الوقت ليس من أوقات هذا اليوم" };
  if (slot.state === "BOOKED") return { ok: false, reason: "عذراً، تم حجز هذا الموعد للتو" };
  if (slot.state === "CLOSED") return { ok: false, reason: "انتهى وقت الحجز لهذا الموعد" };
  if (slot.state === "BLOCKED") return { ok: false, reason: "هذا الموعد غير متاح لحجز موعدٍ ملاصقٍ له" };

  return { ok: true, slot };
}

/** عددٌ بصيغته العربية: مفردٌ ومثنّى وجمعُ قلّةٍ وجمعُ كثرة. */
function countLabel(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** مدّةٌ بالدقائق → نصٌّ عربيّ: «ساعتين»، «٣ ساعات»، «٤٥ دقيقة». */
export function arabicDuration(minutes: number): string {
  if (minutes <= 0) return "بلا مهلة";
  if (minutes % (24 * 60) === 0) {
    const days = minutes / (24 * 60);
    return countLabel(days, "يوم", "يومين", "أيام", "يوماً");
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return countLabel(hours, "ساعة", "ساعتين", "ساعات", "ساعة");
  }
  if (minutes < 60) return countLabel(minutes, "دقيقة", "دقيقتين", "دقائق", "دقيقة");

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${countLabel(hours, "ساعة", "ساعتين", "ساعات", "ساعة")} و${countLabel(rest, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;
}

/** القاعدةُ كما تُقرأ: سطرٌ لكلّ شرط، تُعرض للموظف ولمن يحجز. */
export function describeMeetingRules(rules: MeetingRules): string[] {
  const lines: string[] = [];

  if (rules.cutoffMinutes > 0) lines.push(`يُغلق الحجز قبل الموعد بـ${arabicDuration(rules.cutoffMinutes)}`);
  else lines.push("يبقى الحجز مفتوحاً حتى وقت الموعد");

  if (rules.cutoffDayStart) lines.push("ولا يُحجز موعدٌ في يومه: من دخل عليه اليومُ أُغلق");

  if (rules.blockBefore) lines.push("وحين يُحجز موعد يُغلق الموعد الذي قبله مباشرة");

  if (rules.afterAction === "BLOCK") lines.push("ويُغلق الموعد الذي بعده مباشرة");
  else if (rules.afterAction === "DELAY")
    lines.push(`ويتأجّل الموعد الذي بعده ${arabicDuration(rules.afterDelayMinutes)}`);

  return lines;
}

/** ما يُكتب على موعدٍ غير متاح. */
export const SLOT_STATE_LABEL: Record<Exclude<SlotState, "OPEN">, string> = {
  BOOKED: "محجوز",
  CLOSED: "أُغلق الحجز",
  BLOCKED: "غير متاح",
};

/** سببُ المنع نصّاً، و`null` للمتاح — فالمتاحُ لا يُكتب عليه شيء. */
export function slotStateLabel(state: SlotState): string | null {
  return state === "OPEN" ? null : SLOT_STATE_LABEL[state];
}
