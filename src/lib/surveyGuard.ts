import { prisma } from "@/lib/db";
import { AuthError, requirePermission } from "@/lib/guards";
import { getSurveyScope, maySeeSurvey } from "@/lib/surveyAccess";

/**
 * الحارسُ الواحدُ لأفعال استبيانٍ بعينه: التحرير، والحذف، والنسخ، وتوليد
 * الرابط، وقراءةُ الردود.
 *
 * فالقائمةُ تُرشِّح ما يُرى، **والترشيحُ ليس حراسة**: من يحمل «ما أنشأه وحده»
 * لا يرى استبيانَ غيره في القائمة، ويصل إلى مساره بكتابة مُعرِّفه. فكلُّ فعلٍ
 * يُفحص عند مدخله.
 *
 * ويُقرأ المالكُ ثمّ يُحكَم، لا `update` بشرطٍ على المالك: ذاك يرفع خطأً عامّاً
 * لا يُفرَّق فيه بين «ليس لك» و«غير موجود»، فيُقال للمستخدم رمزُ ٥٠٠.
 *
 * والمُعرِّفُ يُقبَل أو الرابطُ (`slug`) — فبعضُ المسارات تُستدعى بأيِّهما.
 */
export async function requireOwnedSurvey(idOrSlug: string) {
  const session = await requirePermission("manage_own_surveys");
  const survey = await prisma.customSurvey.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, title: true, createdById: true },
  });
  if (!survey) throw new AuthError("الاستبيان غير موجود", 404);
  if (!maySeeSurvey(getSurveyScope(session), survey.createdById)) {
    throw new AuthError("هذا الاستبيان ليس من إنشائك", 403);
  }
  return { session, survey };
}
