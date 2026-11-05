import test from "node:test";
import assert from "node:assert/strict";
import {
  arabicDuration,
  dayOfferedSlots,
  describeMeetingRules,
  findOpenSlot,
  parseAvailableDays,
  parseMeetingRules,
  shiftTime,
  DEFAULT_MEETING_RULES,
  type MeetingRules,
} from "./meetingSlots.ts";

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/** لحظةٌ بساعة الرياض — كلُّ التواريخ في الاختبار تُكتب كما يراها الموظف. */
const at = (wall: string) => new Date(new Date(`${wall}Z`).getTime() - RIYADH_OFFSET_MS);

const rules = (over: Partial<MeetingRules> = {}): MeetingRules => ({ ...DEFAULT_MEETING_RULES, ...over });

const DAY = "2026-11-09";
const SLOTS = ["10:00", "10:30", "11:00", "11:30"];

const stateOf = (list: ReturnType<typeof dayOfferedSlots>, time: string) =>
  list.find((s) => s.time === time)?.state;

test("بلا إغلاقٍ مسبق: الموعدُ متاحٌ حتى بدايته ثم يُقفل", () => {
  const open = dayOfferedSlots(SLOTS, rules(), [], at(`${DAY}T09:59`), DAY);
  assert.equal(stateOf(open, "10:00"), "OPEN");

  const shut = dayOfferedSlots(SLOTS, rules(), [], at(`${DAY}T10:00`), DAY);
  assert.equal(stateOf(shut, "10:00"), "CLOSED");
  assert.equal(stateOf(shut, "10:30"), "OPEN");
});

test("الإغلاقُ المسبق بساعتين يُقفل العشرةَ عند الثامنة لا قبلها", () => {
  const r = rules({ cutoffMinutes: 120 });
  assert.equal(stateOf(dayOfferedSlots(SLOTS, r, [], at(`${DAY}T07:59`), DAY), "10:00"), "OPEN");
  assert.equal(stateOf(dayOfferedSlots(SLOTS, r, [], at(`${DAY}T08:00`), DAY), "10:00"), "CLOSED");
});

test("«لا حجزَ في يومه» يُقفل اليومَ كلَّه مع منتصف ليله", () => {
  const r = rules({ cutoffDayStart: true });
  const eve = dayOfferedSlots(SLOTS, r, [], at("2026-11-08T23:59"), DAY);
  assert.deepEqual(eve.map((s) => s.state), ["OPEN", "OPEN", "OPEN", "OPEN"]);

  const dawn = dayOfferedSlots(SLOTS, r, [], at(`${DAY}T00:00`), DAY);
  assert.deepEqual(dawn.map((s) => s.state), ["CLOSED", "CLOSED", "CLOSED", "CLOSED"]);
});

test("الشرطان معاً: الأضيقُ يغلب", () => {
  // «قبله بنصف ساعة» وحدَها تُبقي العشرةَ مفتوحاً إلى ٩:٣٠ من يومه، لكنّ
  // «بداية اليوم» أسبقُ فتغلب.
  const r = rules({ cutoffMinutes: 30, cutoffDayStart: true });
  assert.equal(stateOf(dayOfferedSlots(SLOTS, r, [], at(`${DAY}T00:01`), DAY), "10:00"), "CLOSED");
});

test("إغلاقُ الملاصقِ قبل المحجوز", () => {
  const list = dayOfferedSlots(SLOTS, rules({ blockBefore: true }), ["11:00"], at(`${DAY}T08:00`), DAY);
  assert.equal(stateOf(list, "10:30"), "BLOCKED");
  assert.equal(stateOf(list, "11:00"), "BOOKED");
  assert.equal(stateOf(list, "11:30"), "OPEN");
  assert.equal(stateOf(list, "10:00"), "OPEN");
});

test("إغلاقُ الملاصقِ بعد المحجوز", () => {
  const list = dayOfferedSlots(SLOTS, rules({ afterAction: "BLOCK" }), ["10:30"], at(`${DAY}T08:00`), DAY);
  assert.equal(stateOf(list, "10:00"), "OPEN");
  assert.equal(stateOf(list, "11:00"), "BLOCKED");
});

test("الاثنان معاً يُقفلان جارَي المحجوز", () => {
  const list = dayOfferedSlots(
    SLOTS,
    rules({ blockBefore: true, afterAction: "BLOCK" }),
    ["10:30"],
    at(`${DAY}T08:00`),
    DAY
  );
  assert.deepEqual(list.map((s) => s.state), ["BLOCKED", "BOOKED", "BLOCKED", "OPEN"]);
});

test("التأجيل: الذي بعد المحجوز يُعرض متأخّراً ويبقى متاحاً", () => {
  const list = dayOfferedSlots(
    SLOTS,
    rules({ afterAction: "DELAY", afterDelayMinutes: 15 }),
    ["10:30"],
    at(`${DAY}T08:00`),
    DAY
  );
  const delayed = list.find((s) => s.time === "11:00")!;
  assert.equal(delayed.offerTime, "11:15");
  assert.equal(delayed.delayMinutes, 15);
  assert.equal(delayed.state, "OPEN");
  // ولا يُزاح إلا الملاصق: الذي بعده على وقته.
  assert.equal(list.find((s) => s.time === "11:30")!.offerTime, "11:30");
});

