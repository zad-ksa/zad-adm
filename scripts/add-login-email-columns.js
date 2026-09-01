/**
 * One-off DDL: the columns email login needs.
 *
 * This is exactly the script `prisma migrate diff` printed for the schema
 * change, run by hand because `prisma db push` insists on --accept-data-loss
 * for the two unique indexes. That warning is about pre-existing duplicates,
 * and there can be none: both columns are created in this same transaction and
 * every row starts NULL. Nothing here drops or rewrites data.
 *
 * Idempotent — IF NOT EXISTS throughout, safe to re-run.
 */

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const match = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(fs.readFileSync(envPath, "utf8"));
  if (!match) throw new Error("DATABASE_URL not found in environment or .env");
  return match[1];
}

const STATEMENTS = [
  `ALTER TABLE "CharityUser" ADD COLUMN IF NOT EXISTS "email" TEXT`,
  `ALTER TABLE "CharityUser" ADD COLUMN IF NOT EXISTS "password" TEXT`,
  `ALTER TABLE "Employee"    ADD COLUMN IF NOT EXISTS "email" TEXT`,
  // Employee.password becomes optional: an account that has not set up email
  // login has no hash at all, and NOT NULL would force a fake one.
  `ALTER TABLE "Employee" ALTER COLUMN "password" DROP NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CharityUser_email_key" ON "CharityUser"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Employee_email_key"    ON "Employee"("email")`,
];

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sql of STATEMENTS) {
      await client.query(sql);
      console.log("  ✓ " + sql.replace(/\s+/g, " "));
    }
    await client.query("COMMIT");
    console.log("\nتم.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
