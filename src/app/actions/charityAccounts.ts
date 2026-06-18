"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function addCharityClientAccount(data: { name: string; phone: string; password: string; charityId: string }) {
  try {
    const session = await getSession();
    const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(session?.role || "");
    
    if (!isAdmin) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    if (!data.name || !data.phone || !data.password || !data.charityId) {
      return { success: false, error: "جميع الحقول مطلوبة" };
    }

    // Check if phone already exists
    const existing = await prisma.employee.findUnique({
      where: { phone: data.phone }
    });

    if (existing) {
      return { success: false, error: "رقم الجوال مسجل مسبقاً" };
    }

    const hashedPassword = await hash(data.password, 10);

    const employee = await prisma.employee.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        password: hashedPassword,
        role: "CHARITY_CLIENT",
        charityId: data.charityId,
        permissions: [],
        isActive: true,
      }
    });

    const charity = await prisma.charity.findUnique({ where: { id: data.charityId } });
    if (charity) {
      revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating charity account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء إنشاء الحساب" };
  }
}
