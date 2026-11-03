-- آخر المستجدات: الأعمدة الخاصة بالجدول، والخدمات الفرعية، وربط الحدث بخدمته الفرعية.
-- جداول وعمودٌ جديدة فقط، ولا يمسّ غيرها. يُعاد تشغيله بلا ضرر.
-- يُطبَّق بـ: npx.cmd prisma db execute --file prisma/sql/latest-updates-columns.sql

-- CreateTable
CREATE TABLE IF NOT EXISTS "LatestUpdateColumn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatestUpdateColumn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LatestUpdateColumn_name_key" ON "LatestUpdateColumn"("name");

-- CreateTable
CREATE TABLE IF NOT EXISTS "LatestUpdateSubColumn" (
    "id" TEXT NOT NULL,
    "parentKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LatestUpdateSubColumn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LatestUpdateSubColumn_parentKey_name_key" ON "LatestUpdateSubColumn"("parentKey", "name");
CREATE INDEX IF NOT EXISTS "LatestUpdateSubColumn_parentKey_idx" ON "LatestUpdateSubColumn"("parentKey");

-- AlterTable
ALTER TABLE "LatestUpdate" ADD COLUMN IF NOT EXISTS "subColumnId" TEXT;
CREATE INDEX IF NOT EXISTS "LatestUpdate_subColumnId_idx" ON "LatestUpdate"("subColumnId");

ALTER TABLE "LatestUpdate" DROP CONSTRAINT IF EXISTS "LatestUpdate_subColumnId_fkey";
ALTER TABLE "LatestUpdate" ADD CONSTRAINT "LatestUpdate_subColumnId_fkey" FOREIGN KEY ("subColumnId") REFERENCES "LatestUpdateSubColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
