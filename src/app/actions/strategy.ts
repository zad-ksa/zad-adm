"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";
import { syncServiceProgress } from "./services";

async function getStrategyService(charityId: string) {
  let service = await prisma.service.findFirst({
    where: { charityId, department: "STRATEGY" }
  });
  if (!service) {
    const charity = await prisma.charity.findUnique({ where: { id: charityId } });
    const timelineName = charity?.strategyTimelineName || "التخطيط الاستراتيجي";
    service = await prisma.service.create({
      data: {
        name: timelineName,
        department: "STRATEGY",
        charityId,
        responsibleName: charity?.strategyResponsibleName,
        responsiblePhone: charity?.strategyResponsiblePhone
      }
    });
  }
  return service;
}

export async function ensureStagesForCharity(charityId: string) {
  const service = await getStrategyService(charityId);
  const existingStages = await prisma.serviceStage.findMany({ where: { serviceId: service.id } });
  if (existingStages.length > 0) return;

  const defaults = await prisma.defaultStage.findMany({
    where: { timelineType: "STRATEGY" },
    orderBy: { order: "asc" },
  });

  if (defaults.length === 0) return;

  await prisma.serviceStage.createMany({
    data: defaults.map((s, idx) => ({
      name: s.name,
      description: s.description,
      order: idx,
      serviceId: service.id,
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

  const service = await getStrategyService(charityId);

  const lastStage = await prisma.serviceStage.findFirst({
    where: { serviceId: service.id },
    orderBy: { order: 'desc' }
  });

  const newOrder = lastStage ? lastStage.order + 1 : 0;

  await prisma.serviceStage.create({
    data: {
      name,
      duration,
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      order: newOrder,
      serviceId: service.id,
      isCurrent: false,
      isContinuous,
      isActive
    }
  });

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
  
  const stageRef = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.service.charityId);
  
  const stage = await prisma.serviceStage.update({
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
    include: { service: { include: { charity: true } } }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
}

export async function deleteStrategicStage(stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  
  const stageRef = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stageRef) await assertCharityAccess(session.id, session.role, stageRef.service.charityId);
  
  const stage = await prisma.serviceStage.delete({
    where: { id: stageId },
    include: { service: { include: { charity: true } } }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
}

export async function toggleActiveStrategicStage(stageId: string, isActive: boolean) {
  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { service: { include: { charity: true } } }
  });

  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}`);
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
}

export async function setCurrentStrategicStage(charityId: string, stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
  await ensureStagesForCharity(charityId);

  const service = await getStrategyService(charityId);

  await syncServiceProgress(service.id, stageId);

  const updatedStage = await prisma.serviceStage.findUnique({
    where: { id: stageId },
    include: { service: { include: { charity: true } } }
  });

  if (updatedStage) {
    revalidatePath(`/charity/${encodeURIComponent(updatedStage.service.charity.name)}`);
    revalidatePath(`/charity/${encodeURIComponent(updatedStage.service.charity.name)}/strategy`);
  }
}

export async function toggleCurrentStrategicStage(stageId: string, isCurrent: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  
  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isCurrent },
    include: { service: { include: { charity: true } } }
  });
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
}

export async function reorderStrategicStages(charityId: string, stageIds: string[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
  
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.serviceStage.update({
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
      services: {
        where: { department: "STRATEGY" },
        include: {
          stages: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!charity) return null;
  
  // To keep compatibility with components expecting strategicStages array:
  const strategicStages = charity.services[0]?.stages || [];
  
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
    charity: {
      ...charity,
      strategicStages
    },
    nextMeeting,
    activeTasks
  };
}
