/**
 * بذر إعدادات الطلبات المالية: أنواعُ الطلب الستّة ونسبةُ ضريبة القيمة المضافة.
 *
 *   node -r dotenv/config scripts/seed-financial-settings.js          # تجريبي
 *   node -r dotenv/config scripts/seed-financial-settings.js --write  # ينفّذ
 *
 * وقابلٌ للإعادة: يُطابق بالاسم فيُحدّث الترتيب ولا يُكرّر، ولا يمسّ نوعاً
 * أضافه المستخدم ولا نسبةً عدّلها.
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const WRITE = process.argv.includes("--write");

const TYPES = [
  "طلب شراء",
  "مدفوعات الموردين والجهات",
  "عهدة نقدية",
  "استرداد مصروفات",
  "طلب صرف",
  "أخرى",
];

const VAT_KEY = "financial_vat_rate";
const VAT_DEFAULT = 15;

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("لا DATABASE_URL في البيئة");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    console.log(`${WRITE ? "تنفيذ" : "تجريبي (بلا كتابة)"} — إعدادات الطلبات المالية\n`);

    let added = 0;
    let updated = 0;
    for (const [index, name] of TYPES.entries()) {
      const existing = await prisma.financialRequestType.findUnique({ where: { name } });
      if (existing) {
        updated++;
        if (WRITE) {
          await prisma.financialRequestType.update({ where: { id: existing.id }, data: { order: index + 1 } });
        }
      } else {
        added++;
        if (WRITE) {
          await prisma.financialRequestType.create({ data: { name, order: index + 1 } });
        }
      }
    }
    console.log(`الأنواع — أُضيف: ${added}   رُتِّب: ${updated}`);

    // النسبة لا تُدهس إن كانت محفوظة: الإعداد قد غُيّر من الواجهة.
    const current = await prisma.globalSetting.findUnique({ where: { key: VAT_KEY } });
    if (current) {
      console.log(`نسبة الضريبة — موجودة: ${JSON.stringify(current.value)} (لا تُمسّ)`);
    } else {
      console.log(`نسبة الضريبة — ستُضبط على ${VAT_DEFAULT}٪`);
      if (WRITE) {
        await prisma.globalSetting.create({ data: { key: VAT_KEY, value: VAT_DEFAULT } });
      }
    }

    const all = await prisma.financialRequestType.findMany({ orderBy: { order: "asc" } });
    console.log(`\nالقائمة (${all.length}): ${all.map((t) => `${t.order}. ${t.name}${t.isActive ? "" : " (معطّل)"}`).join(" · ")}`);

    if (!WRITE) console.log("\nلم يُكتب شيء. أعد التشغيل بـ--write للتنفيذ.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("فشل البذر:", e.message);
  process.exit(1);
});
