import { prisma } from "@/lib/db";
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

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    include: {
      grantApplications: {
        orderBy: { createdAt: "desc" }
      },
      donorAccounts: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!charity) {
    notFound();
  }

  return (
    <GrantsClient
      charityId={charity.id}
      charityName={charity.name}
      initialGrantApplications={charity.grantApplications}
      donorAccounts={charity.donorAccounts}
    />
  );
}
