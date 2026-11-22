import test from "node:test";
import assert from "node:assert/strict";
import { highlightParts, matchesQuery, normalizeArabic } from "./arabicSearch.ts";

test("الهمزاتُ والتاءُ المربوطةُ والياءُ المقصورةُ تُسوَّى", () => {
  assert.equal(normalizeArabic("اللائحة"), normalizeArabic("اللائحه"));
  assert.equal(normalizeArabic("إحسان"), normalizeArabic("احسان"));
  assert.equal(normalizeArabic("الملتقى"), normalizeArabic("الملتقي"));
});

test("التشكيلُ لا يمنع المطابقة", () => {
  assert.equal(matchesQuery("اللائحةُ الأساسيّة", "اللائحة الاساسية"), true);
});

test("بحثٌ فارغٌ يُطابق كلَّ شيء", () => {
  assert.equal(matchesQuery("أي نص", "   "), true);
});

test("ما لا يقع في النصِّ لا يُطابَق", () => {
  assert.equal(matchesQuery("محضر الاجتماع", "ميزانية"), false);
});

test("القطعُ تُعيد النصَّ كما كُتب", () => {
  const text = "توفير لائحة أساسية معتمدة";
  assert.equal(highlightParts(text, "أساسية").map((p) => p.text).join(""), text);
  assert.equal(highlightParts(text, "").map((p) => p.text).join(""), text);
  assert.equal(highlightParts(text, "طائرة").map((p) => p.text).join(""), text);
});

test("المطابقُ وحدَه يُعلَّم", () => {
  assert.deepEqual(highlightParts("توفير لائحة أساسية", "لائحة"), [
    { text: "توفير ", hit: false },
    { text: "لائحة", hit: true },
    { text: " أساسية", hit: false },
  ]);
});

test("يُعلَّم ما كُتب بتشكيلٍ وسُئل عنه بلا تشكيل، والحركةُ داخل المُعلَّم", () => {
  const parts = highlightParts("اللائحةُ الأساسيّة", "اللائحة");
  assert.deepEqual(
    parts.filter((p) => p.hit).map((p) => p.text),
    ["اللائحةُ"]
  );
});

test("المطابقةُ تعبر السطرَ والفراغاتِ المتتالية", () => {
  assert.deepEqual(highlightParts("لائحة   الجمعية", "لائحة الجمعية"), [
    { text: "لائحة   الجمعية", hit: true },
  ]);
});

test("مواضعُ متعدّدةٌ تُعلَّم كلُّها", () => {
  const parts = highlightParts("محضر الاجتماع ثم محضر الجمعية", "محضر");
  assert.equal(parts.filter((p) => p.hit).length, 2);
});

test("نصٌّ فارغٌ قطعةٌ واحدةٌ بلا تعليم", () => {
  assert.deepEqual(highlightParts("", "محضر"), [{ text: "", hit: false }]);
});
