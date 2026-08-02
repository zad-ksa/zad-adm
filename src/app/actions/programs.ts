"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { assertCharityAccess } from "@/lib/access";

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || !session.id) throw new Error("غير مصرح لك بالوصول");
  return session;
}

// 1. Add a program to a charity
export async function addProgramAction(
  charityId: string,
  name: string,
  beneficiaries: number
) {
  try {
    const user = await getAuthenticatedUser();
    await assertCharityAccess(user.id, user.role, charityId);

    if (!name || !name.trim()) {
      return { error: "يجب إدخال اسم البرنامج" };
    }

    if (beneficiaries === undefined || beneficiaries === null || isNaN(beneficiaries) || beneficiaries < 0) {
      return { error: "يجب إدخال عدد صحيح للمستفيدين (لا يمكن أن يكون أقل من 0)" };
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

    revalidatePath(`/portal/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/programs`);
    revalidatePath("/main");
    
    return { success: true, program };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة البرنامج" };
  }
}

// 2. Delete a program
export async function deleteProgramAction(programId: string) {
  try {
    const user = await getAuthenticatedUser();

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: { charity: true },
    });

    if (!program) {
      return { error: "البرنامج غير موجود" };
    }

    await assertCharityAccess(user.id, user.role, program.charityId);

    await prisma.program.delete({
      where: { id: programId },
    });

    revalidatePath(`/portal/${encodeURIComponent(program.charity.name)}`);
    revalidatePath(`/portal/${encodeURIComponent(program.charity.name)}/programs`);
    revalidatePath("/main");

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف البرنامج" };
  }
}
