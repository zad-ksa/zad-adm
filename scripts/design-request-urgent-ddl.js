// عمودا isUrgent وurgentReason في DesignRequest — إضافةٌ إلى قاعدة الإنتاج
// لميزة "طلب تصميم عاجل".
//
// الكود المنشور على main يقرأ ويكتب في هذين العمودين، وهما غير موجودين في
// قاعدة البيانات: النشر يشغّل `prisma generate` فقط ولا يُهاجر شيئاً.
//
// كل جملةٍ هنا إضافية ومكرَّرة الاحتمال (IF NOT EXISTS)، فلا تمسّ صفاً قائماً
// ولا تضرّ إن أُعيد تشغيلها.
//
// معاينة: node scripts/design-request-urgent-ddl.js
// تنفيذ:  node scripts/design-request-urgent-ddl.js --apply
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STATEMENTS = [
  [
    "عمود isUrgent في DesignRequest",
    `ALTER TABLE "DesignRequest" ADD COLUMN IF NOT EXISTS "isUrgent" BOOLEAN NOT NULL DEFAULT false`,
  ],
  [
    "عمود urgentReason في DesignRequest",
    `ALTER TABLE "DesignRequest" ADD COLUMN IF NOT EXISTS "urgentReason" TEXT`,
  ],
];

async function state() {
  const cols = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'DesignRequest'
        AND column_name IN ('isUrgent', 'urgentReason')`
  );
  const names = cols.rows.map((r) => r.column_name);
  return { isUrgent: names.includes("isUrgent"), urgentReason: names.includes("urgentReason") };
}

(async () => {
  const before = await state();
  console.log("قبل:");
  console.log("  isUrgent: " + (before.isUrgent ? "موجود" : "مفقود"));
  console.log("  urgentReason: " + (before.urgentReason ? "موجود" : "مفقود"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. الجمل التي ستُنفَّذ:");
    for (const [label] of STATEMENTS) console.log("  • " + label);
    console.log("\nللتنفيذ: node scripts/design-request-urgent-ddl.js --apply");
    await pool.end();
    return;
  }

  for (const [label, sql] of STATEMENTS) {
    await pool.query(sql);
    console.log("✓ " + label);
  }

  const after = await state();
  console.log("\nبعد:");
  console.log("  isUrgent: " + (after.isUrgent ? "موجود" : "مفقود"));
  console.log("  urgentReason: " + (after.urgentReason ? "موجود" : "مفقود"));

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
