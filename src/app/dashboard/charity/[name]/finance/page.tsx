import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import FinanceClient from "./FinanceClient";
import { unstable_cache } from "next/cache";

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

  const getCachedFinanceData = unstable_cache(
    async (charityName: string) => {
      let charityData = await prisma.charity.findUnique({
        where: { name: charityName },
        include: {
          financialLogs: {
            orderBy: { createdAt: "desc" }
          }
        }
      });

      if (!charityData) {
        const latestResponse = await prisma.surveyResponse.findFirst({
          where: { charityName: { equals: charityName, mode: "insensitive" } },
          orderBy: { createdAt: "desc" },
        });

        const createdCharity = await prisma.charity.create({
          data: {
            name: charityName,
            establishmentDate: latestResponse?.establishmentDate || null,
            licenseNumber: latestResponse?.licenseNumber || null,
          },
        });

        charityData = {
          ...createdCharity,
          financialLogs: []
        } as any;
      }
      
      return charityData;
    },
    ['charity-finance'],
    { revalidate: 300, tags: ['finance'] }
  );

  const charity = await getCachedFinanceData(decodedName);

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
