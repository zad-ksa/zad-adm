-- أصلُ التعديل المعلَّق في الخطة الإعلامية: عمودٌ واحدٌ جديد، ولا يمسّ غيره.
-- يُعاد تشغيله بلا ضرر. يُطبَّق بـ:
-- npx.cmd prisma db execute --file prisma/sql/media-post-baseline.sql

ALTER TABLE "MediaPost" ADD COLUMN IF NOT EXISTS "baseline" JSONB;
