import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ATTACHMENTS,
  cleanMediaInput,
  dayValue,
  parseAttachments,
  snapshotOfRow,
  type MediaPostFields,
} from "./mediaPostInput.ts";

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
    [{ ...GOOD, content: "   " }, /نص المنشور مطلوب/],
    [{ ...GOOD, scheduledOn: "غداً" }, /يوم النشر/],
    [{ ...GOOD, platforms: [] }, /منصة واحدة/],
    [{ ...GOOD, platforms: ["  ", ""] }, /منصة واحدة/],
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

// ── المرفقات والبنود ───────────────────────────────────────────────────────

test("البنود تقتطع، والفارغ منها لا شيء", () => {
  const clean = data({ ...GOOD, title: "  حملة الشتاء  ", description: "  الوصف #زاد  " });
  assert.equal(clean.title, "حملة الشتاء");
  assert.equal(clean.description, "الوصف #زاد");
  assert.equal(data({ ...GOOD, title: "   ", description: "" }).title, null);
  assert.equal(data({ ...GOOD, title: "   ", description: "" }).description, null);
});

test("المرفق يقبل http(s) وحده — المرفوع منه والمكتوب", () => {
  const ok = data({
    ...GOOD,
    attachments: [
      { id: "1", kind: "LINK", url: " https://zad-co.sa/a " },
      { id: "2", kind: "FILE", url: "https://cdn.zad/x.pdf", publicId: "x", name: "ملف.pdf" },
    ],
  });
  assert.equal(ok.attachments.length, 2);
  assert.equal(ok.attachments[0].url, "https://zad-co.sa/a");
  assert.equal(ok.attachments[1].name, "ملف.pdf");

  const bad = cleanMediaInput({
    ...GOOD,
    attachments: [{ id: "1", kind: "LINK", url: "javascript:alert(1)" }],
  });
  assert.ok("error" in bad);
  assert.match(bad.error, /http/);
});

test("ولا يكرر رابط، ولا يزيد العدد على الحد", () => {
  const twice = data({
    ...GOOD,
    attachments: [
      { id: "1", kind: "LINK", url: "https://zad-co.sa/a" },
      { id: "2", kind: "LINK", url: "https://zad-co.sa/a" },
    ],
  });
  assert.equal(twice.attachments.length, 1);

  const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({
    id: String(i),
    kind: "LINK" as const,
    url: `https://zad-co.sa/${i}`,
  }));
  const over = cleanMediaInput({ ...GOOD, attachments: many });
  assert.ok("error" in over);
  assert.match(over.error, new RegExp(String(MAX_ATTACHMENTS)));
});

test("وقراءة المرفقات من القاعدة تسقط ما لا رابط له", () => {
  assert.deepEqual(parseAttachments(null), []);
  assert.deepEqual(parseAttachments("نص"), []);
  const read = parseAttachments([
    { id: "1", kind: "FILE", url: "https://cdn.zad/x.pdf", publicId: "x" },
    { id: "2", kind: "LINK" },
    { url: "https://zad-co.sa/b" },
  ]);
  assert.equal(read.length, 2);
  assert.equal(read[0].kind, "FILE");
  // وما لا نوع له يقرأ رابطا: الرابط هو الأصل والملف استثناؤه.
  assert.equal(read[1].kind, "LINK");
  assert.equal(read[1].id, "https://zad-co.sa/b");
});

test("واللقطة تحمل البنود — فالتعديل فيها يظهر في السجل", () => {
  const snapshot = snapshotOfRow({
    title: "حملة",
    content: "متن",
    description: "وصف #زاد",
    platforms: ["x"],
    imageUrl: null,
    linkUrl: null,
    attachments: [{ id: "1", kind: "FILE", url: "https://cdn.zad/x.pdf", name: "ملف.pdf" }],
    scheduledOn: new Date("2026-11-15T00:00:00.000Z"),
    scheduledAt: null,
  });
  assert.equal(snapshot.title, "حملة");
  assert.equal(snapshot.description, "وصف #زاد");
  // والمرفق يكتب باسمه لا برابطه الطويل.
  assert.deepEqual(snapshot.attachments, ["ملف.pdf"]);
});
