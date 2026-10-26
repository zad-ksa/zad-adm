-- حذف بقايا ميزة «طلب تصميم عاجل» التي نُقضت في cf09f06.
-- العمودان بقيا في القاعدة بعد حذفهما من المخطّط، والكود لا يستعملهما،
-- وفحصٌ قبل الحذف أثبت خلوّهما: ٧٩ طلباً، صفر عاجل، صفر سبب.
ALTER TABLE "DesignRequest" DROP COLUMN IF EXISTS "isUrgent";
ALTER TABLE "DesignRequest" DROP COLUMN IF EXISTS "urgentReason";
