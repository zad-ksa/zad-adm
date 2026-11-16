import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PUBLISHING_PLAN,
  cleanPublishingPlan,
  publishingPlanValue,
} from "./publishingPlan.ts";

test("الأسطرُ تُوحَّد، والأطرافُ تُقصّ", () => {
  assert.equal(cleanPublishingPlan("  منشوران أسبوعياً  \r\n  على إكس  \r\n"), "منشوران أسبوعياً\n  على إكس");
  assert.equal(cleanPublishingPlan("سطر   \nآخر"), "سطر\nآخر");
});

test("والفجواتُ المتتابعةُ تُردّ إلى واحدة", () => {
  assert.equal(cleanPublishingPlan("أوّل\n\n\n\nثانٍ"), "أوّل\n\nثانٍ");
  // وفجوةٌ واحدةٌ تبقى: الفقراتُ تُقرأ بها.
  assert.equal(cleanPublishingPlan("أوّل\n\nثانٍ"), "أوّل\n\nثانٍ");
});

test("والطولُ محدود", () => {
  const long = "م".repeat(MAX_PUBLISHING_PLAN + 500);
  assert.equal(cleanPublishingPlan(long).length, MAX_PUBLISHING_PLAN);
});

test("والفراغُ ليس نصّاً — بل «لم تُكتب بعد»", () => {
  assert.equal(publishingPlanValue("   \n\n  "), null);
  assert.equal(publishingPlanValue(""), null);
  assert.equal(publishingPlanValue(null), null);
  assert.equal(publishingPlanValue(undefined), null);
  assert.equal(publishingPlanValue(" خطة "), "خطة");
});
