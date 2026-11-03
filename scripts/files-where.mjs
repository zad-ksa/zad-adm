/**
 * أين تسكن ملفّاتُ الموقع — عموداً عموداً.
 *
 * والسؤالُ الذي يُجيبه: «كيف أعرف أنّ الملفَّ صار على `files.zad-co.sa`؟».
 * والجوابُ أنّ **الرابطَ المحفوظَ هو الحكم**: مضيفُه يقطع بالمزوّد، فلا عمودَ
 * مزوّدٍ في القاعدة ولا حاجةَ إليه. فيُعدّ هذا السكربتُ الصفوفَ بمضيفها.
 *
 * ويُقرأ منه شيئان:
 *   - أنّ التحوُّل عمل: عددُ باك بليز يزيد مع كلِّ رفعٍ جديد.
 *   - وأنّ النقل تمّ: عددُ Cloudinary يبلغ صفراً — وحينئذٍ وحدَه يُحذف منها.
 *
 * **ولا يكتفي بالعدّ**: يأخذ من روابط باك بليز عيّنةً ويطلبها من البوّابة
 * فعلاً. فصفٌّ يحمل رابطاً سليماً وملفُّه غيرُ موجودٍ عطبٌ لا يظهر في أيِّ
 * إحصاء — والنقلُ كلُّه قائمٌ على ألّا يحدث ذلك.
 *
 * ووصلةٌ واحدةٌ عبر `DIRECT_URL`: الموزِّعُ في وضع الجلسة، فكلُّ وصلةٍ تُحتجز.
 *
 *   npm run files:where
 *   npm run files:where -- --probe=10
 */

import { Client } from "pg";
import { collectStrings, providerOf } from "../src/lib/storage.ts";
import { FILE_SOURCES, sourceLabel } from "../src/lib/fileSources.ts";
import { storagePublicBase } from "../src/lib/b2.ts";

const PROBE = Number(process.argv.find((a) => a.startsWith("--probe="))?.split("=")[1] ?? 5);

const publicBase = storagePublicBase();
if (!publicBase) {
  console.log("STORAGE_PUBLIC_BASE غيرُ مضبوط — فلا يُعرف رابطُ باك بليز من غيره.");
  process.exit(1);
}

