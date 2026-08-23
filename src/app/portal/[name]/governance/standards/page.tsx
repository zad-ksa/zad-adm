import { governanceManuals, CharitySize } from "@/data/governanceManual";
import { redirect } from "next/navigation";
import SaveCharitySize from "@/components/SaveCharitySize";
import GovernanceDocHub from "./GovernanceDocHub";
import { requirePortalPermission } from "@/lib/portalAccess";

export default async function GovernanceStandardsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ name: string }>,
  searchParams: Promise<{ size?: string }>
}) {
  const { name } = await params;
  const { size } = await searchParams;
  const charityName = decodeURIComponent(name);

  // Guarded independently of the parent page — this URL is reachable directly,
  // which is precisely how the custom-surveys gap in the last audit happened.
  await requirePortalPermission(name, "view_governance");

  const sizeParam = (size?.toUpperCase() || "SMALL") as CharitySize;
  
  // Validate size
  if (!governanceManuals[sizeParam]) {
    redirect(`/portal/${encodeURIComponent(charityName)}/governance`);
  }

  const standards = governanceManuals[sizeParam] || [];

  return (
    <>
      <SaveCharitySize charityName={charityName} size={sizeParam} />
      <GovernanceDocHub
        standards={standards}
        sizeParam={sizeParam}
        charityName={charityName}
      />
    </>
  );
}
