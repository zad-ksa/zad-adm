-- طلبات الوثائق: نوعُ الطلب (إنشاءٌ أو مراجعة) ومرفقاتُ الجمعية.
--
-- إضافيٌّ بالكامل: عمودان جديدان بقيمةٍ افتراضيّة، فالطلباتُ القائمةُ تصير
-- «إنشاءً» بلا مرفقات كما كانت. ويعيد التشغيلَ بلا تغيير.

ALTER TABLE "DocRequest" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'CREATE';
ALTER TABLE "DocRequest" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
