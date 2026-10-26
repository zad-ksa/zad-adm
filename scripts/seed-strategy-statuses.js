/**
 * بذر قائمة حالات الخطة الاستراتيجية التي يُختار منها في صفحة الجمعية.
 *
 * قائمةٌ أولى لا نهائية: الجدول يُدار من الواجهة، فإضافة حالةٍ أو تغيير اسمها
 * أو نبرتها بيانات لا نشرة. والسكربت قابلٌ للإعادة: يُطابق بالاسم فيُحدّث
 * الترتيب والنبرة ولا يُكرّر صفاً، ولا يمسّ ما أضافه المستخدم.
 *
 *   node scripts/seed-strategy-statuses.js
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const STATUSES = [
  { name: "لم تبدأ", tone: "muted" },
  { name: "جمع البيانات والتحليل", tone: "warn" },
  { name: "بناء التوجه الاستراتيجي", tone: "warn" },
  { name: "إعداد الأهداف والمؤشرات", tone: "warn" },
  { name: "إعداد الخطة التشغيلية", tone: "warn" },
  { name: "قيد التنفيذ والمتابعة", tone: "good" },
  { name: "مكتملة", tone: "good" },
  { name: "متوقّفة", tone: "danger" },
];

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("لا DATABASE_URL في البيئة");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    let added = 0;
    let updated = 0;
    for (const [index, status] of STATUSES.entries()) {
      const existing = await prisma.strategyStatusOption.findUnique({ where: { name: status.name } });
      await prisma.strategyStatusOption.upsert({
        where: { name: status.name },
        create: { name: status.name, tone: status.tone, order: index + 1 },
        update: { tone: status.tone, order: index + 1 },
      });
      if (existing) updated++;
      else added++;
    }

    const total = await prisma.strategyStatusOption.count();
    console.log(`أُضيف: ${added}   حُدِّث: ${updated}   الإجمالي في الجدول: ${total}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("فشل البذر:", e.message);
  process.exit(1);
});
