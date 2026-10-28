-- نقل طلبات تصاميم زاد من «غياب الجمعية» إلى الكيان الداخلي.
--
-- كان charityId = NULL يعني «الطلب لشركة زاد نفسها». وقد صارت زاد صفّاً حقيقياً
-- في Charity بعلامة isInternal، فنُقلت الطلبات إليه وصار العمود إلزامياً — فلا
-- يبقى في الجدول معنىً ثانٍ للغياب يُنسى عند أوّل استعلام.
--
-- والطابور لا يتغيّر: الجدولة تجمع الطلبات بـcharityId، وكل الصفوف المنقولة
-- كانت NULL معاً فكانت طابوراً واحداً، وصارت الآن طابور الكيان نفسه.

DO $$
DECLARE
  zad_id    text;
  moved     int;
  remaining int;
BEGIN
  SELECT id INTO zad_id
    FROM "Charity"
   WHERE "isInternal" = true AND name = 'شركة زاد'
   LIMIT 1;

  IF zad_id IS NULL THEN
    RAISE EXCEPTION 'لا كيان داخلي باسم «شركة زاد» — شغّل scripts/seed-internal-entity.js أولاً';
  END IF;

  UPDATE "DesignRequest"
     SET "charityId" = zad_id,
         "updatedAt" = NOW()
   WHERE "charityId" IS NULL;

  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'نُقل % طلباً إلى %', moved, zad_id;

  SELECT count(*) INTO remaining FROM "DesignRequest" WHERE "charityId" IS NULL;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'بقيت % صفوفاً بلا جمعية', remaining;
  END IF;
END $$;

ALTER TABLE "DesignRequest" ALTER COLUMN "charityId" SET NOT NULL;
