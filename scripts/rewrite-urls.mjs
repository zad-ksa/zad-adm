/**
 * استبدالُ روابط Cloudinary بروابط باك بليز في القاعدة، من بيان النسخ.
 *
 * وهي الخطوةُ الوحيدةُ في النقل التي **تكتب في القاعدة**، فحولها ثلاثةُ أحراس:
 *
 *   ١ **البيانُ يجب أن يكون من تشغيلٍ حقيقيّ** (`apply: true`). فالتجربةُ
 *     الجافّةُ تكتب بياناً كاملاً بروابطَ باك بليز **ولم تُصعِّد ملفّاً واحداً**.
 *     فمن استبدل منها حوَّل ٥٣٩ صفّاً إلى ملفّاتٍ لا وجودَ لها: الموقعُ يُشير
 *     إلى عدمٍ، وروابطُ Cloudinary التي كانت تعمل ضاعت من الصفوف. وهو أسوأُ ما
 *     يمكن أن يجري في هذا النقل كلِّه، فيُرفض صريحاً.
 *   ٢ **عيّنةٌ من الملفّات تُسأل عنها باك بليز** قبل أيِّ كتابة — فبيانٌ صحيحٌ
 *     وملفّاتٌ حُذفت بعده يُنتج العطبَ نفسَه.
 *   ٣ **والكتابةُ كلُّها في معاملةٍ واحدة**: نقلٌ نصفُه مكتوبٌ ونصفُه لا، يترك
 *     القاعدةَ في حالٍ لا يُعرف منها ما نُقل وما بقي.
 *
 * والاستبدالُ يمرّ من `rewriteUrlsIn` — خالصةٌ مُختبَرةٌ تمشي JSON بلا معرفةٍ
 * بشكله، لأنّ ثلاثةَ أعمدةٍ تحفظ الروابطَ داخل JSON بثلاثة أشكالٍ مختلفة،
 * والعمودُ يُكتب كلُّه أو لا شيء.
 *
 * ووصلةٌ واحدةٌ عبر `DIRECT_URL`: الموزِّعُ في وضع الجلسة، فكلُّ وصلةٍ تُحتجز.
 *
 *   npm run files:rewrite              # تجربةٌ بلا كتابة
 *   npm run files:rewrite -- --apply
 */

import { readFileSync } from "node:fs";
import { Client } from "pg";
import { CLOUDINARY_HOST, collectStrings, providerOf } from "../src/lib/storage.ts";
import { mentionsHost, rewriteUrlsIn } from "../src/lib/urlRewrite.ts";
import { FILE_SOURCES, sourceLabel } from "../src/lib/fileSources.ts";
import { b2ObjectExists, storagePublicBase } from "../src/lib/b2.ts";

const APPLY = process.argv.includes("--apply");
const MANIFEST = "scripts/out/b2-manifest.json";
const SAMPLE = Number(process.argv.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 20);

