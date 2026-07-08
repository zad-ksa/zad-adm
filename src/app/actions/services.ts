"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";

export async function getAllServiceTemplates() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  return await (prisma as any).serviceTemplate.findMany({
    include: {
      stages: { orderBy: { order: 'asc' } }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createServiceTemplate(name: string, department: string | null) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const template = await (prisma as any).serviceTemplate.create({
    data: { name, department }
  });

  const charities = await prisma.charity.findMany({ select: { id: true } });
  if (charities.length > 0) {
    const servicesToCreate = charities.map(c => ({
      name,
      department,
      charityId: c.id,
      templateId: template.id
    }));
    await prisma.service.createMany({ data: servicesToCreate });
  }
  revalidatePath('/dashboard/manage-services');
  return template;
}

export async function updateServiceTemplate(id: string, name: string, department: string | null) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const template = await (prisma as any).serviceTemplate.update({
    where: { id },
    data: { name, department }
  });

  await prisma.service.updateMany({
    where: { templateId: id },
    data: { name, department }
  });
  
  revalidatePath('/dashboard/manage-services');
  return template;
}

export async function deleteServiceTemplate(id: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  // Delete linked services first (so we don't lose the reference due to SetNull)
  await prisma.service.deleteMany({ where: { templateId: id } });
  const template = await (prisma as any).serviceTemplate.delete({ where: { id } });
  
  revalidatePath('/dashboard/manage-services');
  return template;
}

export async function getCharitiesForSelect() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  
  if (hasPermission(session.role, session.permissions, "manage_charities") || hasPermission(session.role, session.permissions, "manage_charity_settings")) {
    return await prisma.charity.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: 'desc' }
    });
  }
  return [];
}

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
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);
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
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const svc = await prisma.service.findUnique({ where: { id }, select: { charityId: true } });
  if (svc) await assertCharityAccess(session.id, session.role, svc.charityId);
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
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const svc = await prisma.service.findUnique({ where: { id }, select: { charityId: true } });
  if (svc) await assertCharityAccess(session.id, session.role, svc.charityId);
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

export async function toggleCurrentServiceStage(stageId: string, isCurrent: boolean) {
  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isCurrent },
    include: { service: { include: { charity: true } } }
  });
  revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
}

const ADMIN_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];

