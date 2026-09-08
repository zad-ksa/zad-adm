/**
 * One-off DDL for the Zad attendance system.
 *
 * The script `prisma migrate diff` produced, plus one partial unique index
 * Prisma has no syntax for. Purely additive — six new tables, one enum, three
 * new Employee columns. Nothing existing is dropped or rewritten.
 *
 * Run inside a transaction so a failure leaves nothing half-created.
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

const SQL = fs.readFileSync(path.join(__dirname, "..", "prisma", "sql", "zad-attendance.sql"), "utf8");

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(SQL);
    await client.query("COMMIT");
    console.log("تم — جداول تحضير زاد والتقويم العام.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
