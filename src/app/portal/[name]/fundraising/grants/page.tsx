import type { Metadata } from "next";
import { loadPortalGrants, requireFundraisingPortal } from "@/lib/portalFundraising";
import GrantsClient from "./GrantsClient";
import FundraisingTabs from "../FundraisingTabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "المنح | تنمية الموارد المالية" };

/**
 * المنحُ التي رفعتها الجمعيةُ إلى الجهات المانحة، وحالةُ كلٍّ منها.
 *
 * ومنصّةُ إحسان وصندوقُ دعم الجمعيات مستثنيان اليوم — انظر `loadPortalGrants`.
 */
export default async function PortalGrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  /** `donor=<id>` — تُفتح مُرشَّحةً بجهةٍ بعينها من ملفِّها. */
  searchParams: Promise<{ donor?: string }>;
}) {
  const { name } = await params;
  const { donor } = await searchParams;
  const { charity } = await requireFundraisingPortal(name);
  const grants = await loadPortalGrants(charity.id);

  // وقائمةُ الجهات تُبنى من الصفوف نفسِها: لا يُرشَّح إلّا بما رُفع إليه.
  const donors = [...new Map(grants.filter((g) => g.donorOrgId).map((g) => [g.donorOrgId!, g.donorName])).entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "ar"));

  return (
    <GrantsClient
      charityName={charity.name}
      grants={grants}
      donors={donors}
      initialDonor={donor && donors.some((d) => d.id === donor) ? donor : null}
      tabs={<FundraisingTabs charityId={charity.id} charityName={charity.name} />}
    />
  );
}
