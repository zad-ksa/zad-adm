/**
 * تفويضُ مديري أنظمة الجمعيات بخدمات **جمعيتهم** كلِّها.
 *
 * و`isAdmin` على العضويّة لا يمنح خدمةً ضمناً: `charityServiceTeam` تقرأ صفوف
 * `CharityMemberService` حرفاً، فمديرٌ بلا صفوفٍ لا يستلم بريد خدمةٍ واحدة.
 *
 * **والخدماتُ لكلِّ جمعيةٍ خدماتُها** (`Service.charityId`): ثمانيُ جمعياتٍ
 * فيها تسع، والتجريبيّةُ فيها ثلاث. فتفويضُ الأسماء التسعة لمن جمعيتُه ثلاثٌ
 * يجعله «مفوَّضاً» بخدمةٍ لا تُقدَّم له، ويُجيز لزاد أن تُرسل إليه فيها.
 *
 * ولهذا يُنقّي السكربت كذلك — **من صفوف المديرين وحدَهم**، ولخدماتٍ ليست في
 * جمعيتهم فقط. وتفويضُ من ليس مديراً لا يُلمَس بحال، كيفما كان.
 *
 * ووصلةٌ واحدةٌ عبر `DIRECT_URL`: الموزِّعُ في وضع الجلسة، فكلُّ وصلةٍ تُحتجز.
 *
 *   npm run grant:admin-services
 *   npm run grant:admin-services -- --apply
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function run() {
  // خدماتُ كلِّ جمعيةٍ باستعلامٍ واحد، لا استعلامٍ لكلِّ مدير.
  const serviceRows = await prisma.service.findMany({
    where: { name: { not: "" } },
    select: { charityId: true, name: true },
  });
  const byCharity = new Map();
  for (const row of serviceRows) {
    if (!row.name.trim()) continue;
    if (!byCharity.has(row.charityId)) byCharity.set(row.charityId, new Set());
    byCharity.get(row.charityId).add(row.name);
  }

  const admins = await prisma.charityUserCharity.findMany({
    where: { isAdmin: true, isActive: true },
    select: {
      id: true,
      charityId: true,
      charity: { select: { name: true, isInternal: true } },
      user: { select: { name: true, isActive: true } },
      services: { select: { serviceName: true } },
    },
  });

  if (admins.length === 0) {
    console.log("لا مديرَ نظامٍ نشطاً في أيِّ جمعية.");
    return;
  }

  const toAdd = [];
  const toDrop = [];
  const skipped = [];
  const lines = [];

  for (const link of admins) {
    if (!link.user.isActive) {
      skipped.push(`${link.user.name} (${link.charity.name})`);
      continue;
    }
    const want = byCharity.get(link.charityId) ?? new Set();
    const held = new Set(link.services.map((s) => s.serviceName));
    const missing = [...want].filter((name) => !held.has(name)).sort();
    const extra = [...held].filter((name) => !want.has(name)).sort();

    for (const serviceName of missing) toAdd.push({ membershipId: link.id, serviceName });
    for (const serviceName of extra) toDrop.push({ membershipId: link.id, serviceName });

    const mark = link.charity.isInternal ? " [داخلي]" : "";
    lines.push(
      `  ${link.charity.name}${mark} — ${link.user.name}: ` +
        `خدماتُ الجمعية ${want.size}، عنده ${held.size}` +
        (missing.length ? `، يُضاف ${missing.length}` : "") +
        (extra.length ? `، يُنقّى ${extra.length} (${extra.join("، ")})` : "")
    );
  }

  lines.sort();
  for (const line of lines) console.log(line);
  if (skipped.length) console.log(`\nتُخطّي حساباتٍ موقوفة: ${skipped.join("، ")}`);

  console.log(`\nمديرون نشطون: ${admins.length - skipped.length}`);
  console.log(`تفويضاتٌ تُضاف: ${toAdd.length}`);
  console.log(`تفويضاتٌ تُنقّى: ${toDrop.length}`);

  if (!APPLY) {
    console.log("\nتجربةٌ بلا كتابة — أضف --apply للتنفيذ.");
    return;
  }
  if (toAdd.length === 0 && toDrop.length === 0) {
    console.log("\nلا شيءَ يُغيَّر.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (toDrop.length) {
      // صفٌّ صفّاً بمفتاحه المركَّب: شرطٌ عامٌّ على الاسم قد يطال تفويضَ من
      // ليس مديراً في جمعيةٍ أخرى تُقدِّم الخدمةَ فعلاً.
      for (const row of toDrop) {
        await tx.charityMemberService.deleteMany({
          where: { membershipId: row.membershipId, serviceName: row.serviceName },
        });
      }
    }
    if (toAdd.length) {
      await tx.charityMemberService.createMany({ data: toAdd, skipDuplicates: true });
    }
  });
  console.log(`\nأُضيف ${toAdd.length} وتُنقِّي ${toDrop.length}.`);

  // يُقرأ من القاعدة بعد الكتابة لا يُستنتج من عدد الصفوف المُرسلة.
  const after = await prisma.charityUserCharity.findMany({
    where: { isAdmin: true, isActive: true, user: { isActive: true } },
    select: {
      charityId: true,
      charity: { select: { name: true } },
      user: { select: { name: true } },
      services: { select: { serviceName: true } },
    },
  });
  console.log("\nالتحقُّق:");
  let short = 0;
  const report = [];
  for (const link of after) {
    const want = byCharity.get(link.charityId) ?? new Set();
    const held = new Set(link.services.map((s) => s.serviceName));
    const exact = held.size === want.size && [...want].every((n) => held.has(n));
    if (!exact) short++;
    report.push(`  ${exact ? "✓" : "✗"} ${link.charity.name} — ${link.user.name}: ${held.size}/${want.size}`);
  }
  report.sort();
  for (const line of report) console.log(line);
  if (short) process.exitCode = 1;
}

run()
  .catch((error) => {
    console.error("فشل:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
