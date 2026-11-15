-- بنود المنشور في الخطة الاعلامية: عنوان، ووصف، ومرفقات.
--
-- والثلاثة اختيارية: منشورات كتبت قبل هذه الاعمدة تبقى كما هي، فلا قيمة
-- افتراضية تخترع لها عنوانا.
--
-- والمرفقات JSONB لا جدول: المرفق لا يستعلم عنه وحده ولا يشارك منشورا آخر،
-- وحياته حياة منشوره — ولو كان جدولا لصار لكل قراءة منشور انضمام لا يقرأ منه
-- شيء.

ALTER TABLE "MediaPost"
  ADD COLUMN IF NOT EXISTS "title"       TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "attachments" JSONB;
