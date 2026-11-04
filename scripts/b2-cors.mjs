/**
 * قاعدةُ CORS على مستودع باك بليز — قراءةً وضبطاً.
 *
 * ولمَ سكربتٌ لا واجهةُ الموقع: واجهةُ باك بليز تُقدِّم خيارين جاهزين
 * («شارِك مع كلِّ الأصول» أو «مع أصولٍ مُعيَّنة»)، وهما يضبطان عمليّاتِ
 * **التنزيل** — ونحن نحتاج `s3_put`، أي الكتابةَ من المتصفِّح. فمن اختار
 * الجاهزَ ظنَّ أنّه فعل المطلوب، وبقي الرفعُ يسقط. ثمّ هي قاعدةٌ تُراجَع
 * وتُزاد (أصلُ معاينةٍ جديد)، فموضعُها العدّةُ لا الذاكرة.
 *
 * ويُستعمل **واجهةُ باك بليز الأصليّة لا S3**: ضبطُ CORS في S3 موردٌ فرعيٌّ
 * (`?cors`)، و`presignS3Url` عندنا تُرمِّز المسارَ كلَّه فيصير `?cors` جزءاً من
 * اسم المفتاح. والواجهةُ الأصليّةُ طلبُ JSON برمزٍ من `b2_authorize_account`،
 * فلا توقيعَ فيها أصلاً.
 *
 * **وهو يُبدِّل القواعدَ كلَّها لا يُضيف إليها**: هكذا تعمل الواجهة. فيُطبع
 * القائمُ قبل الجديد، ولا يُكتب شيءٌ بلا `--apply`.
 *
 *   npm run b2:cors              # قراءةٌ وعرضُ ما سيُكتب، بلا كتابة
 *   npm run b2:cors:apply        # الكتابة
 *
 * ولأمرِ الكتابة اسمُه الخاصُّ عن قصد: `npm run b2:cors --apply` **لا يُمرِّر
 * العلمَ** في npm 10 — يبتلعه npm بوصفه إعداداً لنفسه ولا يصل السكربتَ، ولا
 * ينفع إلّا `-- --apply` بشُرطتين. وهي تُنسى، فيُقرأ جوابُ القراءةِ ظنّاً أنّه
 * جوابُ الكتابة — ويُحسب الضبطُ مضبوطاً وهو لم يُكتب. فاسمٌ ثانٍ أصدقُ من
 * تعليمةٍ تُحفظ.
 *
 * ولأصولٍ غيرِ الافتراضيّة تلزم الشُّرطتان:
 *   npm run b2:cors -- --origin=https://x.sa --origin=https://y.sa --apply
 */

const APPLY = process.argv.includes("--apply");

// الأصولُ التي يُجاز الرفعُ منها. ولا `*` بحال: الرابطُ المُوقَّع يُجيز
// الكتابةَ على مفتاحٍ بعينه، لكنّ `*` تجعل أيَّ صفحةٍ في الإنترنت تستطيع
// استعمالَ تذكرةٍ سُرِّبت من متصفِّح مستخدمٍ مُسجَّل.
const DEFAULT_ORIGINS = ["https://zad-adm.vercel.app", "http://localhost:3000"];
const argOrigins = process.argv
  .filter((a) => a.startsWith("--origin="))
  .map((a) => a.slice("--origin=".length).replace(/\/+$/, ""))
  .filter(Boolean);

// **ولا تُسقَط أصولٌ بحال: الاتّحادُ من ثلاثة.**
//
// فالواجهةُ تُبدِّل القواعدَ كلَّها لا تُضيف إليها، ومن ثَمّ كان كلُّ تشغيلٍ
// يُسقط ما ليس في هذا الملفّ. فمن أجاز نطاقَه الخاصَّ بـ`--origin` مرّةً، ثمّ
// شغّل `b2:cors:apply` بعدها لأيِّ سبب، **أسقط نطاقَه من حيث لا يدري** —
// والرفعُ يسقط ولا يُعرف لماذا، إذ القاعدةُ «موجودةٌ» ويُظنُّ أنّها سليمة.
//
// فتُقرأ الأصولُ القائمةُ من باك بليز ويُضمُّ إليها الافتراضيّان وما وصل من
// السطر. و`--prune` لمن أراد الاقتصارَ عليهما فعلاً، فيكون إسقاطُ الأصلِ
// قصداً مكتوباً لا أثراً جانبيّاً.
const PRUNE = process.argv.includes("--prune");

const rulesFor = (origins) => [
  {
    corsRuleName: "zadBrowserUpload",
    allowedOrigins: origins,
    // `s3_put` وحدَها: الرفعُ من المتصفِّح. والقراءةُ تمرّ من بوّابة كلاود فلير
    // وهي خادمٌ لا متصفِّح، فلا CORS عليها — ومن أضاف `s3_get` هنا وسّع الإجازةَ
    // بلا أن يحتاجها.
    allowedOperations: ["s3_put"],
    // `content-type` يُرسل مع الـ`PUT` فلا بدّ من إجازته، و`*` تُغني عن تتبُّعِ
    // ما يُضيفه المتصفِّحُ من ترويسات.
    allowedHeaders: ["*"],
    exposeHeaders: ["etag"],
    maxAgeSeconds: 3600,
  },
];

