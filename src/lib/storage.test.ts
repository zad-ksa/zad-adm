import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cloudinaryRefFromUrl,
  extensionOf,
  keyFromPublicUrl,
  providerOf,
  publicUrlOf,
  storageKeyOf,
} from "./storage.ts";

const BASE = "https://files.example.com";

/**
 * روابطُ حقيقيّةٌ منسوخةٌ من القاعدة، لا مُتخيَّلة.
 *
 * وهذا مقصود: جُرِّب المحلِّلُ أوّلاً بنمطٍ عامٍّ يُسقط «مقاطع التحويل»، فأكل
 * `zad_design_requests` لأنّه يُشبهها، ولم يُكشف ذلك إلّا بمقابلة الروابط
 * الحقيقيّة. ثمّ قُوبل المحلِّلُ بكلِّ صفٍّ يحفظ مفتاحاً في القاعدة — ٢٦٧ صفّاً —
 * فأعاد إنتاجَ مفاتيحها كلِّها.
 */
test("صورةٌ: المفتاحُ بلا امتداد", () => {
  assert.deepEqual(
    cloudinaryRefFromUrl(
      "https://res.cloudinary.com/dfwyhvzea/image/upload/v1790766174/zad_design_requests/2_1790766173512.png"
    ),
    { publicId: "zad_design_requests/2_1790766173512", resourceType: "image" }
  );
});

test("خامٌّ: المفتاحُ بامتداده", () => {
  assert.deepEqual(
    cloudinaryRefFromUrl(
      "https://res.cloudinary.com/dfwyhvzea/raw/upload/v1788711388/zad_knowledge_tree/___________________________1788711387167.docx"
    ),
    {
      publicId: "zad_knowledge_tree/___________________________1788711387167.docx",
      resourceType: "raw",
    }
  );
});

test("مجلَّداتٌ متداخلة: تُحفظ كلُّها", () => {
  assert.deepEqual(
    cloudinaryRefFromUrl(
      "https://res.cloudinary.com/dfwyhvzea/image/upload/v1789627778/tasks_proofs/2026/09/fkxcncferls94v6bn11l.png"
    ),
    { publicId: "tasks_proofs/2026/09/fkxcncferls94v6bn11l", resourceType: "image" }
  );
});

test("svg صورةٌ لا خامّ", () => {
  assert.deepEqual(
    cloudinaryRefFromUrl(
      "https://res.cloudinary.com/dfwyhvzea/image/upload/v1781432998/zad_charity_logos/xlattad5vnfwllifhe8y.svg"
    ),
    { publicId: "zad_charity_logos/xlattad5vnfwllifhe8y", resourceType: "image" }
  );
});

test("المجلَّدُ الذي يُشبه مقطعَ تحويلٍ لا يُؤكل", () => {
  // `zad_design_requests` يُطابق `[a-z]{1,3}_...` — وهو عينُ الفخّ الذي وقع فيه
  // النمطُ العامّ. فإن عاد أحدٌ إليه سقط هذا الاختبار.
  const ref = cloudinaryRefFromUrl(
    "https://res.cloudinary.com/dfwyhvzea/image/upload/v1/zad_design_requests/a.png"
  );
  assert.equal(ref?.publicId, "zad_design_requests/a.png".replace(".png", ""));
});

test("بلا مقطعِ نسخةٍ أيضاً", () => {
  assert.equal(
    cloudinaryRefFromUrl("https://res.cloudinary.com/dfwyhvzea/raw/upload/zad_services/f.pdf")
      ?.publicId,
    "zad_services/f.pdf"
  );
});

test("ما ليس من Cloudinary يُردّ null", () => {
  assert.equal(cloudinaryRefFromUrl("https://files.example.com/a/b.png"), null);
  assert.equal(cloudinaryRefFromUrl("not a url"), null);
  assert.equal(cloudinaryRefFromUrl("https://res.cloudinary.com/d/image/fetch/x.png"), null);
});

test("المزوّدُ يُعرف من المضيف", () => {
  assert.equal(providerOf("https://res.cloudinary.com/d/image/upload/v1/a.png", BASE), "cloudinary");
  assert.equal(providerOf(`${BASE}/zad_avatars/a.png`, BASE), "b2");
  assert.equal(providerOf("https://elsewhere.com/a.png", BASE), null);
  assert.equal(providerOf("", BASE), null);
  // بلا عنوانٍ عامٍّ مضبوط: Cloudinary تُعرف، وباك بليز لا — فلا تُحذف بالخطأ.
  assert.equal(providerOf(`${BASE}/a.png`, null), null);
  assert.equal(providerOf(`${BASE}/a.png`, "ليس رابطاً"), null);
});

test("المفتاحُ الجديد يحمل المجلَّد والعشوائيَّ والامتداد", () => {
  assert.equal(
    storageKeyOf("zad_avatars", "صورة شخصية.PNG", "0123456789abcdef"),
    "zad_avatars/file_0123456789abcdef.png"
  );
  assert.equal(
    storageKeyOf("zad_mail_attachments", "Final Report v2.pdf", "aaaa"),
    "zad_mail_attachments/Final_Report_v2_aaaa.pdf"
  );
  assert.equal(storageKeyOf("f", "noext", "r"), "f/noext_r");
});

test("الاسمُ الطويل يُقصّ ولا يُفقد الامتداد", () => {
  const key = storageKeyOf("f", "a".repeat(200) + ".pdf", "rand");
  assert.ok(key.endsWith("_rand.pdf"));
  assert.ok(key.length < 90);
});

test("الرابطُ العامُّ والمفتاحُ عكسُ بعضهما", () => {
  const key = "zad_mail_attachments/تقرير نهائي.pdf";
  const url = publicUrlOf(key, BASE);
  assert.equal(url, `${BASE}/zad_mail_attachments/${encodeURIComponent("تقرير نهائي.pdf")}`);
  assert.equal(keyFromPublicUrl(url, BASE), key);
  assert.equal(keyFromPublicUrl(url, `${BASE}/`), key);
});

test("عنوانٌ عامٌّ بمسارٍ بادئ", () => {
  const base = "https://cdn.example.com/files";
  const url = publicUrlOf("a/b.png", base);
  assert.equal(url, "https://cdn.example.com/files/a/b.png");
  assert.equal(keyFromPublicUrl(url, base), "a/b.png");
  // مضيفٌ مطابقٌ ومسارٌ خارج البادئة: ليس مفتاحَنا.
  assert.equal(keyFromPublicUrl("https://cdn.example.com/other/b.png", base), null);
});

test("رابطُ مزوّدٍ آخرَ لا يُعطي مفتاحاً", () => {
  assert.equal(keyFromPublicUrl("https://res.cloudinary.com/d/image/upload/a.png", BASE), null);
  assert.equal(keyFromPublicUrl("ليس رابطاً", BASE), null);
  assert.equal(keyFromPublicUrl(BASE, BASE), null);
});

test("الامتداد", () => {
  assert.equal(extensionOf("a/b/c.PDF"), "pdf");
  assert.equal(extensionOf("c.tar.gz"), "gz");
  assert.equal(extensionOf("noext"), "");
  assert.equal(extensionOf(".hidden"), "");
});
