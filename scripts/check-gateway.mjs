/**
 * فحصُ بوّابةِ الملفّات **قبل نشرها** — بتشغيل دالّتها في هذه العمليّة.
 *
 * ولمَ لا يُنتظر النشر: نشرةُ العامل تحتاج حسابَ Cloudflare ومتصفِّحاً يُوثِّق،
 * ومن نشر ثمّ وجد عطباً راجع كودَه من خلال طبقتين — الحافّةُ وسجلُّها. وهذه
 * الدالّةُ لا تحتاج شيئاً من ذلك: `index.mjs` يُصدّر كائناً فيه `fetch(request,
 * env, ctx)`، فيُنادى هنا كما تُناديه الحافّة، **بمفاتيحِ المستودع الحقيقيّة
 * وعلى ملفٍّ حقيقيٍّ يُرفع ويُحذف**. فما يصحّ هنا يصحّ هناك، إلّا ما كان من
 * شأن الشبكة والنطاق — وذاك ما يفحصه `npm run check:b2` بعد النشر.
 *
 * وبيئةُ العامل تُحاكى بشيئين لا ثالثَ لهما: `caches.default` — وهو غيرُ موجودٍ
 * في Node — و`ctx.waitUntil`. وما عداهما (`fetch` و`Request` و`Response`
 * و`crypto.subtle`) قياسيٌّ في Node 22، فلا يُحاكى شيءٌ من المنطق نفسِه.
 *
 * وأهمُّ ما يُفحَص هنا **فرضُ نوع المحتوى**: يُرفع ملفٌّ اسمُه `.png` ونوعُه
 * `text/html` — وهو ما يستطيعه رافعُ مرفقِ الاستبيان، فنوعُ المحتوى ليس في
 * التوقيع — ثمّ يُطلب من البوّابة، فيجب أن تُعيده `image/png`. ولو أعادته كما
 * حُفظ، صارت صفحةٌ تعمل على نطاقنا يرفعها مجهولٌ بلا حساب.
 *
 *   npm run check:gateway
 */

import { randomBytes } from "node:crypto";
import { b2Config, deleteFromB2, missingB2Keys, presignUpload } from "../src/lib/b2.ts";

const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.log(`  ✗ ${m}`); process.exitCode = 1; };

const config = b2Config();
if (!config) {
  console.log("الإعدادُ ناقص:", missingB2Keys().join("، ") || "قيمةٌ غير صالحة");
  process.exit(1);
}

// محاكاةُ بيئة العامل. و`match` تردُّ العدمَ دائماً كي يُفحَص المسارُ الكامل
// لا الجوابُ المخزَّن، و`put` تُسجَّل لنتحقَّق أنّ ما يُخزَّن هو الجوابُ
// **بعد** تعديل ترويساته لا قبلَه — وإلّا خُدم من الحافّة نوعٌ لم يُفرض.
const puts = [];
globalThis.caches = {
  default: {
    async match() { return undefined; },
    async put(key, response) { puts.push({ key, response }); },
  },
};
const ctx = { waitUntil(promise) { return promise; } };

const env = {
  B2_ENDPOINT: process.env.B2_ENDPOINT,
  B2_REGION: process.env.B2_REGION,
  B2_BUCKET: process.env.B2_BUCKET,
  B2_KEY_ID: process.env.B2_KEY_ID,
  B2_APP_KEY: process.env.B2_APP_KEY,
};

const gateway = (await import("../workers/files/index.mjs")).default;

// النطاقُ في الطلب لا يلزم أن يكون منشوراً: العاملُ يقرأ المسارَ وحدَه.
const ORIGIN = "https://files.zad-co.sa";
const ask = (path, init) => gateway.fetch(new Request(`${ORIGIN}${path}`, init), env, ctx);

const key = `_healthcheck/${randomBytes(8).toString("hex")}.png`;
const body = "zad gateway check";

console.log("البوّابة (محليّاً، على المستودع الحقيقيّ):");
console.log(`  المستودع  ${config.bucket}`);
console.log(`  المفتاح   ${key}`);

// يُرفع بنوعٍ **كاذب**: هذا ما يستطيعه من حمل رابطَ رفعٍ مُوقَّعاً، إذ النوعُ
// خارجَ التوقيع. والبوّابةُ هي من يجب أن تُصلحه.
const put = await fetch(presignUpload(key, 300).uploadUrl, {
  method: "PUT",
  body,
  headers: { "content-type": "text/html" },
});
if (!put.ok) {
  console.log(`  ✗ تعذّر رفعُ ملفِّ الفحص (${put.status}) — شغّل npm run check:b2 أوّلاً`);
  process.exit(1);
}

console.log("\nالفحص:");

