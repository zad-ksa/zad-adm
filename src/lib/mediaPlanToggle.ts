import { prisma } from "@/lib/db";
import { publishingPlanValue } from "@/lib/publishingPlan";

/**
 * هل فُعِّل تبويبُ «الخطة الإعلامية» في بوّابة هذه الجمعية؟
 *
 * والمفتاحُ بيد زادٍ وحدَها (صفحةُ الخطّة عند زاد)، لأنّ الخدمةَ تُقدَّم للجمعية
 * قبل أن تُبدأ خطّتُها: تبويبٌ يُفتح على تقويمٍ فارغٍ خبرٌ كاذب.
 *
 * **ويُقرأ في موضعٍ واحد** — هنا — فيقرؤه الشريطُ الجانبيُّ والصفحةُ والأفعال:
 * ولو حُسب في كلٍّ منها لافترق المعروضُ عن المسموح، وهي علّةُ هذه الطبقة
 * المعروفة.
 */
export async function isMediaPlanEnabled(charityId: string): Promise<boolean> {
  try {
    const row = await prisma.charity.findUnique({
      where: { id: charityId },
      select: { mediaPlanEnabled: true },
    });
    return row?.mediaPlanEnabled ?? false;
  } catch (error) {
    // العمودُ لم يُنشأ بعد (`prisma/sql/media-plan-toggle.sql`). ويُقرأ «مُشعَلاً»
    // كما كان الحالُ قبل المفتاح: هجرةٌ لم تُطبَّق لا تُغلق تبويباً مفتوحاً، ولا
    // تُسقط البوّابةَ على كلِّ جمعية.
    console.error("isMediaPlanEnabled", error);
    return true;
  }
}

/**
 * خطّةُ النشر المكتوبةُ لهذه الجمعية — أو `null` إن لم تُكتب بعد.
 *
 * وهنا لا في الصفحتين: تقرؤها صفحةُ زادٍ لتُعرض في صندوق الكتابة، وصفحةُ
 * الجمعية لتُعرض قراءةً — ونصٌّ يُقرأ في موضعين بحارسَين مختلفين يُقرأ من دالّةٍ
 * واحدة.
 *
 * **وتسقط إلى `null` لا إلى عطب**: العمودُ قد لا يكون أُنشئ بعد
 * (`prisma/sql/media-publishing-plan.sql`)، وخطّةٌ لم تُكتب وخطّةٌ لم يُهاجَر
 * عمودُها سواءٌ في المعروض — وهو أهونُ من صفحةٍ تسقط كلُّها.
 */
export async function readPublishingPlan(charityId: string): Promise<string | null> {
  try {
    const row = await prisma.charity.findUnique({
      where: { id: charityId },
      select: { publishingPlan: true },
    });
    return publishingPlanValue(row?.publishingPlan);
  } catch (error) {
    console.error("readPublishingPlan", error);
    return null;
  }
}