const publicBase = storagePublicBase();
if (!publicBase) {
  console.log("STORAGE_PUBLIC_BASE غيرُ مضبوط.");
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch {
  console.log(`لا بيانَ في ${MANIFEST} — شغّل npm run files:migrate -- --apply أوّلاً.`);
  process.exit(1);
}

// الحرسُ الأوّل، وهو أهمُّها.
if (manifest.apply !== true) {
  console.log(
    "البيانُ من تجربةٍ جافّة (apply: false) — ولم يُصعَّد منه ملفٌّ واحد.\n" +
      "والاستبدالُ منه يُحوِّل الصفوفَ إلى ملفّاتٍ لا وجودَ لها ويُسقط روابطَ Cloudinary العاملة.\n" +
      "شغّل: npm run files:migrate -- --apply"
  );
  process.exit(1);
}

const map = Object.create(null);
for (const [oldUrl, entry] of Object.entries(manifest.manifest ?? {})) {
  const newUrl = typeof entry === "string" ? entry : entry?.newUrl;
  if (newUrl) map[oldUrl] = newUrl;
}
const mapSize = Object.keys(map).length;
if (mapSize === 0) {
  console.log("البيانُ خالٍ من المطابقات.");
  process.exit(1);
}

console.log(`البيان: ${mapSize} مطابقةً · كُتب في ${manifest.at ?? "؟"}`);
if ((manifest.failures ?? []).length) {
  console.log(`وفيه ${manifest.failures.length} فاشلاً لم يُنسخ — تبقى صفوفُها على Cloudinary.`);
}

// الحرسُ الثاني: عيّنةٌ تُسأل عنها باك بليز.
const keys = Object.entries(manifest.manifest ?? {})
  .map(([, e]) => (typeof e === "string" ? null : e?.key))
  .filter(Boolean);
const sample = keys.slice(0, Math.max(1, SAMPLE));
console.log(`\nتحقُّقٌ من وجود ${sample.length} ملفّاً من ${keys.length}:`);
let missing = 0;
for (const key of sample) {
  if (!(await b2ObjectExists(key))) {
    console.log(`  ✗ غيرُ موجود: ${key}`);
    missing++;
  }
}
if (missing > 0) {
  console.log(`\n${missing} من العيّنة غيرُ موجودٍ في المستودع — لا يُكتب شيء.`);
  process.exit(1);
}
console.log("  ✓ كلُّ العيّنة موجودة");

const isCloudinary = mentionsHost(CLOUDINARY_HOST);

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const plan = [];
  const suspects = new Set();
  let totalRefs = 0;

  console.log("\nالفحص:");
  for (const source of FILE_SOURCES) {
    let rows;
    try {
      rows = (
        await client.query(
          `select "${source.id}" as id, "${source.column}" as value from "${source.table}" where "${source.column}"::text like '%${CLOUDINARY_HOST}%'`
        )
      ).rows;
    } catch (error) {
      console.log(`  تخطٍّ ${sourceLabel(source)}: ${String(error.message).split("\n")[0]}`);
      continue;
    }
    if (rows.length === 0) continue;

    let refs = 0;
    let touched = 0;
    for (const row of rows) {
      const result = rewriteUrlsIn(row.value, map, isCloudinary);
      for (const s of result.suspects) suspects.add(s);
      if (result.replaced === 0) continue;
      refs += result.replaced;
      touched++;
      plan.push({ source, id: row.id, value: result.value });
    }
    totalRefs += refs;
    console.log(`  ${sourceLabel(source)}: ${refs} رابطاً في ${touched} صفّاً`);
  }

  console.log(`\nالمجموع: ${totalRefs} رابطاً في ${plan.length} صفّاً`);

  if (suspects.size > 0) {
    console.log(`\nوتبقى ${suspects.size} رابطاً على Cloudinary بلا مطابقةٍ في البيان:`);
    for (const s of [...suspects].slice(0, 10)) console.log(`  · ${s.slice(0, 110)}`);
    if (suspects.size > 10) console.log(`  … و${suspects.size - 10} غيرها`);
    console.log("  (رُفعت بعد النسخ، أو فشل نسخُها — أعد files:migrate ثمّ هذا)");
  }

  if (!APPLY) {
    console.log("\nتجربةٌ بلا كتابة — أضف --apply للتنفيذ.");
    process.exit(0);
  }
  if (plan.length === 0) {
    console.log("\nلا شيءَ يُكتب.");
    process.exit(0);
  }

  // معاملةٌ واحدة: الكلُّ أو لا شيء.
  await client.query("begin");
  try {
    for (const item of plan) {
      const { table, column, id } = { ...item.source, id: item.source.id };
      // أعمدةُ JSON تُكتب نصّاً مُسلسَلاً بتحويلٍ صريحٍ إلى jsonb، وإلّا
      // حفظها pg نصّاً مزدوجَ الترميز فصار العمودُ سلسلةً لا شجرة.
      const sql = item.source.json
        ? `update "${table}" set "${column}" = $1::jsonb where "${id}" = $2`
        : `update "${table}" set "${column}" = $1 where "${id}" = $2`;
      const value = item.source.json ? JSON.stringify(item.value) : item.value;
      await client.query(sql, [value, item.id]);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  console.log(`\nكُتب ${plan.length} صفّاً.`);

  // يُقرأ من القاعدة بعد الكتابة لا يُستنتج من نجاح الطلب.
  console.log("\nالتحقُّق:");
  let left = 0;
  for (const source of FILE_SOURCES) {
    try {
      const rows = (
        await client.query(
          `select "${source.column}" as value from "${source.table}" where "${source.column}"::text like '%${CLOUDINARY_HOST}%'`
        )
      ).rows;
      let n = 0;
      for (const row of rows) {
        const candidates = source.json ? collectStrings(row.value) : [row.value];
        for (const c of candidates) {
          if (typeof c === "string" && providerOf(c) === "cloudinary") n++;
        }
      }
      if (n > 0) {
        console.log(`  · ${sourceLabel(source)}: بقي ${n}`);
        left += n;
      }
    } catch {
      /* عمودٌ زال: لا شيءَ فيه */
    }
  }
  console.log(
    left === 0
      ? "  ✓ لم يبق مرجعٌ واحدٌ على Cloudinary"
      : `  ${left} مرجعاً باقياً (المشتبهون أعلاه)`
  );
  console.log("\nولا يُحذف من Cloudinary إلّا بعد أسبوع تحقُّق.");
} catch (error) {
  console.error("فشل:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
