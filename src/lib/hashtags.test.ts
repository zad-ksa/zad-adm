import test from "node:test";
import assert from "node:assert/strict";
import { hashtagsIn, splitHashtags } from "./hashtags.ts";

test("يقطع النص على هاشتاقاته بالترتيب", () => {
  assert.deepEqual(splitHashtags("حملة #زاد اليوم"), [
    { text: "حملة ", tag: false },
    { text: "#زاد", tag: true },
    { text: " اليوم", tag: false },
  ]);
});

test("والحرف العربي والشرطة السفلية والرقم داخل الهاشتاق", () => {
  assert.deepEqual(hashtagsIn("#زاد_التنموية و#Zad2026 و#خدمات"), [
    "#زاد_التنموية",
    "#Zad2026",
    "#خدمات",
  ]);
});

test("ولا مقاطع فارغة — ولا هاشتاق بلا كلمة", () => {
  assert.deepEqual(splitHashtags("#زاد"), [{ text: "#زاد", tag: true }]);
  assert.deepEqual(splitHashtags("# وحده"), [{ text: "# وحده", tag: false }]);
  assert.deepEqual(splitHashtags(""), []);
  assert.deepEqual(splitHashtags(null), []);
  for (const piece of splitHashtags("أول #واحد #اثنان آخر")) {
    assert.notEqual(piece.text, "");
  }
});

test("المتكرر لا يعاد في القائمة", () => {
  assert.deepEqual(hashtagsIn("#زاد و#زاد"), ["#زاد"]);
});

test("والنص يعاد كما هو إذا جمعت مقاطعه", () => {
  const text = "سطر أول\n#زاد #تمكين\nسطر آخر #٢٠٢٦";
  assert.equal(splitHashtags(text).map((piece) => piece.text).join(""), text);
});
