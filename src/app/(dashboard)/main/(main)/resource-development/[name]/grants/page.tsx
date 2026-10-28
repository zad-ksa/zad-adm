import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GrantsClient from "./GrantsClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | المنح المرفوعة`,
  };
}

export default async function GrantsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_resource_development", decodedName);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    include: {
      grantApplications: {
        orderBy: { createdAt: "desc" }
      },
    }
  });

  if (!charity) {
    notFound();
  }

  // الجهاتُ كلُّها: المنحةُ تُرفع لجهةٍ من الصفوف المسجَّلة، لا من حسابات هذه
  // الجمعية — فقد تُرفع لجهةٍ لم يُسجَّل حسابُها بعد.
  const donorOrgs = await prisma.donorOrg.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <GrantsClient
      charityId={charity.id}
      charityName={charity.name}
      isInternal={charity.isInternal}
      initialGrantApplications={charity.grantApplications}
      donorOrgs={donorOrgs}
    />
  );
}
