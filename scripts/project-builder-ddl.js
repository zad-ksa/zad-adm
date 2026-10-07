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
  [
    "جدول ProjectBuilderPromptVersion",
    `CREATE TABLE IF NOT EXISTS "ProjectBuilderPromptVersion" (
       "id"            TEXT PRIMARY KEY,
       "template"      TEXT NOT NULL,
       "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "createdById"   TEXT,
       "createdByName" TEXT,
       "note"          TEXT
     )`,
  ],
  [
    "فهرس createdAt على ProjectBuilderPromptVersion",
    `CREATE INDEX IF NOT EXISTS "ProjectBuilderPromptVersion_createdAt_idx"
       ON "ProjectBuilderPromptVersion"("createdAt")`,
  ],
  [
    "جدول ProjectBuilderDocument",
    `CREATE TABLE IF NOT EXISTS "ProjectBuilderDocument" (
       "id"         TEXT PRIMARY KEY,
       "employeeId" TEXT NOT NULL,
       "charityId"  TEXT NOT NULL,
       "title"      TEXT NOT NULL,
       "content"    TEXT NOT NULL,
       "history"    JSONB,
       "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  ],
  [
    "مفتاح أجنبي إلى Employee (حذف الموظف يحذف سجلّه)",
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'ProjectBuilderDocument_employeeId_fkey'
       ) THEN
         ALTER TABLE "ProjectBuilderDocument"
           ADD CONSTRAINT "ProjectBuilderDocument_employeeId_fkey"
           FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
           ON DELETE CASCADE ON UPDATE CASCADE;
       END IF;
     END $$`,
  ],
  [
    "مفتاح أجنبي إلى Charity (حذف الجمعية يحذف الوثائق المحفوظة لها)",
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'ProjectBuilderDocument_charityId_fkey'
       ) THEN
         ALTER TABLE "ProjectBuilderDocument"
           ADD CONSTRAINT "ProjectBuilderDocument_charityId_fkey"
           FOREIGN KEY ("charityId") REFERENCES "Charity"("id")
           ON DELETE CASCADE ON UPDATE CASCADE;
       END IF;
     END $$`,
  ],
  [
    "فهرس employeeId على ProjectBuilderDocument",
    `CREATE INDEX IF NOT EXISTS "ProjectBuilderDocument_employeeId_idx"
       ON "ProjectBuilderDocument"("employeeId")`,
  ],
  [
    "فهرس charityId على ProjectBuilderDocument",
    `CREATE INDEX IF NOT EXISTS "ProjectBuilderDocument_charityId_idx"
       ON "ProjectBuilderDocument"("charityId")`,
  ],
];

async function state() {
  const table = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ProjectBuilderCharityProfile'`
  );
  const versions = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ProjectBuilderPromptVersion'`
  );
  const documents = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ProjectBuilderDocument'`
  );
  return { table: table.rowCount > 0, versions: versions.rowCount > 0, documents: documents.rowCount > 0 };
}

(async () => {
  const before = await state();
  console.log("قبل:");
  console.log("  ProjectBuilderCharityProfile: " + (before.table ? "موجود" : "مفقود"));
  console.log("  ProjectBuilderPromptVersion: " + (before.versions ? "موجود" : "مفقود"));
  console.log("  ProjectBuilderDocument: " + (before.documents ? "موجود" : "مفقود"));

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
  console.log("  ProjectBuilderPromptVersion: " + (after.versions ? "موجود" : "مفقود"));
  console.log("  ProjectBuilderDocument: " + (after.documents ? "موجود" : "مفقود"));

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
