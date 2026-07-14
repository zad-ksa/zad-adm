import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DonorsClient from "./DonorsClient";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | الجهات المانحة`,
  };
}

export default async function DonorsPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    include: {
      donorAccounts: {
        orderBy: { createdAt: "desc" }
      },
      grantApplications: {
        orderBy: { createdAt: "desc" }
      },
    }
  });

  if (!charity) {
    notFound();
  }

  return (
    <DonorsClient
      charityId={charity.id}
      charityName={charity.name}
      initialDonorAccounts={charity.donorAccounts}
      grantApplications={charity.grantApplications}
    />
  );
}
