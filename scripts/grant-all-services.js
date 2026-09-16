// منح موظفٍ كل الخدمات الموجودة — منحاً مخزّناً في الجدول، لا تجاوزاً في الكود.
//
// «مدير النظام» كان يمرّ بدوره (role === "ADMIN") في hasPermission، فيفتح ما
// يفتحه غيره بمنحٍ صريح. والمنح أوضح: يُقرأ في الصفحة، ويُسحب متى شئت، ولا
// يتعلق بمسمّى ولا بدور.
//
// معاينة: node scripts/grant-all-services.js "مدير النظام"
// تنفيذ:  node scripts/grant-all-services.js "مدير النظام" --apply
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");

const NAME = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!NAME) {
  console.error("الاستعمال: node scripts/grant-all-services.js <اسم الموظف> [--apply]");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const q = async (s, p) => (await pool.query(s, p)).rows;

  const employees = await q(`select id, name, role from "Employee" where name = $1`, [NAME]);
  if (employees.length !== 1) throw new Error(`المتوقع موظفٌ واحد باسم «${NAME}»، وُجد ${employees.length}`);
  const employee = employees[0];

  const services = (await q(`select distinct name from "Service" order by name`)).map((r) => r.name);
  const held = (await q(`select "serviceName" from "EmployeeServiceAccess" where "employeeId" = $1`, [employee.id])).map((r) => r.serviceName);
  const missing = services.filter((s) => !held.includes(s));

  console.log(`الموظف: ${employee.name}`);
  console.log(`الخدمات في النظام: ${services.length} — ${services.join("، ")}`);
  console.log(`يملك منها: ${held.length}`);
  console.log(`سيُمنح: ${missing.length}${missing.length ? " — " + missing.join("، ") : ""}`);

  const charities = (await q(`select count(*) c from "EmployeeCharity" where "employeeId" = $1`, [employee.id]))[0].c;
  console.log(`الجمعيات المسنَدة إليه: ${charities}`);

  if (!APPLY) {
    console.log("\nمعاينة فقط. للتنفيذ: --apply");
    await pool.end();
    return;
  }
  if (missing.length === 0) {
    console.log("\nلا جديد.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const serviceName of missing) {
      await client.query(
        `insert into "EmployeeServiceAccess" (id, "employeeId", "serviceName", "charityId", "grantedAt")
         values (gen_random_uuid(), $1, $2, null, now())`,
        [employee.id, serviceName]
      );
    }
    await client.query("COMMIT");
    console.log(`\n✓ مُنح ${missing.length} خدمة`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
