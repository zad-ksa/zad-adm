import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  loadPortalDonorFile,
  loadPortalInitiatives,
  requireFundraisingPortal,
} from "@/lib/portalFundraising";
import DonorFileClient from "./DonorFileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; id: string }>;
}): Promise<Metadata> {
  const { name, id } = await params;
  const { charity } = await requireFundraisingPortal(name);
  const file = await loadPortalDonorFile(charity.id, id);
  return { title: file ? `${file.donor.name} | تنمية الموارد المالية` : "تنمية الموارد المالية" };
}

/**
 * ملفُّ الجهة في بوّابة الجمعية: بياناتُها، وما رُفع إليها، ومجالاتُ منحها.
 *
 * وتحت كلِّ مجالٍ مشاريعُ الجمعية المقترحةُ فيه — تُختار من مبادرات خطّتها
 * التشغيلية أو تُكتب من خارجها، ويقرؤها فريقُ زادٍ في ملف الجهة عنده.
 */
export default async function PortalDonorPage({
  params,
}: {
  params: Promise<{ name: string; id: string }>;
}) {
  const { name, id } = await params;
  const { charity } = await requireFundraisingPortal(name);

  const [file, initiatives] = await Promise.all([
    loadPortalDonorFile(charity.id, id),
    loadPortalInitiatives(charity.id),
  ]);
  if (!file) notFound();

  return (
    <DonorFileClient
      charityId={charity.id}
      charityName={charity.name}
      donor={file.donor}
      fields={file.fields}
      initiatives={initiatives}
      usedInitiativeIds={file.usedInitiativeIds}
    />
  );
}
