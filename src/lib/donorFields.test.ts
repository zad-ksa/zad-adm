import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_FIELD_NAME,
  MAX_FIELD_TAGS,
  MAX_TAG,
  cleanFieldDescription,
  cleanFieldName,
  cleanFieldTags,
  proposalStatusLabel,
  proposalStatusOf,
  proposalStatusTone,
  sameFieldName,
  splitLegacyFields,
} from "./donorFields.ts";

test("cleanFieldName: يضمّ المسافات ويحدّ الطول", () => {
  assert.equal(cleanFieldName("  التعليم   والتدريب  "), "التعليم والتدريب");
  assert.equal(cleanFieldName("أ".repeat(MAX_FIELD_NAME + 20)).length, MAX_FIELD_NAME);
  assert.equal(cleanFieldName("   "), "");
});

test("cleanFieldDescription: الفارغُ عدمٌ لا نصٌّ فارغ", () => {
  assert.equal(cleanFieldDescription("  "), null);
  assert.equal(cleanFieldDescription(null), null);
  assert.equal(cleanFieldDescription(" يقبل المشاريع التشغيلية "), "يقبل المشاريع التشغيلية");
});

test("splitLegacyFields: يقطّع بالسطر والفاصلة لا بالواو", () => {
  assert.deepEqual(splitLegacyFields("التعليم، الصحة\nالإسكان"), ["التعليم", "الصحة", "الإسكان"]);
  // والواوُ لا تُقطّع: «التعليم والتدريب» مجالٌ واحد.
  assert.deepEqual(splitLegacyFields("التعليم والتدريب"), ["التعليم والتدريب"]);
  // وشرطةُ التعداد تُنزع من أوّل السطر، ولا تُقطّع وسطَه.
  assert.deepEqual(splitLegacyFields("- دعم الأيتام - المرحلة الثانية"), ["دعم الأيتام - المرحلة الثانية"]);
});

test("splitLegacyFields: يُسقط الفارغَ والمكرَّر", () => {
  assert.deepEqual(splitLegacyFields("التعليم،، التعليم ، \n\n الصحة"), ["التعليم", "الصحة"]);
  assert.deepEqual(splitLegacyFields(""), []);
  assert.deepEqual(splitLegacyFields(null), []);
});

test("sameFieldName: تسويةُ المسافات والحالة، والفارغُ لا يطابق", () => {
  assert.equal(sameFieldName("التعليم والتدريب", "التعليم  والتدريب"), true);
  assert.equal(sameFieldName("Health", "health"), true);
  assert.equal(sameFieldName("", ""), false);
  assert.equal(sameFieldName("التعليم", "الصحة"), false);
});

test("حالُ المقترح: ثلاثةٌ، والمجهولُ يُقرأ «مقترح»", () => {
  assert.equal(proposalStatusOf("SUBMITTED"), "SUBMITTED");
  assert.equal(proposalStatusOf("نصٌّ غريب"), "PROPOSED");
  assert.equal(proposalStatusOf(null), "PROPOSED");
  assert.equal(proposalStatusLabel("DEFERRED"), "مؤجل");
  assert.equal(proposalStatusTone("SUBMITTED"), "good");
  assert.equal(proposalStatusTone(undefined), "neutral");
});

test("cleanFieldTags: يضمّ ويحدّ ويُسقط المكرَّر", () => {
  assert.deepEqual(cleanFieldTags([" تعليم ", "تعليم", "صحة"]), ["تعليم", "صحة"]);
  // والتعريفُ حرفٌ من الكلمة: «تعليم» و«التعليم» وسمان.
  assert.deepEqual(cleanFieldTags(["تعليم", "التعليم"]), ["تعليم", "التعليم"]);
  assert.deepEqual(cleanFieldTags(["", "   "]), []);
  assert.deepEqual(cleanFieldTags(null), []);
  assert.equal(cleanFieldTags(["أ".repeat(60)])[0].length, MAX_TAG);
  assert.equal(cleanFieldTags(Array.from({ length: 30 }, (_, i) => `وسم ${i}`)).length, MAX_FIELD_TAGS);
});
