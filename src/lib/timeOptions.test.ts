import test from "node:test";
import assert from "node:assert/strict";
import {
  formatTime12,
  HOUR_OPTIONS,
  isTimeOutOfRange,
  isTimeString,
  joinTime,
  minutesToTime,
  minuteOptions,
  roundToStep,
  splitTime,
  timeSpanMinutes,
  timeToMinutes,
} from "./timeOptions.ts";

test("الوقتُ يُقرأ ويُكتب بلا منطقةٍ زمنيّة", () => {
  assert.equal(timeToMinutes("00:00"), 0);
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("23:59"), 1439);
  assert.equal(timeToMinutes("9:05"), 545);
  assert.equal(timeToMinutes("24:00"), null);
  assert.equal(timeToMinutes("09:60"), null);
  assert.equal(timeToMinutes(""), null);
  assert.equal(timeToMinutes(null), null);
  assert.equal(minutesToTime(570), "09:30");
  assert.equal(minutesToTime(-5), "00:00");
  assert.equal(minutesToTime(99999), "23:59");
  assert.equal(isTimeString("17:00"), true);
  assert.equal(isTimeString("ظهراً"), false);
});

test("التقسيمُ إلى ساعةٍ ودقيقةٍ ونصفِ يوم", () => {
  assert.deepEqual(splitTime("17:30"), { hour12: 5, minute: 30, meridiem: "PM" });
  assert.deepEqual(splitTime("09:05"), { hour12: 9, minute: 5, meridiem: "AM" });
  // منتصفُ الليل ١٢ صباحاً، والظهرُ ١٢ مساءً — لا صفرٌ ولا ١٢ صباحاً للظهر.
  assert.deepEqual(splitTime("00:00"), { hour12: 12, minute: 0, meridiem: "AM" });
  assert.deepEqual(splitTime("12:00"), { hour12: 12, minute: 0, meridiem: "PM" });
  assert.equal(splitTime("خطأ"), null);
});

test("والجمعُ يعيدُ ما قسَمه", () => {
  for (const value of ["00:00", "00:30", "09:05", "12:00", "12:45", "17:30", "23:59"]) {
    assert.equal(joinTime(splitTime(value)!), value);
  }
});

test("العرضُ بصيغةِ ١٢ ساعةً عربيّة", () => {
  assert.equal(formatTime12("17:30"), "5:30 م");
  assert.equal(formatTime12("09:05"), "9:05 ص");
  assert.equal(formatTime12("00:00"), "12:00 ص");
  assert.equal(formatTime12("12:00"), "12:00 م");
  // وما لا يُقرأ يُعاد كما هو، فلا يُكتب NaN في شاشة.
  assert.equal(formatTime12("لا شيء"), "لا شيء");
});

test("عمودُ الساعة يبدأ باثنتي عشرة كوجه الساعة", () => {
  assert.equal(HOUR_OPTIONS.length, 12);
  assert.equal(HOUR_OPTIONS[0], 12);
  assert.equal(HOUR_OPTIONS[1], 1);
  assert.equal(HOUR_OPTIONS[11], 11);
});

test("عمودُ الدقيقة يتبع الخطوة", () => {
  assert.deepEqual(minuteOptions(15), [0, 15, 30, 45]);
  assert.deepEqual(minuteOptions(30), [0, 30]);
  assert.equal(minuteOptions(5).length, 12);
  assert.equal(minuteOptions(1).length, 60);
  // خطوةٌ لا تُقرأ تعود إلى خمسٍ، ولا تُخرج عموداً فارغاً.
  assert.equal(minuteOptions(0).length, 12);
  assert.equal(minuteOptions(NaN).length, 12);
});

test("المدى يُقاس بالدقائق، فلا يُخطئ في «٩:٠٠» و«٠٩:٠٠»", () => {
  assert.equal(isTimeOutOfRange("08:00", "9:00"), true);
  assert.equal(isTimeOutOfRange("09:00", "9:00"), false);
  assert.equal(isTimeOutOfRange("17:01", undefined, "17:00"), true);
  assert.equal(isTimeOutOfRange("12:00", "08:00", "16:00"), false);
  assert.equal(isTimeOutOfRange("لا وقت", "08:00"), false);
});

test("التقريبُ إلى الخطوة يُظهر دقيقةً مختارةً لقيمةٍ قديمة", () => {
  assert.equal(roundToStep("09:07", 15), "09:00");
  assert.equal(roundToStep("09:08", 15), "09:15");
  assert.equal(roundToStep("09:07", 5), "09:05");
  assert.equal(roundToStep("23:59", 30), "23:59");
  assert.equal(roundToStep("غير صالح", 15), "غير صالح");
});

test("المدّةُ تعبُر منتصفَ الليل", () => {
  assert.equal(timeSpanMinutes("08:00", "16:00"), 480);
  assert.equal(timeSpanMinutes("22:00", "06:00"), 480);
  assert.equal(timeSpanMinutes("08:00", "08:00"), 0);
  assert.equal(timeSpanMinutes("08:00", "خطأ"), null);
});
