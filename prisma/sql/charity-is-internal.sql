-- كيانٌ داخليٌّ لا جمعيةً متعاقدة. انظر تعليق isInternal في المخطّط.
ALTER TABLE "Charity" ADD COLUMN IF NOT EXISTS "isInternal" BOOLEAN NOT NULL DEFAULT false;
