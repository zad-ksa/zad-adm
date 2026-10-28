/**
 * استيرادُ الجهات المانحة، وتقريرُ مطابقةِ الأسماء الحرّة، ثم تعبئتُها.
 *
 *     node -r dotenv/config --experimental-strip-types scripts/seed-donor-orgs.mjs
 *     node -r dotenv/config --experimental-strip-types scripts/seed-donor-orgs.mjs --apply
 *
 * **بلا `--apply` لا يُكتب حرفٌ في الحسابات ولا في المنح**: يُستورد الجهاتُ
 * (وهو آمنٌ ومُعاد)، ويُطبع إلى أي صفٍّ يُطابَق كلُّ اسمٍ حرّ. فالمطابقةُ تُقرأ
 * وتُقرّ قبل أن تُكتب.
 *
 * والاستيرادُ `ON CONFLICT DO NOTHING`: جهةٌ موجودةٌ لا تُكتب فوقها، فتشغيلُ
 * السكربت ثانيةً لا يمسح رابطاً أو مجالاتٍ عدّلها موظفٌ بعد الاستيراد.
 *
 * ويُنفَّذ كلُّه بـ SQL خامّ لا بنماذج Prisma: المخطّط يُعلن `donorOrgId`
 * إلزامياً (وهو ما سيكون بعد الهجرة)، فقراءةُ صفٍّ لم يُعبَّأ بعد بنموذجٍ
 * مُلزِمٍ تفشل.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDonorName } from "../src/lib/donorOrg.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");

/**
 * جهاتٌ لها بياناتٌ في الموقع ولا ذِكرَ لها في ملف المؤسسات — ولكلٍّ نوعُها.
 * وهما تبويبان مستقلّان، فلا تُحشران في قائمة المؤسسات.
 */
const EXTRA = [
  { name: "منصة إحسان", kind: "EHSAN", url: "https://ehsan.sa/", fields: null },
  { name: "صندوق دعم الجمعيات", kind: "CHARITY_FUND", url: null, fields: null },
];

/**
 * أسماءٌ مختلفةُ الترتيب لجهةٍ واحدة — لا تُدركها التسويةُ الحرفية.
 *
 * «مؤسسة عبدالعزيز وسعد الموسى» في الموقع و«مؤسسة سعد وعبدالعزيز الموسى» في
 * الملف: الكلمتان مقلوبتان، والجهةُ واحدةٌ — أقرّه المالك.
 */
const ALIASES = [{ from: "مؤسسة عبدالعزيز وسعد الموسى", to: "مؤسسة سعد وعبدالعزيز الموسى" }];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }),
});

const say = (s = "") => console.log(s);

