// جدول ProjectBuilderCharityProfile — إضافةٌ إلى قاعدة الإنتاج لأداة "منشئ
// وثائق المبادرات".
//
// الكود المنشور على main يقرأ ويكتب في هذا الجدول، وهو غير موجود في قاعدة
// البيانات: النشر يشغّل `prisma generate` فقط ولا يُهاجر شيئاً.
//
// كل جملةٍ هنا إضافية ومكرَّرة الاحتمال (IF NOT EXISTS)، فلا تمسّ صفاً قائماً
// ولا تضرّ إن أُعيد تشغيلها.
//
// معاينة: node scripts/project-builder-ddl.js
// تنفيذ:  node scripts/project-builder-ddl.js --apply
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STATEMENTS = [
  [
    "جدول ProjectBuilderCharityProfile",
    `CREATE TABLE IF NOT EXISTS "ProjectBuilderCharityProfile" (
       "id"             TEXT PRIMARY KEY,
       "charityId"      TEXT NOT NULL UNIQUE,
       "vision"         TEXT,
       "mission"        TEXT,
       "strategicGoals" TEXT,
       "field"          TEXT,
       "city"           TEXT,
       "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedById"    TEXT
     )`,
  ],
  [
    "مفتاح أجنبي إلى Charity (حذف الجمعية يحذف ملفّها هنا)",
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'ProjectBuilderCharityProfile_charityId_fkey'
       ) THEN
         ALTER TABLE "ProjectBuilderCharityProfile"
           ADD CONSTRAINT "ProjectBuilderCharityProfile_charityId_fkey"
           FOREIGN KEY ("charityId") REFERENCES "Charity"("id")
           ON DELETE CASCADE ON UPDATE CASCADE;
       END IF;
     END $$`,
  ],
];

async function state() {
  const table = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ProjectBuilderCharityProfile'`
  );
  return { table: table.rowCount > 0 };
}

(async () => {
  const before = await state();
  console.log("قبل:");
  console.log("  ProjectBuilderCharityProfile: " + (before.table ? "موجود" : "مفقود"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. الجمل التي ستُنفَّذ:");
    for (const [label] of STATEMENTS) console.log("  • " + label);
    console.log("\nللتنفيذ: node scripts/project-builder-ddl.js --apply");
    await pool.end();
    return;
  }

  for (const [label, sql] of STATEMENTS) {
    await pool.query(sql);
    console.log("✓ " + label);
  }

  const after = await state();
  console.log("\nبعد:");
  console.log("  ProjectBuilderCharityProfile: " + (after.table ? "موجود" : "مفقود"));

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
