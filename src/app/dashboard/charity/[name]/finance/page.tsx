import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import FinanceClient from "./FinanceClient";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | المالية`,
  };
}

export default async function CharityFinancePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch charity record from Charity table or bootstrap it from survey responses
  let charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    include: {
      financialLogs: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!charity) {
    const latestResponse = await prisma.surveyResponse.findFirst({
      where: { charityName: { equals: decodedName, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });

    const createdCharity = await prisma.charity.create({
      data: {
        name: decodedName,
        establishmentDate: latestResponse?.establishmentDate || null,
        licenseNumber: latestResponse?.licenseNumber || null,
      },
    });

    charity = {
      ...createdCharity,
      financialLogs: []
    } as any;
  }

  return (
    <FinanceClient
      charity={{
        id: charity!.id,
        name: charity!.name,
        logoUrl: charity!.logoUrl,
        contractValue: charity!.contractValue,
        paidAmount: charity!.paidAmount,
        grants: charity!.grants,
      }}
      initialLogs={charity!.financialLogs || []}
    />
  );
}
