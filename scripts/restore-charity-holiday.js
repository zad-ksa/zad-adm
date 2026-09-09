/**
 * Puts the CharityHoliday table back.
 *
 * WHY THIS EXISTS: the table was dropped while building the Zad attendance
 * system, which replaced it with the unified `Holiday` table. That work lives
 * on a feature branch. Production deploys `main`, whose code still queries
 * `prisma.charityHoliday` in four places — so dropping the table put the
 * database ahead of the deployed code and every production page touching
 * charity holidays now fails with 42P01.
 *
 * The table held zero rows when it was dropped, so recreating it empty returns
 * production to exactly the state it was in. This does not undo any of the
 * attendance work; it only removes the drift until the feature branch ships,
 * at which point the same drop belongs in that deployment.
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

// Column types and constraint names follow what Prisma generates, so a later
// `migrate diff` against the old schema comes back empty rather than proposing
// to rebuild the table.
const DDL = `
CREATE TABLE IF NOT EXISTS "CharityHoliday" (
  "id"            TEXT NOT NULL,
  "charityId"     TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "startDate"     TIMESTAMP(3) NOT NULL,
  "endDate"       TIMESTAMP(3) NOT NULL,
  "createdById"   TEXT,
  "createdByName" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CharityHoliday_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CharityHoliday_charityId_startDate_idx"
  ON "CharityHoliday" ("charityId", "startDate");
`;

const FK = `
ALTER TABLE "CharityHoliday"
  ADD CONSTRAINT "CharityHoliday_charityId_fkey"
  FOREIGN KEY ("charityId") REFERENCES "Charity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
`;

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    const before = await pool.query(
      `SELECT to_regclass('public."CharityHoliday"') IS NOT NULL AS present`
    );
    if (before.rows[0].present) {
      console.log("الجدول موجود بالفعل — لا تغيير.");
      return;
    }

    await pool.query("BEGIN");
    await pool.query(DDL);

    // Added separately so a pre-existing constraint cannot abort the whole
    // transaction; IF NOT EXISTS is not available for ADD CONSTRAINT.
    const fkThere = await pool.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'CharityHoliday_charityId_fkey'`
    );
    if (fkThere.rowCount === 0) await pool.query(FK);

    await pool.query("COMMIT");

    const after = await pool.query(`SELECT COUNT(*)::int AS n FROM "CharityHoliday"`);
    console.log(`أُعيد إنشاء الجدول. عدد الصفوف: ${after.rows[0].n}`);
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
