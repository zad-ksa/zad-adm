import test from "node:test";
import assert from "node:assert/strict";
import {
  annualActual,
  annualPercent,
  averagePercent,
  entryCompletion,
  grade,
  gradeTally,
  periodPercent,
  type IndicatorScoreInput,
  type PeriodResult,
  type Quarter,
} from "./indicatorScore.ts";

const r = (target: number | null, actual: number | null, state: PeriodResult["state"] = "ACTIVE"): PeriodResult => ({
  target,
  actual,
  state,
});

const make = (
  cumulative: boolean,
  year: PeriodResult,
  quarters: Partial<Record<Quarter, PeriodResult>>
): IndicatorScoreInput => ({ cumulative, year, quarters });

// ── نسبة الفترة الواحدة ────────────────────────────────────────────────────

test("نسبة الربع على مستهدفه وحده", () => {
  assert.equal(periodPercent(r(4, 2)), 50);
  assert.equal(periodPercent(r(90, 90)), 100);
});

test("النسبة محدودة بمئة ولو تجاوز المتحقق المستهدف", () => {
  assert.equal(periodPercent(r(1, 5)), 100);
});

test("تقريبٌ إلى منزلةٍ عشرية واحدة", () => {
  assert.equal(periodPercent(r(3, 1)), 33.3);
});

test("المؤجل لا نسبة له", () => {
  assert.equal(periodPercent(r(10, 5, "POSTPONED")), null);
});

test("«لا توجد بيانات» صفرٌ لا فراغ", () => {
  assert.equal(periodPercent(r(10, null, "NO_DATA")), 0);
  assert.equal(periodPercent(r(10, 7, "NO_DATA")), 0);
});

test("بلا مستهدفٍ لا نسبة — لا صفراً يُنزل المتوسط", () => {
  assert.equal(periodPercent(r(null, 5)), null);
});

test("مستهدفٌ صفر: لا شيء مطلوب فالإنجاز تام", () => {
  assert.equal(periodPercent(r(0, 0)), 100);
  assert.equal(periodPercent(r(0, 3)), 100);
});

test("متحققٌ ناقص مع مستهدفٍ قائم يُحتسب صفراً", () => {
  assert.equal(periodPercent(r(50, null)), 0);
});

test("مؤشر النقص: النزول تحسُّن", () => {
  assert.equal(periodPercent(r(10, 20, "ACTIVE"), "DOWN"), 50);
  assert.equal(periodPercent(r(10, 10, "ACTIVE"), "DOWN"), 100);
  assert.equal(periodPercent(r(10, 4, "ACTIVE"), "DOWN"), 100);
  assert.equal(periodPercent(r(10, 0, "ACTIVE"), "DOWN"), 100);
});

// ── المحقق السنوي: التراكمية ───────────────────────────────────────────────

test("غير تراكمي: مجموع الأرباع", () => {
  const ind = make(false, r(4, null), { Q1: r(1, 1), Q2: r(1, 1), Q3: r(1, 2), Q4: r(1, 0) });
  assert.deepEqual(annualActual(ind), { value: 4, source: "sum" });
  assert.equal(annualPercent(ind), 100);
});

test("تراكمي: آخر ربعٍ له متحقق لا مجموعها", () => {
  const ind = make(true, r(100, null), { Q1: r(100, 60), Q2: r(100, 80), Q3: r(100, 100), Q4: r(100, 100) });
  assert.deepEqual(annualActual(ind), { value: 100, source: "last" });
  assert.equal(annualPercent(ind), 100);
});

test("تراكمي بلا ربعٍ رابع: يُعتمد الثالث", () => {
  const ind = make(true, r(100, null), { Q1: r(100, 40), Q3: r(100, 75) });
  assert.deepEqual(annualActual(ind), { value: 75, source: "last" });
  assert.equal(annualPercent(ind), 75);
});

test("تراكمي بالربع الأول وحده", () => {
  const ind = make(true, r(100, null), { Q1: r(100, 30) });
  assert.deepEqual(annualActual(ind), { value: 30, source: "last" });
});

test("الربع المؤجل يُستثنى من الجمع ومن «آخر متحقق»", () => {
  const sum = make(false, r(10, null), { Q1: r(5, 3), Q4: r(5, 9, "POSTPONED") });
  assert.deepEqual(annualActual(sum), { value: 3, source: "sum" });

  const last = make(true, r(100, null), { Q3: r(100, 70), Q4: r(100, 95, "POSTPONED") });
  assert.deepEqual(annualActual(last), { value: 70, source: "last" });
});

