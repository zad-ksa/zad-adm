-- الملف التسويقي للمبادرة: رابطٌ خارجي أو ملفٌ مرفوع. انظر تعليق marketingKind.
ALTER TABLE "Initiative"
  ADD COLUMN IF NOT EXISTS "marketingKind" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingPublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "marketingResourceType" TEXT;
