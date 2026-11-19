-- كليشةُ الجمعية في منشئ الوثائق: عمودان جديدان، ولا يمسّان غيرهما.
-- يُعاد تشغيله بلا ضرر. يُطبَّق بـ:
-- npx.cmd prisma db execute --file prisma/sql/project-builder-letterhead.sql

ALTER TABLE "ProjectBuilderCharityProfile" ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;
ALTER TABLE "ProjectBuilderCharityProfile" ADD COLUMN IF NOT EXISTS "letterheadName" TEXT;
