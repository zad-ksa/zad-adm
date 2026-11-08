-- مكلَّفٌ يُكتب اسمُه يدوياً في مهمة المحضر: عمودٌ واحدٌ جديد، ولا يمسّ غيره.
-- يُعاد تشغيله بلا ضرر. يُطبَّق بـ:
-- npx.cmd prisma db execute --file prisma/sql/meeting-task-manual-assignee.sql

ALTER TABLE "MeetingTask" ADD COLUMN IF NOT EXISTS "assignedToName" TEXT;
