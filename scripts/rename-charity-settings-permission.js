/**
 * يُهاجر manage_charity_settings ← manage_services.
 *
 * الوسم كان يقول «إعدادات تبويبات الجمعيات»، والمُعرّف يحرس في الحقيقة خمسة
 * عشر إجراءً لإدارة الخدمات والمراحل، وبطاقة «إدارة الخدمات» في لوحة التحكم.
 * فالصفحة التي كانت تحمل ذلك الوسم حُذفت، والقدرة بقيت باسمها الصحيح.
 *
 * ── لماذا يُضاف الجديد ويبقى القديم ──────────────────────────────────────────
 *
 * ليصحّ التشغيل قبل النشر وبعده على السواء:
 *   • الشيفرة المنشورة الآن تفحص manage_charity_settings — وهو باقٍ، فلا أحد
 *     يفقد شيئاً في اللحظة بين التشغيل والنشر.
 *   • الشيفرة الجديدة تفحص manage_services — وهو مُضاف، فلا أحد ينتظر.
 *
 * وهذا عكس ترتيب الـDDL: هناك الإضافة قبل النشر والحذف بعده. وهنا كذلك —
 * الحذف (نزع المُعرّف القديم) فعلٌ لاحق، ويجري من تلقائه: sanitizePermissions
 * ينزعه عند أول حفظٍ لصلاحيات الموظف بعد النشر، لأنه صار في قائمة المتقاعدين.
 *
 * يعيد التشغيل بلا تغيير: array_append لا يُنفَّذ إلا على من لا يملك الجديد.
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

const OLD = "manage_charity_settings";
const NEW = "manage_services";

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    const before = await pool.query(
      `SELECT name, role FROM "Employee"
        WHERE $1 = ANY(permissions) AND NOT ($2 = ANY(permissions))
        ORDER BY name`,
      [OLD, NEW]
    );
    console.log("");
    console.log("من سيُضاف له manage_services:");
    if (!before.rows.length) console.log("  (لا أحد — الهجرة جرت من قبل)");
    for (const r of before.rows) console.log(`  · ${r.name} [${r.role}]`);

    await pool.query("BEGIN");

    const emp = await pool.query(
      `UPDATE "Employee" SET permissions = array_append(permissions, $2)
        WHERE $1 = ANY(permissions) AND NOT ($2 = ANY(permissions))`,
      [OLD, NEW]
    );

    // المسميات كذلك: قالبها يُنسخ إلى الموظف بالمزامنة، فلو بقي على المُعرّف
    // القديم لأعادت المزامنة منحَ معرّفٍ متقاعد لا يفحصه الكود الجديد.
    const roles = await pool.query(
      `UPDATE "RoleDefinition" SET permissions = array_append(permissions, $2)
        WHERE $1 = ANY(permissions) AND NOT ($2 = ANY(permissions))`,
      [OLD, NEW]
    );

    // والمجموعات، إن كانت إحداها تحمل المُعرّف القديم.
    const bundles = await pool.query(
      `UPDATE "PermissionBundle" SET permissions = array_append(permissions, $2)
        WHERE $1 = ANY(permissions) AND NOT ($2 = ANY(permissions))`,
      [OLD, NEW]
    );

    await pool.query("COMMIT");

    console.log("");
    console.log(`✓ موظفون: ${emp.rowCount} · مسمّيات: ${roles.rowCount} · مجموعات: ${bundles.rowCount}`);

    const after = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM "Employee" WHERE $1 = ANY(permissions)) AS old_emp,
         (SELECT COUNT(*)::int FROM "Employee" WHERE $2 = ANY(permissions)) AS new_emp,
         (SELECT COUNT(*)::int FROM "Employee"
           WHERE $1 = ANY(permissions) AND NOT ($2 = ANY(permissions))) AS stragglers`,
      [OLD, NEW]
    );
    const a = after.rows[0];
    console.log(
      `  حاملو القديم: ${a.old_emp} · حاملو الجديد: ${a.new_emp} · من بقي بلا الجديد: ${a.stragglers}`
    );
    if (a.stragglers !== 0) {
      console.error("✗ بقي من يحمل القديم بلا الجديد — لا تنشر قبل فحص السبب");
      process.exitCode = 1;
    } else {
      console.log("  (القديم يُنزَع من تلقائه عند أول حفظٍ بعد النشر — صار متقاعداً)");
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
