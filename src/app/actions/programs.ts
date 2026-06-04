"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper to verify user session
async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error("غير مصرح لك بإجراء هذه العملية");
  }
  return session;
}

// 1. Add a program to a charity
export async function addProgramAction(
  charityId: string,
  name: string,
  beneficiaries: number
) {
  try {
    await getAuthenticatedUser();

    if (!name || !name.trim()) {
      return { error: "يرجى إدخال اسم البرنامج أو المشروع" };
    }

    if (beneficiaries === undefined || beneficiaries === null || isNaN(beneficiaries) || beneficiaries < 0) {
      return { error: "يرجى إدخال عدد مستفيدين صحيح (رقم أكبر من أو يساوي 0)" };
    }

    const charity = await prisma.charity.findUnique({
      where: { id: charityId },
    });

    if (!charity) {
      return { error: "الجمعية غير موجودة" };
    }

    const program = await prisma.program.create({
      data: {
        name: name.trim(),
        beneficiaries: Math.floor(beneficiaries),
        charityId: charityId,
      },
    });

    revalidatePath(`/dashboard/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/dashboard/charity/${encodeURIComponent(charity.name)}/programs`);
    revalidatePath("/dashboard");
    
    return { success: true, program };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة البرنامج" };
  }
}

// 2. Delete a program
export async function deleteProgramAction(programId: string) {
  try {
    await getAuthenticatedUser();

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { charity: true },
    });

    if (!program) {
      return { error: "البرنامج غير موجود" };
    }

    await prisma.program.delete({
      where: { id: programId },
    });

    revalidatePath(`/dashboard/charity/${encodeURIComponent(program.charity.name)}`);
    revalidatePath(`/dashboard/charity/${encodeURIComponent(program.charity.name)}/programs`);
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف البرنامج" };
  }
}
