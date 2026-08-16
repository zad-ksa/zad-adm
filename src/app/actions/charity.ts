"use server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { encryptSecret } from "@/lib/encryption";
import { logAudit } from "@/lib/auditLog";
import { processFirstGrant } from "./contracts";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const getSidebarCharities = async () => {
  try {
    const session = await getSession();
    if (!session || !session.id) return [];

    // If admin or has full manage_charities permission, return all
    if (hasPermission(session.role, session.permissions, "manage_charities")) {
      return await prisma.charity.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    // Otherwise return only assigned charities
    const assigned = await prisma.employeeCharity.findMany({
      where: { employeeId: session.id },
      include: { charity: true },
      orderBy: { charity: { createdAt: "desc" } }
    });

    return assigned.map(a => a.charity);
  } catch (error) {
    console.error("Error fetching sidebar charities:", error);
    return [];
  }
};



export const getCharities = async () => {
    try {
      const charities = await prisma.charity.findMany({
        orderBy: { createdAt: "desc" },
      });
      return charities;
    } catch (error) {
      console.error("Error fetching charities:", error);
      return [];
    }
  };

export async function addCharity(data: { name: string; establishmentDate?: string; licenseNumber?: string; domain?: string; logoUrl?: string | null }) {
  try {
    const existing = await prisma.charity.findUnique({
      where: { name: data.name.trim() }
    });

    if (existing) {
      return { success: false, message: "ظ‡ط°ظ‡ ط§ظ„ط¬ظ…ط¹ظٹط© ظ…ظˆط¬ظˆط¯ط© ظ…ط³ط¨ظ‚ط§ظ‹" };
    }

    const charity = await prisma.charity.create({
      data: {
        name: data.name.trim(),
        establishmentDate: data.establishmentDate || null,
        licenseNumber: data.licenseNumber || null,
        domain: data.domain || null,
        logoUrl: data.logoUrl || null,
      }
    });

    const templates = await (prisma as any).serviceTemplate.findMany();
    if (templates.length > 0) {
      const servicesToCreate = templates.map((t: any) => ({
        name: t.name,
        department: t.department,
        charityId: charity.id,
        templateId: t.id
      }));
      await prisma.service.createMany({ data: servicesToCreate });
    }

    revalidatePath("/main");
    return { success: true, data: charity };
  } catch (error: any) {
    console.error("Error adding charity:", error);
    return { success: false, message: error.message || "حدث خطأ أثناء الإضافة" };
  }
}

export async function updateCharity(id: string, data: { name?: string; establishmentDate?: string; licenseNumber?: string; domain?: string; logoUrl?: string | null }) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session.role, session.permissions, "manage_charities")) {
      return { success: false, message: "غير مصرح" };
    }

    const currentCharity = await prisma.charity.findUnique({ where: { id } });
    if (!currentCharity) return { success: false, message: "الجمعية غير موجودة" };
    
    let trimmedName = data.name ? data.name.trim() : currentCharity.name;

    if (data.name && trimmedName.toLowerCase() !== currentCharity.name.toLowerCase()) {
      const existing = await prisma.charity.findFirst({
        where: { name: trimmedName, id: { not: id } }
      });
      if (existing) {
        return { success: false, message: "هذا الاسم مستخدم لجمعية أخرى" };
      }
    }

    const charity = await prisma.charity.update({
      where: { id },
      data: {
        ...(data.name && { name: trimmedName }),
        ...(data.establishmentDate !== undefined && { establishmentDate: data.establishmentDate }),
        ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      }
    });

    if (data.name && trimmedName.toLowerCase() !== currentCharity.name.toLowerCase()) {
      const oldName = currentCharity.name;
      await prisma.surveyResponse.updateMany({
        where: { charityName: oldName },
        data: { charityName: trimmedName }
      });
      await prisma.hexagonalResponse.updateMany({
        where: { charityName: oldName },
        data: { charityName: trimmedName }
      });
      await prisma.performanceMetric.updateMany({
        where: { charityName: oldName },
        data: { charityName: trimmedName }
      });
      revalidatePath(`/portal/${encodeURIComponent(oldName)}`);
      revalidatePath(`/portal/${encodeURIComponent(trimmedName)}`);
    }

    revalidatePath("/main");
    return { success: true, data: charity };
  } catch (error: any) {
    console.error("Error updating charity:", error);
    return { success: false, message: "حدث خطأ أثناء التحديث" };
  }
}

export async function deleteCharity(id: string) {
  try {
    const session = await getSession();
    if (!session || !hasPermission(session.role, session.permissions, "manage_charities")) {
      return { success: false, message: "غير مصرح" };
    }

    // Try deleting. If it fails due to foreign key constraints, Prisma will throw an error
    await prisma.charity.delete({
      where: { id }
    });

    revalidatePath("/main");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting charity:", error);
    // Usually code P2003 indicates foreign key constraint failed
    if (error.code === "P2003") {
      return { success: false, message: "لا يمكن حذف الجمعية لوجود بيانات (عقود، منح، الخ) مرتبطة بها." };
    }
    return { success: false, message: "حدث خطأ أثناء الحذف" };
  }
}

