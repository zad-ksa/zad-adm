-- تفعيلُ تبويب «الخطة الإعلامية» في بوّابة الجمعية — مفتاحٌ بيد زاد.
--
-- ومُطفأٌ افتراضاً: الخدمةُ تُقدَّم للجمعية قبل أن تُبدأ خطّتُها، فتبويبٌ يُفتح
-- على تقويمٍ فارغٍ خبرٌ كاذب.
--
-- ويُشعَل لمن بدأت خطّتُها فعلاً (لها منشورٌ واحدٌ على الأقل): ما كان ظاهراً
-- يبقى ظاهراً، فلا ينقطع وصولٌ قائمٌ بهجرةٍ.

ALTER TABLE "Charity"
  ADD COLUMN IF NOT EXISTS "mediaPlanEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Charity" c
   SET "mediaPlanEnabled" = true
 WHERE EXISTS (SELECT 1 FROM "MediaPost" p WHERE p."charityId" = c.id)
   AND c."mediaPlanEnabled" = false;
