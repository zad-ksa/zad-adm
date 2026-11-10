-- الخطة الإعلامية: أربعةُ جداولَ جديدة، ولا يمسّ هذا الملفُّ جدولاً قائماً.
--
-- ثلاثةٌ للخطّة (المنشورُ وسجلُّه والمنصّات)، ورابعٌ عامٌّ: جرسُ أعضاء الجمعيات
-- — فلم يكن لهم جرسٌ قطّ، و`AppNotification` لموظَّفي زاد وحدَهم.
--
-- ويُبذَر في آخره تسعُ منصّاتٍ مشهورة. البذرُ `ON CONFLICT DO NOTHING`، فإعادةُ
-- تشغيل الملفِّ لا تُكرِّرها ولا تُعيد منصّةً عُطِّلت أو سُمّيت من جديد.
--
-- يُطبَّق بـ: npx.cmd prisma db execute --file prisma/sql/media-plan.sql

-- CreateTable: MediaPost
CREATE TABLE IF NOT EXISTS "MediaPost" (
    "id"            TEXT NOT NULL,
    "charityId"     TEXT NOT NULL,
    "scheduledOn"   DATE NOT NULL,
    "scheduledAt"   TEXT,
    "content"       TEXT NOT NULL,
    "platforms"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "imageUrl"      TEXT,
    "imagePublicId" TEXT,
    "linkUrl"       TEXT,
    "status"        TEXT NOT NULL DEFAULT 'PENDING_CHARITY',
    "createdById"   TEXT,
    "createdByName" TEXT,
    "finalizedAt"   TIMESTAMP(3),
    "finalizedBy"   TEXT,
    "finalizedSide" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPost_pkey" PRIMARY KEY ("id")
);

-- شهرُ جمعيةٍ واحدةٍ هو كلُّ ما يُقرأ في كل فتحةٍ للتقويم.
CREATE INDEX IF NOT EXISTS "MediaPost_charityId_scheduledOn_idx" ON "MediaPost"("charityId", "scheduledOn");
-- وشارةُ «ينتظر تعميدَك» تعدّ بالحالة عبر الجمعيات كلّها.
CREATE INDEX IF NOT EXISTS "MediaPost_status_idx" ON "MediaPost"("status");

ALTER TABLE "MediaPost" DROP CONSTRAINT IF EXISTS "MediaPost_charityId_fkey";
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_charityId_fkey"
  FOREIGN KEY ("charityId") REFERENCES "Charity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MediaPostEvent
CREATE TABLE IF NOT EXISTS "MediaPostEvent" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "kind"      TEXT NOT NULL,
    "actorSide" TEXT NOT NULL,
    "actorId"   TEXT,
    "actorName" TEXT,
    "note"      TEXT,
    "before"    JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPostEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MediaPostEvent_postId_createdAt_idx" ON "MediaPostEvent"("postId", "createdAt");

ALTER TABLE "MediaPostEvent" DROP CONSTRAINT IF EXISTS "MediaPostEvent_postId_fkey";
ALTER TABLE "MediaPostEvent" ADD CONSTRAINT "MediaPostEvent_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "MediaPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MediaPlatform
CREATE TABLE IF NOT EXISTS "MediaPlatform" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "iconKey"   TEXT,
    "logoUrl"   TEXT,
    "color"     TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaPlatform_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaPlatform_key_key" ON "MediaPlatform"("key");

-- CreateTable: CharityNotification
CREATE TABLE IF NOT EXISTS "CharityNotification" (
    "id"            TEXT NOT NULL,
    "charityUserId" TEXT NOT NULL,
    "charityId"     TEXT,
    "title"         TEXT NOT NULL,
    "message"       TEXT,
    "link"          TEXT,
    "isRead"        BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharityNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CharityNotification_charityUserId_isRead_idx"
  ON "CharityNotification"("charityUserId", "isRead");

ALTER TABLE "CharityNotification" DROP CONSTRAINT IF EXISTS "CharityNotification_charityUserId_fkey";
ALTER TABLE "CharityNotification" ADD CONSTRAINT "CharityNotification_charityUserId_fkey"
  FOREIGN KEY ("charityUserId") REFERENCES "CharityUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- بذرُ المنصّات المشهورة. و`iconKey` يُطابق رسماً في الموقع، فمنصّةٌ هنا بلا
-- رسمٍ هناك تظهر بحرفها الأوّل ولا تنكسر.
INSERT INTO "MediaPlatform" ("id", "key", "name", "iconKey", "color", "sortOrder", "updatedAt") VALUES
  (gen_random_uuid(), 'x',         'إكس',       'x',         '#000000', 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'instagram', 'إنستغرام',  'instagram', '#E4405F', 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'snapchat',  'سناب شات',  'snapchat',  '#FFFC00', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'tiktok',    'تيك توك',   'tiktok',    '#000000', 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'linkedin',  'لينكدإن',   'linkedin',  '#0A66C2', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'facebook',  'فيسبوك',    'facebook',  '#1877F2', 6, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'youtube',   'يوتيوب',    'youtube',   '#FF0000', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'whatsapp',  'واتساب',    'whatsapp',  '#25D366', 8, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'telegram',  'تيليجرام',  'telegram',  '#26A5E4', 9, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
