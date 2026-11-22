import type { Metadata } from "next";
import { loadPortalProposals, requireFundraisingPortal } from "@/lib/portalFundraising";
import ProposalsClient from "./ProposalsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "مقترحاتنا | تنمية الموارد المالية" };

/**
 * كلُّ ما اقترحته الجمعيةُ في مجالات الجهات، ومصيرُ كلِّ مقترح.
 *
 * وهي ما بين الشاشتين: «الجهات» أين نقترح، و«المنح» ما رُفع فعلاً — وهذه
 * ما كُتب وينتظر.
 */
export default async function PortalProposalsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { charity } = await requireFundraisingPortal(name);
  const proposals = await loadPortalProposals(charity.id);

  return <ProposalsClient charityName={charity.name} proposals={proposals} />;
}
