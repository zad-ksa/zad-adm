import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pastedTextLines } from "./mailText.ts";

test("السطرُ الفارغ بين الفقرتين يبقى سطراً", () => {
  assert.deepEqual(pastedTextLines("أولى\n\nثانية"), ["أولى", "", "ثانية"]);
});

test("وسطران فارغان سطران، لا واحد", () => {
  assert.deepEqual(pastedTextLines("أولى\n\n\nثانية"), ["أولى", "", "", "ثانية"]);
});

test("أسطرُ ويندوز تُقرأ كأسطرٍ واحدة", () => {
  assert.deepEqual(pastedTextLines("أولى\r\n\r\nثانية"), ["أولى", "", "ثانية"]);
  assert.deepEqual(pastedTextLines("أولى\rثانية"), ["أولى", "ثانية"]);
});

test("الفراغُ في آخر المُلصَق يُحذف", () => {
  assert.deepEqual(pastedTextLines("أولى\n\nثانية\n\n"), ["أولى", "", "ثانية"]);
  assert.deepEqual(pastedTextLines("سطر\n   \n"), ["سطر"]);
});

test("ونصٌّ بسطرٍ واحدٍ سطرٌ واحد", () => {
  assert.deepEqual(pastedTextLines("سطر"), ["سطر"]);
});

test("ولا يُفرَّغ المُلصَقُ كلُّه: نصٌّ فارغٌ سطرٌ فارغ", () => {
  // لو حُذف الأخيرُ بلا شرطٍ لعاد المُلصَقُ قائمةً فارغة، فلا تُنشأ فقرةٌ
  // أصلاً ويبدو اللصقُ كأنّه لم يعمل.
  assert.deepEqual(pastedTextLines(""), [""]);
  assert.deepEqual(pastedTextLines("\n"), [""]);
});

test("والمسافاتُ في داخل السطر لا تُمسّ", () => {
  assert.deepEqual(pastedTextLines("  مُزاح\n\tبعلامة"), ["  مُزاح", "\tبعلامة"]);
});
