/**
 * نسخُ ملفّات Cloudinary إلى باك بليز — **والقاعدةُ لا تُلمس**.
 *
 * يُنزّل كلَّ ملفٍّ ويُصعّده ويتحقّق من وصوله، ثمّ يكتب بيانَ مطابقةٍ
 * (`oldUrl → newUrl`) في ملفّ. واستبدالُ الروابط في القاعدة مرحلةٌ أخرى تُنشر
 * مع تعديل الكود: فالصفُّ إن أشار إلى باك بليز قبل أن تُجيزها سياسةُ المحتوى،
 * انحجب كلُّ ملفٍّ في الموقع.
 *
 * ووصلةٌ واحدةٌ إلى القاعدة عبر `DIRECT_URL`: الموزِّعُ في وضع الجلسة على
 * المنفذ 5432، فكلُّ وصلةٍ تُحتجز طولَ العمل. وعشرُ وصلاتٍ محتجزةٌ ساعةً تعني
 * «too many connections» في وجه المستعملين.
 *
 *   node -r dotenv/config --experimental-strip-types scripts/migrate-files-to-b2.mjs
 *   node -r dotenv/config --experimental-strip-types scripts/migrate-files-to-b2.mjs --apply
 */

import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { cloudinaryRefFromUrl, extensionOf, providerOf } from "../src/lib/storage.ts";
import { b2ObjectExists, presignUpload, requireB2Config } from "../src/lib/b2.ts";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);
const MANIFEST = "scripts/out/b2-manifest.json";
const CONCURRENCY = 4;

/**
 * من أين تُجمع الروابط.
 *
 * `json: true` يعني أنّ العمود يحمل شجرةً تُمشى مشياً عامّاً: الأشكالُ ثلاثةٌ
 * مختلفة — مصفوفةُ كائناتٍ في `Request`، وكائنُ مصفوفاتٍ في الاستبانات
 * المخصّصة، وتعشيشٌ عميقٌ في إعداد الواجهة — فمعرفةُ الشكل سلفاً تُخطئ واحداً
 * منها حتماً.
 */
const SOURCES = [
  { table: "Request", id: "id", column: "attachments", json: true },
  { table: "CustomSurveyResponse", id: "id", column: "attachments", json: true },
  { table: "GlobalSetting", id: "key", column: "value", json: true },
  { table: "DesignRequestAttachment", id: "id", column: "fileUrl" },
  { table: "KnowledgeNode", id: "id", column: "fileUrl" },
  { table: "MailAttachment", id: "id", column: "fileUrl" },
  { table: "Task", id: "id", column: "proofUrl" },
  { table: "Task", id: "id", column: "attachmentUrl" },
  { table: "Achievement", id: "id", column: "proofUrl" },
  { table: "GovernanceProgress", id: "id", column: "proofUrl" },
  { table: "Initiative", id: "id", column: "marketingUrl" },
  { table: "Charity", id: "id", column: "logoUrl" },
  { table: "Employee", id: "id", column: "avatarUrl" },
];

/** كلُّ نصٍّ في الشجرة — بلا معرفةٍ بشكلها. */
function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

async function gatherUrls(client) {
  const urls = new Map(); // url -> [{table, column, id}]
  for (const src of SOURCES) {
    let rows;
    try {
      rows = (
        await client.query(
          `select "${src.id}" as id, "${src.column}" as value from "${src.table}" where "${src.column}"::text like '%res.cloudinary.com%'`
        )
      ).rows;
    } catch (error) {
      console.log(`  تخطٍّ ${src.table}.${src.column}: ${String(error.message).split("\n")[0]}`);
      continue;
    }
    let found = 0;
    for (const row of rows) {
      const candidates = src.json ? collectStrings(row.value) : [row.value];
      for (const candidate of candidates) {
        if (typeof candidate !== "string" || providerOf(candidate) !== "cloudinary") continue;
        found++;
        if (!urls.has(candidate)) urls.set(candidate, []);
        urls.get(candidate).push({ table: src.table, column: src.column, id: row.id });
      }
    }
    if (found) console.log(`  ${src.table}.${src.column}: ${found} رابطاً في ${rows.length} صفّاً`);
  }
  return urls;
}

