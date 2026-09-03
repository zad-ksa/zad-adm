/**
 * One-off DDL: the two columns a task's creation attachment needs.
 *
 * Exactly what `prisma migrate diff` printed for the schema change, applied by
 * hand because `prisma db push` demands --accept-data-loss whenever it sees an
 * index or constraint change anywhere in the diff. Purely additive: two
 * nullable columns, no drop, no rewrite.
 *
 * Idempotent — IF NOT EXISTS, safe to re-run.
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
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT`,
  `ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "attachmentPublicId" TEXT`,
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

main().catch((err) => { console.error(err); process.exit(1); });
