import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import FinanceClient from "./FinanceClient";

import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";

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
        },
        contractInstallments: {
          orderBy: { dueDate: "asc" }
        }
      }
    });

    if (!charityData) {
      const latestResponse = await prisma.surveyResponse.findFirst({
        where: { charityName: { equals: charityName, mode: "insensitive" } },
        orderBy: { createdAt: "desc" },
      });

      if (!latestResponse) {
        notFound();
      }

      const createdCharity = await prisma.charity.create({
        data: {
          name: charityName,
          establishmentDate: latestResponse.establishmentDate || null,
          licenseNumber: latestResponse.licenseNumber || null,
        },
      });

      charityData = {
        ...createdCharity,
        financialLogs: [],
        contractInstallments: [],
      } as any;
    }
    
    return charityData;
  };

export default async function CharityFinancePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // كانت الصفحة بلا بوابة: من يكتب الرابط يرى المالية ويسجّل سداد الأقساط.
  // البوابة قبل جلب البيانات، لأن الجلب قد يُنشئ الجمعية من استبيانها.
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_finance")) {
    redirect("/main");
  }

  const charity = await getCachedFinanceData(decodedName);

  const assignedIds = await getAssignedCharityIds(session.id, session.role, session.permissions);
  if (assignedIds !== null && !assignedIds.includes(charity!.id)) {
    redirect("/main");
  }



  return (
    <div className="space-y-12">
      <FinanceClient
        charity={{
          id: charity!.id,
          name: charity!.name,
          logoUrl: charity!.logoUrl,
          contractValue: charity!.contractValue,
          paidAmount: charity!.paidAmount,
          grants: charity!.grants,
          annualRevenue: (charity as any).annualRevenue,
        }}
        initialLogs={(charity as any).financialLogs || []}
        initialInstallments={(charity as any).contractInstallments || []}
      />
    </div>
  );
}
