import { strict as assert } from "node:assert";
import { test } from "node:test";
import { INERT_CONTENT_TYPE, MIME_BY_EXTENSION, contentTypeFor } from "./mime.ts";
import { ALLOWED_EXTENSIONS } from "./uploadPurposes.ts";

test("كلُّ امتدادٍ يقبله الموقعُ له نوعُ محتوى", () => {
  // وإلّا رُفع إلى باك بليز بالنوع الخامّ، فنزّلته المتصفِّحاتُ ولم تعرضه.
  // وهذا الاختبارُ يُسقط إضافةَ امتدادٍ إلى `ALLOWED_EXTENSIONS` بلا نوع.
  const missing = ALLOWED_EXTENSIONS.filter((ext) => !MIME_BY_EXTENSION[ext]);
  assert.deepEqual(missing, [], `امتداداتٌ بلا نوعِ محتوى: ${missing.join("، ")}`);
});

test("شواهدُ المهامّ تزيد heic وheif", () => {
  assert.equal(contentTypeFor("proof.heic"), "image/heic");
  assert.equal(contentTypeFor("proof.HEIF"), "image/heif");
});

test("لا نوعَ يُنفَّذ في متصفِّح", () => {
  // الشرطُ الأمنيُّ للخريطة: مرفقُ الاستبيان يرفعه مجهولٌ بلا حساب، فلو
  // أمكنه أن يُخدَم html من نطاقنا صارت لدينا صفحةُ تصيُّدٍ على اسمنا.
  //
  // والمنعُ بقائمةِ أنواعٍ بعينها لا بتفتيشِ النصِّ عن «xml»: أنواعُ أوفيس
  // الحديثةُ كلُّها `openxmlformats`، فالتفتيشُ العامُّ يُسقطها وهي أبعدُ ما
  // يكون عن التنفيذ.
  const FORBIDDEN = new Set([
    "text/html",
    "text/xml",
    "text/javascript",
    "application/xhtml+xml",
    "application/xml",
    "application/javascript",
    "application/x-javascript",
    "application/ecmascript",
    "image/svg+xml",
  ]);
  for (const [ext, type] of Object.entries(MIME_BY_EXTENSION)) {
    const essence = type.split(";")[0].trim().toLowerCase();
    assert.equal(FORBIDDEN.has(essence), false, `${ext} ← ${type}`);
    // وقاعدةٌ بنيويّةٌ تمسك ما لم تُسمِّه القائمة: لا `text/*` إلّا المسطَّحَ
    // والجدولَ. وما عدا ذلك من النصوص يُفسَّر في تبويب.
    if (essence.startsWith("text/")) {
      assert.ok(["text/plain", "text/csv"].includes(essence), `${ext} ← ${type}`);
    }
  }
});

test("النصُّ يحمل محرفَه", () => {
  // بلا charset قرأت المتصفِّحاتُ العربيَّ بـlatin-1 فظهر طلاسمَ.
  assert.match(MIME_BY_EXTENSION.txt, /charset=utf-8/);
  assert.match(MIME_BY_EXTENSION.csv, /charset=utf-8/);
});

test("المجهولُ يسقط إلى الخامّ لا إلى تخمين", () => {
  assert.equal(contentTypeFor("file.exe"), INERT_CONTENT_TYPE);
  assert.equal(contentTypeFor("file.html"), INERT_CONTENT_TYPE);
  assert.equal(contentTypeFor("no-extension"), INERT_CONTENT_TYPE);
  assert.equal(contentTypeFor(""), INERT_CONTENT_TYPE);
  // اسمٌ يبدأ بنقطةٍ ولا امتدادَ له: `dot === 0` فلا يُقرأ ما بعده نوعاً.
  assert.equal(contentTypeFor(".env"), INERT_CONTENT_TYPE);
});

test("المفتاحُ بمجلَّداته يُقرأ من آخر مقطعٍ لا من أوّل نقطة", () => {
  assert.equal(contentTypeFor("zad_design_requests/v1.2/report_ab12.pdf"), "application/pdf");
  // ومجلَّدٌ فيه نقطةٌ والملفُّ بلا امتداد: لا يُؤخذ امتدادُ المجلَّد.
  assert.equal(contentTypeFor("folder.png/file"), INERT_CONTENT_TYPE);
});

test("الامتدادُ لا يُحسب بحالة حروفه", () => {
  assert.equal(contentTypeFor("A.JPG"), "image/jpeg");
  assert.equal(contentTypeFor("A.Pdf"), "application/pdf");
  assert.equal(contentTypeFor("A.DocX"), MIME_BY_EXTENSION.docx);
});
