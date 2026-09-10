/**
 * Adds what "return the revision to the charity" needs to store.
 *
 * Both changes are ADDITIVE, which is the whole point of doing them this way
 * round. A new column with a default and two new enum values are invisible to
 * the code currently deployed: nothing reads the column, and nothing writes
 * the new kinds until the matching code ships. So this may safely run before
 * the deploy — the opposite of a DROP, which must never run before it.
 *
 * `ALTER TYPE ... ADD VALUE` cannot run in the same transaction that then uses
 * the value, so each statement is issued on its own rather than wrapped.
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

const NEW_KINDS = ["REVISION_RETURNED", "CLOSED_WITH_NOTES"];

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  try {
    const col = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      ["DesignRequest", "closedWithNotes"]
    );
    if (col.rowCount === 0) {
      await pool.query(
        `ALTER TABLE "DesignRequest" ADD COLUMN "closedWithNotes" BOOLEAN NOT NULL DEFAULT false`
      );
      console.log("✓ أُضيف العمود closedWithNotes");
    } else {
      console.log("• العمود closedWithNotes موجود");
    }

    for (const kind of NEW_KINDS) {
      const has = await pool.query(
        `SELECT 1 FROM pg_enum e
         JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'DesignEventKind' AND e.enumlabel = $1`,
        [kind]
      );
      if (has.rowCount === 0) {
        await pool.query(`ALTER TYPE "DesignEventKind" ADD VALUE '${kind}'`);
        console.log(`✓ أُضيفت القيمة ${kind}`);
      } else {
        console.log(`• القيمة ${kind} موجودة`);
      }
    }

    const kinds = await pool.query(
      `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'DesignEventKind' ORDER BY e.enumsortorder`
    );
    console.log("قيم DesignEventKind:", kinds.rows.map((r) => r.enumlabel).join(", "));
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
