import test from "node:test";
import assert from "node:assert/strict";
import {
  isStepField,
  parseStepField,
  parseStepFields,
  type StepFieldResult,
} from "./initiativeStepFields.ts";

const WEEKS = 22;
const value = (result: StepFieldResult) => ("value" in result ? result.value : result);
const error = (result: StepFieldResult) => ("error" in result ? result.error : null);

test("نصُّ الخطوة لا يقبل الفراغ، ويُقصّ طرفاه", () => {
  assert.equal(value(parseStepField("title", "  إعداد الدليل  ", WEEKS)), "إعداد الدليل");
  assert.equal(error(parseStepField("title", "   ", WEEKS)), "نصّ الخطوة مطلوب");
});

test("والشاهدُ والمسؤولُ يقبلانه — فراغُهما «لا قيمة»", () => {
  assert.equal(value(parseStepField("evidence", "", WEEKS)), null);
  assert.equal(value(parseStepField("owner", " سعود ", WEEKS)), "سعود");
});

test("والمرحلةُ من قائمتها وحدَها", () => {
  assert.equal(value(parseStepField("phase", "التنفيذ", WEEKS)), "التنفيذ");
  assert.equal(value(parseStepField("phase", "مرحلةٌ مخترعة", WEEKS)), null);
  assert.equal(value(parseStepField("phase", "", WEEKS)), null);
});

test("والتكلفةُ رقمٌ، وفواصلُ الآلاف تُحذف", () => {
  assert.equal(value(parseStepField("cost", "12,500", WEEKS)), 12500);
  assert.equal(value(parseStepField("cost", "", WEEKS)), null);
  assert.equal(error(parseStepField("cost", "كثير", WEEKS)), "التكلفة يجب أن تكون رقماً");
  assert.equal(error(parseStepField("actualCost", "x", WEEKS)), "التكلفة الفعلية يجب أن تكون رقماً");
});

test("والأسابيعُ صحيحةٌ داخل مدى الخطة، والرسالةُ تسمّي حقلَها", () => {
  assert.equal(value(parseStepField("planStartWeek", "3", WEEKS)), 3);
  assert.equal(value(parseStepField("planWeeks", "22", WEEKS)), 22);
  assert.equal(error(parseStepField("planStartWeek", "0", WEEKS)), "أسبوع البداية بين ١ و22");
  assert.equal(error(parseStepField("planWeeks", "23", WEEKS)), "مدة الخطة بين ١ و22");
  assert.equal(error(parseStepField("actualStartWeek", "1.5", WEEKS)), "أسبوع البداية الفعلي بين ١ و22");
  assert.equal(error(parseStepField("actualWeeks", "-2", WEEKS)), "مدة التنفيذ بين ١ و22");
  assert.equal(value(parseStepField("actualWeeks", "", WEEKS)), null);
});

test("ونسبةُ الإنجاز بين صفرٍ ومئة، وعلامةُ النسبة تُقبل", () => {
  assert.equal(value(parseStepField("progress", "40%", WEEKS)), 40);
  assert.equal(value(parseStepField("progress", "39.6", WEEKS)), 40);
  assert.equal(value(parseStepField("progress", "", WEEKS)), 0);
  assert.equal(error(parseStepField("progress", "120", WEEKS)), "نسبة الإنجاز بين ٠ و١٠٠");
});

test("والحقولُ دفعةً: أوّلُ سببٍ يُقال، لا آخرُه", () => {
  const bad = parseStepFields({ title: "خطوة", cost: "س", planStartWeek: "99" }, WEEKS);
  assert.deepEqual(bad, { error: "التكلفة يجب أن تكون رقماً" });

  const good = parseStepFields(
    { phase: "الإعداد", title: "خطوة", cost: "1,000", planStartWeek: "2", planWeeks: "3", progress: "50" },
    WEEKS
  );
  assert.ok("values" in good);
  assert.deepEqual(good.values, {
    phase: "الإعداد",
    title: "خطوة",
    evidence: null,
    owner: null,
    cost: 1000,
    actualCost: null,
    planStartWeek: 2,
    planWeeks: 3,
    actualStartWeek: null,
    actualWeeks: null,
    progress: 50,
  });
});

test("وما ليس حقلاً معروفاً يُردّ قبل أن يُكتب في عمود", () => {
  assert.ok(isStepField("progress"));
  assert.equal(isStepField("id"), false);
  assert.equal(isStepField("order"), false);
});
