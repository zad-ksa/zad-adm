-- الإشعارُ الانبثاقيُّ: يقف أمام عضو الجمعية في الصفحة التي يَعنيه فيها.
--
-- وهو غيرُ جرس الإشعارات: الجرسُ خبرٌ يُقرأ متى شاء صاحبُه، وهذا يُعرض عند
-- فتح صفحةٍ بعينها — ولذلك له موضعٌ وعمرٌ وتكرار.
--
-- و«الجمعيات» فارغةً تعني الكلَّ: جمعيةٌ تُضاف بعد كتابة الإشعار تدخل فيه بلا
-- تعديل، وهو المقصود في التعميم.

CREATE TABLE IF NOT EXISTS "PortalPopup" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "pageKey"     TEXT NOT NULL DEFAULT 'ANY',
  "charityIds"  TEXT[] NOT NULL DEFAULT '{}'::text[],
  "repeatMode"  TEXT NOT NULL DEFAULT 'ONCE',
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "startsAt"    TIMESTAMP(3),
  "endsAt"      TIMESTAMP(3),
  "createdById" TEXT REFERENCES "Employee"("id") ON DELETE SET NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PortalPopup_isActive_pageKey_idx"
  ON "PortalPopup" ("isActive", "pageKey");

CREATE TABLE IF NOT EXISTS "PortalPopupSeen" (
  "id"            TEXT PRIMARY KEY,
  "popupId"       TEXT NOT NULL REFERENCES "PortalPopup"("id") ON DELETE CASCADE,
  "charityUserId" TEXT NOT NULL REFERENCES "CharityUser"("id") ON DELETE CASCADE,
  "seenAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortalPopupSeen_popupId_charityUserId_key"
  ON "PortalPopupSeen" ("popupId", "charityUserId");
CREATE INDEX IF NOT EXISTS "PortalPopupSeen_charityUserId_idx"
  ON "PortalPopupSeen" ("charityUserId");
