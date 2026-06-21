"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addFinanceStage(
  charityId: string, 
  name: string, 
  duration?: string,
  description?: string,
  startDate?: string,
  endDate?: string
) {
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
      isCurrent: false
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
  endDate?: string
) {
  const stage = await prisma.financeStage.update({
    where: { id: stageId },
    data: { 
      name, 
      duration,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/finance`);
}

export async function deleteFinanceStage(stageId: string) {
  const stage = await prisma.financeStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/finance`);
}

export async function setCurrentFinanceStage(charityId: string, stageId: string) {
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
