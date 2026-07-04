"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCommunicationData() {
  try {
    const charities = await prisma.charity.findMany({
      include: {
        services: {
          orderBy: { createdAt: 'asc' }
        },
      },
      orderBy: { name: 'asc' }
    });
    
    const mappedCharities = charities.map(charity => {
      const unifiedServices = [
        {
          id: `PILLAR_STRATEGY_${charity.id}`,
          name: charity.strategyTimelineName || "التخطيط الاستراتيجي",
          department: "STRATEGY",
          responsibleName: charity.strategyResponsibleName,
          responsiblePhone: charity.strategyResponsiblePhone,
          isPillar: true
        },
        {
          id: `PILLAR_GOVERNANCE_${charity.id}`,
          name: charity.governanceTimelineName || "الحوكمة",
          department: "GOVERNANCE",
          responsibleName: charity.governanceResponsibleName,
          responsiblePhone: charity.governanceResponsiblePhone,
          isPillar: true
        },
        {
          id: `PILLAR_FINANCE_${charity.id}`,
          name: charity.financeTimelineName || "تنمية الموارد المالية",
          department: "FINANCE",
          responsibleName: charity.financeResponsibleName,
          responsiblePhone: charity.financeResponsiblePhone,
          isPillar: true
        },
        ...charity.services.map(s => ({
          id: s.id,
          name: s.name,
          department: s.department,
          responsibleName: s.responsibleName,
          responsiblePhone: s.responsiblePhone,
          isPillar: false
        }))
      ];
    
      return {
        id: charity.id,
        name: charity.name,
        services: unifiedServices
      };
    });

    return { success: true, charities: mappedCharities };
  } catch (error) {
    console.error("Error fetching communication data:", error);
    return { success: false, error: "حدث خطأ أثناء جلب البيانات" };
  }
}

export async function updateServiceResponsible(
  serviceId: string,
  responsibleName: string | null,
  responsiblePhone: string | null
) {
  try {
    if (serviceId.startsWith("PILLAR_")) {
      const parts = serviceId.split("_");
      const pillarType = parts[1];
      const charityId = parts.slice(2).join("_");
      
      let dataToUpdate = {};
      if (pillarType === "STRATEGY") {
        dataToUpdate = { strategyResponsibleName: responsibleName, strategyResponsiblePhone: responsiblePhone };
      } else if (pillarType === "GOVERNANCE") {
        dataToUpdate = { governanceResponsibleName: responsibleName, governanceResponsiblePhone: responsiblePhone };
      } else if (pillarType === "FINANCE") {
        dataToUpdate = { financeResponsibleName: responsibleName, financeResponsiblePhone: responsiblePhone };
      }
  
      await prisma.charity.update({
        where: { id: charityId },
        data: dataToUpdate
      });
    } else {
      await prisma.service.update({
        where: { id: serviceId },
        data: {
          responsibleName,
          responsiblePhone,
        }
      });
    }

    revalidatePath("/dashboard/communication");
    return { success: true };
  } catch (error) {
    console.error("Error updating service responsible:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث بيانات المسؤول" };
  }
}
