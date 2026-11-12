import test from "node:test";
import assert from "node:assert/strict";
import {
  RECOMMENDATIONS_HEADING,
  RECOMMENDATIONS_TOKEN,
  spliceRecommendations,
} from "./meetingMinutes.ts";

const MINUTES = [
  "**التاريخ:** 2026-11-12",
  "",
  "---",
  "",
  "### أولاً: افتتاح الاجتماع",
  "افتُتح الاجتماع بكلمةٍ للمدير.",
  "",
  "### ثالثاً: القرارات والتوصيات",
  RECOMMENDATIONS_TOKEN,
  "",
  "### رابعاً: المهام والإجراءات المطلوبة",
  "| المهمة | المسؤول | الموعد |",
  "|--------|---------|--------|",
].join("\n");

const WRITTEN = "نشوف موضوع الميزانية مع أحمد\nونرفع الطلب قبل الخميس";

test("يُدرج نصَّ التوصيات حرفاً بحرف، بأسطره كما كُتبت", () => {
  const out = spliceRecommendations(MINUTES, WRITTEN);
  assert.ok(out.includes(WRITTEN));
  assert.ok(!out.includes(RECOMMENDATIONS_TOKEN));
});

test("يُدرَج داخل القسم: بعد عنوانه وقبل «رابعاً»", () => {
  const lines = spliceRecommendations(MINUTES, WRITTEN).split("\n");
  const heading = lines.findIndex((l) => l.includes("ثالثاً"));
  const first = lines.indexOf("نشوف موضوع الميزانية مع أحمد");
  const fourth = lines.findIndex((l) => l.includes("رابعاً"));
  assert.ok(heading < first && first < fourth);
});

test("يُطرح نصُّ النموذج إن كتب للقسم صياغةً من عنده", () => {
  const rephrased = MINUTES.replace(
    RECOMMENDATIONS_TOKEN,
    "- تمَّ الاتفاقُ على مناقشة الميزانية.\n- تقديمُ الطلب في موعده."
  );
  const out = spliceRecommendations(rephrased, WRITTEN);
  assert.ok(out.includes(WRITTEN));
  assert.ok(!out.includes("تمَّ الاتفاقُ على مناقشة الميزانية."));
  // وبقيةُ المحضر لا تُمَسّ.
  assert.ok(out.includes("افتُتح الاجتماع بكلمةٍ للمدير."));
  assert.ok(out.includes("| المهمة | المسؤول | الموعد |"));
});

test("يكتب العنوانَ قبل «رابعاً» إن أسقط النموذجُ القسم", () => {
  const without = MINUTES.split("\n")
    .filter((l) => !l.includes("ثالثاً") && l !== RECOMMENDATIONS_TOKEN)
    .join("\n");
  const lines = spliceRecommendations(without, WRITTEN).split("\n");
  const heading = lines.indexOf(RECOMMENDATIONS_HEADING);
  const fourth = lines.findIndex((l) => l.includes("رابعاً"));
  assert.ok(heading !== -1 && heading < fourth);
});

test("يُذيَّل بالقسم إن لم يكن في المحضر «ثالثاً» ولا «رابعاً»", () => {
  const out = spliceRecommendations("### أولاً: افتتاح الاجتماع\nكلمةٌ قصيرة.", WRITTEN);
  assert.ok(out.includes(RECOMMENDATIONS_HEADING));
  assert.ok(out.trimEnd().endsWith("ونرفع الطلب قبل الخميس"));
});

test("يُعرف القسمُ ولو كتبه النموذجُ عريضاً لا عنواناً، وبلا تشكيل", () => {
  const bold = MINUTES.replace("### ثالثاً: القرارات والتوصيات", "**ثالثا: القرارات والتوصيات**");
  const out = spliceRecommendations(bold, WRITTEN);
  assert.ok(out.includes(WRITTEN));
  assert.ok(!out.includes(RECOMMENDATIONS_HEADING)); // لا يُكرَّر عنوانٌ موجود
});

test("بلا نصٍّ: تُنزع العلامةُ ولا يبقى في المحضر أثرٌ تقني", () => {
  const out = spliceRecommendations(MINUTES, "   \n  ");
  assert.ok(!out.includes(RECOMMENDATIONS_TOKEN));
  assert.ok(out.includes("### ثالثاً: القرارات والتوصيات"));
  assert.ok(out.includes("### رابعاً: المهام والإجراءات المطلوبة"));
});

test("العلامةُ تُنزع ولو دُسَّت في سطرٍ فيه غيرُها", () => {
  const inline = MINUTES.replace(RECOMMENDATIONS_TOKEN, `هنا: ${RECOMMENDATIONS_TOKEN}`);
  const out = spliceRecommendations(inline, "");
  assert.ok(!out.includes(RECOMMENDATIONS_TOKEN));
  assert.ok(out.includes("هنا:"));
});

test("لا يُقتطع الفراغُ داخل النص، بل من طرفيه", () => {
  const spaced = "\n\n  أوّلاً: سطرٌ بمسافاتٍ بادئة\n\nسطرٌ بعد فراغ\n\n";
  const out = spliceRecommendations(MINUTES, spaced);
  assert.ok(out.includes("  أوّلاً: سطرٌ بمسافاتٍ بادئة\n\nسطرٌ بعد فراغ"));
});

test("نهاياتُ الأسطر تُوحَّد ولا تبقى CR في المحضر", () => {
  const out = spliceRecommendations(MINUTES, "سطرٌ أوّل\r\nسطرٌ ثانٍ");
  assert.ok(!out.includes("\r"));
  assert.ok(out.includes("سطرٌ أوّل\nسطرٌ ثانٍ"));
});

test("لا تُكرَّر الأسطرُ الفارغةُ عند الإدراج", () => {
  const out = spliceRecommendations(MINUTES, WRITTEN);
  assert.ok(!out.includes("\n\n\n"));
});
