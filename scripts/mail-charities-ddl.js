// المرحلة الأولى من خطة بريد الجمعيات: أعمدة وجداول، كلها غير هدّامة.
// راجع docs/خطة-بريد-الجمعيات.md
//
// التشغيل: node scripts/mail-charities-ddl.js
require("dotenv").config({ quiet: true });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const STATEMENTS = [
  // ── InternalMail ──────────────────────────────────────────────────────
  `ALTER TABLE "InternalMail" ALTER COLUMN "senderId" DROP NOT NULL`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "senderKind" TEXT NOT NULL DEFAULT 'EMPLOYEE'`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "senderCharityUserId" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "serviceName" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "charityId" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "addressedAs" TEXT NOT NULL DEFAULT 'PERSON'`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "approvalState" TEXT NOT NULL DEFAULT 'NONE'`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "approvedById" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "approvedByCharityUserId" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3)`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "returnNote" TEXT`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "draftCharityUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE "InternalMail" ADD COLUMN IF NOT EXISTS "draftCharityIds" TEXT[] DEFAULT ARRAY[]::TEXT[]`,

  // ── MailRecipient ─────────────────────────────────────────────────────
  `ALTER TABLE "MailRecipient" ALTER COLUMN "employeeId" DROP NOT NULL`,
  `ALTER TABLE "MailRecipient" ADD COLUMN IF NOT EXISTS "charityUserId" TEXT`,
  `ALTER TABLE "MailRecipient" ADD COLUMN IF NOT EXISTS "charityId" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MailRecipient_mailId_charityUserId_key" ON "MailRecipient"("mailId","charityUserId")`,
  `CREATE INDEX IF NOT EXISTS "MailRecipient_charityUserId_isDeleted_isRead_idx" ON "MailRecipient"("charityUserId","isDeleted","isRead")`,

  // ── Charity ───────────────────────────────────────────────────────────
  `ALTER TABLE "Charity" ADD COLUMN IF NOT EXISTS "mailRequiresApproval" BOOLEAN NOT NULL DEFAULT false`,

  // ── جدولا المعمِّدين ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS "MailApprover" (
     "employeeId" TEXT NOT NULL,
     "serviceName" TEXT NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "MailApprover_pkey" PRIMARY KEY ("employeeId","serviceName")
   )`,
  `CREATE INDEX IF NOT EXISTS "MailApprover_serviceName_idx" ON "MailApprover"("serviceName")`,
  `CREATE TABLE IF NOT EXISTS "CharityMailApprover" (
     "charityUserId" TEXT NOT NULL,
     "charityId" TEXT NOT NULL,
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "CharityMailApprover_pkey" PRIMARY KEY ("charityUserId","charityId")
   )`,
  `CREATE INDEX IF NOT EXISTS "CharityMailApprover_charityId_idx" ON "CharityMailApprover"("charityId")`,
];

const FOREIGN_KEYS = [
  ["InternalMail_senderCharityUserId_fkey", `ALTER TABLE "InternalMail" ADD CONSTRAINT "InternalMail_senderCharityUserId_fkey" FOREIGN KEY ("senderCharityUserId") REFERENCES "CharityUser"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ["InternalMail_charityId_fkey", `ALTER TABLE "InternalMail" ADD CONSTRAINT "InternalMail_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE SET NULL ON UPDATE CASCADE`],
  ["MailRecipient_charityUserId_fkey", `ALTER TABLE "MailRecipient" ADD CONSTRAINT "MailRecipient_charityUserId_fkey" FOREIGN KEY ("charityUserId") REFERENCES "CharityUser"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ["MailApprover_employeeId_fkey", `ALTER TABLE "MailApprover" ADD CONSTRAINT "MailApprover_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ["CharityMailApprover_charityUserId_fkey", `ALTER TABLE "CharityMailApprover" ADD CONSTRAINT "CharityMailApprover_charityUserId_fkey" FOREIGN KEY ("charityUserId") REFERENCES "CharityUser"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
  ["CharityMailApprover_charityId_fkey", `ALTER TABLE "CharityMailApprover" ADD CONSTRAINT "CharityMailApprover_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE`],
];

(async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sql of STATEMENTS) await client.query(sql);
    for (const [name, sql] of FOREIGN_KEYS) {
      const exists = await client.query(`select 1 from pg_constraint where conname = $1`, [name]);
      if (exists.rowCount === 0) await client.query(sql);
    }
    await client.query("COMMIT");
    console.log("✓ طُبِّقت المرحلة الأولى");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("✗ " + e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => { console.error("✗", e.message); process.exit(1); });
