import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MIME_BY_EXTENSION as workerMap, contentTypeForKey } from "../../workers/files/mime.mjs";
import { INERT_CONTENT_TYPE, MIME_BY_EXTENSION, contentTypeFor } from "./mime.ts";

/**
 * خريطةُ الأنواعِ مكتوبةٌ مرّتين — في `mime.ts` للموقع وفي `workers/files/mime.mjs`
 * للبوّابة — لأنّ العاملَ يُنشر من مجلَّده وحدَه ولا يستورد من `src`.
 *
 * فهذا الاختبارُ هو ثمنُ التكرار: مَن أضاف نوعاً في موضعٍ ونسي الآخر، سقط
 * بناؤه هنا باسمِ الامتداد لا برسالةٍ عامّة. ولولاه لرُفع الملفُّ بنوعٍ
 * وخُدم بآخر، وهو أسوأُ من الخطأ لأنّه لا يُشكى منه.
 */
test("خريطةُ البوّابة وخريطةُ الموقع واحدةٌ مدخلاً مدخلاً", () => {
  assert.deepEqual(
    Object.keys(workerMap as Record<string, string>).sort(),
    Object.keys(MIME_BY_EXTENSION).sort()
  );
  for (const [ext, type] of Object.entries(MIME_BY_EXTENSION)) {
    assert.equal((workerMap as Record<string, string>)[ext], type, ext);
  }
});

test("المعروفُ يتطابق في الدالّتين", () => {
  for (const key of [
    "zad_avatars/a_ab12.png",
    "zad_design_requests/brief_ff00.pdf",
    "zad_mail_attachments/sheet_1234.xlsx",
    "tasks_proofs/shot_9999.heic",
    "zad_survey_uploads/notes_abcd.txt",
  ]) {
    assert.equal(contentTypeForKey(key), contentTypeFor(key), key);
  }
});

test("المجهولُ يفترق عن قصد: الموقعُ يَفرض خامّاً والبوّابةُ تترك", () => {
  // البوّابةُ تردُّ `null` لما لا تعرفه فتُبقي ما ردّته باك بليز — وإلّا
  // أفسدت كلَّ ملفٍّ قديمٍ امتدادُه خارجَ الخريطة. والموقعُ يَفرض الخامَّ عند
  // الرفع لأنّه لا يرفع إلّا امتداداً في قائمته.
  for (const key of ["x/y.xyz", "x/y", "x/.env"]) {
    assert.equal(contentTypeForKey(key), null, key);
    assert.equal(contentTypeFor(key), INERT_CONTENT_TYPE, key);
  }
});
