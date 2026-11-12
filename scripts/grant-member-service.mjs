/**
 * تفويضُ عضوِ جمعيةٍ بخدمةٍ من خدمات زاد — صفٌّ في `CharityMemberService`.
 *
 * ولمَ سكربتٌ لا شاشة: التفويضُ بيد الجمعية (بوّابتها → موظفو الجمعية)، ولا
 * شاشةَ له عند زاد ولا فعلَ يقبل جلسةَ موظَّف. فإذا طُلب من زادٍ أن تفعله
 * نيابةً، فهذا بابُه — بإذنٍ صريحٍ في كلِّ مرّة، ومكتوبٌ في `AuditLog` باسم من
 * طلبه، كي لا يكون تفويضٌ بلا أثرٍ يُسأل عنه.
 *
 * **ولا يُفوَّض بخدمةٍ لا تُقدَّم للجمعية**: الخدماتُ صفوفٌ في `Service` لكلِّ
 * جمعيةٍ صفوفُها، وتفويضٌ باسمٍ ليس فيها يجعل العضوَ «مفوَّضاً» بما لا وجود
 * له — ويُجيز لزاد أن تُرسل إليه فيه.
 *
 *   node -r dotenv/config scripts/grant-member-service.mjs --phone 05x --service الإعلامية
 *   node -r dotenv/config scripts/grant-member-service.mjs --phone 05x --service الإعلامية --apply
 *
 * وبلا `--apply` لا يُكتب حرف.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1] ?? null;
};

const PHONE = valueOf("--phone");
const SERVICE = valueOf("--service");
const CHARITY = valueOf("--charity"); // اختياريّ: يلزم لحسابٍ في أكثر من جمعية
const BY = valueOf("--by") || "طلبٌ مباشرٌ من مالك الموقع";

if (!PHONE || !SERVICE) {
  console.error("الاستعمال: --phone <الجوال> --service <اسم الخدمة> [--charity <الجمعية>] [--apply]");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function run() {
  const user = await prisma.charityUser.findUnique({
    where: { phone: PHONE },
    select: {
      id: true,
      name: true,
      isActive: true,
      charities: {
        select: {
          id: true,
          isActive: true,
          isAdmin: true,
          charity: { select: { id: true, name: true } },
          services: { select: { serviceName: true } },
        },
      },
    },
  });
  if (!user) throw new Error(`لا حسابَ بالجوال ${PHONE}`);

  const memberships = CHARITY
    ? user.charities.filter((m) => m.charity.name === CHARITY)
    : user.charities;
  if (memberships.length === 0) throw new Error("لا عضويّةَ مطابقة");
  if (memberships.length > 1) {
    throw new Error(
      `الحسابُ في ${memberships.length} جمعيات — حدِّد --charity: ${memberships
        .map((m) => m.charity.name)
        .join("، ")}`
    );
  }

  const link = memberships[0];
  const offered = await prisma.service.findFirst({
    where: { charityId: link.charity.id, name: SERVICE },
    select: { id: true },
  });

  console.log(`الحساب:   ${user.name} (${PHONE}) — ${user.isActive ? "نشط" : "غير نشط"}`);
  console.log(`العضوية:  ${link.charity.name} — ${link.isActive ? "نشطة" : "غير نشطة"}${link.isAdmin ? " · مدير" : ""}`);
  console.log(`المفوَّضة: ${link.services.map((s) => s.serviceName).join("، ") || "(لا شيء)"}`);
  console.log(`المطلوبة: ${SERVICE} — ${offered ? "تُقدَّم لهذه الجمعية" : "**ليست من خدمات هذه الجمعية**"}`);

  if (!offered) throw new Error("لا تُفوَّض خدمةٌ لا تُقدَّم للجمعية");
  if (link.services.some((s) => s.serviceName === SERVICE)) {
    console.log("\nمفوَّضٌ بها أصلاً — لا شيء ليُكتب.");
    return;
  }

  if (!APPLY) {
    console.log(`\n[قراءةٌ فقط] سيُكتب صفٌّ واحد: CharityMemberService(${link.id}, "${SERVICE}") — أعدْ بـ--apply`);
    return;
  }

  await prisma.$transaction([
    prisma.charityMemberService.create({
      data: { membershipId: link.id, serviceName: SERVICE },
    }),
    prisma.auditLog.create({
      data: {
        actorType: "SYSTEM",
        actorName: "سكربت تفويضٍ بطلب زاد",
        action: "PERMISSION_CHANGE",
        targetType: "CharityMemberService",
        targetId: link.id,
        metadata: {
          charity: link.charity.name,
          member: user.name,
          phone: PHONE,
          serviceName: SERVICE,
          reason: BY,
        },
      },
    }),
  ]);

  console.log(`\nتمّ: فُوِّض «${user.name}» بخدمة «${SERVICE}» في «${link.charity.name}»، ومكتوبٌ في سجلّ التدقيق.`);
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
