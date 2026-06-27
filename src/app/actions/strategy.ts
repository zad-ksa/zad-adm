"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";

// Seed default stages from DB if none exist for a charity
export async function ensureStagesForCharity(charityId: string) {
  const existingStages = await prisma.strategicStage.findMany({ where: { charityId } });
  if (existingStages.length > 0) return;

  const defaults = await prisma.defaultStage.findMany({
    where: { timelineType: "STRATEGY" },
    orderBy: { order: "asc" },
  });

  if (defaults.length === 0) return;

  await prisma.strategicStage.createMany({
    data: defaults.map((s, idx) => ({
      name: s.name,
      description: s.description,
      order: idx,
      charityId,
      isCurrent: idx === 0,
      isContinuous: s.isContinuous,
    })),
  });
}

export async function addStrategicStage(
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

  // Revalidate charity page and strategy page
  const charity = await prisma.charity.findUnique({ where: { id: charityId } });
  if (charity) {
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(charity.name)}/strategy`);
  }
}

export async function updateStrategicStage(
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
  const stageRef = await prisma.strategicStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.strategicStage.update({
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
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/strategy`);
}

export async function deleteStrategicStage(stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stageRef = await prisma.strategicStage.findUnique({ where: { id: stageId }, select: { charityId: true } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.charityId);
  const stage = await prisma.strategicStage.delete({
    where: { id: stageId },
    include: { charity: true }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/strategy`);
}

export async function toggleActiveStrategicStage(stageId: string, isActive: boolean) {
  const stage = await prisma.strategicStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { charity: true }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/strategy`);
}

export async function setCurrentStrategicStage(charityId: string, stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
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
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
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

export async function toggleReadinessVisibility(charityName: string, isVisible: boolean) {
  await prisma.charity.update({
    where: { name: charityName },
    data: { isReadinessVisible: isVisible }
  });
  revalidatePath(`/charity/${encodeURIComponent(charityName)}/strategy`);
}

export async function togglePerformanceEditability(charityName: string, isEditable: boolean) {
  await prisma.charity.update({
    where: { name: charityName },
    data: { isPerformanceEditable: isEditable }
  });
  revalidatePath(`/charity/${encodeURIComponent(charityName)}/strategy`);
  revalidatePath(`/charity/${encodeURIComponent(charityName)}/strategy/performance`);
}

export async function toggleVisionMissionVisibility(charityName: string, isVisible: boolean) {
  await prisma.charity.update({
    where: { name: charityName },
    data: { isVisionMissionVisible: isVisible }
  });
  revalidatePath(`/charity/${encodeURIComponent(charityName)}/strategy`);
  revalidatePath(`/charity/${encodeURIComponent(charityName)}/strategy/vision-mission`);
}

export async function getCharityDashboardData(charityName: string) {
  const charity = await prisma.charity.findUnique({
    where: { name: charityName },
    include: {
      strategicStages: {
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!charity) return null;

  const nextMeeting = await prisma.meeting.findFirst({
    where: {
      charityId: charity.id,
      date: { gte: new Date() }
    },
    orderBy: { date: 'asc' }
  });

  const activeTasks = await prisma.task.findMany({
    where: {
      charityName: charityName,
      status: 'IN_PROGRESS',
      assignedTo: { role: 'STRATEGY' }
    },
    include: {
      assignedTo: true
    }
  });

  return {
    charity,
    nextMeeting,
    activeTasks
  };
}
