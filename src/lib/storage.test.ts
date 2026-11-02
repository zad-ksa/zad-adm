import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cloudinaryRefFromUrl,
  deletePlanFor,
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

// ───────── موزِّعُ الحذف ─────────

const CL = "https://res.cloudinary.com/dfwyhvzea/image/upload/v1790766174/zad_design_requests/2_1790766173512.png";

test("رابطُ باك بليز يُحذف من باك بليز", () => {
  assert.deepEqual(deletePlanFor({ url: `${BASE}/zad_avatars/a_9f3.png` }, BASE), {
    provider: "b2",
    key: "zad_avatars/a_9f3.png",
  });
});

test("رابطُ باك بليز يتقدّم على publicId مخزَّنٍ قديم", () => {
  // هذا لبُّ الموزِّع: صفٌّ رُحِّل ملفُّه وبقي فيه `publicId` من Cloudinary.
  // فإن قُدِّم المُعرِّفُ على الرابط، حُذف من Cloudinary ملفٌّ ليس فيها.
  assert.deepEqual(
    deletePlanFor(
      { url: `${BASE}/zad_design_requests/x.png`, cloudinaryPublicId: "zad_design_requests/x" },
      BASE
    ),
    { provider: "b2", key: "zad_design_requests/x.png" }
  );
});

test("رابطُ Cloudinary يُحذف منها بمُعرِّفه المخزَّن", () => {
  assert.deepEqual(
    deletePlanFor({ url: CL, cloudinaryPublicId: "zad_design_requests/2_1790766173512", resourceType: "image" }, BASE),
    { provider: "cloudinary", publicId: "zad_design_requests/2_1790766173512", resourceType: "image" }
  );
});

test("رابطُ Cloudinary بلا مُعرِّفٍ مخزَّن: يُشتقّ من الرابط", () => {
  // الأعمدةُ الأربعةُ التي تحفظ الرابطَ وحدَه — البريدُ والشعارُ والصورةُ
  // والاستبانات — تُحذف بهذا، ولم تكن تُحذف قبله.
  assert.deepEqual(deletePlanFor({ url: CL }, BASE), {
    provider: "cloudinary",
    publicId: "zad_design_requests/2_1790766173512",
    resourceType: "image",
  });
});

test("مُعرِّفٌ بلا رابط: Cloudinary كما كان الموقعُ قبل النقل", () => {
  assert.deepEqual(deletePlanFor({ cloudinaryPublicId: "tasks_proofs/2026/09/x" }, BASE), {
    provider: "cloudinary",
    publicId: "tasks_proofs/2026/09/x",
    resourceType: "raw",
  });
  assert.deepEqual(
    deletePlanFor({ cloudinaryPublicId: "a/b", resourceType: "image" }, BASE),
    { provider: "cloudinary", publicId: "a/b", resourceType: "image" }
  );
});

test("رابطٌ خارجيٌّ لا يُحذف ولا يُعدّ خطأً", () => {
  const plan = deletePlanFor({ url: "https://drive.google.com/file/d/xyz" }, BASE);
  assert.equal(plan.provider, null);
});

test("لا رابطَ ولا مُعرِّف: لا شيءَ يُحذف", () => {
  assert.deepEqual(deletePlanFor({}, BASE), { provider: null, reason: "لا رابطَ ولا مُعرِّف" });
  assert.deepEqual(deletePlanFor({ url: "   ", cloudinaryPublicId: "" }, BASE), {
    provider: null,
    reason: "لا رابطَ ولا مُعرِّف",
  });
});

test("بلا عنوانٍ عامٍّ مضبوط: رابطُ باك بليز لا يُحذف من Cloudinary", () => {
  // وهذا ما يحمي من نشرةٍ نُسي فيها STORAGE_PUBLIC_BASE: لا يُحذف شيءٌ
  // بالخطأ، إنّما يُتخطّى ويُسجَّل.
  const plan = deletePlanFor({ url: "https://f003.backblazeb2.com/file/zad-site/a.png" }, null);
  assert.equal(plan.provider, null);
});

test("رابطٌ خارجيٌّ مع مُعرِّفٍ مخزَّن: يُحذف بالمُعرِّف", () => {
  assert.deepEqual(
    deletePlanFor({ url: "https://elsewhere.com/a.png", cloudinaryPublicId: "f/g", resourceType: "raw" }, BASE),
    { provider: "cloudinary", publicId: "f/g", resourceType: "raw" }
  );
});
