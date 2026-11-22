import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePortalPermission } from "@/lib/portalAccess";
import { guideSize, isGuideSize } from "@/lib/governanceGuide";
import { governanceManuals } from "@/data/governanceManual";
import GovernanceGuide from "./GovernanceGuide";

export const metadata: Metadata = { title: "دليل الحوكمة" };

/**
 * معاييرُ الحوكمة بحجمٍ بعينه — ممارساتُها وشواهدُها.
 *
 * **والحارسُ هنا من جديدٍ**: هذا العنوانُ يُكتب مباشرةً ولا يمرُّ بالصفحة
 * التي قبله، فالصلاحيّةُ تُفحص في كلِّ باب.
 */
export default async function GovernanceStandardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  const { name } = await params;
  const { size } = await searchParams;
  const access = await requirePortalPermission(name, "view_governance");
  const base = `/portal/${encodeURIComponent(access.charity.name)}/governance`;

  const picked = size?.toUpperCase();
  // وحجمٌ مجهولٌ يُردّ إلى الاختيار لا يُستبدل بحجمٍ افتراضي: دليلُ جمعيةٍ
  // صغيرةٍ يُعرض لكبيرةٍ خبرٌ كاذب، والصمتُ عنه أسوأ من ردّها.
  if (!isGuideSize(picked)) redirect(`${base}?change=1`);

  return (
    <GovernanceGuide
      charityName={access.charity.name}
      size={picked}
      sizeLabel={guideSize(picked)?.label ?? ""}
      standards={governanceManuals[picked] ?? []}
    />
  );
}
