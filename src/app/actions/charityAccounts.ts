"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { CharityUserTitle } from "@prisma/client";

export async function addCharityClientAccount(data: { name: string; phone: string; title: string; charityIds: string[] }) {
  try {
    const session = await getSession();
    const canManage = hasPermission(session?.role || "", session?.permissions || [], "manage_charity_accounts");
    
    if (!canManage) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    if (!data.name || !data.phone || !data.title || !data.charityIds || data.charityIds.length === 0) {
      return { success: false, error: "جميع الحقول مطلوبة" };
    }

    // Check if phone already exists in CharityUser
    const existing = await prisma.charityUser.findUnique({
      where: { phone: data.phone }
    });

    if (existing) {
      return { success: false, error: "رقم الجوال مسجل مسبقاً" };
    }

    const newAccount = await prisma.charityUser.create({
      data: {
        name: data.name.trim(),
        phone: data.phone.trim(),
        title: data.title as CharityUserTitle,
        isActive: true,
        charities: {
          create: data.charityIds.map(id => ({
            charityId: id
          }))
        }
      },
      include: {
        charities: {
          include: { charity: { select: { name: true } } }
        }
      }
    });

    revalidatePath("/main/charity-accounts");

    return { 
      success: true, 
      account: {
        id: newAccount.id,
        name: newAccount.name,
        phone: newAccount.phone,
        title: newAccount.title,
        charityNames: newAccount.charities.map(c => c.charity.name),
        createdAt: newAccount.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    console.error("Error creating charity account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء إنشاء الحساب" };
  }
}

export async function deleteCharityClientAccount(accountId: string) {
  try {
    const session = await getSession();
    const canManage = hasPermission(session?.role || "", session?.permissions || [], "manage_charity_accounts");
    
    if (!canManage) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية" };
    }

    await prisma.charityUser.delete({
      where: { id: accountId }
    });

    revalidatePath("/main/charity-accounts");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting charity account:", error);
    return { success: false, error: error.message || "حدث خطأ أثناء الحذف" };
  }
}
