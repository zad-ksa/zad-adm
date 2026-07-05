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
      const unifiedServices = charity.services.map(s => ({
        id: s.id,
        name: s.name,
        department: s.department,
        responsibleName: s.responsibleName,
        responsiblePhone: s.responsiblePhone,
        isPillar: false
      }));
    
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
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        responsibleName,
        responsiblePhone,
      }
    });

    revalidatePath("/dashboard/communication");
    return { success: true };
  } catch (error) {
    console.error("Error updating service responsible:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث بيانات المسؤول" };
  }
}
