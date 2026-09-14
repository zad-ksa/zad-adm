/**
 * ينزع المُعرّفات المتقاعدة من المصفوفات المخزّنة.
 *
 * ── لا تُشغّله قبل النشر ─────────────────────────────────────────────────────
 *
 * الشيفرة المنشورة الآن لا تزال تفحص المُعرّفات القديمة، فنزعُها قبل أن تُنشر
 * الشيفرة الجديدة يسلب أصحابها في اللحظة:
 *
 *   • manage_charity_settings — خمسة أشخاص يفقدون إدارة الخدمات (الجديدة
 *     manage_services مُضافة لهم، لكن الشيفرة المنشورة لا تعرفها بعد).
 *   • view_all_charities — واحد يصير مقيَّداً بجمعياته المسنَدة.
 *   • view_services_overview — أربعة يفقدون تبويب الخدمات حتى يُمنحوا خدمة.
 *
 * وبعد النشر لا يسلب أحداً شيئاً: الشيفرة الجديدة لا تقرأ أيّاً منها — إلا
 * view_services_overview التي تُستنتج من منح الخدمات فلا تُقرأ من المصفوفة
 * أصلاً.
 *
 * وهو تنظيفٌ لا ضرورة: updateEmployee يُنقّي عند كل حفظ، فالمصفوفات تُنظّف من
 * تلقائها تدريجياً. فائدة التشغيل أن لا يبقى أثرٌ مخزّنٌ يظنّه قارئٌ لاحقاً منحاً.
 *
 * --apply للتنفيذ. بدونها يعرض ما سيفعل ولا يكتب شيئاً.
 */
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const m = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!m) throw new Error("DATABASE_URL not found");
  return m[1];
}

/** نفس RETIRED_PERMISSION_IDS في src/lib/permissions.ts. */
const RETIRED = [
  "edit_contracts",
  "manage_hr",
  "view_services_overview",
  "view_all_charities",
  "manage_charity_settings",
];

const APPLY = process.argv.includes("--apply");

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    console.log("");
    console.log(APPLY ? "التنفيذ:" : "معاينة (بلا كتابة) — أضف --apply للتنفيذ:");
    console.log("");

    for (const id of RETIRED) {
      const rows = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM "Employee" WHERE $1 = ANY(permissions)) AS emp,
           (SELECT COUNT(*)::int FROM "RoleDefinition" WHERE $1 = ANY(permissions)) AS roles,
           (SELECT COUNT(*)::int FROM "PermissionBundle" WHERE $1 = ANY(permissions)) AS bundles`,
        [id]
      );
      const r = rows.rows[0];
      const total = r.emp + r.roles + r.bundles;
      console.log(
        `  ${id.padEnd(26)} موظفون: ${String(r.emp).padStart(2)} · مسمّيات: ${r.roles} · مجموعات: ${r.bundles}`
      );
      if (!APPLY || !total) continue;

      await pool.query("BEGIN");
      await pool.query(
        `UPDATE "Employee" SET permissions = array_remove(permissions, $1) WHERE $1 = ANY(permissions)`,
        [id]
      );
      await pool.query(
        `UPDATE "RoleDefinition" SET permissions = array_remove(permissions, $1) WHERE $1 = ANY(permissions)`,
        [id]
      );
      await pool.query(
        `UPDATE "PermissionBundle" SET permissions = array_remove(permissions, $1) WHERE $1 = ANY(permissions)`,
        [id]
      );
      await pool.query("COMMIT");
      console.log(`      ✓ نُزع من ${total} صفّاً`);
    }

    if (!APPLY) {
      console.log("");
      console.log("لم يُكتب شيء.");
    }
  } catch (e) {
    await pool.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
