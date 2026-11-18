-- المشاريعُ المقترحة: ما تقول الجمعيةُ إنّها تنوي رفعَه في مجالِ منحٍ عند جهة.
--
-- وهي اقتراحٌ لا منحة: المنحةُ (`GrantApplication`) وثيقةٌ رُفعت بمبلغٍ وحالة،
-- وهذا نيّةٌ تُكتب في بوّابة الجمعية فيقرؤها فريقُ زادٍ في ملف الجهة. ولو
-- كُتبت في جدول المنح لاختلط المرفوعُ بالمقترح في كلِّ عدٍّ وتقرير.
--
-- و`initiativeId` حين يُختار المشروعُ من الخطة التشغيلية، و`name` في الحالين:
-- اسمُ المشروع وقتَ الاقتراح يبقى مكتوباً ولو أُعيدت تسميةُ المبادرة أو حُذفت
-- خطّتُها — كما في `GrantApplication.entityName`.

CREATE TABLE IF NOT EXISTS "GrantProposal" (
  "id"           TEXT PRIMARY KEY,
  "donorFieldId" TEXT NOT NULL REFERENCES "DonorField"("id") ON DELETE CASCADE,
  "charityId"    TEXT NOT NULL REFERENCES "Charity"("id") ON DELETE CASCADE,
  "initiativeId" TEXT REFERENCES "Initiative"("id") ON DELETE SET NULL,
  "name"         TEXT NOT NULL,
  "note"         TEXT,
  "createdById"  TEXT REFERENCES "CharityUser"("id") ON DELETE SET NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "GrantProposal_donorFieldId_charityId_idx"
  ON "GrantProposal" ("donorFieldId", "charityId");
CREATE INDEX IF NOT EXISTS "GrantProposal_charityId_idx"
  ON "GrantProposal" ("charityId");
