"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";

export async function addGovernanceStage(
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
      isCurrent: false,
      isContinuous,
      isActive
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
  endDate?: string,
  isContinuous: boolean = false,
  isActive: boolean = true
) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stageRef = await prisma.governanceStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.governanceStage.update({
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
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/governance`);
}

export async function deleteGovernanceStage(stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stageRef = await prisma.governanceStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.governanceStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/governance`);
}

export async function toggleActiveGovernanceStage(stageId: string, isActive: boolean) {
  const stage = await prisma.governanceStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { charity: true }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/governance`);
}

export async function setCurrentGovernanceStage(charityId: string, stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
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
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
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
