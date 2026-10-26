import test from "node:test";
import assert from "node:assert/strict";
import {
  budgetSummary,
  currentPlanWeek,
  daysRemaining,
  expectedPercent,
  groupPercent,
  initiativePercent,
  initiativeStatus,
  scheduleAdherence,
  scheduleFlags,
  weekStartDate,
  type StepInput,
} from "./initiativeProgress.ts";

const step = (progress: number, extra: Partial<StepInput> = {}): StepInput => ({ progress, ...extra });
const d = (iso: string) => new Date(iso + "T00:00:00Z");

// ── نسبة الإنجاز ──────────────────────────────────────────────────────────

test("متوسطٌ بسيط لنسب الخطوات", () => {
  assert.equal(initiativePercent([step(100), step(0), step(0), step(0)]), 25);
  assert.equal(initiativePercent([step(50), step(100)]), 75);
});

test("مبادرةٌ بلا خطوات: لا نسبة", () => {
  assert.equal(initiativePercent([]), null);
});

test("لا ترجيح بالتكلفة — «أرشفة الملفات» من ملف المعاقد", () => {
  // سبع خطوات، الأولى بإنجاز تام وتكلفتها ٧٥٠ من إجمالي ٨٨٠٠.
  const steps = [
    step(100, { cost: 750 }),
    step(0, { cost: 750 }),
    step(0, { cost: 750 }),
    step(0, { cost: 750 }),
    step(0, { cost: 2000 }),
    step(0, { cost: 1900 }),
    step(0, { cost: 1900 }),
  ];
  // الكشاف يقول ١٤٢٨٥٧,٠ أي ١÷٧ = ٣,١٤٪ — لا ٥٢,٨٪ التي يعطيها الترجيح.
  assert.equal(initiativePercent(steps), 14.3);
});

test("متوسط الإدارة متوسطٌ بسيط لمبادراتها — «التحول الرقمي»", () => {
  // مبادرتان: أرشفة ١÷٧ وأتمتة صفر ← لوحة المعلومات تقول ٠٧١٤٢٨٥٧,٠.
  assert.equal(groupPercent([14.3, 0]), 7.2);
  assert.equal(groupPercent([null, null]), null);
  assert.equal(groupPercent([]), null);
});

// ── الزمن ─────────────────────────────────────────────────────────────────

test("الأيام المتبقية", () => {
  assert.equal(daysRemaining(d("2026-12-31"), d("2026-12-01")), 30);
  assert.equal(daysRemaining(d("2026-11-01"), d("2026-12-01")), -30);
  assert.equal(daysRemaining(d("2026-12-01"), d("2026-12-01")), 0);
  assert.equal(daysRemaining(null, d("2026-12-01")), null);
});

test("النسبة المتوقَّعة: ما مضى من المدّة", () => {
  assert.equal(expectedPercent(d("2026-01-01"), d("2026-01-11"), d("2026-01-06")), 50);
  assert.equal(expectedPercent(d("2026-01-01"), d("2026-01-11"), d("2025-12-01")), 0);
  assert.equal(expectedPercent(d("2026-01-01"), d("2026-01-11"), d("2026-02-01")), 100);
  assert.equal(expectedPercent(null, d("2026-01-11"), d("2026-01-06")), null);
});

test("مدّةٌ صفرية لا تقسم على صفر", () => {
  assert.equal(expectedPercent(d("2026-01-05"), d("2026-01-05"), d("2026-01-05")), 100);
  assert.equal(expectedPercent(d("2026-01-05"), d("2026-01-05"), d("2026-01-01")), 0);
});

test("الالتزام بالجدول: المنجَز على المتوقَّع", () => {
  assert.equal(scheduleAdherence(50, 50), 100);
  assert.equal(scheduleAdherence(25, 50), 50);
  assert.equal(scheduleAdherence(60, 50), 120);
  assert.equal(scheduleAdherence(null, 50), null);
  assert.equal(scheduleAdherence(0, 0), null);
  assert.equal(scheduleAdherence(10, 0), 100);
});

// ── الحالة ────────────────────────────────────────────────────────────────

test("منتهية ببلوغ المئة", () => {
  assert.equal(
    initiativeStatus({ percent: 100, startDate: d("2026-01-01"), endDate: d("2026-06-01"), today: d("2026-03-01") }),
    "DONE"
  );
});

test("لم تبدأ قبل موعد البداية", () => {
  assert.equal(
    initiativeStatus({ percent: 0, startDate: d("2026-06-01"), endDate: d("2026-09-01"), today: d("2026-03-01") }),
    "NOT_STARTED"
  );
});

test("متعثرة إن انقضى الموعد ولم تكتمل", () => {
  assert.equal(
    initiativeStatus({ percent: 80, startDate: d("2026-01-01"), endDate: d("2026-02-01"), today: d("2026-03-01") }),
    "AT_RISK"
  );
});

