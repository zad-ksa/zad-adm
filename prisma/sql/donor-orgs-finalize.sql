-- الخطوةُ الثالثة: إلزامُ عمود الحسابات، وحذفُ ما خَلَفَه.
--
-- تُنفَّذ **بعد** سكربت المطابقة وحده. وفيها حِمايةٌ صريحة: إن بقي حسابٌ بلا
-- جهةٍ فالتنفيذُ يتوقّف برسالةٍ تقول العدد، ولا يُلزَم عمودٌ على بياناتٍ ناقصة.

DO $$
DECLARE
  orphans INT;
BEGIN
  SELECT count(*) INTO orphans FROM "DonorAccount" WHERE "donorOrgId" IS NULL;
  IF orphans > 0 THEN
    RAISE EXCEPTION 'بقي % حساباً بلا جهةٍ مانحة — شغّل سكربت المطابقة قبل الإلزام', orphans;
  END IF;
END $$;

ALTER TABLE "DonorAccount" ALTER COLUMN "donorOrgId" SET NOT NULL;

-- حسابٌ واحدٌ لكل جمعيةٍ عند كل جهة.
CREATE UNIQUE INDEX IF NOT EXISTS "DonorAccount_donorOrgId_charityId_key"
  ON "DonorAccount" ("donorOrgId", "charityId");

-- `donorName` خَلَفَه `donorOrgId`. و`website` خَلَفَه `DonorOrg.url`: صفرُ
-- صفوفٍ كانت تحمله، فلا شيءَ يُفقد.
ALTER TABLE "DonorAccount" DROP COLUMN IF EXISTS "donorName";
ALTER TABLE "DonorAccount" DROP COLUMN IF EXISTS "website";
