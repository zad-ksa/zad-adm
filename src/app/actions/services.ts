"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getServices(charityId: string, department?: string | null) {
  const whereClause: any = { charityId };
  if (department !== undefined) {
    whereClause.department = department;
  }
  
  return await prisma.service.findMany({
    where: whereClause,
    include: {
      stages: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createService(charityId: string, name: string, department: string | null) {
  // Enforce max 1 timeline per department (unless no department)
  if (department && department !== "NONE") {
    const existingService = await prisma.service.findFirst({
      where: { charityId, department }
    });
    
    if (existingService) {
      throw new Error(`يوجد بالفعل مخطط زمني مرتبط بقسم ${department}`);
    }
  }

  const service = await prisma.service.create({
    data: {
      name,
      department: department === "NONE" ? null : department,
      charityId
    },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/services`);
  if (service.department) {
    revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/${service.department.toLowerCase()}`);
  }
  
  return service;
}

export async function updateService(id: string, name: string, department: string | null) {
  const service = await prisma.service.update({
    where: { id },
    data: { name, department },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/services`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/strategy`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/governance`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/finance`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/programs`);
  
  return service;
}

export async function deleteService(id: string) {
  const service = await prisma.service.delete({
    where: { id },
    include: { charity: true }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/services`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/strategy`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/governance`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/finance`);
  revalidatePath(`/charity/${encodeURIComponent(service.charity.name)}/programs`);
  
  return service;
}

export async function addServiceStage(
  serviceId: string, 
  name: string, 
  description: string | null = null, 
  startDate: Date | null = null, 
  endDate: Date | null = null,
  isContinuous: boolean = false,
  isActive: boolean = true,
  duration: string | null = null
) {
  const lastStage = await prisma.serviceStage.findFirst({
    where: { serviceId },
    orderBy: { order: 'desc' }
  });
  
  const newOrder = lastStage ? lastStage.order + 1 : 0;
  
  const stage = await prisma.serviceStage.create({
    data: {
      serviceId,
      name,
      description,
      startDate,
      endDate,
      order: newOrder,
      isContinuous,
      isActive,
      duration
    },
    include: { service: { include: { charity: true } } }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
  if (stage.service.department) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
  }
  
  return stage;
}

export async function updateServiceStage(
  id: string, 
  name: string, 
  description: string | null, 
  startDate: Date | null, 
  endDate: Date | null,
  isContinuous: boolean = false,
  isActive: boolean = true,
  duration: string | null = null
) {
  const stage = await prisma.serviceStage.update({
    where: { id },
    data: { name, description, startDate, endDate, isContinuous, isActive, duration },
    include: { service: { include: { charity: true } } }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
  if (stage.service.department) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
  }
  
  return stage;
}

export async function deleteServiceStage(id: string) {
  const stage = await prisma.serviceStage.delete({
    where: { id },
    include: { service: { include: { charity: true } } }
  });
  
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
  if (stage.service.department) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
  }
  
  return stage;
}

export async function toggleActiveServiceStage(stageId: string, isActive: boolean) {
  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { service: { include: { charity: true } } }
  });

  if (stage) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}

export async function reorderServiceStages(stageIds: string[]) {
  if (stageIds.length === 0) return;
  
  for (let i = 0; i < stageIds.length; i++) {
    await prisma.serviceStage.update({
      where: { id: stageIds[i] },
      data: { order: i }
    });
  }
  
  const stage = await prisma.serviceStage.findUnique({
    where: { id: stageIds[0] },
    include: { service: { include: { charity: true } } }
  });
  
  if (stage) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}

export async function setCurrentServiceStage(serviceId: string, stageId: string) {
  await prisma.$transaction([
    prisma.serviceStage.updateMany({
      where: { serviceId },
      data: { isCurrent: false }
    }),
    prisma.serviceStage.update({
      where: { id: stageId },
      data: { isCurrent: true }
    })
  ]);
  
  const stage = await prisma.serviceStage.findUnique({
    where: { id: stageId },
    include: { service: { include: { charity: true } } }
  });
  
  if (stage) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}`);
    if (stage.service.department) {
      revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}