const pad = (text, width) => {
  const value = String(text);
  return value + " ".repeat(Math.max(0, width - value.length));
};
const padStart = (text, width) => {
  const value = String(text);
  return " ".repeat(Math.max(0, width - value.length)) + value;
};

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const totals = { b2: 0, cloudinary: 0, other: 0 };
  const rows = [];
  const b2Urls = [];
  const otherUrls = new Set();
  // **الإشاراتُ والملفّاتُ عددان لا واحد**، والفرقُ بينهما ليس تفصيلاً: الملفُّ
  // الواحدُ يُشار إليه من صفّين — مرفقٌ أُعيد إرساله، أو شاهدٌ نُسخ — فالنسخُ
  // يُعدّ بالمميَّز (كم ملفّاً يُنزَّل ويُصعَّد) والاستبدالُ يُعدّ بالإشارات (كم
  // موضعاً يُكتب). ومن خلط بينهما حسب النقلَ ناقصاً وهو تامّ.
  const distinct = { b2: new Set(), cloudinary: new Set() };

  for (const source of FILE_SOURCES) {
    let found;
    try {
      found = (
        await client.query(
          `select "${source.id}" as id, "${source.column}" as value from "${source.table}" where "${source.column}" is not null`
        )
      ).rows;
    } catch (error) {
      // جدولٌ أو عمودٌ زال: يُقال ولا يُسقط التقرير — القائمةُ أوسعُ من
      // المخطَّط عن قصدٍ أحياناً، وما لا وجودَ له لا ملفّاتِ فيه.
      console.log(`  تخطٍّ ${sourceLabel(source)}: ${String(error.message).split("\n")[0]}`);
      continue;
    }

    const count = { b2: 0, cloudinary: 0, other: 0 };
    for (const row of found) {
      const candidates = source.json ? collectStrings(row.value) : [row.value];
      for (const candidate of candidates) {
        if (typeof candidate !== "string" || !candidate.trim()) continue;
        // ولا يُعدُّ إلّا ما هو رابطٌ أصلاً: أعمدةُ JSON تحمل أسماءَ ملفّاتٍ
        // وأحجاماً ونصوصاً أخرى، وهي ليست ملفّاتٍ تُحصى.
        if (!/^https?:\/\//i.test(candidate.trim())) continue;
        const provider = providerOf(candidate, publicBase);
        if (provider === "b2") {
          count.b2++;
          distinct.b2.add(candidate);
          if (b2Urls.length < PROBE * 4) b2Urls.push(candidate);
        } else if (provider === "cloudinary") {
          count.cloudinary++;
          distinct.cloudinary.add(candidate);
        } else {
          count.other++;
          if (otherUrls.size < 5) otherUrls.add(candidate);
        }
      }
    }
    totals.b2 += count.b2;
    totals.cloudinary += count.cloudinary;
    totals.other += count.other;
    if (count.b2 || count.cloudinary || count.other) rows.push({ label: sourceLabel(source), ...count });
  }

  const width = Math.max(22, ...rows.map((r) => r.label.length));
  console.log(`العنوانُ العامّ: ${publicBase}\n`);
  console.log(`${pad("الموضع", width)}  ${padStart("باك بليز", 9)}  ${padStart("Cloudinary", 10)}  ${padStart("أخرى", 6)}`);
  console.log("─".repeat(width + 32));
  for (const r of rows.sort((a, b) => b.cloudinary + b.b2 - (a.cloudinary + a.b2))) {
    console.log(`${pad(r.label, width)}  ${padStart(r.b2 || "·", 9)}  ${padStart(r.cloudinary || "·", 10)}  ${padStart(r.other || "·", 6)}`);
  }
  console.log("─".repeat(width + 32));
  console.log(`${pad("الإشارات", width)}  ${padStart(totals.b2, 9)}  ${padStart(totals.cloudinary, 10)}  ${padStart(totals.other, 6)}`);
  console.log(`${pad("ملفّاتٌ مميَّزة", width)}  ${padStart(distinct.b2.size, 9)}  ${padStart(distinct.cloudinary.size, 10)}  ${padStart("—", 6)}`);
  const shared = totals.cloudinary - distinct.cloudinary.size;
  if (shared > 0) {
    console.log(
      `\nو${shared} إشارةً زائدةً على عدد الملفّات: ملفٌّ واحدٌ يُشار إليه من أكثرَ من موضع.` +
        `\nفالنسخُ ${distinct.cloudinary.size} ملفّاً، والاستبدالُ ${totals.cloudinary} موضعاً.`
    );
  }

  if (otherUrls.size) {
    console.log("\nروابطُ لا تخصّ مزوّدَينا (لا تُنقل ولا تُحذف):");
    for (const url of otherUrls) console.log(`  · ${url.slice(0, 100)}`);
  }

  // والعيّنةُ تُطلب من البوّابة فعلاً: الإحصاءُ يقول «الصفُّ يُشير»، لا «الملفُّ
  // موجود». وبينهما فرقُ مرفقٍ مفقودٍ لا يُشكى منه حتى يفتحه أحد.
  if (totals.b2 === 0) {
    console.log("\nلا رابطَ باك بليزَ واحدٌ بعد. وأوّلُ رفعٍ بعد ضبط STORAGE_UPLOAD_PROVIDER=b2 يظهر هنا.");
  } else {
    const sample = b2Urls.slice(-PROBE);
    console.log(`\nعيّنةٌ تُطلب من البوّابة (${sample.length} من ${totals.b2}):`);
    let bad = 0;
    for (const url of sample) {
      let line;
      try {
        const res = await fetch(url, { method: "HEAD" });
        const ok = res.status >= 200 && res.status < 300;
        if (!ok) bad++;
        line = `${ok ? "✓" : "✗"} ${res.status} · ${res.headers.get("content-type") ?? "—"}`;
      } catch (error) {
        bad++;
        line = `✗ تعذّر الوصول: ${error?.cause?.code ?? error.message}`;
      }
      console.log(`  ${line}  ${url.slice(publicBase.length)}`);
    }
    if (bad) {
      console.log(`\n✗ ${bad} من العيّنة لا تُقرأ — صفوفٌ تُشير إلى ملفّاتٍ غيرِ موجودة.`);
      process.exitCode = 1;
    } else {
      console.log("\n✓ كلُّ العيّنةِ تُقرأ من البوّابة.");
    }
  }

  if (totals.cloudinary === 0 && totals.b2 > 0) {
    console.log("\nولم يبق مرجعٌ واحدٌ على Cloudinary — فالحذفُ منها صار مأموناً.");
  }
} catch (error) {
  console.error("فشل:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
