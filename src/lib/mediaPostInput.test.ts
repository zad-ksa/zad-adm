import test from "node:test";
import assert from "node:assert/strict";
import { cleanMediaInput, dayValue, snapshotOfRow, type MediaPostFields } from "./mediaPostInput.ts";

const GOOD: MediaPostFields = {
  scheduledOn: "2026-11-15",
  scheduledAt: "9:5",
  content: "  منشورٌ عن المبادرة  ",
  platforms: ["x", "x", " instagram ", ""],
  linkUrl: " https://zad-co.sa/news ",
  imageUrl: "",
};

function data(input: MediaPostFields) {
  const result = cleanMediaInput(input);
  assert.ok("data" in result, "error" in result ? result.error : "");
  return result.data;
}

test("يُقتطع المتنُ، وتُوحَّد المنصّاتُ، ويُهذَّب الرابط", () => {
  const clean = data(GOOD);
  assert.equal(clean.content, "منشورٌ عن المبادرة");
  assert.deepEqual(clean.platforms, ["x", "instagram"]);
  assert.equal(clean.linkUrl, "https://zad-co.sa/news");
});

test("الوقتُ يُقوَّم، والفارغُ لا وقتَ له", () => {
  assert.equal(data(GOOD).scheduledAt, "09:05");
  assert.equal(data({ ...GOOD, scheduledAt: "" }).scheduledAt, null);
  // ما لا يُقرأ وقتاً لا يُوقف الحفظ: الوقتُ اختياريّ.
  assert.equal(data({ ...GOOD, scheduledAt: "لاحقاً" }).scheduledAt, null);
});

test("اليومُ مرسىً في UTC، فلا ينزلق إلى جاره", () => {
  assert.equal(data(GOOD).scheduledOn.toISOString(), "2026-11-15T00:00:00.000Z");
  assert.equal(dayValue("2026-13-40"), null);
  assert.equal(dayValue("15-11-2026"), null);
});

test("يُردّ ما لا يصحّ، برسالةٍ تُعرض كما هي", () => {
  const cases: [MediaPostFields, RegExp][] = [
    [{ ...GOOD, content: "   " }, /نصُّ المنشور مطلوب/],
    [{ ...GOOD, scheduledOn: "غداً" }, /يوم النشر/],
    [{ ...GOOD, platforms: [] }, /منصّةً واحدةً/],
    [{ ...GOOD, platforms: ["  ", ""] }, /منصّةً واحدةً/],
    [{ ...GOOD, linkUrl: "javascript:alert(1)" }, /http/],
    [{ ...GOOD, linkUrl: "zad-co.sa" }, /http/],
  ];
  for (const [input, pattern] of cases) {
    const result = cleanMediaInput(input);
    assert.ok("error" in result, `قُبل ما لا يصحّ: ${JSON.stringify(input.platforms)}`);
    assert.match(result.error, pattern);
  }
});

test("الصورةُ والرابطُ اختياريّان: الفراغُ يصير لا شيء", () => {
  const clean = data({ ...GOOD, linkUrl: "  ", imageUrl: "  ", imagePublicId: undefined });
  assert.equal(clean.linkUrl, null);
  assert.equal(clean.imageUrl, null);
  assert.equal(clean.imagePublicId, null);
});

test("اللقطةُ تكتب اليومَ نصّاً — فتُقارن بلا كائنات", () => {
  const snapshot = snapshotOfRow({
    content: "متن",
    platforms: ["x"],
    imageUrl: null,
    linkUrl: null,
    scheduledOn: new Date("2026-11-15T00:00:00.000Z"),
    scheduledAt: "09:05",
  });
  assert.equal(snapshot.scheduledOn, "2026-11-15");
  assert.equal(snapshot.scheduledAt, "09:05");
});
