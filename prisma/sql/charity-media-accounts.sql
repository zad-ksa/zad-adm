-- روابطُ حسابات الجمعية في منصّات النشر: جدولٌ جديدٌ وحدَه، لا يمسّ غيره.
-- يُعاد تشغيله بلا ضرر. يُطبَّق بـ:
-- npx.cmd prisma db execute --file prisma/sql/charity-media-accounts.sql

CREATE TABLE IF NOT EXISTS "CharityMediaAccount" (
  "id" TEXT NOT NULL,
  "charityId" TEXT NOT NULL,
  "platformKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CharityMediaAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CharityMediaAccount_charityId_platformKey_key"
  ON "CharityMediaAccount"("charityId", "platformKey");

DO $$ BEGIN
  ALTER TABLE "CharityMediaAccount"
    ADD CONSTRAINT "CharityMediaAccount_charityId_fkey"
    FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
