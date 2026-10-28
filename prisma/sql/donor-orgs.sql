-- الجهاتُ المانحة صفوفٌ لا نصوصٌ حرّة — الخطوةُ الأولى: الجدولُ والعمودان.
--
-- والعمودان يُضافان **قابلين للفراغ** هنا، ثم يُعبَّآن بسكربت المطابقة
-- (`scripts/seed-donor-orgs.mjs`)، ثم يُلزَم عمودُ الحسابات في
-- `donor-orgs-finalize.sql`. وثلاثُ خطواتٍ لا واحدة: عمودٌ إلزاميٌّ على جدولٍ
-- فيه صفوفٌ يحتاج قيمةً لكل صفٍّ قبل أن يُلزَم، والقيمةُ هنا نتيجةُ مطابقةٍ
-- تُقرأ وتُقرّ قبل أن تُكتب. وهو نفسُ ترتيبِ نقلِ طلبات التصاميم عن `null`.

CREATE TABLE IF NOT EXISTS "DonorOrg" (
  "id"           TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "url"          TEXT,
  "fields"       TEXT,
  "kind"         TEXT         NOT NULL DEFAULT 'FOUNDATION',
  "intakeStatus" TEXT         NOT NULL DEFAULT 'CLOSED',
  "opensAt"      TIMESTAMP(3),
  "closesAt"     TIMESTAMP(3),
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DonorOrg_pkey" PRIMARY KEY ("id")
);

-- الاسمُ مفتاحُ الاستيراد: السكربتُ يُشغَّل مرّتين فلا يُضاعف.
CREATE UNIQUE INDEX IF NOT EXISTS "DonorOrg_name_key" ON "DonorOrg" ("name");
CREATE INDEX IF NOT EXISTS "DonorOrg_kind_name_idx" ON "DonorOrg" ("kind", "name");

ALTER TABLE "DonorAccount"     ADD COLUMN IF NOT EXISTS "donorOrgId" TEXT;
ALTER TABLE "GrantApplication" ADD COLUMN IF NOT EXISTS "donorOrgId" TEXT;

CREATE INDEX IF NOT EXISTS "GrantApplication_donorOrgId_charityId_idx"
  ON "GrantApplication" ("donorOrgId", "charityId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DonorAccount_donorOrgId_fkey') THEN
    ALTER TABLE "DonorAccount"
      ADD CONSTRAINT "DonorAccount_donorOrgId_fkey"
      FOREIGN KEY ("donorOrgId") REFERENCES "DonorOrg" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GrantApplication_donorOrgId_fkey') THEN
    ALTER TABLE "GrantApplication"
      ADD CONSTRAINT "GrantApplication_donorOrgId_fkey"
      FOREIGN KEY ("donorOrgId") REFERENCES "DonorOrg" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