try {
  // ── ١) استيرادُ الجهات ────────────────────────────────────────────────────
  const seed = JSON.parse(readFileSync(join(root, "prisma", "seed-data", "donor-orgs.json"), "utf8"));
  const all = [...seed.map((r) => ({ ...r, kind: "FOUNDATION" })), ...EXTRA];

  let inserted = 0;
  for (const row of all) {
    const n = await prisma.$executeRaw`
      INSERT INTO "DonorOrg" ("id", "name", "url", "fields", "kind", "updatedAt")
      VALUES (${randomUUID()}, ${row.name}, ${row.url}, ${row.fields}, ${row.kind}, now())
      ON CONFLICT ("name") DO NOTHING
    `;
    inserted += n;
  }
  say(`الجهاتُ في الملف والزيادتان: ${all.length} — أُضيف الآن: ${inserted}، وكان موجوداً: ${all.length - inserted}`);

  // ── ٢) فهرسُ المطابقة ─────────────────────────────────────────────────────
  const orgs = await prisma.$queryRaw`SELECT "id", "name", "kind" FROM "DonorOrg"`;
  const byNorm = new Map(orgs.map((o) => [normalizeDonorName(o.name), o]));
  for (const a of ALIASES) {
    const target = byNorm.get(normalizeDonorName(a.to));
    if (target) byNorm.set(normalizeDonorName(a.from), target);
  }

  const accounts = await prisma.$queryRaw`
    SELECT a."id", a."donorName", a."donorOrgId", c."name" AS "charityName"
      FROM "DonorAccount" a JOIN "Charity" c ON c."id" = a."charityId"
     ORDER BY a."donorName"
  `;
  const grants = await prisma.$queryRaw`
    SELECT g."id", g."entityName", g."donorOrgId", c."name" AS "charityName"
      FROM "GrantApplication" g JOIN "Charity" c ON c."id" = g."charityId"
     ORDER BY g."entityName"
  `;

  // ── ٣) التقرير ────────────────────────────────────────────────────────────
  /** اسمٌ حرٌّ → { صفوفُ الحسابات، صفوفُ المنح، الجهةُ المطابقة } */
  const groups = new Map();
  const put = (raw, kind, row) => {
    const key = normalizeDonorName(raw);
    if (!groups.has(key)) groups.set(key, { raw: new Set(), accounts: [], grants: [], org: byNorm.get(key) ?? null });
    const g = groups.get(key);
    g.raw.add(raw);
    g[kind].push(row);
  };
  for (const a of accounts) put(a.donorName, "accounts", a);
  for (const g of grants) put(g.entityName, "grants", g);

  say();
  say("تقريرُ المطابقة:");
  const missing = [];
  for (const [, g] of groups) {
    const names = [...g.raw].map((s) => JSON.stringify(s)).join(" + ");
    if (g.org) {
      say(`  ✓ ${names}`);
      say(`      → ${g.org.name} [${g.org.kind}] — ${g.accounts.length} حساباً و${g.grants.length} منحة`);
    } else {
      say(`  + ${names}`);
      say(`      → لا مثيلَ له في الملف: ${APPLY ? "يُنشأ" : "سيُنشأ"} صفٌّ جديد [FOUNDATION] — ${g.accounts.length} حساباً و${g.grants.length} منحة`);
      missing.push(g);
    }
  }

  // ── ٤) إنشاءُ الناقص ثم التعبئة ───────────────────────────────────────────
  if (!APPLY) {
    say();
    say("هذه قراءةٌ فقط. لم يُكتب شيءٌ في الحسابات ولا في المنح.");
    say("للتنفيذ: أعد التشغيل بـ --apply");
  } else {
    for (const g of missing) {
      // الاسمُ المعروض أطولُ هجاءٍ ورد — فالمسافةُ الزائدةُ لا تُورَّث.
      const display = [...g.raw].map((s) => s.replace(/\s+/g, " ").trim()).sort((a, b) => b.length - a.length)[0];
      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO "DonorOrg" ("id", "name", "kind", "updatedAt")
        VALUES (${id}, ${display}, 'FOUNDATION', now())
        ON CONFLICT ("name") DO NOTHING
      `;
      const [row] = await prisma.$queryRaw`SELECT "id", "name", "kind" FROM "DonorOrg" WHERE "name" = ${display}`;
      g.org = row;
    }

    let a = 0;
    let b = 0;
    for (const [, g] of groups) {
      if (!g.org) continue;
      for (const row of g.accounts) {
        a += await prisma.$executeRaw`UPDATE "DonorAccount" SET "donorOrgId" = ${g.org.id} WHERE "id" = ${row.id}`;
      }
      for (const row of g.grants) {
        b += await prisma.$executeRaw`UPDATE "GrantApplication" SET "donorOrgId" = ${g.org.id} WHERE "id" = ${row.id}`;
      }
    }
    say();
    say(`عُبِّئ: ${a} حساباً و${b} منحة.`);

    const [left] = await prisma.$queryRaw`
      SELECT
        (SELECT count(*)::int FROM "DonorAccount"     WHERE "donorOrgId" IS NULL) AS "accounts",
        (SELECT count(*)::int FROM "GrantApplication" WHERE "donorOrgId" IS NULL) AS "grants"
    `;
    say(`المتبقّي بلا جهة: ${left.accounts} حساباً و${left.grants} منحة.`);
    if (left.accounts > 0) {
      say("⚠ لا تُنفِّذ donor-orgs-finalize.sql قبل أن يصير متبقّي الحسابات صفراً.");
      process.exitCode = 1;
    }
  }
} finally {
  await prisma.$disconnect();
}
