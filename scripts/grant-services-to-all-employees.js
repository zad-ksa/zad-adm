// منح كل موظفي زاد النشطين كل الخدمات — ليُترك التقليص للمدير لاحقاً من
// «إدارة الموظفين» أو «إدارة الخدمات».
//
// معاينة: node scripts/grant-services-to-all-employees.js
// تنفيذ:  node scripts/grant-services-to-all-employees.js --apply
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const APPLY = process.argv.includes("--apply");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const q = async (s) => (await pool.query(s)).rows;
  const employees = await q(`select id, name from "Employee" where "isActive" order by name`);
  const services = (await q(`select distinct name from "Service" order by name`)).map((r) => r.name);
  const existing = await q(`select "employeeId", "serviceName" from "EmployeeServiceAccess"`);

  const held = new Map();
  for (const row of existing) {
    const set = held.get(row.employeeId) ?? new Set();
    set.add(row.serviceName);
    held.set(row.employeeId, set);
  }

  const pending = [];
  for (const e of employees) {
    const set = held.get(e.id) ?? new Set();
    for (const name of services) if (!set.has(name)) pending.push({ employeeId: e.id, name: e.name, serviceName: name });
  }

  console.log(`الموظفون النشطون: ${employees.length} · الخدمات: ${services.length}`);
  console.log(`منوحات ستُضاف: ${pending.length}`);
  const byEmployee = new Map();
  for (const p of pending) byEmployee.set(p.name, (byEmployee.get(p.name) ?? 0) + 1);
  for (const [name, count] of byEmployee) console.log(`  ${name}: +${count}`);

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: --apply");
    await pool.end();
    return;
  }
  if (pending.length === 0) {
    console.log("\nلا جديد.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of pending) {
      await client.query(
        `insert into "EmployeeServiceAccess" (id, "employeeId", "serviceName", "charityId", "grantedAt")
         values (gen_random_uuid(), $1, $2, null, now())`,
        [row.employeeId, row.serviceName]
      );
    }
    await client.query("COMMIT");
    console.log(`\n✓ أُضيف ${pending.length} منحاً`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
