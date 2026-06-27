import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── TimelineConfig ──────────────────────────────────────────────
  await prisma.timelineConfig.upsert({
    where: { timelineType: "STRATEGY" },
    update: {},
    create: { timelineType: "STRATEGY", displayName: "التخطيط الاستراتيجي" },
  });
  await prisma.timelineConfig.upsert({
    where: { timelineType: "GOVERNANCE" },
    update: {},
    create: { timelineType: "GOVERNANCE", displayName: "الحوكمة" },
  });
  await prisma.timelineConfig.upsert({
    where: { timelineType: "FINANCE" },
    update: {},
    create: { timelineType: "FINANCE", displayName: "تنمية الموارد المالية" },
  });

  // ── مسح البيانات القديمة المخترعة وإعادة الرفع بالبيانات الحقيقية ──
  await prisma.defaultStage.deleteMany({});

  // ── DefaultStage — STRATEGY (4 مراحل حقيقية من قاعدة البيانات) ────
  const strategyStages = [
    { name: "التحليل الاستراتيجي", description: null, order: 1 },
    { name: "بناء التوجه الاستراتيجي", description: null, order: 2 },
    { name: "بناء دليل الاهداف والمؤشرات", description: null, order: 3 },
    { name: "المبادرات والخطة التشغيلية", description: null, order: 4 },
  ];

  for (const stage of strategyStages) {
    await prisma.defaultStage.create({ data: { ...stage, timelineType: "STRATEGY" } });
  }

  // ── DefaultStage — GOVERNANCE (8 مراحل حقيقية من جمعية رواء سقيا الماء) ──
  const governanceStages = [
    { name: "جمع البيانات ودراستها", description: null, order: 1 },
    { name: "لقاء/ملف: إجراءات وممارسات الحوكمة", description: null, order: 2 },
    { name: "إنشاء وتفعيل مجلد مشترك: الحوكمة وشواهدها", description: null, order: 3 },
    { name: "تسليم الجمعية نماذج اللوائح والسياسات والحوكمة", description: null, order: 4 },
    { name: "إعداد تقييم الحوكمة 1 (مراجعة ملفات وشواهد الحوكمة)", description: null, order: 5 },
    { name: "إعداد تقييم الحوكمة 2 (تقييم داخلي)", description: null, order: 6 },
    { name: "إعداد تقييم الحوكمة 3 (توفير وإعداد وتصحيح المستندات)", description: null, order: 7 },
    { name: "رفع تقييم الحوكمة", description: null, order: 8 },
  ];

  for (const stage of governanceStages) {
    await prisma.defaultStage.create({ data: { ...stage, timelineType: "GOVERNANCE" } });
  }

  // ── DefaultStage — FINANCE (8 مراحل حقيقية من جمعية رواء سقيا الماء) ──
  const financeStages = [
    { name: "تواصل تنسيقي", description: null, order: 1 },
    { name: "جمع البيانات ودراستها", description: null, order: 2 },
    { name: "الإعداد الأولي", description: null, order: 3 },
    { name: "فتح وتحديث حسابات المنح الحكومية", description: null, order: 4 },
    { name: "إعداد ملف مشروع التأسيس", description: null, order: 5 },
    { name: "اعتماد ملف التأسيس من الجمعية", description: null, order: 6 },
    { name: "إنشاء وتحديث ومتابعة الحسابات في الجهات المانحة", description: null, order: 7 },
    { name: "رفع منح التأسيس", description: null, order: 8 },
  ];

  for (const stage of financeStages) {
    await prisma.defaultStage.create({ data: { ...stage, timelineType: "FINANCE" } });
  }

  console.log("✅ تم رفع البيانات الافتراضية الحقيقية بنجاح");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