export async function unifyCharityStagesAction(sourceCharityId: string, timelineType: string, sourceServiceId?: string, targetCharityIds?: string[]) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const isAdmin = ADMIN_ROLES.includes(session.role);
  if (!isAdmin) {
    const assigned = await prisma.employeeCharity.findMany({
      where: { employeeId: session.id },
      select: { charityId: true },
    });
    const allowedIds = new Set(assigned.map(r => r.charityId));

    if (!allowedIds.has(sourceCharityId)) throw new Error("لا يمكنك التعميم من جمعية غير مرتبطة بك");

    if (targetCharityIds && targetCharityIds.length > 0) {
      const forbidden = targetCharityIds.filter(id => !allowedIds.has(id));
      if (forbidden.length > 0) throw new Error("لا يمكنك التعميم على جمعيات غير مرتبطة بك");
    } else {
      targetCharityIds = [...allowedIds].filter(id => id !== sourceCharityId);
    }
  }

  type StepData = { name: string; isDone: boolean; order: number };
  type SourceStage = {
    name: string; description: string | null; startDate: Date | null; endDate: Date | null;
    duration: string | null; order: number; isCurrent: boolean; isContinuous: boolean; isActive: boolean;
    steps: StepData[];
  };

  let sourceStages: SourceStage[] = [];
  let resolvedSourceServiceId = sourceServiceId;

  if (["STRATEGY", "GOVERNANCE", "FINANCE"].includes(timelineType)) {
    const svc = await prisma.service.findFirst({
      where: { charityId: sourceCharityId, department: timelineType }
    });
    if (!svc) throw new Error("لم يتم العثور على مسار لهذه الجمعية");
    resolvedSourceServiceId = svc.id;
  }

  if (!resolvedSourceServiceId) throw new Error("لم يتم تحديد الخدمة المصدر");

  const stages = await prisma.serviceStage.findMany({
    where: { serviceId: resolvedSourceServiceId }, orderBy: { order: "asc" },
    include: { steps: { orderBy: { order: "asc" } } }
  });
  sourceStages = stages.map(s => ({ name: s.name, description: s.description, startDate: s.startDate, endDate: s.endDate, duration: s.duration, order: s.order, isCurrent: s.isCurrent, isContinuous: s.isContinuous, isActive: s.isActive, steps: s.steps.map(p => ({ name: p.name, isDone: p.isDone, order: p.order })) }));

  if (sourceStages.length === 0) {
    throw new Error("لا توجد مراحل في المخطط الزمني المختار لنسخها");
  }

  const otherCharities = await prisma.charity.findMany({
    where: targetCharityIds?.length ? { id: { in: targetCharityIds } } : { id: { not: sourceCharityId } }
  });

  if (otherCharities.length === 0) return { success: true };

  const sourceService = await prisma.service.findUnique({ where: { id: resolvedSourceServiceId } });
  if (!sourceService) throw new Error("الخدمة المصدر غير موجودة");

  for (const targetCharity of otherCharities) {
    let targetSvc = await prisma.service.findFirst({ 
      where: { 
        charityId: targetCharity.id, 
        ...(["STRATEGY", "GOVERNANCE", "FINANCE"].includes(timelineType) 
             ? { department: timelineType } 
             : { name: sourceService.name })
      } 
    });

    if (!targetSvc) {
      targetSvc = await prisma.service.create({
        data: {
          name: sourceService.name,
          department: sourceService.department,
          charityId: targetCharity.id,
        }
      });
    }

    await prisma.serviceStage.deleteMany({ where: { serviceId: targetSvc.id } });

    for (const s of sourceStages) {
      await prisma.serviceStage.create({
        data: {
          serviceId: targetSvc.id,
          name: s.name, description: s.description, startDate: s.startDate, endDate: s.endDate,
          duration: s.duration, order: s.order, isCurrent: s.isCurrent,
          isContinuous: s.isContinuous, isActive: s.isActive,
          steps: s.steps.length > 0 ? { create: s.steps } : undefined,
        }
      });
    }
  }


  return { success: true };
}

export async function assignGanttDates(
  serviceId: string,
  startDate: Date,
  endDate: Date,
  stageIds: string[],
  stepIds: string[]
) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  // Clear dates for items in this service that currently have this exact week but were deselected
  await (prisma as any).serviceStage.updateMany({
    where: {
      serviceId,
      startDate: startDate,
      endDate: endDate,
      id: { notIn: stageIds.length > 0 ? stageIds : ['none'] }
    },
    data: { startDate: null, endDate: null }
  });

  await (prisma as any).serviceStageStep.updateMany({
    where: {
      stage: { serviceId },
      startDate: startDate,
      endDate: endDate,
      id: { notIn: stepIds.length > 0 ? stepIds : ['none'] }
    },
    data: { startDate: null, endDate: null }
  });

  // Assign dates to selected ones
  if (stageIds.length > 0) {
    await (prisma as any).serviceStage.updateMany({
      where: { id: { in: stageIds } },
      data: { startDate, endDate }
    });
  }

  if (stepIds.length > 0) {
    await (prisma as any).serviceStageStep.updateMany({
      where: { id: { in: stepIds } },
      data: { startDate, endDate }
    });
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function toggleGanttItemCompletion(type: 'stage'|'step', id: string, isDone: boolean) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  if (type === 'stage') {
    await (prisma as any).serviceStage.update({ where: { id }, data: { isDone } });
  } else {
    await (prisma as any).serviceStageStep.update({ where: { id }, data: { isDone } });
  }
  revalidatePath('/dashboard');
  return { success: true };
}
