"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

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

export async function addCharity(data: { name: string; establishmentDate?: string; licenseNumber?: string }) {
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
