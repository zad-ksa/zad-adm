-- أرشيفُ طلبات التصاميم.
--
-- والأرشفةُ علامةٌ على الصفّ لا حالةٌ سابعة: الحالةُ تقود دورة العمل كلَّها
-- — الموعدَ والتسليمَ ومراجعةَ الجمعية — فجعلُ الأرشيف حالةً يُنسي الطلبَ ما
-- كان عليه، ويُلزمنا حقلاً ثانياً نُعيده منه. فـ"archivedAt" مستقلّةٌ عن
-- الحالة: تُخرج الصفَّ من القوائم ومن حساب الطابور، والحالةُ كما هي.
--
-- ومن أرشف: منسوخاً لا مرتبطاً — قد يكون موظفاً أو مستخدمَ جمعية، والحسابُ
-- قد يُحذف أو يُعاد تسميته، وسجلٌّ يُعيد كتابة نفسه ليس سجلاً. وهو نفسُ ما
-- فعله "DesignRequestEvent" بفاعله.

ALTER TABLE "DesignRequest"
  ADD COLUMN IF NOT EXISTS "archivedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedByType" "AuditActorType",
  ADD COLUMN IF NOT EXISTS "archivedById"   TEXT,
  ADD COLUMN IF NOT EXISTS "archivedByName" TEXT;

-- قوائمُ الصفحتين كلُّها «جهةٌ + أرشيف»: المعروضةُ غيرُ المؤرشفة، والأرشيفُ
-- تبويبٌ قائمٌ بنفسه.
CREATE INDEX IF NOT EXISTS "DesignRequest_charityId_archivedAt_idx"
  ON "DesignRequest" ("charityId", "archivedAt");

ALTER TYPE "DesignEventKind" ADD VALUE IF NOT EXISTS 'ARCHIVED';
ALTER TYPE "DesignEventKind" ADD VALUE IF NOT EXISTS 'UNARCHIVED';
