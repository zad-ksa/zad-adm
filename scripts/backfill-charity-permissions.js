/**
 * One-off migration: give every existing charity membership the permissions it
 * effectively already had.
 *
 * WHY THIS IS MANDATORY, not optional. Before this change every charity account
 * could open every portal tab, because there was no permission layer at all.
 * The new layer denies by default, and `CharityUserCharity.permissions` starts
 * empty — so deploying the code WITHOUT running this script silently removes
 * Services, Governance and Design Requests from every existing user.
 *
 * Run order:
 *   1. npx prisma db push        (adds the columns and the attendance tables)
 *   2. node scripts/backfill-charity-permissions.js
 *   3. deploy
 *
 * The script is idempotent — running it twice grants nothing extra, and it
 * never removes a permission an admin has since configured.
 *
 * Administrative permissions (manage_charity_users, manage_attendance,
 * view_attendance_reports) are deliberately NOT granted: nobody held them
 * before, so handing them out here would be an escalation, not a migration.
 * The first SYSTEM_ADMIN in each charity gets everything implicitly, and Zad
 * staff create that account from /main/charity-accounts.
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

const PAGE_PERMISSIONS = [
  "view_services",
  "view_governance",
  "view_design_requests",
  "create_design_requests",
  // view_hr intentionally absent — nothing reads it; see lib/charityPermissions.ts
];

async function main() {
  const pool = new Pool({ connectionString: connectionString() });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const links = await prisma.charityUserCharity.findMany({
      select: { id: true, permissions: true, charityUserId: true, charityId: true },
    });

    let updated = 0;
    for (const link of links) {
      const merged = Array.from(new Set([...(link.permissions || []), ...PAGE_PERMISSIONS]));
      if (merged.length === (link.permissions || []).length) continue;

      await prisma.charityUserCharity.update({
        where: { id: link.id },
        data: { permissions: merged },
      });
      updated += 1;
    }

    console.log(`Checked ${links.length} memberships, updated ${updated}.`);

    const admins = await prisma.charityUser.count({ where: { title: "SYSTEM_ADMIN" } });
    if (admins === 0) {
      console.warn(
        "\n⚠  No CharityUser has title SYSTEM_ADMIN.\n" +
          "   No charity can manage its own staff until Zad staff create one\n" +
          "   from /main/charity-accounts (requires manage_charity_accounts)."
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
