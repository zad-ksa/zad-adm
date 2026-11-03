/**
 * فحصُ سلسلة التخزين كاملةً قبل أن يُبنى عليها شيء.
 *
 * سبعُ خطواتٍ لأنّ العطبَ في كلِّ واحدةٍ يختلف عن الأخرى، وجمعُها في فحصٍ
 * واحدٍ يُخفي أيُّها انكسر:
 *   ١ الإعداد مقروء        ٢ التوقيع مقبول (404 لا 403)
 *   ٣ الرفع يمرّ           ٤ الملفُّ موجودٌ فعلاً
 *   ٥ النطاقُ العامُّ يقرؤه بلا توقيع   ٦ الحذفُ يعمل
 *   ٧ قاعدةُ CORS تُجيز رفعَ المتصفِّح
 *
 * ولا يترك أثراً: ما يرفعه يحذفه، ويتحقّق من زواله.
 *
 *   node -r dotenv/config --experimental-strip-types scripts/check-b2.mjs
 *   npm run check:b2 -- --origin=https://zad-adm.vercel.app
 */

import { randomBytes } from "node:crypto";
import { b2Config, b2ObjectExists, deleteFromB2, missingB2Keys, presignUpload } from "../src/lib/b2.ts";
import { keyFromPublicUrl, providerOf } from "../src/lib/storage.ts";

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.log(`  ✗ ${m}`); process.exitCode = 1; };

const config = b2Config();
if (!config) {
  console.log("الإعدادُ ناقص:", missingB2Keys().join("، ") || "قيمةٌ غير صالحة");
  process.exit(1);
}

console.log("الإعداد:");
console.log(`  المستودع      ${config.bucket}`);
console.log(`  نقطةُ النهاية  ${config.endpointHost}`);
console.log(`  الإقليم       ${config.region}`);
console.log(`  العنوانُ العامّ ${config.publicBase}`);
console.log(`  المفتاح       ${config.keyId.slice(0, 4)}… (${config.keyId.length} حرفاً)`);
// ومزوّدُ الرفعِ مطبوعٌ لأنّه أكثرُ ما يُنسى: سلسلةٌ سليمةٌ كاملةً والرفعُ
// ما زال يذهب إلى Cloudinary، لأنّ `STORAGE_UPLOAD_PROVIDER` لم يُضبط.
const UPLOAD_TO = process.env.STORAGE_UPLOAD_PROVIDER?.trim().toLowerCase() === "b2" ? "باك بليز" : "Cloudinary";
console.log(`  مزوّدُ الرفع   ${UPLOAD_TO}  (STORAGE_UPLOAD_PROVIDER)`);

const key = `_healthcheck/${randomBytes(8).toString("hex")}.txt`;
const body = `zad storage check ${new Date().toISOString()}`;

console.log("\nالفحص:");

// ٢ — ردُّ المستودع على مفتاحٍ مفقود، إخباراً لا حكماً.
//
//     و٤٠٣ هنا صحيحةٌ كـ٤٠٤: المفتاحُ لا يحمل `listFiles`، وباك بليز — كـS3 —
//     تردّ ٤٠٣ على المفقود حينئذٍ كي لا تُفصح عن وجوده. فلا يُحكم على
//     التوقيع من هنا، إنّما من الرفع والحذف بعدَه.
const target = presignUpload(key, 300);
const missing = await fetch(presignUpload(`${key}.missing`, 60).uploadUrl, { method: "HEAD" });
console.log(`  · ردُّ المفقود: ${missing.status} (٤٠٣ أو ٤٠٤، وكلاهما سليم)`);
// ٣ — الرفع
const put = await fetch(target.uploadUrl, {
  method: "PUT",
  body,
  headers: { "content-type": "text/plain; charset=utf-8" },
});
if (put.ok) pass(`الرفع مرّ (${put.status})`);
else fail(`الرفع ${put.status}: ${(await put.text()).slice(0, 200)}`);

// ٤ — موجودٌ فعلاً
if (await b2ObjectExists(key)) pass("الملفُّ موجودٌ في المستودع");
else fail("رُفع ولم يُوجد");

