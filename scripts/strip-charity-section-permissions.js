// نزع صلاحيات أقسام الجمعية من كل موظف ومسمى ومجموعة.
//
// الثلاث الباقيات (manage_strategy وmanage_governance وmanage_finance) لم تعد
// تُمنح بيد أحد: تُربط بخدمةٍ في صفحة «الصلاحيات» فينالها من مُنح تلك الخدمة.
// وmanage_programs متقاعدة بالكامل: لم تكن تُفحص في موضعٍ واحد، وصفحتها حُذفت.
//
// معاينة:  node scripts/strip-charity-section-permissions.js
// تنفيذ:   node scripts/strip-charity-section-permissions.js --apply
// تراجع:   node scripts/strip-charity-section-permissions.js --restore <ملف النسخة>
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const IDS = ["manage_strategy", "manage_governance", "manage_finance", "manage_programs"];
const APPLY = process.argv.includes("--apply");
const RESTORE = process.argv.indexOf("--restore");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  if (RESTORE > -1) {
    const file = process.argv[RESTORE + 1];
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const row of backup.employees) {
      await pool.query(`update "Employee" set permissions = $2 where id = $1`, [row.id, row.permissions]);
    }
    for (const row of backup.roles) {
      await pool.query(`update "RoleDefinition" set permissions = $2 where id = $1`, [row.id, row.permissions]);
    }
    for (const row of backup.bundles) {
      await pool.query(`update "PermissionBundle" set permissions = $2 where id = $1`, [row.id, row.permissions]);
    }
    console.log("أُعيدت الحالة من " + file);
    await pool.end();
    return;
  }

  const q = async (s, p) => (await pool.query(s, p)).rows;
  const employees = await q(`select id, name, permissions from "Employee" where permissions && $1`, [IDS]);
  const roles = await q(`select id, key, permissions from "RoleDefinition" where permissions && $1`, [IDS]);
  const bundles = await q(`select id, name, permissions from "PermissionBundle" where permissions && $1`, [IDS]);

  const strip = (arr) => arr.filter((p) => !IDS.includes(p));
  console.log("الموظفون المتأثرون (" + employees.length + "):");
  for (const e of employees) {
    console.log("  " + e.name + ": يُنزع " + e.permissions.filter((p) => IDS.includes(p)).join("، "));
  }
  console.log("المسميات (" + roles.length + "): " + roles.map((r) => r.key).join("، "));
  console.log("المجموعات (" + bundles.length + "): " + (bundles.map((b) => b.name).join("، ") || "لا شيء"));

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: --apply");
    await pool.end();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(__dirname, "backup-charity-perms-" + stamp + ".json");
  fs.writeFileSync(file, JSON.stringify({ employees, roles, bundles }, null, 2));
  console.log("\nنسخة الحالة قبل النزع: " + file);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const e of employees) {
      await client.query(`update "Employee" set permissions = $2 where id = $1`, [e.id, strip(e.permissions)]);
    }
    for (const r of roles) {
      await client.query(`update "RoleDefinition" set permissions = $2 where id = $1`, [r.id, strip(r.permissions)]);
    }
    for (const b of bundles) {
      await client.query(`update "PermissionBundle" set permissions = $2 where id = $1`, [b.id, strip(b.permissions)]);
    }
    const left = await client.query(`select count(*) from "Employee" where permissions && $1`, [IDS]);
    if (Number(left.rows[0].count) !== 0) throw new Error("بقيت صفوف تحمل المُعرّفات");
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
