"use server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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

    revalidatePath("/dashboard");
    return { success: true, data: charity };
  } catch (error: any) {
    console.error("Error adding charity:", error);
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط§ظ„ط¥ط¶ط§ظپط©" };
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

export async function updateCharity(
  oldName: string,
  data: {
    name: string;
    establishmentDate?: string;
    licenseNumber?: string;
    domain?: string;
    logoUrl?: string | null;
  }
) {
  try {
    const { name, establishmentDate, licenseNumber, domain, logoUrl } = data;

    if (!name || !name.trim()) {
      return { success: false, message: "ط§ط³ظ… ط§ظ„ط¬ظ…ط¹ظٹط© ظ…ط·ظ„ظˆط¨" };
    }

    const trimmedName = name.trim();

    // 1. Check if name is being changed and if new name already exists
    if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
      const existing = await prisma.charity.findUnique({
        where: { name: trimmedName }
      });
      if (existing) {
        return { success: false, message: "ط¬ظ…ط¹ظٹط© ط¨ظ‡ط°ط§ ط§ظ„ط§ط³ظ… ظ…ظˆط¬ظˆط¯ط© ط¨ط§ظ„ظپط¹ظ„" };
      }
    }

    // 2. Fetch the current charity record
    const charity = await prisma.charity.findUnique({
      where: { name: oldName }
    });

    if (!charity) {
      return { success: false, message: "ط§ظ„ط¬ظ…ط¹ظٹط© ط؛ظٹط± ظ…ظˆط¬ظˆط¯ط©" };
    }

    // 4. Update the charity details
    const updatedCharity = await prisma.charity.update({
      where: { name: oldName },
      data: {
        name: trimmedName,
        establishmentDate: establishmentDate || null,
        licenseNumber: licenseNumber || null,
        logoUrl: logoUrl,
        domain: domain || null,
      }
    });

    // 5. Cascade updates if the name changed to avoid broken references
    if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
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
    }

    revalidatePath("/dashboard");
    revalidatePath(`/charity/${encodeURIComponent(oldName)}`);
    revalidatePath(`/charity/${encodeURIComponent(trimmedName)}`);

    return { success: true, name: trimmedName };
  } catch (error: any) {
    console.error("Error updating charity profile:", error);
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط§ظ„ط¨ظٹط§ظ†ط§طھ" };
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

    revalidatePath("/dashboard");
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);

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

    revalidatePath("/dashboard");
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/services`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/strategy`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/governance`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating timeline config:", error);
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ" };
  }
}

export async function updateCharityLogo(charityId: string, logoUrl: string | null) {
  const session = await getSession();
  const adminRoles = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"];
  if (!session || !adminRoles.includes(session.role)) {
    return { success: false, message: "ط؛ظٹط± ظ…طµط±ط­" };
  }
  try {
    const charity = await prisma.charity.update({
      where: { id: charityId },
      data: { logoUrl },
      select: { name: true },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/charities");
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message || "ط­ط¯ط« ط®ط·ط£" };
  }
}

export async function addDonorAccount(charityId: string, donorName: string, username: string, password: string, website?: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "ط؛ظٹط± ظ…طµط±ط­" };

    const account = await (prisma as any).donorAccount.create({
      data: {
        charityId,
        donorName,
        username,
        password,
        website: website || null,
      }
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
    
    return { success: true, account };
  } catch (error: any) {
    console.error("Error adding donor account:", error);
    return { success: false, message: "ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، ط¥ط¶ط§ظپط© ط­ط³ط§ط¨ ط§ظ„ط¬ظ‡ط© ط§ظ„ظ…ط§ظ†ط­ط©" };
  }
}

export async function deleteDonorAccount(accountId: string, charityId: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { success: false, message: "ط؛ظٹط± ظ…طµط±ط­" };

    await (prisma as any).donorAccount.delete({
      where: { id: accountId }
    });

    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    if (charity) revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
    
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
    if (charity) revalidatePath(`/charity/${encodeURIComponent(charity.name)}/resource-development/grants`);
    
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
  installmentsCount?: number,
  installmentsNotes?: string,
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
        prisma.charity.update({
          where: { id: charityId },
          data: { grants: charity.grants + approvedAmount }
        })
      );
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

    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/resource-development/grants`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
    
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
    if (charity) revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting grant application:", error);
    return { success: false, message: "حدث خطأ أثناء الحذف" };
  }
}
