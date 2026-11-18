import type { Metadata } from "next";
import { loadPortalGrants, requireFundraisingPortal } from "@/lib/portalFundraising";
import GrantsClient from "./GrantsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "المنح | تنمية الموارد المالية" };

/**
 * المنحُ التي رفعتها الجمعيةُ إلى الجهات المانحة، وحالةُ كلٍّ منها.
 *
 * ومنصّةُ إحسان وصندوقُ دعم الجمعيات مستثنيان اليوم — انظر `loadPortalGrants`.
 */
export default async function PortalGrantsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { charity } = await requireFundraisingPortal(name);
  const grants = await loadPortalGrants(charity.id);

  return <GrantsClient charityName={charity.name} grants={grants} />;
}
