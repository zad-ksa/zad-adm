-- مجالاتُ المنح في الجهة المانحة: صفوفٌ لا نصٌّ واحد.
--
-- كان `DonorOrg.fields` جملةً تُكتب فتُقرأ ولا تُستعمل. وبوّابةُ الجمعية تعرض
-- تحت كلِّ مجالٍ مشاريعَها المقترحةَ فيه، ولا يُعلَّق شيءٌ على سطرٍ من نصّ.
--
-- والعمودُ القديم لا يُمسّ: فيه ما كُتب لستٍّ وستين جهة، ويُنقل إلى مجالاتٍ
-- بزرٍّ في ملف الجهة متى شاء أهلُه — فالنقلُ قرارُ قارئٍ لا هجرةٌ تُخمّن.

CREATE TABLE IF NOT EXISTS "DonorField" (
  "id"          TEXT PRIMARY KEY,
  "donorOrgId"  TEXT NOT NULL REFERENCES "DonorOrg"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "order"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "DonorField_donorOrgId_order_idx"
  ON "DonorField" ("donorOrgId", "order");