// Temporary function to seed charities from existing survey responses
export async function bootstrapCharities() {
  try {
    const surveys = await prisma.surveyResponse.findMany();
    const hexs = await prisma.hexagonalResponse.findMany();

    const uniqueCharities = new Map<string, any>();

    surveys.forEach(s => {
      const name = s.charityName.trim();
      if (!uniqueCharities.has(name)) {
        uniqueCharities.set(name, {
          name,
          establishmentDate: s.establishmentDate,
          licenseNumber: s.licenseNumber,
        });
      }
    });

    hexs.forEach(h => {
      const name = h.charityName.trim();
      if (!uniqueCharities.has(name)) {
        uniqueCharities.set(name, {
          name,
          establishmentDate: null,
          licenseNumber: null,
        });
      }
    });

    let added = 0;
    for (const [, charityData] of uniqueCharities) {
      const exists = await prisma.charity.findUnique({ where: { name: charityData.name } });
      if (!exists) {
        await prisma.charity.create({ data: charityData });
        added++;
      }
    }

    return { success: true, message: `طھظ… طھط­ط¯ظٹط« ظˆط¥ط¶ط§ظپط© ${added} ط¬ظ…ط¹ظٹط© ط¬ط¯ظٹط¯ط© ظ…ظ† ط§ظ„ط§ط³طھط¨ظٹط§ظ†ط§طھ ط§ظ„ط³ط§ط¨ظ‚ط©.` };
  } catch (error) {
    console.error("Error bootstrapping charities:", error);
    return { success: false, message: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„طھظ‡ظٹط¦ط©" };
  }
}



export async function addFinancialTransactionAction(
  charityId: string,
  type: "CONTRACT_UPDATE" | "PAID_UPDATE" | "ADD_GRANT" | "DISBURSEMENT",
  amount: number,
  notes?: string
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return { success: false, message: "ط؛ظٹط± ظ…طµط±ط­ ظ„ظƒ ط¨ط¥ط¬ط±ط§ط، ظ‡ط°ظ‡ ط§ظ„ط¹ظ…ظ„ظٹط©" };
    }

    if (amount < 0 || isNaN(amount)) {
      return { success: false, message: "ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط§ظ„ظ…ط¨ظ„ط؛ ط±ظ‚ظ…ط§ظ‹ ظ…ظˆط¬ط¨ط§ظ‹ ط£ظƒط¨ط± ظ…ظ† ط£ظˆ ظٹط³ط§ظˆظٹ 0" };
    }

    const charity = await prisma.charity.findUnique({
      where: { id: charityId }
    });

    if (!charity) {
      return { success: false, message: "ط§ظ„ط¬ظ…ط¹ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" };
    }

    let updatedData: any = {};
    if (type === "CONTRACT_UPDATE") {
      updatedData.contractValue = amount;
    } else if (type === "PAID_UPDATE") {
      updatedData.paidAmount = amount;
    } else if (type === "ADD_GRANT") {
      updatedData.grants = charity.grants + amount;
      // Trigger processFirstGrant
      await processFirstGrant(charityId, new Date());
    } else if (type === "DISBURSEMENT") {
      updatedData.paidAmount = charity.paidAmount + amount;
    } else {
      return { success: false, message: "ظ†ظˆط¹ ط§ظ„ط¹ظ…ظ„ظٹط© ط؛ظٹط± طµط§ظ„ط­" };
    }

    // Perform database transaction to ensure both charity update and log insertion are atomic
    const [updatedCharity, log] = await prisma.$transaction([
      prisma.charity.update({
        where: { id: charityId },
        data: updatedData
      }),
      prisma.financialLog.create({
        data: {
          charityId,
          type,
          amount,
          notes: notes ? notes.trim() : null
        }
      })
    ]);

    revalidatePath("/main");
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);

    return { success: true, charity: updatedCharity, log };
  } catch (error: any) {
    console.error("Error adding financial transaction:", error);
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط¬ط±ط§ط، ط§ظ„ط¹ظ…ظ„ظٹط© ط§ظ„ظ…ط§ظ„ظٹط©" };
  }
}

