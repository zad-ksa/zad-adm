-- آخر المستجدات: جدولٌ واحدٌ جديد، ولا يمسّ غيره.
-- يُطبَّق بـ: npx prisma db execute --file prisma/sql/latest-updates.sql

-- CreateTable
CREATE TABLE IF NOT EXISTS "LatestUpdate" (
    "id" TEXT NOT NULL,
    "charityId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatestUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LatestUpdate_charityId_serviceName_eventDate_idx" ON "LatestUpdate"("charityId", "serviceName", "eventDate");

-- AddForeignKey
ALTER TABLE "LatestUpdate" DROP CONSTRAINT IF EXISTS "LatestUpdate_charityId_fkey";
ALTER TABLE "LatestUpdate" ADD CONSTRAINT "LatestUpdate_charityId_fkey" FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