// ٥ — يُقرأ من النطاق العامّ بلا توقيع: المستودعُ عامٌّ، والـCNAME وقاعدةُ
//     التحويل تعملان. وهذه أكثرُ خطوةٍ تنكسر، وعطبُها لا يظهر إلّا هنا.
console.log(`  … ${target.publicUrl}`);
const read = await fetch(target.publicUrl, { headers: { "cache-control": "no-cache" } });
if (read.ok) {
  const text = await read.text();
  if (text === body) pass(`النطاقُ العامُّ يقرؤه (${read.status})`);
  else fail(`قُرئ محتوىً مختلف: ${text.slice(0, 80)}`);
  const cf = read.headers.get("cf-cache-status");
  console.log(`      الخادم: ${read.headers.get("server") ?? "—"}${cf ? ` · التخزين: ${cf}` : ""}`);
} else if (read.status === 401 || read.status === 403) {
  // ٤٠١ من مسار `/file/` لباك بليز معناها واحدٌ لا يُخطئ: المستودعُ خاصّ.
  // ولا علاقةَ لها بالتوقيع — فالتوقيعُ مرّ في الخطوات قبلها.
  fail(`${read.status} — المستودعُ خاصٌّ لا عامّ. اجعله Public من إعداداته`);
} else if (read.status === 404) {
  fail("404 — العنوانُ العامُّ أو قاعدةُ التحويل: المسارُ لا يُشير إلى الملفّ");
} else {
  fail(`النطاقُ العامُّ ردَّ ${read.status}`);
}

// ٥ب — الرابطُ والمفتاحُ عكسُ بعضهما فعلاً بهذا العنوان
if (providerOf(target.publicUrl, config.publicBase) === "b2" && keyFromPublicUrl(target.publicUrl, config.publicBase) === key)
  pass("الرابطُ يُعرف مزوّدُه ويُشتقّ مفتاحُه");
else fail("الرابطُ لا يُشتقّ منه المفتاح — راجع STORAGE_PUBLIC_BASE");

// ٧ — قاعدةُ CORS: يُسأل عنها الخادمُ بطلبٍ تمهيديٍّ كما يسأله المتصفِّح.
//
//     والحاجةُ إليها لا تظهر في أيِّ خطوةٍ قبلها: الرفعُ في الخطوة ٣ من
//     Node، وNode لا يُطبّق CORS. فالتوقيعُ يصحّ، والمستودعُ يقبل، ثمّ
//     **يسقط رفعُ المتصفِّح وحدَه** بحالةٍ صفرٍ لا جسمَ لها ولا سبب. وهو
//     أخفى عطبٍ في السلسلة كلِّها، فيُفحص هنا صريحاً.
const originArg = process.argv.find((a) => a.startsWith("--origin="));
const ORIGIN = originArg?.slice("--origin=".length) || "https://zad-adm.vercel.app";
// ويُبنى عنوانُ نقطةِ النهاية من المفتاح لا بقصٍّ من الرابط العامّ: ذاك
// يتغيّر بتغيُّر `STORAGE_PUBLIC_BASE`، وقصٌّ لا يُطابق يُرسل الطلبَ إلى
// مضيفٍ آخرَ فيُقرأ جوابُه حكماً على CORS وهو ليس منها.
const endpointUrl = `https://${config.endpointHost}/${config.bucket}/${key
  .split("/")
  .map(encodeURIComponent)
  .join("/")}`;
const preflight = await fetch(endpointUrl, {
  method: "OPTIONS",
  headers: {
    origin: ORIGIN,
    "access-control-request-method": "PUT",
    "access-control-request-headers": "content-type",
  },
});
const allowOrigin = preflight.headers.get("access-control-allow-origin");
const allowMethod = preflight.headers.get("access-control-allow-methods") ?? "";
if (allowOrigin === ORIGIN || allowOrigin === "*") {
  if (/PUT/i.test(allowMethod) || !allowMethod) pass(`CORS تُجيز الرفعَ من ${ORIGIN}`);
  else fail(`CORS تُجيز الأصلَ ولا تُجيز PUT (${allowMethod})`);
} else {
  fail(
    `CORS لا تُجيز ${ORIGIN} (${preflight.status}) — أضف قاعدةً للمستودع تسمح بـs3_put من هذا الأصل،` +
      " وإلّا سقط رفعُ المتصفِّح وحدَه بلا سببٍ ظاهر"
  );
}

// ٦ — الحذف
if (await deleteFromB2(key)) pass("الحذف مرّ");
else fail("الحذفُ لم يمرّ");
if (!(await b2ObjectExists(key))) pass("زال الملفُّ فعلاً");
else fail("بقي الملفُّ بعد الحذف");

console.log(process.exitCode ? "\nفيه عطب." : "\nالسلسلةُ سليمة.");
