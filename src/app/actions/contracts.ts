"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addInstallment(data: {
  charityId: string;
  amount: number;
  dueDate?: Date;
  isLinkedToFirstGrant?: boolean;
}) {
  try {
    const installment = await prisma.contractInstallment.create({
      data: {
        charityId: data.charityId,
        amount: data.amount,
        dueDate: data.dueDate || null,
        isLinkedToFirstGrant: data.isLinkedToFirstGrant || false,
        isPaid: false,
      } as any,
    });

    revalidatePath("/dashboard/contracts");
    return { success: "تمت إضافة القسط بنجاح", installment };
  } catch (error: any) {
    console.error("Error adding installment:", error);
    return { error: "حدث خطأ أثناء إضافة القسط" };
  }
}

export async function updateInstallment(data: {
  id: string;
  amount: number;
  dueDate?: Date;
  isLinkedToFirstGrant?: boolean;
  isPaid?: boolean;
}) {
  try {
    const installment = await prisma.contractInstallment.update({
      where: { id: data.id },
      data: {
        amount: data.amount,
        dueDate: data.dueDate || null,
        isLinkedToFirstGrant: data.isLinkedToFirstGrant || false,
        ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
      } as any,
    });

    revalidatePath("/dashboard/contracts");
    return { success: "تم تحديث القسط بنجاح", installment };
  } catch (error: any) {
    console.error("Error updating installment:", error);
    return { error: "حدث خطأ أثناء تحديث القسط" };
  }
}

export async function deleteInstallment(id: string) {
  try {
    await prisma.contractInstallment.delete({
      where: { id },
    });

    revalidatePath("/dashboard/contracts");
    return { success: "تم حذف القسط بنجاح" };
  } catch (error: any) {
    console.error("Error deleting installment:", error);
    return { error: "حدث خطأ أثناء حذف القسط" };
  }
}

export async function toggleInstallmentPaid(id: string, isPaid: boolean) {
  try {
    const paidDate = isPaid ? new Date() : null;
    
    const installment = await prisma.contractInstallment.update({
      where: { id },
      data: {
        isPaid,
        paidDate,
      },
    });

    revalidatePath("/dashboard/contracts");
    return { success: isPaid ? "تم تسجيل سداد القسط" : "تم إلغاء سداد القسط", installment };
  } catch (error: any) {
    console.error("Error toggling installment status:", error);
    return { error: "حدث خطأ أثناء تغيير حالة القسط" };
  }
}

export async function processFirstGrant(charityId: string, grantDate: Date) {
  try {
    const installments = await prisma.contractInstallment.updateMany({
      where: { 
        charityId, 
        isLinkedToFirstGrant: true,
        dueDate: null
      } as any,
      data: {
        dueDate: grantDate,
      },
    });

    revalidatePath("/dashboard/contracts");
    return { success: `تم تحديد تواريخ الاستحقاق لعدد ${installments.count} قسط بناءً على تاريخ أول منحة.` };
  } catch (error: any) {
    console.error("Error processing first grant:", error);
    return { error: "حدث خطأ أثناء معالجة ارتباط أول منحة." };
  }
}

export async function batchAddInstallments(data: {
  charityId: string;
  totalAmount: number;
  count: number;
}) {
  try {
    if (data.count <= 0) return { error: "عدد الأقساط غير صالح" };
    
    const amountPerInstallment = data.totalAmount / data.count;
    const installmentsData = Array.from({ length: data.count }).map(() => ({
      charityId: data.charityId,
      amount: amountPerInstallment,
      dueDate: null,
      isLinkedToFirstGrant: true,
      isPaid: false,
    }));

    await prisma.contractInstallment.createMany({
      data: installmentsData as any[],
    });

    revalidatePath("/dashboard/contracts");
    return { success: `تم إنشاء ${data.count} أقساط مقسمة بنجاح` };
  } catch (error: any) {
    console.error("Error batch adding installments:", error);
    return { error: "حدث خطأ أثناء تقسيم الأقساط" };
  }
}
