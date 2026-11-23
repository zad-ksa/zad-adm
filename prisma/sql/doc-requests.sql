-- طلبات إنشاء وثائق المشاريع: النوعُ والجدول.
--
-- إضافيٌّ بالكامل: لا يمسّ جدولاً قائماً، فتشغيلُه قبل الرفع بلا خطر — شيفرةٌ
-- منشورةٌ لا تقرأ جدولاً جديداً لا يتغيّر عندها شيء.
--
-- ويعيد التشغيلَ بلا تغيير.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocRequestStatus') THEN
    CREATE TYPE "DocRequestStatus" AS ENUM ('PENDING', 'AWAITING_REVIEW', 'RETURNED', 'COMPLETED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "DocRequest" (
  "id"                     TEXT NOT NULL,
  "charityId"              TEXT NOT NULL,

  "programName"            TEXT,
  "programIdea"            TEXT NOT NULL,
  "beneficiariesCount"     TEXT,
  "programDuration"        TEXT,
  "targetCategory"         TEXT,
  "startDate"              TEXT,
  "endDate"                TEXT,
  "budgetInclude"          BOOLEAN NOT NULL DEFAULT FALSE,
  "budgetTotal"            TEXT,
  "note"                   TEXT,

  "status"                 "DocRequestStatus" NOT NULL DEFAULT 'PENDING',
  "submittedById"          TEXT,
  "submittedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "workingDays"            INTEGER NOT NULL DEFAULT 3,
  "scheduledStartDate"     TIMESTAMP(3) NOT NULL,
  "expectedCompletionDate" TIMESTAMP(3) NOT NULL,

  "docContent"             TEXT,
  "builderOptions"         JSONB,
  "generatedAt"            TIMESTAMP(3),
  "generatedById"          TEXT,

  "fileUrl"                TEXT,
  "fileName"               TEXT,
  "fileSize"               INTEGER,
  "deliveredAt"            TIMESTAMP(3),
  "deliveredById"          TEXT,
  "deliveryNote"           TEXT,

  "returnNote"             TEXT,
  "returnedAt"             TIMESTAMP(3),

  "completedAt"            TIMESTAMP(3),

  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DocRequest_pkey" PRIMARY KEY ("id")
);

-- والمفاتيحُ الأجنبيةُ تُضاف إن لم تكن: صفٌّ يُحذف صاحبُه لا يبقى يتيماً،
-- والموظّفُ يُحذف فيبقى الطلبُ بلا اسمِ منفِّذٍ لا أن يُحذف معه.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocRequest_charityId_fkey') THEN
    ALTER TABLE "DocRequest" ADD CONSTRAINT "DocRequest_charityId_fkey"
      FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocRequest_submittedById_fkey') THEN
    ALTER TABLE "DocRequest" ADD CONSTRAINT "DocRequest_submittedById_fkey"
      FOREIGN KEY ("submittedById") REFERENCES "CharityUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocRequest_generatedById_fkey') THEN
    ALTER TABLE "DocRequest" ADD CONSTRAINT "DocRequest_generatedById_fkey"
      FOREIGN KEY ("generatedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocRequest_deliveredById_fkey') THEN
    ALTER TABLE "DocRequest" ADD CONSTRAINT "DocRequest_deliveredById_fkey"
      FOREIGN KEY ("deliveredById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "DocRequest_charityId_status_idx" ON "DocRequest"("charityId", "status");
CREATE INDEX IF NOT EXISTS "DocRequest_status_scheduledStartDate_idx" ON "DocRequest"("status", "scheduledStartDate");
