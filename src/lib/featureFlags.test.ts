import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CHARITY_MAIL_ENABLED, CHARITY_MAIL_SCOPE, isCharityMailOpen } from "./featureFlags.ts";

/**
 * اختبارٌ يحرس **إعداداً** لا منطقاً.
 *
 * فمن أراد إقفالَ البريد أو حصرَه في أسماءٍ بعدَ اليوم، أسقط هذا الاختبارَ
 * فعلم أنّه يُغيّر من يُراسِل من — لا أنّه يُعدّل سطراً في ملفِّ أعلام. وهذا
 * هو المقصود: القرارُ يُقصد، ولا يُنسى سهواً في مراجعةٍ عابرة.
 */
test("بريدُ الجمعيات مفتوحٌ للجميع", () => {
  assert.equal(CHARITY_MAIL_SCOPE, "ALL");
  assert.equal(CHARITY_MAIL_ENABLED, true);
});

test("كلُّ جمعيةٍ مفتوحةٌ، والاسمُ يُقلَّم", () => {
  for (const name of [
    "مكين التعليمية",
    "الرأفة الإنسانية",
    "أثر القيم",
    "المعاقد التعليمية",
    "رواء سقيا الماء",
    "رواق المسجد",
    "ضماد الإسعافية",
    "مسارات الشبابية",
    "جمعية تجريبية للتطوير",
  ]) {
    assert.equal(isCharityMailOpen(name), true, name);
  }
  assert.equal(isCharityMailOpen("  مكين التعليمية  "), true);
  // واسمٌ لم يُسجَّل بعد — جمعيةٌ تُضاف غداً تُفتح بلا تعديل كود.
  assert.equal(isCharityMailOpen("جمعيةٌ جديدة"), true);
});
