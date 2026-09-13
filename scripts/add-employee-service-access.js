/**
 * Adds EmployeeServiceAccess — who may see which service in «عرض الخدمات».
 *
 * ADDITIVE, which is why it is safe to run before the deploy: a table nothing
 * reads yet changes nothing for the code currently live. The opposite order is
 * what a DROP needs, and confusing the two is what took the charity HR pages
 * down once already.
 *
 * The absence of any row for an employee means "unrestricted" — so this table
 * being empty after it is created is exactly the state that keeps every
 * current holder of view_services_overview seeing what they see today.
 *
 * Idempotent: re-running changes nothing.
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

const DDL = `
CREATE TABLE IF NOT EXISTS "EmployeeServiceAccess" (
  "id"          TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "serviceName" TEXT NOT NULL,
  "charityId"   TEXT,
  "grantedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeServiceAccess_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EmployeeServiceAccess"
  DROP CONSTRAINT IF EXISTS "EmployeeServiceAccess_employeeId_fkey";
ALTER TABLE "EmployeeServiceAccess"
  ADD CONSTRAINT "EmployeeServiceAccess_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeServiceAccess"
  DROP CONSTRAINT IF EXISTS "EmployeeServiceAccess_charityId_fkey";
ALTER TABLE "EmployeeServiceAccess"
  ADD CONSTRAINT "EmployeeServiceAccess_charityId_fkey"
  FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "EmployeeServiceAccess_employeeId_idx"
  ON "EmployeeServiceAccess"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeeServiceAccess_serviceName_idx"
  ON "EmployeeServiceAccess"("serviceName");
`;

// A NULL in a Postgres unique index is distinct from every other NULL, so a
// plain UNIQUE(employeeId, serviceName, charityId) would NOT stop two rows
// granting the same service with charityId NULL. NULLS NOT DISTINCT is what
// actually enforces it — the same trap the attendance tables were built to
// avoid.
const UNIQUE = `
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeServiceAccess_unique"
  ON "EmployeeServiceAccess"("employeeId", "serviceName", "charityId")
  NULLS NOT DISTINCT;
`;

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    await pool.query("BEGIN");
    await pool.query(DDL);
    await pool.query("COMMIT");
    console.log("✓ الجدول والمفاتيح والفهارس");

    try {
      await pool.query(UNIQUE);
      console.log("✓ الفهرس الفريد (NULLS NOT DISTINCT)");
    } catch (e) {
      // NULLS NOT DISTINCT needs Postgres 15+. Say so rather than pretend the
      // constraint is in place.
      console.error("✗ تعذّر الفهرس الفريد:", e.message.split("\n")[0]);
      console.error("  يتطلب Postgres 15+. المنح سيعمل، لكن التكرار غير ممنوع على مستوى القاعدة.");
      process.exitCode = 1;
      return;
    }

    const v = await pool.query("SHOW server_version");
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'EmployeeServiceAccess' ORDER BY ordinal_position`
    );
    console.log("Postgres:", v.rows[0].server_version);
    console.log("الأعمدة:", cols.rows.map((r) => r.column_name).join(", "));
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
