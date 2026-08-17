"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guards";

// Gated on the same permission the communication screen uses in
// EmployeeSidebar. getCommunicationData in particular returns personal contact
// details (chairman/CEO names and phone numbers) for every charity.
export async function getCommunicationData() {
  try {
    await requirePermission("manage_communication");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

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
        logoUrl: charity.logoUrl,
        email: charity.email,
        phone: charity.phone,
        chairmanName: charity.chairmanName,
        chairmanPhone: charity.chairmanPhone,
        ceoName: charity.ceoName,
        ceoPhone: charity.ceoPhone,
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
    await requirePermission("manage_communication");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        responsibleName,
        responsiblePhone,
      }
    });

    revalidatePath("/main/communication");
    return { success: true };
  } catch (error) {
    console.error("Error updating service responsible:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث بيانات المسؤول" };
  }
}

export async function updateCharityContact(
  charityId: string,
  data: {
    email?: string | null;
    phone?: string | null;
    chairmanName?: string | null;
    chairmanPhone?: string | null;
    ceoName?: string | null;
    ceoPhone?: string | null;
  }
) {
  try {
    await requirePermission("manage_communication");
  } catch {
    return { success: false, error: "غير مصرح" };
  }

  try {
    await prisma.charity.update({
      where: { id: charityId },
      data,
    });

    revalidatePath("/main/communication");
    return { success: true };
  } catch (error) {
    console.error("Error updating charity contact:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث بيانات الجمعية" };
  }
}
