import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_RATING_IDS,
  COMMITMENT_IDS,
  READINESS_IDS,
  SECTION_COUNT,
  parseProgress,
  ratingAverage,
  ratingsComplete,
  stepPlannedEnd,
} from "./planSurvey.ts";

// ── بنيةُ الاستبانة ────────────────────────────────────────────────────────

test("سبعةُ أقسام، وعباراتٌ من ١ إلى ٢١ بلا تكرارٍ ولا ثغرة", () => {
  assert.equal(SECTION_COUNT, 7);
  assert.equal(COMMITMENT_IDS.length, 15);
  assert.equal(READINESS_IDS.length, 6);
  assert.deepEqual(ALL_RATING_IDS, Array.from({ length: 21 }, (_, i) => i + 1));
  assert.equal(new Set(ALL_RATING_IDS).size, 21);
});

// ── المتوسط ────────────────────────────────────────────────────────────────

test("المتوسطُ على ما أُجيب عنه، وغيرُ المُجاب لا يُحسب صفراً", () => {
  const r = ratingAverage({ "1": 5, "2": 3 }, [1, 2, 3]);
  assert.equal(r.average, 4);
  assert.equal(r.answered, 2);
  assert.equal(r.total, 3);
});

test("بلا جوابٍ لا متوسط — ولا صفر", () => {
  assert.equal(ratingAverage({}, [1, 2]).average, null);
  assert.equal(ratingAverage(null, [1]).average, null);
});

test("درجةٌ خارج السُّلّم تُهمَل", () => {
  assert.equal(ratingAverage({ "1": 9, "2": 0, "3": 4 }, [1, 2, 3]).answered, 1);
});

test("الكسرُ يُقرَّب إلى منزلتين", () => {
  assert.equal(ratingAverage({ "1": 5, "2": 4, "3": 4 }, [1, 2, 3]).average, 4.33);
});

// ── تمامُ القسم ────────────────────────────────────────────────────────────

test("القسمُ لا يتمّ بعبارةٍ ناقصة", () => {
  assert.equal(ratingsComplete({ "1": 5, "2": 4 }, [1, 2]), true);
  assert.equal(ratingsComplete({ "1": 5 }, [1, 2]), false);
  assert.equal(ratingsComplete({ "1": 5, "2": 7 }, [1, 2]), false);
});

// ── نسبةُ الإنجاز ──────────────────────────────────────────────────────────

test("النسبةُ تُقبل بعلامتها وبلا علامة", () => {
  assert.equal(parseProgress("40"), 40);
  assert.equal(parseProgress("40%"), 40);
  assert.equal(parseProgress("٪40"), 40);
  assert.equal(parseProgress(" 100 "), 100);
  assert.equal(parseProgress(0), 0);
});

test("ما خرج عن ٠-١٠٠ يُرفض", () => {
  assert.equal(parseProgress("101"), null);
  assert.equal(parseProgress("-1"), null);
  assert.equal(parseProgress("كثير"), null);
  assert.equal(parseProgress(""), null);
});

// ── موعدُ الخطوة ───────────────────────────────────────────────────────────

const planStart = new Date("2026-08-01T00:00:00Z");
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

test("الأسبوعُ الأول ينتهي بآخر أيامه", () => {
  assert.equal(iso(stepPlannedEnd(planStart, 1, 1)), "2026-08-07");
});

test("أسبوعان من الثالث", () => {
  // يبدأ ١٥ أغسطس وينتهي ٢٨
  assert.equal(iso(stepPlannedEnd(planStart, 3, 2)), "2026-08-28");
});

test("عددُ أسابيعَ غائبٌ يُعدّ أسبوعاً", () => {
  assert.equal(iso(stepPlannedEnd(planStart, 2, null)), "2026-08-14");
});

test("بلا أسبوعِ بدايةٍ لا موعد", () => {
  assert.equal(stepPlannedEnd(planStart, null, 3), null);
  assert.equal(stepPlannedEnd(planStart, 0, 3), null);
});
