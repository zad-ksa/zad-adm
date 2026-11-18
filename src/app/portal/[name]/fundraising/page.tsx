import type { Metadata } from "next";
import { loadPortalDonors, requireFundraisingPortal } from "@/lib/portalFundraising";
import DonorsClient from "./DonorsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "تنمية الموارد المالية" };

/**
 * الجهاتُ المانحةُ كما تراها الجمعية: حالةُ الرفع، وحسابُها عند كلِّ جهة.
 *
 * والحارسُ في `requireFundraisingPortal`: عضويّةٌ وصلاحيّةٌ وفتحُ القسم لهذه
 * الجمعية — فالقسمُ يُجرَّب على جمعيةٍ واحدةٍ أوّلاً، وكتابةُ العنوان في غيرها
 * تُردّ كما يَرُدّ التبويبُ «قريباً».
 */
export default async function FundraisingPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { charity } = await requireFundraisingPortal(name);
  const donors = await loadPortalDonors(charity.id);

  return <DonorsClient charityId={charity.id} charityName={charity.name} donors={donors} />;
}
