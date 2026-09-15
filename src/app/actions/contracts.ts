"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermission, requireAnyPermission } from "@/lib/guards";
import { logAudit } from "@/lib/auditLog";
import { getAssignedCharityIds } from "@/lib/access";

// Every action here mutates contractual/financial records, so each one guards
// itself: server actions are directly reachable HTTP endpoints and are not
// covered by the page-level protection in src/proxy.ts.
//
// "manage_contracts" mirrors the canEdit gate already used by the contracts page
// (main/(main)/contracts/page.tsx), so no legitimate user loses access.
//
// The denial object is repeated inline rather than shared through a const on
// purpose: TypeScript only pads *fresh* object literals returned from the same
// function with optional undefined members, which is what keeps `res.error`
// and `res.success` both accessible at the call sites. Returning a shared const
// collapses that and breaks every caller's type-checking.

const OUT_OF_SCOPE = "هذه الجمعية غير مسندة إليك";

/**
 * العقود تتبع جمعيات الموظف المسنَدة كبقية الموقع؛ developer_mode وحدها بلا قيد.
 * كانت الصفحة تعرض الجمعيات كلها، والأفعال تقبل أي جمعيةٍ أو قسط.
 */
async function charityInScope(
  actor: { id: string; role: string; permissions?: string[] },
  charityId: string
) {
  const assigned = await getAssignedCharityIds(actor.id, actor.role, actor.permissions);
  return assigned === null || assigned.includes(charityId);
}

export async function addInstallment(data: {
  charityId: string;
  amount: number;
  dueDate?: Date;
  isLinkedToFirstGrant?: boolean;
}) {
  let actor;
  try {
    actor = await requirePermission("manage_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    if (!(await charityInScope(actor, data.charityId))) return { error: OUT_OF_SCOPE };

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
    actor = await requirePermission("manage_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    const existing = await prisma.contractInstallment.findUnique({ where: { id: data.id }, select: { charityId: true } });
    if (!existing) return { error: "القسط غير موجود" };
    if (!(await charityInScope(actor, existing.charityId))) return { error: OUT_OF_SCOPE };

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
    actor = await requirePermission("manage_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    const existing = await prisma.contractInstallment.findUnique({ where: { id }, select: { charityId: true } });
    if (!existing) return { error: "القسط غير موجود" };
    if (!(await charityInScope(actor, existing.charityId))) return { error: OUT_OF_SCOPE };

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
  // (manage_contracts) and the charity finance screen (manage_finance).
  let actor;
  try {
    actor = await requireAnyPermission(["manage_contracts", "manage_finance"]);
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
    if (!(await charityInScope(actor, installment.charityId))) return { error: OUT_OF_SCOPE };

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

// processFirstGrant أُزيلت: نداؤها الوحيد كان في نموذجٍ ماليٍّ لا تعرضه الواجهة،
// فلم تُجدوَل أقساط «أول منحة» قطّ. الجدولة الآن عند اعتماد المنحة، في
// updateGrantApplicationStatus (actions/charity.ts).

export async function batchAddInstallments(data: {
  charityId: string;
  totalAmount: number;
  count: number;
}) {
  let actor;
  try {
    actor = await requirePermission("manage_contracts");
  } catch {
    return { error: "ليس لديك صلاحية لإدارة العقود" };
  }

  try {
    if (data.count <= 0) return { error: "عدد الأقساط غير صالح" };
    if (!(await charityInScope(actor, data.charityId))) return { error: OUT_OF_SCOPE };
    
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