test("بلا أرباعٍ مُدخلة: لا محقق سنوي", () => {
  assert.deepEqual(annualActual(make(false, r(4, null), {})), { value: null, source: "none" });
  assert.equal(annualPercent(make(false, r(4, null), {})), 0);
});

test("التجاوز اليدوي يتقدّم على الحساب", () => {
  const ind: IndicatorScoreInput = {
    cumulative: false,
    year: { target: 10, actual: 7, state: "ACTIVE", isOverride: true },
    quarters: { Q1: r(5, 1), Q2: r(5, 1) },
  };
  assert.deepEqual(annualActual(ind), { value: 7, source: "override" });
  assert.equal(annualPercent(ind), 70);
});

test("تجاوزٌ بلا قيمة لا يُعتدّ به", () => {
  const ind: IndicatorScoreInput = {
    cumulative: false,
    year: { target: 10, actual: null, state: "ACTIVE", isOverride: true },
    quarters: { Q1: r(5, 4) },
  };
  assert.deepEqual(annualActual(ind), { value: 4, source: "sum" });
});

test("مؤشرٌ مؤجلٌ للعام كلّه: لا نسبة سنوية", () => {
  const ind = make(false, r(4, null, "POSTPONED"), { Q1: r(1, 1) });
  assert.equal(annualPercent(ind), null);
});

// ── التصنيف ───────────────────────────────────────────────────────────────

test("حدود التصنيف", () => {
  assert.equal(grade(100), "EXCELLENT");
  assert.equal(grade(90), "EXCELLENT");
  assert.equal(grade(89.9), "GOOD");
  assert.equal(grade(70), "GOOD");
  assert.equal(grade(69.9), "WEAK");
  assert.equal(grade(0), "WEAK");
});

test("حالة المؤشر تتقدّم على نسبته في التصنيف", () => {
  assert.equal(grade(100, "POSTPONED"), "POSTPONED");
  assert.equal(grade(100, "NO_DATA"), "NO_DATA");
  assert.equal(grade(null), "NO_DATA");
});

// ── المتوسطات والتجميع ────────────────────────────────────────────────────

test("المتوسط يُستثني المؤجل ولا يَعدّه في المقام", () => {
  assert.equal(averagePercent([100, null, 50]), 75);
  assert.equal(averagePercent([null, null]), null);
  assert.equal(averagePercent([]), null);
});

test("المتوسط يَعدّ الصفر — «لا توجد بيانات» تُنزل الأداء", () => {
  assert.equal(averagePercent([100, 0]), 50);
});

test("توزيع الدرجات", () => {
  const tally = gradeTally(["EXCELLENT", "WEAK", "WEAK", "POSTPONED"]);
  assert.equal(tally.EXCELLENT, 1);
  assert.equal(tally.WEAK, 2);
  assert.equal(tally.POSTPONED, 1);
  assert.equal(tally.GOOD, 0);
});

test("نسبة اكتمال إدخال النتائج", () => {
  const filled = make(false, r(4, null), { Q1: r(1, 1) });
  const empty = make(false, r(4, null), {});
  const postponed = make(false, r(4, null, "POSTPONED"), {});
  assert.equal(entryCompletion([filled, empty]), 50);
  // المؤجل خارج البسط والمقام معاً.
  assert.equal(entryCompletion([filled, postponed]), 100);
  assert.equal(entryCompletion([postponed]), null);
  assert.equal(entryCompletion([]), null);
});

// ── مطابقة أرقام ملف المعاقد ──────────────────────────────────────────────

test("ت ٢-٤ «نسبة جاهزية المقر» — المؤشر الممتاز الوحيد في الملف", () => {
  // تراكمي: مستهدف ١٠٠، ومتحقق ١٠٠ في الربعين الثالث والرابع.
  const ind = make(true, r(100, null), { Q3: r(100, 100), Q4: r(100, 100) });
  assert.deepEqual(annualActual(ind), { value: 100, source: "last" });
  assert.equal(annualPercent(ind), 100);
  assert.equal(grade(annualPercent(ind)), "EXCELLENT");
  // ولو جُمعت لصارت ٢٠٠ فظهرت نسبةٌ لا معنى لها.
  assert.notEqual(annualActual({ ...ind, cumulative: false }).value, 100);
});

test("س ١-١ «عدد المبادرات» — غير تراكمي بمستهدفٍ سنويٍّ أربع", () => {
  const ind = make(false, r(4, null), { Q3: r(1, 0), Q4: r(1, 0) });
  assert.equal(annualPercent(ind), 0);
  assert.equal(grade(annualPercent(ind)), "WEAK");
});
