/**
 * One-off migration: move administrator standing from the account onto each
 * membership.
 *
 * WHY THIS IS MANDATORY, not optional. Administrator used to mean
 * `CharityUser.title === "SYSTEM_ADMIN"`, read from the account. It is now
 * `CharityUserCharity.isAdmin`, read from the membership — which starts `false`.
 * Deploying the code WITHOUT running this script leaves every charity with no
 * administrator at all, recoverable only by Zad staff.
 *
 * Run order:
 *   1. npx prisma db push                      (adds CharityUserCharity.isAdmin)
 *   2. node scripts/backfill-charity-admins.js
 *   3. deploy
 *
 * What it does: every ACTIVE membership held by an account whose title is
 * SYSTEM_ADMIN becomes an administrator of that charity. That reproduces the
 * old behaviour exactly — such an account already had full authority in every
 * charity it belonged to — so this grants nobody anything they did not already
 * hold. What changes is that from now on each charity controls the flag for
 * itself, and one charity can no longer set or clear it for another.
 *
 * Inactive memberships are skipped: the person was already removed there, and
 * reactivating them later should be a deliberate decision, not a side effect of
 * this migration.
 *
 * Idempotent — re-running grants nothing extra and clears nothing.
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

// Prisma 7 refuses a bare `new PrismaClient()` — this project drives it through
// the pg adapter (see src/lib/db.ts), so a standalone script must build the same
// pair. DATABASE_URL is read from .env directly because plain `node` does not
// load it the way Next does.
function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, "..", ".env");
  const match = /^\s*DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m.exec(
    fs.readFileSync(envPath, "utf8")
  );
  if (!match) throw new Error("DATABASE_URL not found in environment or .env");
  return match[1];
}

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const legacyAdmins = await prisma.charityUser.findMany({
      where: { title: "SYSTEM_ADMIN" },
      select: { id: true, name: true, isActive: true },
    });

    if (legacyAdmins.length === 0) {
      console.warn(
        "\n⚠  No CharityUser holds the legacy SYSTEM_ADMIN title.\n" +
          "   Nothing to migrate — but also no charity can manage its own staff\n" +
          "   until an administrator is set, either here or by Zad staff from\n" +
          "   /main/charity-accounts."
      );
      return;
    }

    const result = await prisma.charityUserCharity.updateMany({
      where: {
        charityUserId: { in: legacyAdmins.map((u) => u.id) },
        isActive: true,
        isAdmin: false,
      },
      data: { isAdmin: true },
    });

    console.log(
      `Found ${legacyAdmins.length} legacy admin account(s); ` +
        `promoted ${result.count} membership(s).`
    );

    // A charity with zero administrators cannot manage its own accounts, so it
    // is worth naming rather than leaving to be discovered by a locked-out user.
    const charities = await prisma.charity.findMany({ select: { id: true, name: true } });
    const orphaned = [];
    for (const charity of charities) {
      const admins = await prisma.charityUserCharity.count({
        where: { charityId: charity.id, isActive: true, isAdmin: true, user: { isActive: true } },
      });
      if (admins === 0) orphaned.push(charity.name);
    }

    if (orphaned.length > 0) {
      console.warn(
        `\n⚠  ${orphaned.length} charity/charities have no active administrator:\n` +
          orphaned.map((n) => `   - ${n}`).join("\n") +
          "\n   Zad staff must set one from /main/charity-accounts."
      );
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
