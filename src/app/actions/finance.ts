"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";

export async function addFinanceStage(
  charityId: string,
  name: string,
  duration?: string,
  description?: string,
  startDate?: string,
  endDate?: string,
  isContinuous: boolean = false,
  isActive: boolean = true
) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
  const lastStage = await prisma.financeStage.findFirst({
    where: { charityId },
    orderBy: { order: 'desc' }
  });
  
  const newOrder = lastStage ? lastStage.order + 1 : 0;
  
  await prisma.financeStage.create({
    data: {
      name,
      duration,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      order: newOrder,
      charityId,
      isCurrent: false,
      isContinuous,
      isActive
    }
  });
  
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
  }
}

export async function updateFinanceStage(
  stageId: string,
  name: string,
  duration?: string,
  description?: string,
  startDate?: string,
  endDate?: string,
  isContinuous: boolean = false,
  isActive: boolean = true
) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stageRef = await prisma.financeStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.financeStage.update({
    where: { id: stageId },
    data: { 
      name, 
      duration,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isContinuous,
      isActive
    },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/finance`);
}

export async function deleteFinanceStage(stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stageRef = await prisma.financeStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.financeStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/finance`);
}

export async function toggleActiveFinanceStage(stageId: string, isActive: boolean) {
  const stage = await prisma.financeStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/finance`);
}

export async function setCurrentFinanceStage(charityId: string, stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
  await prisma.financeStage.updateMany({
    where: { charityId },
    data: { isCurrent: false }
  });
  
  const updatedStage = await prisma.financeStage.update({
    where: { id: stageId },
    data: { isCurrent: true },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}/finance`);
}

export async function reorderFinanceStages(charityId: string, stageIds: string[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.financeStage.update({
      where: { id: stageIds[i] },
      data: { order: i }
    });
  }
  
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/finance`);
  }
}