// ١ — القراءةُ تمرّ من مستودعٍ خاصٍّ بلا توقيعٍ من الزائر.
const res = await ask(`/${key}`);
if (res.status === 200) {
  const text = await res.clone().text();
  if (text === body) pass("البوّابةُ تقرأ من المستودع الخاصّ وتُعيد المحتوى");
  else fail(`المحتوى مختلف: ${text.slice(0, 60)}`);
} else {
  fail(`القراءةُ ردَّت ${res.status} — التوقيعُ أو الإعدادُ في العامل`);
}

// ٢ — **النوعُ يُفرض من الامتداد لا مما حُفظ.** وهو لبُّ الفحص.
const type = res.headers.get("content-type");
if (type === "image/png") pass("نوعُ المحتوى مفروضٌ من الامتداد (image/png)");
else if (type?.includes("text/html"))
  fail("خُدم text/html كما حُفظ — صفحةٌ تعمل على نطاقنا، والفرضُ لا يعمل");
else fail(`نوعٌ غيرُ متوقَّع: ${type}`);

// ٣ — ترويساتُ الحماية والتخزين.
const expect = (name, want) => {
  const got = res.headers.get(name);
  if (got === want) pass(`${name}: ${want}`);
  else fail(`${name} = ${got ?? "—"} (المتوقَّع ${want})`);
};
expect("x-content-type-options", "nosniff");
expect("content-security-policy", "default-src 'none'; sandbox");
expect("cache-control", "public, max-age=86400, s-maxage=604800");

// ٤ — لا تخرج ترويسةٌ تُفصح عن المزوّد.
const leaked = ["x-bz-file-id", "x-bz-file-name", "x-bz-content-sha1", "x-amz-request-id", "server"]
  .filter((h) => res.headers.has(h));
if (leaked.length === 0) pass("لا ترويسةَ تُفصح عن المزوّد");
else fail(`ترويساتٌ خرجت: ${leaked.join("، ")}`);

// ٥ — وما يُخزَّن في الحافّة هو الجوابُ المُعدَّل، لا جوابُ باك بليز الخامّ.
//     ولو خُزِّن قبل التعديل، خُدم أوّلُ زائرٍ صحيحاً ثمّ خُدم الباقون خطأً.
if (puts.length === 1 && puts[0].response.headers.get("content-type") === "image/png")
  pass("المُخزَّن في الحافّة يحمل النوعَ المفروض");
else fail(`التخزين: ${puts.length} جواباً، نوعُه ${puts[0]?.response.headers.get("content-type") ?? "—"}`);

// ٦ — HEAD بلا جسمٍ وبترويساته.
const head = await ask(`/${key}`, { method: "HEAD" });
const headBody = await head.text();
if (head.status === 200 && headBody === "") pass("HEAD يردُّ ترويساتٍ بلا جسم");
else fail(`HEAD: ${head.status}، وجسمُه ${headBody.length} حرفاً`);

// ٧ — لا كتابةَ تمرّ من البوّابة بحال. وهذا هو المسبرُ الذي يُعرف به أنّ
//     العاملَ حيٌّ بعد النشر: ٤٠٥ منه، و٤٠٤ من غيره.
for (const method of ["POST", "PUT", "DELETE"]) {
  const denied = await ask(`/${key}`, { method });
  if (denied.status === 405) pass(`${method} مرفوضٌ (405)`);
  else fail(`${method} ردَّ ${denied.status} لا 405`);
}

// ٨ — لا صعودَ بالمسار ولا مفتاحٌ مستور.
for (const path of ["/../other-bucket/x.txt", "/.env", "/"]) {
  const bad = await ask(path);
  if (bad.status === 404) pass(`مسارٌ مرفوض: ${path}`);
  else fail(`${path} ردَّ ${bad.status} لا 404`);
}

// ٩ — المفقودُ يردُّ ٤٠٤ عارياً، ولا يُنقل نصُّ خطأ باك بليز.
const missing = await ask(`/${key}.missing`);
const missingText = await missing.text();
if (missing.status === 404 && !/bucket|zad-site|xml/i.test(missingText))
  pass("المفقود: 404 بلا إفصاح");
else fail(`المفقود ردَّ ${missing.status}: ${missingText.slice(0, 80)}`);

// ١٠ — إعدادٌ ناقصٌ يُقال بالاسم لا يُسقط بصمت.
const blind = await gateway.fetch(new Request(`${ORIGIN}/${key}`), { ...env, B2_APP_KEY: "" }, ctx);
const blindText = await blind.text();
if (blind.status === 500 && blindText.includes("B2_APP_KEY")) pass("الإعدادُ الناقصُ يُسمّى في الجواب");
else fail(`الإعدادُ الناقص: ${blind.status} — ${blindText.slice(0, 60)}`);

await deleteFromB2(key);
console.log(process.exitCode ? "\nفي البوّابة عطب." : "\nالبوّابةُ سليمةٌ، وتبقى نشرتُها.");
