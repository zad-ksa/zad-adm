import test from "node:test";
import assert from "node:assert/strict";
import { WEEKDAY_LABELS } from "./attendanceTime.ts";
import {
  formatDateShort,
  formatDateWithWeekday,
  isISODate,
  isOutOfRange,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  toISODate,
  WEEKDAY_INITIALS,
} from "./calendarGrid.ts";

test("الشبكةُ ستّةُ صفوفٍ × سبعةُ أيامٍ دائماً — فلا يقفز ما تحتها بتغيّر الشهر", () => {
  for (const month of [0, 1, 7, 11]) {
    const grid = monthGrid({ year: 2026, month });
    assert.equal(grid.length, 6);
    assert.ok(grid.every((week) => week.length === 7));
  }
});

test("الصفُّ يبدأ بالأحد، وأوّلُ الشهر في خانته من الأسبوع", () => {
  // ١ نوفمبر ٢٠٢٦ يومُ أحد: فيكون أوّلَ خانةٍ في أوّل صفّ.
  const grid = monthGrid({ year: 2026, month: 10 });
  assert.equal(grid[0][0].date, "2026-11-01");
  assert.equal(grid[0][0].inMonth, true);

  // ١ ديسمبر ٢٠٢٦ يومُ ثلاثاء: فأوّلُ الصفّ ٢٩ نوفمبر (الأحد) حشواً.
  const dec = monthGrid({ year: 2026, month: 11 });
  assert.equal(dec[0][0].date, "2026-11-29");
  assert.equal(dec[0][0].inMonth, false);
  assert.equal(dec[0][2].date, "2026-12-01");
  assert.equal(dec[0][2].inMonth, true);
});

test("رأسُ الشبكة سبعةُ أحرفٍ تبدأ بالحاء", () => {
  assert.equal(WEEKDAY_INITIALS.length, 7);
  assert.equal(WEEKDAY_INITIALS[0], "ح");
  assert.equal(WEEKDAY_INITIALS[6], "س");
});

test("شباطُ الكبيسةُ كاملٌ في شبكته", () => {
  const days = monthGrid({ year: 2028, month: 1 })
    .flat()
    .filter((c) => c.inMonth);
  assert.equal(days.length, 29);
  assert.equal(days[days.length - 1].date, "2028-02-29");
});

test("إزاحةُ الشهر تلتفّ على السنة", () => {
  assert.deepEqual(shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 5 }, 0), { year: 2026, month: 5 });
});

test("شهرُ القيمة، وإلّا شهرُ اليوم", () => {
  assert.deepEqual(monthOf("2026-03-17", "2026-11-09"), { year: 2026, month: 2 });
  assert.deepEqual(monthOf("", "2026-11-09"), { year: 2026, month: 10 });
  assert.deepEqual(monthOf("ليس تاريخاً", "2026-11-09"), { year: 2026, month: 10 });
});

test("المدى يُقاس بالنصّ: الترتيبُ المعجميُّ هو الزمنيّ", () => {
  assert.equal(isOutOfRange("2026-11-08", "2026-11-09"), true);
  assert.equal(isOutOfRange("2026-11-09", "2026-11-09"), false);
  assert.equal(isOutOfRange("2026-12-01", undefined, "2026-11-30"), true);
  assert.equal(isOutOfRange("2026-11-09", "2026-11-01", "2026-11-30"), false);
  // حدٌّ لا يُقرأ لا يحجب شيئاً.
  assert.equal(isOutOfRange("2026-11-09", "غير صالح"), false);
});

test("التاريخُ يُقرأ ومعه اسمُ يومه — ميلاديّاً", () => {
  assert.equal(formatDateWithWeekday("2026-11-09", WEEKDAY_LABELS), "الإثنين 9 نوفمبر 2026");
  assert.equal(formatDateShort("2026-11-09"), "9 نوفمبر 2026");
  assert.equal(monthLabel({ year: 2026, month: 10 }), "نوفمبر 2026");
  // وما لا يُقرأ يُعاد كما هو، فلا يُكتب «Invalid Date» في شاشة.
  assert.equal(formatDateWithWeekday("خطأ", WEEKDAY_LABELS), "خطأ");
});

test("التاريخُ الصالحُ يُعرَف، والشهرُ الذي لا ثلاثين فيه يُردّ", () => {
  assert.equal(isISODate("2026-11-09"), true);
  assert.equal(isISODate("2026-02-31"), false);
  assert.equal(isISODate(""), false);
  assert.equal(isISODate(null), false);
  assert.equal(toISODate(new Date(Date.UTC(2026, 10, 9))), "2026-11-09");
});
