"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission, requireAnyPermission } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";

// Every action here mutates contractual/financial records, so each one guards
// itself: server actions are directly reachable HTTP endpoints and are not
// covered by the page-level protection in src/proxy.ts.
//
// "edit_contracts" mirrors the canEdit gate already used by the contracts page
// (main/(main)/contracts/page.tsx), so no legitimate user loses access.
//
// The denial object is repeated inline rather than shared through a const on
// purpose: TypeScript only pads *fresh* object literals returned from the same
// function with optional undefined members, which is what keeps `res.error`
// and `res.success` both accessible at the call sites. Returning a shared const
// collapses that and breaks every caller's type-checking.

export async function addInstallment(data: {
  charityId: string;
  amount: number;
  dueDate?: Date;
  isLinkedToFirstGrant?: boolean;
}) {
  let actor;
  try {
    actor = await requirePermission("edit_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

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

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: "CREATE",
      targetType: "ContractInstallment",
      targetId: installment.id,
      metadata: { charityId: data.charityId, amount: data.amount },
    });

    revalidatePath("/main/contracts");
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
  let actor;
  try {
    actor = await requirePermission("edit_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

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

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: "UPDATE",
      targetType: "ContractInstallment",
      targetId: data.id,
      metadata: { amount: data.amount, isPaid: data.isPaid },
    });

    revalidatePath("/main/contracts");
    return { success: "تم تحديث القسط بنجاح", installment };
  } catch (error: any) {
    console.error("Error updating installment:", error);
    return { error: "حدث خطأ أثناء تحديث القسط" };
  }
}

export async function deleteInstallment(id: string) {
  let actor;
  try {
    actor = await requirePermission("edit_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    await prisma.contractInstallment.delete({
      where: { id },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: "DELETE",
      targetType: "ContractInstallment",
      targetId: id,
    });

    revalidatePath("/main/contracts");
    return { success: "تم حذف القسط بنجاح" };
  } catch (error: any) {
    console.error("Error deleting installment:", error);
    return { error: "حدث خطأ أثناء حذف القسط" };
  }
}

export async function toggleInstallmentPaid(id: string, isPaid: boolean) {
  // Reachable from two screens with different gates: the contracts screen
  // (edit_contracts) and the charity finance screen (manage_finance).
  let actor;
  try {
    actor = await requireAnyPermission(["edit_contracts", "manage_finance"]);
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    const paidDate = isPaid ? new Date() : null;
    
    const installment = await prisma.contractInstallment.findUnique({
      where: { id },
      include: { charity: true }
    });

    if (!installment || !installment.charity) return { error: "القسط أو الجمعية غير موجودة" };

    const queries: any[] = [];

    queries.push(
      prisma.contractInstallment.update({
        where: { id },
        data: {
          isPaid,
          paidDate,
        },
      })
    );

    if (isPaid && !installment.isPaid) {
      queries.push(
        prisma.charity.update({
          where: { id: installment.charityId },
          data: { paidAmount: installment.charity.paidAmount + installment.amount }
        })
      );
      queries.push(
        prisma.financialLog.create({
          data: {
            charityId: installment.charityId,
            type: "DISBURSEMENT",
            amount: installment.amount,
            notes: "سداد قسط مستحق"
          }
        })
      );
    } else if (!isPaid && installment.isPaid) {
      queries.push(
        prisma.charity.update({
          where: { id: installment.charityId },
          data: { paidAmount: Math.max(0, installment.charity.paidAmount - installment.amount) }
        })
      );
      queries.push(
        prisma.financialLog.create({
          data: {
            charityId: installment.charityId,
            type: "DISBURSEMENT",
            amount: -installment.amount,
            notes: "إلغاء سداد قسط"
          }
        })
      );
    }

    await prisma.$transaction(queries);

    // Money movement: this both flips the installment and writes a
    // DISBURSEMENT financial log, so it is the highest-value action to trace.
    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: isPaid ? "INSTALLMENT_MARKED_PAID" : "INSTALLMENT_MARKED_UNPAID",
      targetType: "ContractInstallment",
      targetId: id,
      metadata: {
        charityId: installment.charityId,
        charityName: installment.charity.name,
        amount: installment.amount,
      },
    });

    revalidatePath("/main/contracts");
    revalidatePath(`/portal/${encodeURIComponent(installment.charity.name)}/finance`);
    return { success: isPaid ? "تم تسجيل سداد القسط" : "تم إلغاء سداد القسط", installment: { ...installment, isPaid, paidDate } };
  } catch (error: any) {
    console.error("Error toggling installment status:", error);
    return { error: "حدث خطأ أثناء تغيير حالة القسط" };
  }
}

export async function processFirstGrant(charityId: string, grantDate: Date) {
  let actor;
  try {
    actor = await requirePermission("edit_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

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

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: "UPDATE",
      targetType: "ContractInstallment",
      metadata: { charityId, grantDate, affectedCount: installments.count, reason: "first_grant_scheduling" },
    });

    revalidatePath("/main/contracts");
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
  let actor;
  try {
    actor = await requirePermission("edit_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

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

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: actor?.id,
      actorName: actor?.name,
      action: "CREATE",
      targetType: "ContractInstallment",
      metadata: { charityId: data.charityId, totalAmount: data.totalAmount, count: data.count },
    });

    revalidatePath("/main/contracts");
    return { success: `تم إنشاء ${data.count} أقساط مقسمة بنجاح` };
  } catch (error: any) {
    console.error("Error batch adding installments:", error);
    return { error: "حدث خطأ أثناء تقسيم الأقساط" };
  }
}
