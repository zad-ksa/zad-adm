// نزع «الاعتمادات» (manage_requests) من كل موظف ومسمى ومجموعة.
//
// صار رفع الطلب ومتابعته لكل موظف بلا صلاحية. والاعتماد ومتابعة الجميع
// يبقيان بـmanage_requests وreview_all_requests.
//
// معاينة: node scripts/strip-manage-tasks.js
// تنفيذ:  node scripts/strip-manage-tasks.js --apply
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ID = "manage_requests";
const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const q = async (s) => (await pool.query(s)).rows;
  const employees = await q(`select id, name, permissions from "Employee" where '${ID}' = any(permissions)`);
  const roles = await q(`select id, key, permissions from "RoleDefinition" where '${ID}' = any(permissions)`);
  const bundles = await q(`select id, name, permissions from "PermissionBundle" where '${ID}' = any(permissions)`);

  console.log("الموظفون (" + employees.length + "): " + (employees.map((e) => e.name).join("، ") || "لا أحد"));
  console.log("المسميات (" + roles.length + "): " + (roles.map((r) => r.key).join("، ") || "لا شيء"));
  console.log("المجموعات (" + bundles.length + "): " + (bundles.map((b) => b.name).join("، ") || "لا شيء"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: --apply");
    await pool.end();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(__dirname, "backup-manage-requests-" + stamp + ".json");
  fs.writeFileSync(file, JSON.stringify({ employees, roles, bundles }, null, 2));
  console.log("\nنسخة الحالة: " + file);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`update "Employee" set permissions = array_remove(permissions, '${ID}') where '${ID}' = any(permissions)`);
    await client.query(`update "RoleDefinition" set permissions = array_remove(permissions, '${ID}') where '${ID}' = any(permissions)`);
    await client.query(`update "PermissionBundle" set permissions = array_remove(permissions, '${ID}') where '${ID}' = any(permissions)`);
    const left = await client.query(`select count(*) from "Employee" where '${ID}' = any(permissions)`);
    if (Number(left.rows[0].count) !== 0) throw new Error("بقيت صفوف تحمل المُعرّف");
    await client.query("COMMIT");
    console.log("✓ نُزعت من " + employees.length + " موظفاً و" + roles.length + " مسمى و" + bundles.length + " مجموعة");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
