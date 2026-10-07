// يُهاجر بيانات أداة "منشئ وثائق المبادرات" بعد إعادة التسمية من "قيود
// المحتوى" (exclusions) إلى "تفضيلات المحتوى" (preferences)، وإزالة قائمة
// "محاور الوثيقة المعيارية" المنفصلة (sections) — صار الهيكل المعياري يُقرأ
// من البرومبت نفسه مباشرة، لا من نسخة ثانية قد تختلف عنه.
//
// يفعل اثنين، كلٌّ منهما IF NEEDED فقط:
//   1. GlobalSetting["PROJECT_BUILDER_OPTIONS"]: { exclusions, sections } → { preferences }
//      (preferences = exclusions بحرفها؛ sections تُحذف من القيمة، لا من أي مكان آخر)
//   2. أحدث ProjectBuilderPromptVersion: يستبدل الرمز الحرفي {{exclusions}}
//      بـ{{preferences}} — بإضافة إصدار جديد، لا بالكتابة فوق القائم، فيبقى
//      كل إصدار سابق كما هو في السجل.
//
// معاينة: node scripts/project-builder-rename-exclusions-to-preferences.js
// تنفيذ:  node scripts/project-builder-rename-exclusions-to-preferences.js --apply
require("dotenv").config({ quiet: true });
const { randomUUID } = require("crypto");
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const optionsRow = await pool.query(`SELECT value FROM "GlobalSetting" WHERE key = 'PROJECT_BUILDER_OPTIONS'`);
  const latestPrompt = await pool.query(
    `SELECT id, template FROM "ProjectBuilderPromptVersion" ORDER BY "createdAt" DESC LIMIT 1`
  );

  const optionsValue = optionsRow.rows[0]?.value;
  const needsOptionsMigration = !!optionsValue && Array.isArray(optionsValue.exclusions) && !Array.isArray(optionsValue.preferences);

  const promptTemplate = latestPrompt.rows[0]?.template || "";
  const needsPromptMigration = promptTemplate.includes("{{exclusions}}");

  console.log("قبل:");
  console.log("  PROJECT_BUILDER_OPTIONS يحتاج هجرة: " + (needsOptionsMigration ? "نعم" : "لا"));
  console.log("  أحدث برومبت يحتاج هجرة: " + (needsPromptMigration ? "نعم" : "لا"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: node scripts/project-builder-rename-exclusions-to-preferences.js --apply");
    await pool.end();
    return;
  }

  if (needsOptionsMigration) {
    const next = { preferences: optionsValue.exclusions };
    await pool.query(`UPDATE "GlobalSetting" SET value = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE key = 'PROJECT_BUILDER_OPTIONS'`, [
      JSON.stringify(next),
    ]);
    console.log(`✓ PROJECT_BUILDER_OPTIONS: نُقلت ${next.preferences.length} تفضيلاً، وحُذفت sections من القيمة`);
  } else {
    console.log("— تخطّي PROJECT_BUILDER_OPTIONS");
  }

  if (needsPromptMigration) {
    const fixed = promptTemplate.split("{{exclusions}}").join("{{preferences}}");
    await pool.query(
      `INSERT INTO "ProjectBuilderPromptVersion" (id, template, "createdByName", note) VALUES ($1, $2, $3, $4)`,
      [randomUUID(), fixed, "ترحيل تلقائي", 'تصحيح تسمية الرمز: {{exclusions}} إلى {{preferences}}']
    );
    console.log("✓ أُضيف إصدار جديد من البرومبت برمز {{preferences}} المصحَّح");
  } else {
    console.log("— تخطّي البرومبت");
  }

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
