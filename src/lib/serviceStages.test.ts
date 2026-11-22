import test from "node:test";
import assert from "node:assert/strict";
import {
  SERVICE_STATE_LABEL,
  currentStage,
  currentStep,
  groupStages,
  isComingSoon,
  serviceProgress,
  serviceState,
  serviceStateOf,
  sortedSteps,
  type ServiceStage,
} from "./serviceStages.ts";

const stage = (over: Partial<ServiceStage> & { id: string; order: number }): ServiceStage => ({
  name: `مرحلة ${over.order}`,
  ...over,
});

const trail: ServiceStage[] = [
  stage({ id: "c", order: 3 }),
  stage({ id: "a", order: 1, isDone: true }),
  stage({ id: "perm", order: 9, isContinuous: true, isActive: true, name: "استشارات" }),
  stage({ id: "b", order: 2, steps: [
    { id: "s2", name: "الثانية", order: 2 },
    { id: "s1", name: "الأولى", order: 1, isDone: true },
  ] }),
];

// ── التقسيم والترتيب ───────────────────────────────────────────────────────

test("المتتابعةُ تُفرز عن الدائمة، وكلٌّ مرتَّبةٌ بترتيبها", () => {
  const { sequential, continuous } = groupStages(trail);
  assert.deepEqual(sequential.map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(continuous.map((s) => s.id), ["perm"]);
});

test("قائمةٌ فارغةٌ لا تكسر التقسيم", () => {
  assert.deepEqual(groupStages([]), { sequential: [], continuous: [] });
  assert.deepEqual(groupStages(), { sequential: [], continuous: [] });
});

test("الخطواتُ تُرتَّب، ومرحلةٌ بلا خطواتٍ قائمةٌ فارغة", () => {
  assert.deepEqual(sortedSteps(trail.find((s) => s.id === "b")).map((s) => s.id), ["s1", "s2"]);
  assert.deepEqual(sortedSteps(null), []);
});

// ── الحالية ────────────────────────────────────────────────────────────────

test("الحاليةُ أوّلُ ما لم يُنجَز حين لا علَم", () => {
  assert.equal(currentStage(trail)?.id, "b");
});

test("والعلَمُ يسبق الاحتياط", () => {
  const marked = trail.map((s) => (s.id === "c" ? { ...s, isCurrent: true } : s));
  assert.equal(currentStage(marked)?.id, "c");
});

test("وإن أُنجز الكلُّ وقفت عند آخرها", () => {
  const all = trail.map((s) => ({ ...s, isDone: true }));
  assert.equal(currentStage(all)?.id, "c");
});

test("خدمةٌ بلا مسارٍ لا مرحلةَ حاليّةَ لها", () => {
  assert.equal(currentStage([]), null);
  assert.equal(currentStage([stage({ id: "p", order: 1, isContinuous: true })]), null);
});

test("الخطوةُ الحاليةُ أوّلُ ما لم يُنجَز من خطوات المرحلة", () => {
  assert.equal(currentStep(trail)?.id, "s2");
});

test("ومرحلةٌ بلا خطواتٍ أو منجزةٌ لا خطوةَ حاليّةَ لها", () => {
  assert.equal(currentStep([stage({ id: "a", order: 1 })]), null);
  assert.equal(currentStep(trail.map((s) => ({ ...s, isDone: true }))), null);
});

// ── قريباً ─────────────────────────────────────────────────────────────────

test("«قريباً» تُقرأ من العلَم ومن الاسم", () => {
  assert.equal(isComingSoon(stage({ id: "x", order: 1, isComingSoon: true })), true);
  assert.equal(isComingSoon(stage({ id: "x", order: 1, name: "التخطيط (قريبا)" })), true);
  assert.equal(isComingSoon(stage({ id: "x", order: 1, name: "التخطيط" })), false);
  assert.equal(isComingSoon(null), false);
});

// ── التقدّم ────────────────────────────────────────────────────────────────

test("المُنجَزُ ما قبل الحالية، والجاريةُ ليست نصفَ إنجاز", () => {
  assert.deepEqual(serviceProgress(trail), { done: 1, total: 3, percent: 33, at: 2 });
});

test("مسارٌ تامٌّ مئةٌ في المئة", () => {
  assert.deepEqual(serviceProgress(trail.map((s) => ({ ...s, isDone: true }))), {
    done: 3,
    total: 3,
    percent: 100,
    at: 3,
  });
});

test("الدائمةُ لا تدخل الحساب", () => {
  const only = [stage({ id: "p", order: 1, isContinuous: true, isActive: true })];
  assert.deepEqual(serviceProgress(only), { done: 0, total: 0, percent: 0, at: 0 });
});

// ── الحال ──────────────────────────────────────────────────────────────────

test("حالُ الخدمة بكلمةٍ واحدة", () => {
  assert.equal(serviceState([]), "EMPTY");
  assert.equal(serviceState(trail), "RUNNING");
  assert.equal(serviceState(trail.map((s) => ({ ...s, isDone: true }))), "DONE");
  assert.equal(
    serviceState([stage({ id: "p", order: 1, isContinuous: true, isActive: true })]),
    "RUNNING"
  );
});

test("«قريباً» تسبق «جارية»", () => {
  const soon = [stage({ id: "a", order: 1, isComingSoon: true }), stage({ id: "b", order: 2 })];
  assert.equal(serviceState(soon), "SOON");
});

test("لكلِّ حالٍ تسميةٌ عربية", () => {
  for (const state of ["EMPTY", "SOON", "RUNNING", "DONE"] as const) {
    assert.equal(typeof SERVICE_STATE_LABEL[state], "string");
    assert.ok(SERVICE_STATE_LABEL[state].length > 0);
  }
});

test("علَمُ «قريباً» على الخدمة يسبق قراءةَ مراحلها", () => {
  assert.equal(serviceStateOf({ isComingSoon: true, stages: trail }), "SOON");
  assert.equal(serviceStateOf({ stages: trail }), "RUNNING");
  assert.equal(serviceStateOf({}), "EMPTY");
});
