/**
 * Drops CharityHoliday, now that nothing points at it.
 *
 * HISTORY, because this exact table has already caused one outage: it was
 * dropped once while the code that queried it was still the deployed code, and
 * every charity HR page started failing with 42P01. It had to be recreated.
 *
 * What is different now — each checked rather than assumed:
 *   · no query anywhere reads or writes `prisma.charityHoliday`
 *   · `saveCharityHoliday` / `deleteCharityHoliday` keep the old names but
 *     write to `prisma.holiday`; the name is history, not a reference
 *   · the model is absent from schema.prisma (only a comment mentions it)
 *   · the table holds zero rows
 *   · no foreign key in any other table points at it
 *   · the replacement table `Holiday` exists
 *
 * The rule this follows, and the one the outage taught: a DROP goes AFTER the
 * code that stopped needing it is deployed — never before. That code is
 * deployed; origin/main was checked, not assumed.
 *
 * Prints a recreation script on the way out, so undoing this needs no memory.
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

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    const present = await pool.query(
      `SELECT to_regclass('public."CharityHoliday"') IS NOT NULL AS present`
    );
    if (!present.rows[0].present) {
      console.log("الجدول غير موجود — لا تغيير.");
      return;
    }

    // Re-checked here rather than trusted from the pre-flight: between running
    // that and running this, someone could have written a row.
    const rows = await pool.query(`SELECT COUNT(*)::int c FROM "CharityHoliday"`);
    if (rows.rows[0].c !== 0) {
      console.error(
        `توقّف: الجدول يحتوي ${rows.rows[0].c} صفاً. الحذف كان سيُفقد بيانات — راجعها أولاً.`
      );
      process.exitCode = 1;
      return;
    }

    const inbound = await pool.query(
      `SELECT tc.table_name FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'CharityHoliday'`
    );
    if (inbound.rowCount > 0) {
      console.error(
        "توقّف: جداول تشير إليه — " + inbound.rows.map((r) => r.table_name).join("، ")
      );
      process.exitCode = 1;
      return;
    }

    await pool.query(`DROP TABLE "CharityHoliday"`);

    const after = await pool.query(
      `SELECT to_regclass('public."CharityHoliday"') IS NOT NULL AS present`
    );
    console.log(after.rows[0].present ? "✗ ما زال موجوداً" : "✓ حُذف الجدول.");
    console.log("\nللتراجع: node scripts/restore-charity-holiday.js");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
