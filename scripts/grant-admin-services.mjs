/**
 * تفويضُ مديري أنظمة الجمعيات بكلِّ الخدمات في جمعياتهم.
 *
 * و`isAdmin` على العضويّة لا يمنح خدمةً ضمناً: `charityServiceTeam` تقرأ صفوف
 * `CharityMemberService` حرفاً، فمديرٌ بلا صفوفٍ لا يستلم بريد خدمةٍ واحدة.
 * وهذا السكربت يُنشئ الصفوفَ الناقصة.
 *
 * **ولا يحذف شيئاً**: يُضيف الناقصَ وحدَه، فتشغيلُه مرّتين كتشغيلِه مرّة.
 * والتفويضُ الزائدُ عن المديرين لا يُلمَس.
 *
 * ووصلةٌ واحدةٌ عبر `DIRECT_URL`: الموزِّعُ في وضع الجلسة، فكلُّ وصلةٍ تُحتجز.
 *
 *   node -r dotenv/config --experimental-strip-types scripts/grant-admin-services.mjs
 *   node -r dotenv/config --experimental-strip-types scripts/grant-admin-services.mjs --apply
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
  const services = (
    await prisma.service.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } })
  )
    .map((r) => r.name)
    .filter((n) => n.trim() !== "");

  if (services.length === 0) {
    console.log("لا خدماتَ مسجَّلةٌ في الموقع — لا شيءَ يُفوَّض.");
    return;
  }
  console.log(`الخدمات (${services.length}): ${services.join("، ")}\n`);

  // النشطةُ وحدَها: عضويّةٌ أُوقفت لا تستلم بريداً، فتفويضُها ضجيجٌ في الجدول.
  const admins = await prisma.charityUserCharity.findMany({
    where: { isAdmin: true, isActive: true },
    select: {
      id: true,
      charity: { select: { name: true, isInternal: true } },
      user: { select: { name: true, isActive: true } },
      services: { select: { serviceName: true } },
    },
    orderBy: { charityId: "asc" },
  });

  if (admins.length === 0) {
    console.log("لا مديرَ نظامٍ نشطاً في أيِّ جمعية.");
    return;
  }

  const rows = [];
  let already = 0;
  const skippedInactiveAccounts = [];

  for (const link of admins) {
    // حسابٌ موقوفٌ على مستوى الحساب كلِّه لا يُفوَّض: لا يدخل أصلاً.
    if (!link.user.isActive) {
      skippedInactiveAccounts.push(`${link.user.name} (${link.charity.name})`);
      continue;
    }
    const held = new Set(link.services.map((s) => s.serviceName));
    const missing = services.filter((name) => !held.has(name));
    already += held.size;
    for (const serviceName of missing) rows.push({ membershipId: link.id, serviceName });
    const mark = link.charity.isInternal ? " [داخلي]" : "";
    console.log(
      `  ${link.charity.name}${mark} — ${link.user.name}: عنده ${held.size}، يُضاف ${missing.length}`
    );
  }

  if (skippedInactiveAccounts.length) {
    console.log(`\nتُخطّي حساباتٍ موقوفة: ${skippedInactiveAccounts.join("، ")}`);
  }

  console.log(`\nمديرون نشطون: ${admins.length - skippedInactiveAccounts.length}`);
  console.log(`تفويضاتٌ قائمة: ${already}`);
  console.log(`تفويضاتٌ تُضاف: ${rows.length}`);

  if (!APPLY) {
    console.log("\nتجربةٌ بلا كتابة — أضف --apply للتنفيذ.");
    return;
  }
  if (rows.length === 0) {
    console.log("\nلا شيءَ يُضاف.");
    return;
  }

  // skipDuplicates حرزٌ ثانٍ: المفتاحُ الأوّليُّ (membershipId, serviceName) يمنع
  // التكرار أصلاً، لكنّ تشغيلين متوازيين يسقط أحدهما بلا هذا.
  const result = await prisma.charityMemberService.createMany({ data: rows, skipDuplicates: true });
  console.log(`\nأُضيف ${result.count} تفويضاً.`);

  // يُقرأ من القاعدة بعد الكتابة لا يُستنتج: العدُّ من الصفوف المُرسلة يقول ما
  // أردناه، والقراءةُ تقول ما صار.
  const verify = await prisma.charityUserCharity.findMany({
    where: { isAdmin: true, isActive: true, user: { isActive: true } },
    select: { charity: { select: { name: true } }, user: { select: { name: true } }, _count: { select: { services: true } } },
  });
  console.log("\nالتحقُّق:");
  let short = 0;
  for (const link of verify) {
    const ok = link._count.services >= services.length;
    if (!ok) short++;
    console.log(`  ${ok ? "✓" : "✗"} ${link.charity.name} — ${link.user.name}: ${link._count.services}/${services.length}`);
  }
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
