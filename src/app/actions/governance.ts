"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addGovernanceStage(
  charityId: string, 
  name: string, 
  duration?: string,
  description?: string,
  startDate?: string,
  endDate?: string
) {
  const lastStage = await prisma.governanceStage.findFirst({
    where: { charityId },
    orderBy: { order: 'desc' }
  });
  
  const newOrder = lastStage ? lastStage.order + 1 : 0;
  
  await prisma.governanceStage.create({
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
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/governance`);
  }
}

export async function updateGovernanceStage(
  stageId: string, 
  name: string, 
  duration?: string,
  description?: string,
  startDate?: string,
  endDate?: string
) {
  const stage = await prisma.governanceStage.update({
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
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/governance`);
}

export async function deleteGovernanceStage(stageId: string) {
  const stage = await prisma.governanceStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/governance`);
}

export async function setCurrentGovernanceStage(charityId: string, stageId: string) {
  await prisma.governanceStage.updateMany({
    where: { charityId },
    data: { isCurrent: false }
  });
  
  const updatedStage = await prisma.governanceStage.update({
    where: { id: stageId },
    data: { isCurrent: true },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(updatedStage.charity.name)}/governance`);
}

export async function reorderGovernanceStages(charityId: string, stageIds: string[]) {
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.governanceStage.update({
      where: { id: stageIds[i] },
      data: { order: i }
    });
  }
  
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/governance`);
  }
}

export async function addRegulation(title: string, category: string, link: string, description?: string) {
  await prisma.regulation.create({
    data: {
      title,
      description,
      category,
      link,
    }
  });
  
  revalidatePath("/", "layout");
}

export async function deleteRegulation(regulationId: string) {
  await prisma.regulation.delete({
    where: { id: regulationId },
  });
  
  revalidatePath("/", "layout");
}

export async function toggleRegulationVisibility(charityId: string, regulationId: string, isCurrentlyVisible: boolean) {
  if (isCurrentlyVisible) {
    // Hide it by creating a visibility record set to false
    await prisma.charityRegulationVisibility.create({
      data: {
        charityId,
        regulationId,
        isVisible: false
      }
    });
  } else {
    // Show it by deleting the visibility record
    await prisma.charityRegulationVisibility.deleteMany({
      where: {
        charityId,
        regulationId,
      }
    });
  }
  
  revalidatePath("/", "layout");
}