test("الموعدُ المؤجَّلُ إذا حُجز بوقته المعروض لا يُعرض متاحاً مرّةً أخرى", () => {
  const list = dayOfferedSlots(
    SLOTS,
    rules({ afterAction: "DELAY", afterDelayMinutes: 15 }),
    ["10:30", "11:15"],
    at(`${DAY}T08:00`),
    DAY
  );
  assert.equal(stateOf(list, "11:00"), "BOOKED");
});

test("حكمُ الخادم يقبل الوقتَ المعروض ويردّ الأصليّ حين يتأجّل", () => {
  const days = [{ date: DAY, slots: SLOTS }];
  const r = rules({ afterAction: "DELAY", afterDelayMinutes: 15 });
  const booked = [{ date: DAY, startTime: "10:30" }];

  assert.equal(findOpenSlot(days, r, booked, DAY, "11:15", at(`${DAY}T08:00`)).ok, true);
  assert.equal(findOpenSlot(days, r, booked, DAY, "11:00", at(`${DAY}T08:00`)).ok, false);
});

test("حكمُ الخادم يردّ وقتاً ليس من الجدول، ويوماً ليس منه", () => {
  const days = [{ date: DAY, slots: SLOTS }];
  assert.equal(findOpenSlot(days, rules(), [], DAY, "13:00", at(`${DAY}T08:00`)).ok, false);
  assert.equal(findOpenSlot(days, rules(), [], "2026-11-10", "10:00", at(`${DAY}T08:00`)).ok, false);
});

test("حكمُ الخادم يردّ المُغلقَ ويذكر السبب", () => {
  const days = [{ date: DAY, slots: SLOTS }];
  const res = findOpenSlot(days, rules({ cutoffMinutes: 120 }), [], DAY, "10:00", at(`${DAY}T09:00`));
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.reason, "انتهى وقت الحجز لهذا الموعد");
});

test("القواعدُ تُطهَّر: جدولٌ قديمٌ بلا أعمدة، وقيمةٌ لا تُفهم، وتأجيلٌ فوق المدّة", () => {
  assert.deepEqual(parseMeetingRules({ duration: 30 }), DEFAULT_MEETING_RULES);
  assert.equal(parseMeetingRules({ duration: 30, afterSlotAction: "WHATEVER" }).afterAction, "NONE");
  // التأجيلُ لا يتجاوز مدّة الاجتماع، وإلّا دفع الموعدَ فوق الذي يليه.
  assert.equal(
    parseMeetingRules({ duration: 30, afterSlotAction: "DELAY", afterSlotDelayMinutes: 90 }).afterDelayMinutes,
    30
  );
  assert.equal(parseMeetingRules({ duration: 30, bookingCutoffMinutes: -5 }).cutoffMinutes, 0);
});

test("التأجيلُ فوق منتصف الليل يُترك على وقته", () => {
  assert.equal(shiftTime("23:50", 15), null);
  const list = dayOfferedSlots(
    ["23:00", "23:50"],
    rules({ afterAction: "DELAY", afterDelayMinutes: 15 }),
    ["23:00"],
    at(`${DAY}T08:00`),
    DAY
  );
  assert.equal(list.find((s) => s.time === "23:50")!.offerTime, "23:50");
});

test("أيامُ الجدول تُطهَّر من كل ما لا يُقرأ", () => {
  const parsed = parseAvailableDays([
    { date: DAY, slots: ["10:00", 7] },
    { date: "2026-02-31", slots: ["10:00"] },
    { date: "ليس تاريخاً", slots: [] },
    null,
    "نصّ",
  ]);
  assert.deepEqual(parsed, [{ date: DAY, slots: ["10:00"] }]);
});

test("المدّةُ تُكتب بصيغة العدد العربية", () => {
  assert.equal(arabicDuration(0), "بلا مهلة");
  assert.equal(arabicDuration(1), "دقيقة");
  assert.equal(arabicDuration(2), "دقيقتين");
  assert.equal(arabicDuration(45), "45 دقيقة");
  assert.equal(arabicDuration(60), "ساعة");
  assert.equal(arabicDuration(120), "ساعتين");
  assert.equal(arabicDuration(180), "3 ساعات");
  assert.equal(arabicDuration(720), "12 ساعة");
  assert.equal(arabicDuration(90), "ساعة و30 دقيقة");
  assert.equal(arabicDuration(1440), "يوم");
  assert.equal(arabicDuration(2880), "يومين");
});

test("القاعدةُ تُقرأ سطوراً — وبلا شرطٍ تقول ذلك صريحاً", () => {
  assert.deepEqual(describeMeetingRules(rules()), ["يبقى الحجز مفتوحاً حتى وقت الموعد"]);
  assert.deepEqual(
    describeMeetingRules(rules({ cutoffMinutes: 120, cutoffDayStart: true, blockBefore: true, afterAction: "DELAY", afterDelayMinutes: 15 })),
    [
      "يُغلق الحجز قبل الموعد بـساعتين",
      "ولا يُحجز موعدٌ في يومه: من دخل عليه اليومُ أُغلق",
      "وحين يُحجز موعد يُغلق الموعد الذي قبله مباشرة",
      "ويتأجّل الموعد الذي بعده 15 دقيقة",
    ]
  );
});
