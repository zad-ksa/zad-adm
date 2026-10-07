// يضيف رمز {{additionalInfo}} (عدد المستفيدين، مدة البرنامج، الفئة
// المستهدفة — الحقول الاختيارية الثلاثة) إلى البرومبت المعتمد، مباشرة بعد
// {{programIdea}} وقبل {{preferences}}. يُضيف إصداراً جديداً إلى السجل، لا
// يكتب فوق القائم.
//
// معاينة: node scripts/project-builder-add-additional-info-token.js
// تنفيذ:  node scripts/project-builder-add-additional-info-token.js --apply
require("dotenv").config({ quiet: true });
const { randomUUID } = require("crypto");
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ANCHOR = "{{programIdea}}\n\n{{preferences}}";
const REPLACEMENT = "{{programIdea}}\n\n{{additionalInfo}}\n\n{{preferences}}";

(async () => {
  const latest = await pool.query(`SELECT id, template FROM "ProjectBuilderPromptVersion" ORDER BY "createdAt" DESC LIMIT 1`);
  const row = latest.rows[0];

  if (!row) {
    console.log("لا يوجد برومبت محفوظ بعد — لا شيء لفعله.");
    await pool.end();
    return;
  }

  const alreadyHasToken = row.template.includes("{{additionalInfo}}");
  const hasAnchor = row.template.includes(ANCHOR);

  console.log("قبل:");
  console.log("  يحتوي {{additionalInfo}} أصلاً: " + (alreadyHasToken ? "نعم" : "لا"));
  console.log("  موضع الإدراج المتوقَّع موجود: " + (hasAnchor ? "نعم" : "لا"));

  if (alreadyHasToken) {
    console.log("\nلا شيء لفعله.");
    await pool.end();
    return;
  }
  if (!hasAnchor) {
    console.log(
      "\nتعذّر إيجاد الموضع المتوقَّع (ربما عُدِّل البرومبت يدوياً) — أضِف {{additionalInfo}} يدوياً من محرّر الإعدادات."
    );
    await pool.end();
    return;
  }

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: node scripts/project-builder-add-additional-info-token.js --apply");
    await pool.end();
    return;
  }

  const fixed = row.template.split(ANCHOR).join(REPLACEMENT);
  await pool.query(
    `INSERT INTO "ProjectBuilderPromptVersion" (id, template, "createdByName", note) VALUES ($1, $2, $3, $4)`,
    [randomUUID(), fixed, "ترحيل تلقائي", "إضافة رمز {{additionalInfo}} (عدد المستفيدين/المدة/الفئة المستهدفة)"]
  );
  console.log("✓ أُضيف إصدار جديد من البرومبت يتضمّن {{additionalInfo}}");

  await pool.end();
})().catch(async (e) => {
  console.error("فشل:", e.message);
  await pool.end();
  process.exit(1);
});
