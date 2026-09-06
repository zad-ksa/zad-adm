/**
 * One-off DDL: the design-request activity log, and the "work started" columns.
 *
 * The exact script `prisma migrate diff` produced, applied by hand because
 * `prisma db push` demands --accept-data-loss the moment a diff contains any
 * index or constraint. Purely additive — a new enum, a new table, two nullable
 * columns and their foreign keys. Nothing is dropped or rewritten.
 *
 * Guarded so a re-run is a no-op rather than an error.
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

const SQL = fs.readFileSync(path.join(__dirname, "..", "prisma", "sql", "design-request-log.sql"), "utf8");

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(SQL);
    await client.query("COMMIT");
    console.log("تم — جدول السجل والعمودان.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
