import { prisma } from "@/lib/db";
import { PORTAL_DONOR_KIND } from "@/lib/portalFundraising";
import FundraisingNav from "./FundraisingNav";

/**
 * تبويبُ القسم بعدَديه — يُستدعى من الصفحة لا من الغلاف.
 *
 * **ولمَ نزل من الغلاف**: الغلافُ يسبق الصفحةَ كلَّها، فكان التبويبُ فوق
 * مسار التنقّل فوق العنوان — وترتيبٌ مقلوب: العنوانُ يقول أين أنت، ثمّ
 * التبويبُ يقول إلى أين تنتقل. وصار كلُّ قائمةٍ تضعه تحت عنوانها.
 *
 * **وملفُّ الجهة لا يستدعيه**: هو صفحةُ ابنٍ، ومسارُ التنقّل فيه يُعيد —
 * وتبويبٌ هناك يُعلِّم «الجهات المانحة» وأنت لست في قائمتها.
 */
export default async function FundraisingTabs({
  charityId,
  charityName,
}: {
  charityId: string;
  charityName: string;
}) {
  const [donors, grants] = await Promise.all([
    prisma.donorOrg.count({ where: { kind: PORTAL_DONOR_KIND } }),
    prisma.grantApplication.count({
      where: { charityId, donorOrg: { kind: PORTAL_DONOR_KIND } },
    }),
  ]);

  return <FundraisingNav charityName={charityName} donors={donors} grants={grants} />;
}
