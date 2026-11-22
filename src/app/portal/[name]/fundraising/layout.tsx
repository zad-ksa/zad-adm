import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { PORTAL_DONOR_KIND, requireFundraisingPortal } from "@/lib/portalFundraising";
import FundraisingNav from "./FundraisingNav";

/**
 * غلافُ قسم تنمية الموارد: حارسُه وتنقّلُه.
 *
 * **والحارسُ هنا كما في كلِّ صفحة**: عضويّةٌ وصلاحيّةٌ وفتحُ القسم لهذه
 * الجمعية. ولم يُحذف من الصفحات: غلافٌ يحرس وصفحةٌ تُستدعى من غيره يومَ
 * تُنقل — والحراسةُ تُكرَّر ولا تُفترض.
 *
 * **والعددان يُجلبان مرّةً للشاشتين**: كلاهما سطرٌ واحدٌ في القاعدة، ووجودُهما
 * على التبويب يقول حجمَ ما خلفه قبل فتحه.
 */
export default async function FundraisingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const { charity } = await requireFundraisingPortal(name);

  const [donors, grants, proposals] = await Promise.all([
    prisma.donorOrg.count({ where: { kind: PORTAL_DONOR_KIND } }),
    prisma.grantApplication.count({
      where: { charityId: charity.id, donorOrg: { kind: PORTAL_DONOR_KIND } },
    }),
    // ومحروسٌ: جدولُ المقترحات قد لا يكون أُنشئ بعد، ولا يسقط القسمُ لعدّاد.
    prisma.grantProposal.count({ where: { charityId: charity.id } }).catch(() => 0),
  ]);

  return (
    <div className="space-y-4">
      <FundraisingNav charityName={charity.name} donors={donors} proposals={proposals} grants={grants} />
      {children}
    </div>
  );
}
