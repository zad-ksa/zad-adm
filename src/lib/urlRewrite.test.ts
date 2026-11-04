import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mentionsHost, rewriteUrlsIn } from "./urlRewrite.ts";
import { CLOUDINARY_HOST } from "./storage.ts";

const OLD = "https://res.cloudinary.com/dfwyhvzea/raw/upload/v1788176058/zad_approvals/a.pdf";
const NEW = "https://files.zad-co.sa/zad_approvals/a_ab12.pdf";
const OLD2 = "https://res.cloudinary.com/dfwyhvzea/image/upload/v1/zad_avatars/b.png";
const NEW2 = "https://files.zad-co.sa/zad_avatars/b_cd34.png";
const MAP = { [OLD]: NEW, [OLD2]: NEW2 };

test("مصفوفةُ كائنات — شكلُ Request.attachments", () => {
  const before = [
    { fileUrl: OLD, fileName: "a.pdf", fileSize: 1234 },
    { fileUrl: "https://example.com/x.pdf", fileName: "x.pdf" },
  ];
  const out = rewriteUrlsIn(before, MAP);
  assert.equal(out.replaced, 1);
  assert.deepEqual(out.value, [
    { fileUrl: NEW, fileName: "a.pdf", fileSize: 1234 },
    { fileUrl: "https://example.com/x.pdf", fileName: "x.pdf" },
  ]);
  // والمُدخَلُ لم يُمَسّ: الشجرةُ تُبنى جديدةً.
  assert.equal(before[0].fileUrl, OLD);
});

test("كائنُ مصفوفات — شكلُ الاستبانات المخصّصة", () => {
  const out = rewriteUrlsIn({ q1: [OLD, OLD2], q2: [], q3: ["نص لا رابط"] }, MAP);
  assert.equal(out.replaced, 2);
  assert.deepEqual(out.value, { q1: [NEW, NEW2], q2: [], q3: ["نص لا رابط"] });
});

test("تعشيشٌ عميق — شكلُ إعداد الواجهة", () => {
  const out = rewriteUrlsIn(
    { hero: { bg: { desktop: OLD, mobile: null }, items: [{ icon: OLD2 }] }, n: 7, ok: true },
    MAP
  );
  assert.equal(out.replaced, 2);
  assert.deepEqual(out.value, {
    hero: { bg: { desktop: NEW, mobile: null }, items: [{ icon: NEW2 }] },
    n: 7,
    ok: true,
  });
});

test("ونصٌّ مسطَّحٌ يُبدَّل كما هو", () => {
  assert.deepEqual(rewriteUrlsIn(OLD, MAP), { value: NEW, replaced: 1, suspects: [] });
});

test("المطابقةُ تامّةٌ لا جزئيّة", () => {
  // رابطٌ أطولُ يحمل المفتاحَ في بدايته: الاستبدالُ الجزئيُّ يقطعه فيشير إلى
  // ملفٍّ لم يُصعَّد. وهذا النصُّ لم يُسجَّل في البيان أصلاً، فلا يُمَسّ.
  const longer = `${OLD}?v=2`;
  const out = rewriteUrlsIn({ a: longer }, MAP);
  assert.equal(out.replaced, 0);
  assert.deepEqual(out.value, { a: longer });
});

test("ونصٌّ يذكر الرابطَ في متن كلامٍ لا يُبدَّل", () => {
  const sentence = `انظر الملف ${OLD} من فضلك`;
  const out = rewriteUrlsIn([sentence], MAP);
  assert.equal(out.replaced, 0);
  assert.deepEqual(out.value, [sentence]);
});

test("ما بقي على المزوّد القديم يُجمع ولا يُخمَّن", () => {
  // الفائدةُ الكبرى: بلا هذه القائمة يبقى العملُ «ناجحاً» وفيه روابطُ لم
  // تُنقل، ولا يُعلم بها حتى يُحذف المزوّدُ القديم فتنكسر.
  const missing = "https://res.cloudinary.com/dfwyhvzea/raw/upload/v9/zad_x/never-copied.pdf";
  const out = rewriteUrlsIn({ a: OLD, b: missing, c: `${OLD}?v=2` }, MAP, mentionsHost(CLOUDINARY_HOST));
  assert.equal(out.replaced, 1);
  assert.deepEqual(out.suspects.sort(), [missing, `${OLD}?v=2`].sort());
});

test("ولا يُجمع المُستبدلُ في المشتبهين", () => {
  const out = rewriteUrlsIn([OLD, OLD2], MAP, mentionsHost(CLOUDINARY_HOST));
  assert.equal(out.replaced, 2);
  assert.deepEqual(out.suspects, []);
});

test("والمشتبهون بلا تكرارٍ وإن تكرّر النصّ", () => {
  const missing = "https://res.cloudinary.com/x/raw/upload/v1/a.pdf";
  const out = rewriteUrlsIn([missing, missing, { x: missing }], MAP, mentionsHost(CLOUDINARY_HOST));
  assert.deepEqual(out.suspects, [missing]);
});

test("ما لم يتغيّر يُعاد مرجعُه نفسُه", () => {
  // فلا يُكتب في القاعدة عمودٌ لم يُمَسّ: الكتابةُ بلا تغييرٍ تُلمِّس صفّاً
  // وتُربك أيَّ تتبُّعٍ للتغيير.
  const tree = { a: ["x", { b: 1 }], c: null };
  const out = rewriteUrlsIn(tree, MAP);
  assert.equal(out.replaced, 0);
  assert.equal(out.value, tree);
});

test("وأنواعُ JSON كلُّها تُحفظ كما هي", () => {
  const tree = { s: "x", n: 0, f: 1.5, t: true, f2: false, nul: null, arr: [], obj: {} };
  const out = rewriteUrlsIn(tree, MAP);
  assert.equal(out.value, tree);
  assert.deepEqual(out.value, tree);
});

test("ولا يسقط على بيانٍ فارغٍ ولا على عدم", () => {
  assert.deepEqual(rewriteUrlsIn(null, MAP), { value: null, replaced: 0, suspects: [] });
  assert.deepEqual(rewriteUrlsIn(undefined, MAP), { value: undefined, replaced: 0, suspects: [] });
  assert.deepEqual(rewriteUrlsIn({ a: OLD }, {}), { value: { a: OLD }, replaced: 0, suspects: [] });
});

test("ومفتاحٌ يُبدَّل بنفسه لا يُحسب تغييراً", () => {
  const out = rewriteUrlsIn({ a: OLD }, { [OLD]: OLD });
  assert.equal(out.replaced, 0);
});

test("ومفاتيحُ الكائن لا تُبدَّل، إنّما قيمُه", () => {
  // مفتاحٌ اسمُه رابطٌ يبقى: البيانُ يُقابل قيمَ روابطَ لا أسماءَ حقول.
  const out = rewriteUrlsIn({ [OLD]: "قيمة" }, MAP);
  assert.equal(out.replaced, 0);
  assert.deepEqual(out.value, { [OLD]: "قيمة" });
});
