import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import FinanceClient from "./FinanceClient";
import FinanceStagesManager from "./FinanceStagesManager";
import DepartmentServicesTimeline from "@/components/DepartmentServicesTimeline";


export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | المالية`,
  };
}

const getCachedFinanceData = async (charityName: string) => {
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
  };

export default async function CharityFinancePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await getCachedFinanceData(decodedName);

  let stages: any[] = [];
  if (charity) {
    stages = await prisma.financeStage.findMany({
      where: { charityId: charity.id },
      orderBy: { order: 'asc' },
    });
  }

  return (
    <div className="space-y-12">
      {charity && (
        <DepartmentServicesTimeline charityId={charity.id} department="FINANCE" />
      )}

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
    </div>
  );
}