const need = ["B2_KEY_ID", "B2_APP_KEY", "B2_BUCKET"].filter((k) => !process.env[k]?.trim());
if (need.length) {
  console.log("الإعدادُ ناقص:", need.join("، "));
  process.exit(1);
}

const bucketName = process.env.B2_BUCKET.trim();
const basic = Buffer.from(`${process.env.B2_KEY_ID.trim()}:${process.env.B2_APP_KEY.trim()}`).toString("base64");

const authRes = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
  headers: { Authorization: `Basic ${basic}` },
});
const authBody = await authRes.json();
if (!authRes.ok) {
  console.log(`تعذّر التوثيق (${authRes.status}): ${authBody.message ?? ""}`);
  process.exit(1);
}
const { apiUrl } = authBody.apiInfo.storageApi;
const token = authBody.authorizationToken;
const accountId = authBody.accountId;
const capabilities = authBody.apiInfo.storageApi.capabilities ?? [];

const call = async (name, body) => {
  const res = await fetch(`${apiUrl}/b2api/v3/${name}`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${name} ${res.status}: ${json.message ?? JSON.stringify(json)}`);
  return json;
};

const { buckets } = await call("b2_list_buckets", { accountId, bucketName });
const bucket = buckets?.[0];
if (!bucket) {
  console.log(`لا مستودعَ بهذا الاسم: ${bucketName}`);
  process.exit(1);
}

console.log(`المستودع: ${bucket.bucketName} (${bucket.bucketType})`);
console.log("\nالقائمُ الآن:");
console.log(bucket.corsRules?.length ? JSON.stringify(bucket.corsRules, null, 2) : "  (لا قاعدةَ — وكلُّ رفعٍ من المتصفِّح يسقط)");

// الأصولُ القائمةُ في باك بليز — من قاعدتنا ومن أيِّ قاعدةٍ أخرى عليها.
const existing = PRUNE ? [] : (bucket.corsRules ?? []).flatMap((r) => r.allowedOrigins ?? []);
// و`*` لا تُنقل إن وجدت: من أجازها يدوياً يوماً لا يُثبَّت له ذلك هنا.
const origins = [...new Set([...existing, ...DEFAULT_ORIGINS, ...argOrigins])].filter(
  (o) => o !== "*"
);
const RULES = rulesFor(origins);

const added = origins.filter((o) => !existing.includes(o));
const dropped = existing.filter((o) => !origins.includes(o));

console.log("\nالذي سيُكتب:");
console.log(JSON.stringify(RULES, null, 2));
if (added.length) console.log(`\nيُضاف: ${added.join("، ")}`);
if (dropped.length) console.log(`يُسقَط: ${dropped.join("، ")}`);
if (!added.length && !dropped.length) console.log("\nولا فرقَ عمّا هو قائم.");

if (!capabilities.includes("writeBuckets")) {
  console.log(
    "\nوالمفتاحُ بلا `writeBuckets`، فلا يستطيع الضبط. أنشئ مفتاحاً يحمله،" +
      " أو اضبطها من واجهة باك بليز."
  );
  process.exit(1);
}

if (!APPLY) {
  // **يُطبع الأمرُ بأصوله لا اسمُه مجرّداً.**
  //
  // فكان يُطبع `npm run b2:cors:apply` دائماً، ومن شغّله بـ`--origin` ثمّ اتّبع
  // النصيحةَ حرفاً، كتب القاعدةَ **بلا أصله** — فيرى قاعدةً مكتوبةً ويحسب أنّه
  // أجاز نطاقَه، والرفعُ يسقط ولا يُعرف لماذا. وقد وقع هذا فعلاً.
  const cmd = argOrigins.length
    ? `npm run b2:cors -- ${argOrigins.map((o) => `--origin=${o}`).join(" ")}${PRUNE ? " --prune" : ""} --apply`
    : PRUNE
      ? "npm run b2:cors -- --prune --apply"
      : "npm run b2:cors:apply";
  console.log(`\nقراءةٌ بلا كتابة. وللكتابة:\n  ${cmd}`);
  process.exit(0);
}

// `bucketType` لا يُمرَّر: الواجهةُ تُبقيه على ما هو، والمستودعُ خاصٌّ بقصدٍ
// فلا يُلمس من هنا بحال.
await call("b2_update_bucket", { accountId, bucketId: bucket.bucketId, corsRules: RULES });

// يُقرأ من باك بليز بعد الكتابة لا يُستنتج من نجاح الطلب.
const after = (await call("b2_list_buckets", { accountId, bucketName })).buckets?.[0];
const written = after?.corsRules ?? [];
console.log("\nالتحقُّق — ما تقوله باك بليز الآن:");
console.log(JSON.stringify(written, null, 2));

const rule = written.find((r) => r.corsRuleName === RULES[0].corsRuleName);
const ok =
  rule &&
  rule.allowedOperations?.includes("s3_put") &&
  origins.every((o) => rule.allowedOrigins?.includes(o));
if (ok) {
  console.log("\n✓ القاعدةُ مكتوبة. وأعد `npm run check:b2` فيُجرِّب الطلبَ التمهيديَّ عليها.");
} else {
  console.log("\n✗ القاعدةُ لم تُكتب كما أُرسلت — راجع الطبعةَ أعلاه.");
  process.exitCode = 1;
}
