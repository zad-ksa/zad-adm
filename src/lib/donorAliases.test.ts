import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DONOR_NAME_ALIASES, applyDonorAliases } from "./donorAliases.ts";
import { normalizeDonorName } from "./donorOrg.ts";

const mapOf = (...names: string[]) =>
  new Map(names.map((n) => [normalizeDonorName(n), { id: n, name: n }]));

test("الهجاءُ يُشير إلى صفِّ الأصل", () => {
  const m = mapOf("مؤسسة سليمان الراجحي الخيرية — ريادة وأثر");
  assert.equal(applyDonorAliases(m), 2); // الهجاءان المذكوران لهذا الصفّ
  assert.equal(m.get(normalizeDonorName("ريادة وأثر/ سليمان الراجحي"))?.id, "مؤسسة سليمان الراجحي الخيرية — ريادة وأثر");
  assert.equal(m.get(normalizeDonorName("مؤسسة سليمان الراجحي الخيرية"))?.id, "مؤسسة سليمان الراجحي الخيرية — ريادة وأثر");
});

test("ولا يُزيح صفّاً قائماً بنفس الاسم", () => {
  // «مؤسسة سليمان الراجحي الخيرية» اسمٌ صحيحٌ في نفسه. فلو صار صفّاً في
  // القاعدة، فالمفتاحُ له — وإلّا سُجِّلت حساباتُه في جهةٍ أخرى بلا أن يُعلم.
  const m = mapOf("مؤسسة سليمان الراجحي الخيرية — ريادة وأثر", "مؤسسة سليمان الراجحي الخيرية");
  applyDonorAliases(m);
  assert.equal(m.get(normalizeDonorName("مؤسسة سليمان الراجحي الخيرية"))?.id, "مؤسسة سليمان الراجحي الخيرية");
});

test("وهجاءٌ لا أصلَ له في القاعدة يُترك", () => {
  // فتبقى الجهةُ غيرَ مطابقةٍ فتُنشأ باسمها كما في الدفتر — وهو الصواب: لا
  // يُخترع صفٌّ لاسمٍ لم يُرَ قبلاً.
  const m = mapOf("جهةٌ أخرى");
  assert.equal(applyDonorAliases(m), 0);
  assert.equal(m.size, 1);
});

test("ولا يُستدعى أثرٌ على خريطةٍ فارغة", () => {
  const m = new Map<string, { id: string }>();
  assert.equal(applyDonorAliases(m), 0);
  assert.equal(m.size, 0);
});

test("كلُّ هجاءٍ مختلفٌ عن أصله بعد التسوية", () => {
  // هجاءٌ يُسوّى إلى أصله لا يحتاج سطراً في القائمة: التسويةُ تكفيه. وبقاؤه
  // يُوهم أنّ ثَمّ حالةً تُعالَج وليس كذلك.
  for (const a of DONOR_NAME_ALIASES) {
    assert.notEqual(
      normalizeDonorName(a.from),
      normalizeDonorName(a.to),
      `«${a.from}» يُسوّى إلى أصله — أسقطه من القائمة`
    );
  }
});

test("ولا هجاءَ يُشير إلى هجاءٍ آخر", () => {
  // سلسلةٌ (أ ← ب ← ج) لا تُحَلّ: الدالّةُ تمرّ مرّةً واحدة، فالأوّلُ يبقى
  // بلا أصل. فتُكتب الهجاءاتُ كلُّها إلى الصفِّ المخزَّن مباشرةً.
  const tos = new Set(DONOR_NAME_ALIASES.map((a) => normalizeDonorName(a.to)));
  for (const a of DONOR_NAME_ALIASES) {
    assert.ok(!tos.has(normalizeDonorName(a.from)), `«${a.from}» هجاءٌ وأصلٌ في الوقت نفسه`);
  }
});
