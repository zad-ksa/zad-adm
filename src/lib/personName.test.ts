import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersonName, samePersonName } from "./personName.ts";

test("المسافاتُ الزائدةُ لا تُفرِّق اسمين", () => {
  assert.ok(samePersonName("  خالد  العتيبي ", "خالد العتيبي"));
});

test("والهمزةُ والتاءُ المربوطةُ والألفُ المقصورة", () => {
  assert.ok(samePersonName("أحمد", "احمد"));
  assert.ok(samePersonName("حمزة", "حمزه"));
  assert.ok(samePersonName("يحيى", "يحيي"));
  assert.ok(samePersonName("مُحمَّد", "محمد"));
});

test("ومن اختلف اسمُه اختلف", () => {
  assert.equal(samePersonName("خالد العتيبي", "خالد العتيبى الشمري"), false);
  assert.equal(samePersonName("مدير المبادرات", "مدير المشاريع"), false);
});

test("والفراغُ لا يطابق شيئاً ولا نفسَه", () => {
  assert.equal(samePersonName("", ""), false);
  assert.equal(samePersonName(null, null), false);
  assert.equal(samePersonName("  ", "خالد"), false);
  assert.equal(samePersonName("خالد", undefined), false);
});

test("والتسويةُ تُقرأ وحدَها", () => {
  assert.equal(normalizePersonName(" أُسامة  بن  زيد "), "اسامه بن زيد");
  assert.equal(normalizePersonName(null), "");
});