/**
 * مفتاحُ الملفِّ في باك بليز.
 *
 * ويُشتقّ من مُعرِّف Cloudinary نفسِه لا يُولَّد جديداً: الترحيلُ يصير ١:١
 * يُراجَع بالعين، ويُعاد تشغيلُ السكربت بلا أن يُضاعف الملفّات. والمفتاحُ غيرُ
 * قابلٍ للتخمين أصلاً — فيه ختمُ الوقت بالملّي ثانية كما ولّدته Cloudinary.
 */
function keyFor(url) {
  const ref = cloudinaryRefFromUrl(url);
  if (!ref) return null;
  const ext = extensionOf(ref.publicId) || extensionOf(new URL(url).pathname);
  return ext && !ref.publicId.toLowerCase().endsWith(`.${ext}`)
    ? `${ref.publicId}.${ext}`
    : ref.publicId;
}

async function copyOne(url, key) {
  const res = await fetch(url);
  if (!res.ok) return { ok: false, reason: `تنزيل ${res.status}` };
  const body = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";

  const target = presignUpload(key, 900);
  const put = await fetch(target.uploadUrl, {
    method: "PUT",
    body,
    headers: { "content-type": contentType, "content-length": String(body.length) },
  });
  if (!put.ok) return { ok: false, reason: `رفع ${put.status} ${(await put.text()).slice(0, 160)}` };

  // لا يُكتب في البيان ما لم يُسأل عنه بعد رفعه: رفعٌ ردَّ 200 ولم يُثبت وجودَ
  // الملفِّ يصير رابطاً مكسوراً حين تُستبدل الروابط، ولا رجعةَ فيه بعد الحذف.
  if (!(await b2ObjectExists(key))) return { ok: false, reason: "رُفع ولم يُوجد" };
  return { ok: true, newUrl: target.publicUrl, bytes: body.length };
}

async function run() {
  const config = requireB2Config();
  console.log(`المستودع: ${config.bucket} على ${config.endpointHost}`);
  console.log(`العنوان العامّ: ${config.publicBase}`);
  console.log(APPLY ? "الوضع: تنفيذ\n" : "الوضع: تجربة (بلا رفع) — أضف --apply للتنفيذ\n");

  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("الجمع:");
  const urls = await gatherUrls(client);
  await client.end();

  let list = [...urls.keys()];
  if (LIMIT > 0) list = list.slice(0, LIMIT);
  console.log(`\nروابطُ Cloudinary الفريدة: ${urls.size}${LIMIT ? ` (يُعالج منها ${list.length})` : ""}`);

  const manifest = {};
  const failures = [];
  let done = 0;
  let bytes = 0;

  const worker = async (queue) => {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      const key = keyFor(url);
      if (!key) {
        failures.push({ url, reason: "تعذّر اشتقاق المفتاح" });
        continue;
      }
      if (!APPLY) {
        manifest[url] = { key, newUrl: `${config.publicBase}/${key}`, dryRun: true };
        done++;
        continue;
      }
      const result = await copyOne(url, key);
      if (result.ok) {
        manifest[url] = { key, newUrl: result.newUrl, bytes: result.bytes, places: urls.get(url) };
        bytes += result.bytes;
      } else {
        failures.push({ url, key, reason: result.reason });
      }
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${list.length}`);
    }
  };

  const queue = [...list];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  writeFileSync(MANIFEST, JSON.stringify({ at: new Date().toISOString(), apply: APPLY, manifest, failures }, null, 2));
  console.log(`\nنُسخ: ${Object.keys(manifest).length}`);
  if (APPLY) console.log(`الحجم: ${(bytes / 1024 / 1024).toFixed(1)} ميقابايت`);
  console.log(`فشل: ${failures.length}`);
  for (const f of failures.slice(0, 15)) console.log(`  ${f.reason} — ${f.url}`);
  console.log(`\nالبيان: ${MANIFEST}`);
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  console.error("فشل:", error.message);
  process.exit(1);
});
