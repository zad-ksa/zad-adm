-- مُنشئُ الاستبيان المخصَّص — عليه تقوم صلاحيةُ «ما أنشأه الموظف وحده».
--
-- العمودان يقبلان NULL، فالاستبياناتُ العشرةُ القائمةُ تبقى بلا مالك: لا يراها
-- إلا من يحمل «جميع الاستبيانات». وهذا هو الصواب هنا — فلا أحدَ يُنسب إليه ما
-- لا نعلم أنه أنشأه، ومنحُها مالكاً بالحدس يُعطي أحدَهم تحريرَ استبيانٍ مفعَّلٍ
-- عليه ردود.
--
-- ولا علاقةَ (FOREIGN KEY) إلى Employee، كما في LatestUpdate: الاستبيانُ يبقى
-- بعد ذهاب حساب مُنشئه، والاسمُ المخزَّنُ معه يُغني عن الانضمام في كل قراءة.
--
-- يُعاد تشغيله بلا ضرر.
-- يُطبَّق بـ: npx.cmd prisma db execute --file prisma/sql/custom-survey-owner.sql

-- AlterTable
ALTER TABLE "CustomSurvey"
  ADD COLUMN IF NOT EXISTS "createdById"   TEXT,
  ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

-- قائمةُ حامل «ما أنشأه وحده» تُرشِّح على هذا العمود في كل فتحةٍ للصفحة.
CREATE INDEX IF NOT EXISTS "CustomSurvey_createdById_idx" ON "CustomSurvey" ("createdById");
