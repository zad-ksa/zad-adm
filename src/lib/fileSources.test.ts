import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FILE_SOURCES, sourceLabel } from "./fileSources.ts";
import { collectStrings } from "./storage.ts";

/**
 * اختباراتٌ تحرس **قائمةً** لا منطقاً، وذاك مقصود.
 *
 * فالقائمةُ هي ما يُحصى به ما بقي على Cloudinary وما يُنسخ منه. وعمودٌ يسقط
 * منها لا يُشكى منه: يُقال «لم يبق شيء» عن موضعٍ لم يُنظر فيه.
 */
test("لا موضعَ مكرَّرٌ في قائمة المصادر", () => {
  const labels = FILE_SOURCES.map(sourceLabel);
  assert.deepEqual([...new Set(labels)], labels, "موضعٌ مذكورٌ مرّتين يُحصى مرّتين");
});

test("كلُّ مصدرٍ يحمل جدولَه وعمودَه ومُعرِّفَه", () => {
  for (const source of FILE_SOURCES) {
    assert.ok(source.table.trim(), JSON.stringify(source));
    assert.ok(source.column.trim(), JSON.stringify(source));
    // و`GlobalSetting` مفتاحُها `key` لا `id`، فلا يُفترض الاسمُ بحال.
    assert.ok(source.id.trim(), JSON.stringify(source));
  }
});

test("أعمدةُ JSON الأربعةُ موسومةٌ، والمسطَّحةُ ليست", () => {
  // وسمٌ ناقصٌ يعني أنّ العمودَ يُقرأ نصّاً فلا يُستخرج منه رابطٌ واحد؛
  // ووسمٌ زائدٌ يعني أنّ نصّاً مسطَّحاً يُمرَّر على `JSON.parse` فيسقط.
  const json = FILE_SOURCES.filter((s) => s.json).map(sourceLabel).sort();
  assert.deepEqual(json, [
    "CustomSurveyResponse.attachments",
    "GlobalSetting.value",
    "Request.attachments",
  ]);
});

test("الأعمدةُ التي لا تحفظ publicId مذكورةٌ كلُّها", () => {
  // هذه بعينها سببُ اشتقاق المزوّد من الرابط: لا عمودَ آخرَ يُسأل فيها.
  const labels = FILE_SOURCES.map(sourceLabel);
  for (const label of [
    "MailAttachment.fileUrl",
    "Charity.logoUrl",
    "Employee.avatarUrl",
    "CustomSurveyResponse.attachments",
  ]) {
    assert.ok(labels.includes(label), label);
  }
});

test("المشيُ العامُّ يبلغ النصوصَ في كلِّ شكل", () => {
  // مصفوفةُ كائنات — شكلُ `Request.attachments`
  assert.deepEqual(collectStrings([{ url: "a", name: "b" }, { url: "c" }]), ["a", "b", "c"]);
  // كائنُ مصفوفات — شكلُ الاستبانات المخصّصة
  assert.deepEqual(collectStrings({ q1: ["a", "b"], q2: ["c"] }), ["a", "b", "c"]);
  // تعشيشٌ عميق — شكلُ إعداد الواجهة
  assert.deepEqual(collectStrings({ a: { b: { c: [{ d: "deep" }] } } }), ["deep"]);
});

test("ولا يسقط على ما ليس نصّاً", () => {
  assert.deepEqual(collectStrings(null), []);
  assert.deepEqual(collectStrings(undefined), []);
  assert.deepEqual(collectStrings(42), []);
  assert.deepEqual(collectStrings({ a: null, b: 1, c: true, d: "x" }), ["x"]);
  assert.deepEqual(collectStrings([]), []);
  // والنصُّ الفارغُ يُجمع: التنقيحُ شأنُ من يستدعي، و`providerOf` تُسقطه.
  assert.deepEqual(collectStrings({ a: "" }), [""]);
});
