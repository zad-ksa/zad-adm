// عمود «اقتراح موعد آخر» وجدوله — إضافةٌ إلى قاعدة الإنتاج.
//
// الكود المنشور على main يقرأ MeetingSchedule.allowAlternativeRequest ويكتب في
// MeetingAlternativeRequest، وكلاهما غير موجود في قاعدة البيانات: النشر يشغّل
// `prisma generate` فقط ولا يُهاجر شيئاً. فكل استعلامٍ على جدول المواعيد يفشل،
// وصفحات الحجز العامة تردّ «غير متوفر» لأن الخطأ يُلتقط فتُعامَل كأنها غير موجودة.
//
// كل جملةٍ هنا إضافية ومكرَّرة الاحتمال (IF NOT EXISTS)، فلا تمسّ صفاً قائماً
// ولا تضرّ إن أُعيد تشغيلها.
//
// معاينة: node scripts/meeting-alternative-request-ddl.js
// تنفيذ:  node scripts/meeting-alternative-request-ddl.js --apply
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STATEMENTS = [
  [
    "عمود allowAlternativeRequest في MeetingSchedule",
    `ALTER TABLE "MeetingSchedule"
       ADD COLUMN IF NOT EXISTS "allowAlternativeRequest" BOOLEAN NOT NULL DEFAULT false`,
  ],
  [
    "جدول MeetingAlternativeRequest",
    `CREATE TABLE IF NOT EXISTS "MeetingAlternativeRequest" (
       "id"           TEXT PRIMARY KEY,
       "scheduleId"   TEXT NOT NULL,
       "charityName"  TEXT NOT NULL,
       "message"      TEXT NOT NULL,
       "contactPhone" TEXT,
       "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  ],
  [
    "فهرس scheduleId",
    `CREATE INDEX IF NOT EXISTS "MeetingAlternativeRequest_scheduleId_idx"
       ON "MeetingAlternativeRequest"("scheduleId")`,
  ],
  [
    "مفتاح أجنبي إلى MeetingSchedule (حذف الجدول يحذف اقتراحاته)",
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'MeetingAlternativeRequest_scheduleId_fkey'
       ) THEN
         ALTER TABLE "MeetingAlternativeRequest"
           ADD CONSTRAINT "MeetingAlternativeRequest_scheduleId_fkey"
           FOREIGN KEY ("scheduleId") REFERENCES "MeetingSchedule"("id")
           ON DELETE CASCADE ON UPDATE CASCADE;
       END IF;
     END $$`,
  ],
];

async function state() {
  const column = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'MeetingSchedule'
        AND column_name = 'allowAlternativeRequest'`
  );
  const table = await pool.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'MeetingAlternativeRequest'`
  );
  return { column: column.rowCount > 0, table: table.rowCount > 0 };
}

(async () => {
  const before = await state();
  console.log("قبل:");
  console.log("  allowAlternativeRequest: " + (before.column ? "موجود" : "مفقود"));
  console.log("  MeetingAlternativeRequest: " + (before.table ? "موجود" : "مفقود"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. الجمل التي ستُنفَّذ:");
    for (const [label] of STATEMENTS) console.log("  • " + label);
    console.log("\nللتنفيذ: node scripts/meeting-alternative-request-ddl.js --apply");
    await pool.end();
    return;
  }

  for (const [label, sql] of STATEMENTS) {
    await pool.query(sql);
    console.log("✓ " + label);
  }

  const after = await state();
  console.log("\nبعد:");
  console.log("  allowAlternativeRequest: " + (after.column ? "موجود" : "مفقود"));
  console.log("  MeetingAlternativeRequest: " + (after.table ? "موجود" : "مفقود"));

  const schedules = await pool.query('SELECT count(*)::int AS c FROM "MeetingSchedule"');
  const bookings = await pool.query('SELECT count(*)::int AS c FROM "MeetingBooking"');
  console.log(
    `\nالبيانات كما هي: ${schedules.rows[0].c} جدول موعد، ${bookings.rows[0].c} حجزاً.`
  );

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