export async function updateTimelineConfig(
  charityId: string,
  timelineType: "STRATEGY" | "GOVERNANCE" | "FINANCE",
  name: string,
  department: string
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return { success: false, message: "ط؛ظٹط± ظ…طµط±ط­ ظ„ظƒ ط¨ط¥ط¬ط±ط§ط، ظ‡ط°ظ‡ ط§ظ„ط¹ظ…ظ„ظٹط©" };
    }

    const charity = await prisma.charity.findUnique({
      where: { id: charityId }
    });

    if (!charity) {
      return { success: false, message: "ط§ظ„ط¬ظ…ط¹ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" };
    }

    let dataToUpdate: any = {};
    if (timelineType === "STRATEGY") {
      dataToUpdate = { strategyTimelineName: name, strategyTimelineDept: department };
    } else if (timelineType === "GOVERNANCE") {
      dataToUpdate = { governanceTimelineName: name, governanceTimelineDept: department };
    } else if (timelineType === "FINANCE") {
      dataToUpdate = { financeTimelineName: name, financeTimelineDept: department };
    }

    await prisma.charity.update({
      where: { id: charityId },
      data: dataToUpdate
    });

    revalidatePath("/main");
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/services`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/strategy`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/governance`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating timeline config:", error);
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ" };
  }
}

export async function updateCharityLogo(charityId: string, logoUrl: string | null) {
  const session = await getSession();
  if (!session || !(isAdmin(session.role) || hasPermission(session.role, session.permissions || [], "manage_charity_accounts"))) {
    return { success: false, message: "غير مصرح" };
  }
  try {
    const charity = await prisma.charity.update({
      where: { id: charityId },
      data: { logoUrl },
      select: { name: true },
    });
    revalidatePath("/main");
    revalidatePath("/main/charities");
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£" };
  }
}

export async function addDonorAccount(charityId: string, donorName: string, username: string, password: string, website?: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "غير مصرح" };

    const account = await (prisma as any).donorAccount.create({
      data: {
        charityId,
        donorName,
        username,
        password: encryptSecret(password),
        website: website || null,
      }
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "CREATE",
      targetType: "DonorAccount",
      targetId: account.id,
      metadata: { donorName, charityId },
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);

    // Return the plaintext password (not the encrypted DB value) so the client's
    // optimistic UI update shows the real credential the user just typed.
    return { success: true, account: { ...account, password } };
  } catch (error: any) {
    console.error("Error adding donor account:", error);
    return { success: false, message: "حدث خطأ أثناء إضافة حساب الجهة المانحة" };
  }
}

export async function deleteDonorAccount(accountId: string, charityId: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "غير مصرح" };

    const target = await (prisma as any).donorAccount.findUnique({ where: { id: accountId }, select: { donorName: true } });

    await (prisma as any).donorAccount.delete({
      where: { id: accountId }
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "DonorAccount",
      targetId: accountId,
      metadata: { donorName: target?.donorName, charityId },
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting donor account:", error);
    return { success: false, message: "حدث خطأ أثناء الحذف" };
  }
}

export async function addGrantApplication(
  charityId: string, 
  initiativeName: string, 
  requestedAmount: number, 
  entityName: string,
  status: string = "PENDING"
) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "غير مصرح" };

    if (requestedAmount <= 0) return { success: false, message: "المبلغ غير صالح" };

    const grant = await (prisma as any).grantApplication.create({
      data: {
        charityId,
        initiativeName,
        requestedAmount,
        entityName,
        status,
      }
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/portal/${encodeURIComponent(charity.name)}/resource-development/grants`);
    
    return { success: true, grant };
  } catch (error: any) {
    console.error("Error adding grant application:", error);
    return { success: false, message: "حدث خطأ أثناء رفع المنحة" };
  }
}

export async function updateGrantApplicationStatus(
  grantId: string, 
  charityId: string, 
  status: string, 
  approvedAmount?: number,
  installmentsCount?: number | null,
  installmentsNotes?: string | null,
  beneficiariesCount?: number,
  collectedAmount?: number,
  closureDate?: Date
) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "غير مصرح" };

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (!charity) return { success: false, message: "الجمعية غير موجودة" };

    const grant = await (prisma as any).grantApplication.findUnique({ where: { id: grantId } });
    if (!grant) return { success: false, message: "المنحة غير موجودة" };

    const queries: any[] = [];

    const updateData: any = { status };
    if (installmentsCount !== undefined) updateData.installmentsCount = installmentsCount;
    if (installmentsNotes !== undefined) updateData.installmentsNotes = installmentsNotes;
    if (beneficiariesCount !== undefined) updateData.beneficiariesCount = beneficiariesCount;
    if (collectedAmount !== undefined) updateData.collectedAmount = collectedAmount;
    if (closureDate !== undefined) updateData.closureDate = closureDate;

    queries.push(
      (prisma as any).grantApplication.update({
        where: { id: grantId },
        data: updateData
      })
    );

    if (status === "APPROVED" && grant.status !== "APPROVED" && approvedAmount && approvedAmount > 0) {
      queries.push(
        prisma.financialLog.create({
          data: {
            charityId,
            type: "ADD_GRANT",
            amount: approvedAmount,
            notes: `اعتماد منحة مشروع: ${grant.initiativeName}`
          }
        })
      );
    }

    await prisma.$transaction(queries);

    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/resource-development/grants`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);
    
    return { success: true, grant: { ...grant, ...updateData, status } };
  } catch (error: any) {
    console.error("Error updating grant status:", error);
    return { success: false, message: "حدث خطأ أثناء تحديث حالة المنحة" };
  }
}

export async function deleteGrantApplication(grantId: string, charityId: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "غير مصرح" };

    await (prisma as any).grantApplication.delete({
      where: { id: grantId }
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/portal/${encodeURIComponent(charity.name)}/finance`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting grant application:", error);
    return { success: false, message: "حدث خطأ أثناء الحذف" };
  }
}
