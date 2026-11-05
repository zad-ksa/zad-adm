import { strict as assert } from "node:assert";
import { test } from "node:test";
import { toggleWithRange } from "./rangeSelect.ts";

const IDS = ["a", "b", "c", "d", "e"];

test("نقرةٌ عاديّةٌ تُحدِّد، وأخرى تُلغي", () => {
  const on = toggleWithRange(IDS, [], "c", null, false);
  assert.deepEqual(on, { selected: ["c"], anchor: "c" });
  assert.deepEqual(toggleWithRange(IDS, on.selected, "c", "c", false), { selected: [], anchor: "c" });
});

test("Shift يُحدِّد ما بين المرساة والمنقور شاملاً الطرفين", () => {
  const out = toggleWithRange(IDS, ["b"], "d", "b", true);
  assert.deepEqual(out, { selected: ["b", "c", "d"], anchor: "d" });
});

test("والمدى يعمل إلى الأعلى كما إلى الأسفل", () => {
  // النقرُ على صفٍّ قبل المرساة: المدى هو نفسُه، فالترتيبُ يُسوّى.
  const out = toggleWithRange(IDS, ["d"], "b", "d", true);
  assert.deepEqual(out.selected, ["d", "b", "c"]);
  assert.deepEqual([...out.selected].sort(), ["b", "c", "d"]);
});

test("المدى يُضيف ولا يقلب", () => {
  // لبُّ القرار: القلبُ يجعل Shift على تحديدٍ قائمٍ يُلغي نصفَه ويُثبِت نصفَه.
  const out = toggleWithRange(IDS, ["a", "c"], "d", "b", true);
  assert.deepEqual([...out.selected].sort(), ["a", "b", "c", "d"]);
});

test("ولا تكرارَ في التحديد", () => {
  const out = toggleWithRange(IDS, ["b", "c", "d"], "d", "b", true);
  assert.deepEqual(out.selected, ["b", "c", "d"]);
});

test("Shift بلا مرساةٍ نقرةٌ عاديّة", () => {
  assert.deepEqual(toggleWithRange(IDS, [], "c", null, true), { selected: ["c"], anchor: "c" });
});

test("ومرساةٌ ليست في المعروض تُسقط المدى", () => {
  // تغيّرت الصفحةُ أو المجلّد، فالمرساةُ معرِّفٌ لا يُرى. ولا يُحدَّد ما لا يُرى.
  const out = toggleWithRange(IDS, [], "c", "zz", true);
  assert.deepEqual(out, { selected: ["c"], anchor: "c" });
});

test("وShift على المرساة نفسِها يقلبها", () => {
  // مدىً من صفٍّ إلى نفسه لا معنى له، فيُعامل نقرةً — وإلّا تعذّر إلغاءُ
  // تحديد الصفّ الذي بُدئ منه.
  assert.deepEqual(toggleWithRange(IDS, ["c"], "c", "c", true), { selected: [], anchor: "c" });
});

test("والمرساةُ تصير المنقورَ دائماً", () => {
  // فمدىً ثانٍ بـShift يُقاس من آخر نقرةٍ لا من أوّلها — وهو ما يفعله Gmail
  // ومديرُ الملفّات: تُمسك Shift وتوسّع من حيث انتهيت.
  assert.equal(toggleWithRange(IDS, ["a"], "c", "a", true).anchor, "c");
  assert.equal(toggleWithRange(IDS, [], "e", null, false).anchor, "e");
});

test("ولا يُمَسّ المُدخَل", () => {
  const selected = ["b"];
  toggleWithRange(IDS, selected, "d", "b", true);
  assert.deepEqual(selected, ["b"]);
});
