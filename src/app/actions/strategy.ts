"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const DEFAULT_STAGES = [
  "مرحلة قياس الجاهزية",
  "مرحلة بناء التقرير الاستراتيجي",
  "مرحلة بناء التوجه الاستراتيجي",
  "مرحلة بناء دليل الاهداف والمؤشرات",
  "مرحلة انشاء المبادرات والخطة التشغيلية",
  "مرحلة متابعة الأداء"
];

// Seed default stages if none exist for a charity
export async function ensureStagesForCharity(charityId: string) {
  const existingStages = await prisma.strategicStage.findMany({
    where: { charityId }
  });
  
  if (existingStages.length === 0) {
    const charity = await prisma.charity.findUnique({
      where: { id: charityId }
    });
    
    const currentStageIndex = Math.max(1, charity?.strategicStage || 1) - 1;
    
    const newStages = DEFAULT_STAGES.map((name, index) => ({
      name,
      duration: "",
      order: index,
      charityId,
      isCurrent: index === currentStageIndex,
    }));
    
    await prisma.strategicStage.createMany({
      data: newStages
    });
  }
}

export async function addStrategicStage(charityId: string, name: string, duration?: string) {
  await ensureStagesForCharity(charityId);
  
  const lastStage = await prisma.strategicStage.findFirst({
    where: { charityId },
    orderBy: { order: 'desc' }
  });
  
  const newOrder = lastStage ? lastStage.order + 1 : 0;
  
  await prisma.strategicStage.create({
    data: {
      name,
      duration,
      order: newOrder,
      charityId,
      isCurrent: false
    }
  });
  
  // Revalidate charity page and strategy page
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/strategy`);
  }
}

export async function updateStrategicStage(stageId: string, name: string, duration?: string) {
  const stage = await prisma.strategicStage.update({
    where: { id: stageId },
    data: { name, duration },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/strategy`);
}

export async function deleteStrategicStage(stageId: string) {
  const stage = await prisma.strategicStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/strategy`);
}

export async function setCurrentStrategicStage(charityId: string, stageId: string) {
  await ensureStagesForCharity(charityId);

  // Unset all
  await prisma.strategicStage.updateMany({
    where: { charityId },
    data: { isCurrent: false }
  });
  
  // Set the specific one
  const updatedStage = await prisma.strategicStage.update({
    where: { id: stageId },
    data: { isCurrent: true },
    include: { charity: true }
  });
  
  // Also update the legacy strategicStage integer to match the order + 1, so the rest of the app doesn't break if it relies on it
  await prisma.charity.update({
    where: { id: charityId },
    data: { strategicStage: updatedStage.order + 1 }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}/strategy`);
}

export async function reorderStrategicStages(charityId: string, stageIds: string[]) {
  // We receive the new array of IDs in the desired order
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.strategicStage.update({
      where: { id: stageIds[i] },
      data: { order: i }
    });
  }
  
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/strategy`);
  }
}
