import { prisma } from "@/lib/db";

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
