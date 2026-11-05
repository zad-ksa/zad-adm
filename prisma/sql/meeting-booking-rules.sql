-- قواعدُ إغلاق الحجز في جداول المواعيد، وعلامةُ «رُئي» على الحجز.
--
-- أعمدةٌ جديدةٌ بقيمٍ افتراضيّةٍ هي سلوكُ الجداول القائمة نفسُه: صفرُ دقائقٍ
-- وfalse يعني «يبقى الحجز مفتوحاً حتى وقت الموعد ولا يُقفل جارٌ جاره» — وهو
-- ما كانت عليه قبل هذه الإعدادات. فلا صفَّ يتغيّر حكمُه بتطبيق هذا الملف.
--
-- و`seenAt` يُترك NULL للحجوزات القائمة، فتُعدّ كلُّها «جديدة» مرّةً واحدة ثم
-- تُرى. وهذا أهونُ من ختمها كلِّها مرئيّةً: من لم يفتح جدولَه منذ أسبوعٍ له
-- أن يرى ما فاته.
--
-- يُعاد تشغيله بلا ضرر.
-- يُطبَّق بـ: npx.cmd prisma db execute --file prisma/sql/meeting-booking-rules.sql

-- AlterTable
ALTER TABLE "MeetingSchedule"
  ADD COLUMN IF NOT EXISTS "bookingCutoffMinutes"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bookingCutoffDayStart" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "blockSlotBefore"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "afterSlotAction"       TEXT    NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "afterSlotDelayMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MeetingBooking"
  ADD COLUMN IF NOT EXISTS "seenAt" TIMESTAMP(3);

-- شارةُ التبويب تعدّ ما لم يُرَ لصاحب الجدول، فالمُرشِّحُ على هذا العمود.
CREATE INDEX IF NOT EXISTS "MeetingBooking_seenAt_idx" ON "MeetingBooking" ("seenAt");