test("متعثرة إن تخلّف الإنجاز عن المتوقَّع فوق الهامش", () => {
  // مضى نصف المدّة والإنجاز صفر.
  assert.equal(
    initiativeStatus({ percent: 0, startDate: d("2026-01-01"), endDate: d("2026-01-11"), today: d("2026-01-06") }),
    "AT_RISK"
  );
});

test("تأخّرٌ داخل الهامش جارية لا متعثرة", () => {
  // المتوقَّع ٥٠٪ والمنجَز ٤٥٪ — فرقٌ خمسةٌ والهامش عشرة.
  assert.equal(
    initiativeStatus({ percent: 45, startDate: d("2026-01-01"), endDate: d("2026-01-11"), today: d("2026-01-06") }),
    "RUNNING"
  );
});

test("بلا تواريخ: الإنجاز وحده يحكم", () => {
  assert.equal(initiativeStatus({ percent: 0, today: d("2026-03-01") }), "NOT_STARTED");
  assert.equal(initiativeStatus({ percent: 40, today: d("2026-03-01") }), "RUNNING");
  assert.equal(initiativeStatus({ percent: 100, today: d("2026-03-01") }), "DONE");
});

test("نسبةٌ معدومة تُعامَل كصفر لا كخطأ", () => {
  assert.equal(initiativeStatus({ percent: null, today: d("2026-03-01") }), "NOT_STARTED");
});

// ── الموازنة ──────────────────────────────────────────────────────────────

test("ملخّص الموازنة والانحراف", () => {
  const steps = [step(0, { cost: 1800, actualCost: 500 }), step(0, { cost: 1200, actualCost: 0 })];
  const b = budgetSummary(steps, 80000);
  assert.equal(b.budget, 80000);
  assert.equal(b.planned, 3000);
  assert.equal(b.spent, 500);
  assert.equal(b.variance, 79500);
  assert.equal(b.spentPercent, 0.6);
});

test("موازنةٌ صفر: لا نسبة صرف ولا قسمةٌ على صفر", () => {
  const b = budgetSummary([step(0, { cost: 100, actualCost: 50 })], 0);
  assert.equal(b.spentPercent, null);
  assert.equal(b.variance, -50);
});

test("تجاوز الموازنة انحرافٌ سالب", () => {
  const b = budgetSummary([step(0, { actualCost: 1200 })], 1000);
  assert.equal(b.variance, -200);
  assert.equal(b.spentPercent, 120);
});

// ── محور الأسابيع والشارات ────────────────────────────────────────────────

test("أسبوع الخطة الحالي نسبةً إلى بدايتها", () => {
  const start = d("2026-08-03");
  assert.equal(currentPlanWeek(start, d("2026-08-03"), 22), 1);
  assert.equal(currentPlanWeek(start, d("2026-08-09"), 22), 1);
  assert.equal(currentPlanWeek(start, d("2026-08-10"), 22), 2);
  assert.equal(currentPlanWeek(start, d("2026-07-01"), 22), 0);
  // بعد انقضاء الخطة: weekCount + 1
  assert.equal(currentPlanWeek(start, d("2027-06-01"), 22), 23);
});

test("تاريخ بداية الأسبوع", () => {
  assert.equal(weekStartDate(d("2026-08-03"), 1).toISOString().slice(0, 10), "2026-08-03");
  assert.equal(weekStartDate(d("2026-08-03"), 3).toISOString().slice(0, 10), "2026-08-17");
});

test("أسابيع مجدولة بلا إنجاز", () => {
  const steps = [
    step(0, { planStartWeek: 1, planWeeks: 2 }), // انتهى أسبوعها ولا إنجاز
    step(100, { planStartWeek: 1, planWeeks: 2 }),
    step(0, { planStartWeek: 9, planWeeks: 1 }), // لم يحن بعد
  ];
  assert.equal(scheduleFlags(steps, 5).plannedWithoutProgress, 1);
});

test("خطوةٌ بدأت في غير أسبوعها", () => {
  const steps = [step(100, { planStartWeek: 5, planWeeks: 2, actualStartWeek: 7, actualWeeks: 1 })];
  const flags = scheduleFlags(steps, 9);
  assert.equal(flags.shiftedSteps, 1);
  assert.equal(flags.offPlanSteps, 1);
});

test("خطوةٌ على خطتها لا تُوسَم", () => {
  const steps = [step(100, { planStartWeek: 5, planWeeks: 2, actualStartWeek: 5, actualWeeks: 2 })];
  const flags = scheduleFlags(steps, 9);
  assert.equal(flags.shiftedSteps, 0);
  assert.equal(flags.offPlanSteps, 0);
});

test("خطوةٌ بلا أسبوع بداية لا تُحسب ولا تُسقط الدالّة", () => {
  const flags = scheduleFlags([step(0), step(50, { actualStartWeek: 0 })], 9);
  assert.deepEqual(flags, { plannedWithoutProgress: 0, offPlanSteps: 0, shiftedSteps: 0 });
});
