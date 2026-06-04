"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { getSession } from "@/lib/auth";

export async function getCharities() {
  try {
    const charities = await prisma.charity.findMany({
      orderBy: { createdAt: "desc" },
    });
    return charities;
  } catch (error) {
    console.error("Error fetching charities:", error);
    return [];
  }
}

export async function addCharity(data: { name: string; establishmentDate?: string; licenseNumber?: string; domain?: string; logoUrl?: string | null }) {
  try {
    const existing = await prisma.charity.findUnique({
      where: { name: data.name.trim() }
    });

    if (existing) {
      return { success: false, message: "هذه الجمعية موجودة مسبقاً" };
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

    revalidatePath("/dashboard");
    return { success: true, data: charity };
  } catch (error: any) {
    console.error("Error adding charity:", error);
    return { success: false, message: error.message || "حدث خطأ أثناء الإضافة" };
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

    return { success: true, message: `تم تحديث وإضافة ${added} جمعية جديدة من الاستبيانات السابقة.` };
  } catch (error) {
    console.error("Error bootstrapping charities:", error);
    return { success: false, message: "حدث خطأ أثناء التهيئة" };
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
      return { success: false, message: "اسم الجمعية مطلوب" };
    }

    const trimmedName = name.trim();

    // 1. Check if name is being changed and if new name already exists
    if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
      const existing = await prisma.charity.findUnique({
        where: { name: trimmedName }
      });
      if (existing) {
        return { success: false, message: "جمعية بهذا الاسم موجودة بالفعل" };
      }
    }

    // 2. Fetch the current charity record
    const charity = await prisma.charity.findUnique({
      where: { name: oldName }
    });

    if (!charity) {
      return { success: false, message: "الجمعية غير موجودة" };
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
    revalidatePath(`/dashboard/charity/${encodeURIComponent(oldName)}`);
    revalidatePath(`/dashboard/charity/${encodeURIComponent(trimmedName)}`);

    return { success: true, name: trimmedName };
  } catch (error: any) {
    console.error("Error updating charity profile:", error);
    return { success: false, message: error.message || "حدث خطأ أثناء تحديث البيانات" };
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
      return { success: false, message: "غير مصرح لك بإجراء هذه العملية" };
    }

    if (amount < 0 || isNaN(amount)) {
      return { success: false, message: "يجب أن يكون المبلغ رقماً موجباً أكبر من أو يساوي 0" };
    }

    const charity = await prisma.charity.findUnique({
      where: { id: charityId }
    });

    if (!charity) {
      return { success: false, message: "الجمعية غير موجودة" };
    }

    let updatedData: any = {};
    if (type === "CONTRACT_UPDATE") {
      updatedData.contractValue = amount;
    } else if (type === "PAID_UPDATE") {
      updatedData.paidAmount = amount;
    } else if (type === "ADD_GRANT") {
      updatedData.grants = charity.grants + amount;
    } else if (type === "DISBURSEMENT") {
      updatedData.paidAmount = charity.paidAmount + amount;
    } else {
      return { success: false, message: "نوع العملية غير صالح" };
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
    revalidatePath(`/dashboard/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/dashboard/charity/${encodeURIComponent(charity.name)}/finance`);

    return { success: true, charity: updatedCharity, log };
  } catch (error: any) {
    console.error("Error adding financial transaction:", error);
    return { success: false, message: error.message || "حدث خطأ أثناء إجراء العملية المالية" };
  }
}

