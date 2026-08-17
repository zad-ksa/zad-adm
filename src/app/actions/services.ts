"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";
import { hasPermission, isAdmin } from "@/lib/permissions";

export async function getAllServiceTemplates() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  return await (prisma as any).serviceTemplate.findMany({
    include: {
      stages: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createServiceTemplate(name: string, department: string | null, charityIds?: string[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const template = await (prisma as any).serviceTemplate.create({
    data: { name, department }
  });

  const targetCharities = charityIds && charityIds.length > 0
    ? await prisma.charity.findMany({ where: { id: { in: charityIds } }, select: { id: true } })
    : await prisma.charity.findMany({ select: { id: true } });

  if (targetCharities.length > 0) {
    const servicesToCreate = targetCharities.map(c => ({
      name,
      department,
      charityId: c.id,
      templateId: template.id
    }));
    await prisma.service.createMany({ data: servicesToCreate });
  }
  revalidatePath('/main/manage-services');
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
  
  revalidatePath('/main/manage-services');
  return template;
}

export async function deleteServiceTemplate(id: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  await prisma.service.deleteMany({ where: { templateId: id } });
  const template = await (prisma as any).serviceTemplate.delete({ where: { id } });
  
  revalidatePath('/main/manage-services');
  return template;
}

// ═══════════════════════════════════════════════════════════════
// دوال إدارة الخدمات — تعمل مباشرة مع جدول Service
// ═══════════════════════════════════════════════════════════════

// جلب كل الخدمات مجمّعة حسب الاسم مع عدد الجمعيات
export async function getServicesForManagement() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const allServices = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      department: true,
      charity: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // تجميع حسب الاسم
  const grouped = new Map<string, {
    name: string;
    department: string | null;
    charities: { id: string; name: string }[];
    serviceIds: string[];
  }>();

  for (const svc of allServices) {
    if (!grouped.has(svc.name)) {
      grouped.set(svc.name, {
        name: svc.name,
        department: svc.department,
        charities: [],
        serviceIds: [],
      });
    }
    const group = grouped.get(svc.name)!;
    // تجنب تكرار نفس الجمعية
    if (!group.charities.some(c => c.id === svc.charity.id)) {
      group.charities.push(svc.charity);
    }
    group.serviceIds.push(svc.id);
  }

  return Array.from(grouped.values()).map(g => ({
    name: g.name,
    department: g.department,
    charityCount: g.charities.length,
    charities: g.charities,
    serviceIds: g.serviceIds,
  }));
}

// إضافة خدمة جديدة لجمعيات محددة
export async function addServiceToCharities(name: string, department: string | null, charityIds: string[]) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  if (!charityIds || charityIds.length === 0) {
    throw new Error("يرجى تحديد جمعية واحدة على الأقل");
  }

  const servicesToCreate = charityIds.map(cId => ({
    name: name.trim(),
    department,
    charityId: cId,
  }));

  await prisma.service.createMany({ data: servicesToCreate });
  
  revalidatePath('/main/manage-services');
  return { success: true, count: charityIds.length };
}

// تعديل اسم خدمة عند كل الجمعيات
export async function renameServiceGlobally(oldName: string, newName: string, newDepartment: string | null) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const result = await prisma.service.updateMany({
    where: { name: oldName },
    data: { name: newName.trim(), department: newDepartment }
  });

  revalidatePath('/main/manage-services');
  return { success: true, updatedCount: result.count };
}

// حذف خدمة من كل الجمعيات
export async function deleteServiceGlobally(name: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_charity_settings") && !hasPermission(session.role, session.permissions, "manage_charities")) {
    throw new Error("UNAUTHORIZED");
  }

  const result = await prisma.service.deleteMany({ where: { name } });

  revalidatePath('/main/manage-services');
  return { success: true, deletedCount: result.count };
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

// Stage-level actions below take a stageId/serviceId rather than a charityId,
// so they resolve the owning charity first and then apply the same
// assertCharityAccess check used by createService/updateService/deleteService.
// All of their call sites live under (dashboard)/main, so this is an
// employee-scoped guard.
async function assertStageAccess(stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const stage = await prisma.serviceStage.findUnique({
    where: { id: stageId },
    include: { service: true },
  });
  if (stage) await assertCharityAccess(session.id, session.role, stage.service.charityId);
  return session;
}

async function assertServiceAccess(serviceId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (service) await assertCharityAccess(session.id, session.role, service.charityId);
  return session;
}

export async function getServices(charityId: string, department?: string | null) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  await assertCharityAccess(session.id, session.role, charityId);

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
  
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/services`);
  if (service.department) {
    revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/${service.department.toLowerCase()}`);
  }
  
  return service;
}

export async function updateService(id: string, name: string, department: string | null, isComingSoon?: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const svc = await prisma.service.findUnique({ where: { id }, select: { charityId: true } });
  if (svc) await assertCharityAccess(session.id, session.role, svc.charityId);
  const dataToUpdate: any = { name, department };
  if (isComingSoon !== undefined) {
    dataToUpdate.isComingSoon = isComingSoon;
  }
  const service = await prisma.service.update({
    where: { id },
    data: dataToUpdate,
    include: { charity: true }
  });
  
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/services`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/strategy`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/governance`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/finance`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/programs`);
  
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
  
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/services`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/strategy`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/governance`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/finance`);
  revalidatePath(`/portal/${encodeURIComponent(service.charity.name)}/programs`);
  
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
  duration: string | null = null,
  isComingSoon: boolean = false
) {
  await assertServiceAccess(serviceId);

  const lastStage = await prisma.serviceStage.findFirst({
    where: { serviceId },
    orderBy: { order: 'desc' }
  });
  
  const newOrder = lastStage ? lastStage.order + 1 : 0;
  
  const stage: any = await (prisma as any).serviceStage.create({
    data: {
      serviceId,
      name,
      description,
      startDate,
      endDate,
      order: newOrder,
      isContinuous,
      isActive,
      duration,
      isComingSoon
    },
    include: { service: { include: { charity: true } } }
  });
  
  if (stage?.service?.charity) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
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
  duration: string | null = null,
  isComingSoon: boolean = false
) {
  await assertStageAccess(id);

  const stage: any = await (prisma as any).serviceStage.update({
    where: { id },
    data: { name, description, startDate, endDate, isContinuous, isActive, duration, isComingSoon },
    include: { service: { include: { charity: true } } }
  });
  
  if (stage?.service?.charity) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
  
  return stage;
}

export async function toggleServiceStageComingSoon(stageId: string, isComingSoon: boolean) {
  await assertStageAccess(stageId);

  const stage: any = await (prisma as any).serviceStage.update({
    where: { id: stageId },
    data: { isComingSoon },
    include: { service: { include: { charity: true } } }
  });

  if (stage?.service?.charity) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
  return stage;
}

export async function deleteServiceStage(id: string) {
  await assertStageAccess(id);

  const stage = await prisma.serviceStage.delete({
    where: { id },

    include: { service: { include: { charity: true } } }
  });
  
  revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
  if (stage.service.department) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
  }
  
  if (stage.serviceId) {
    await syncServiceProgress(stage.serviceId);
  }
  
  return stage;
}

export async function toggleActiveServiceStage(stageId: string, isActive: boolean) {
  await assertStageAccess(stageId);

  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isActive },
    include: { service: { include: { charity: true } } }
  });

  if (stage) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}

export async function reorderServiceStages(stageIds: string[]) {
  if (stageIds.length === 0) return;

  // All ids belong to one service in every call site; checking the first is
  // enough to establish charity access before the reorder loop.
  await assertStageAccess(stageIds[0]);

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
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}

export type SyncAction = { type: 'STAGE' | 'STEP'; id: string; isDone: boolean };

export async function syncServiceProgress(
  serviceId: string,
  actionOrForcedId?: SyncAction | string
) {
  // Also called internally from finance.ts/governance.ts, but those callers
  // already run inside an authenticated, charity-checked request, so the guard
  // is a no-op for them and only blocks direct external invocation.
  await assertServiceAccess(serviceId);

  const allStages = await prisma.serviceStage.findMany({
    where: { serviceId },
    orderBy: { order: 'asc' },
    include: { steps: { orderBy: { order: 'asc' } } }
  });

  if (allStages.length === 0) return;

  let action: SyncAction | undefined;
  if (typeof actionOrForcedId === 'string') {
    // Legacy forcedCurrentStageId
    action = { type: 'STAGE', id: actionOrForcedId, isDone: false };
  } else {
    action = actionOrForcedId;
  }

  if (action) {
    let targetStageIndex = -1;
    let targetStepIndex = -1;

    if (action.type === 'STAGE') {
      targetStageIndex = allStages.findIndex(s => s.id === action!.id);
    } else {
      for (let i = 0; i < allStages.length; i++) {
        const sIdx = allStages[i].steps.findIndex(stp => stp.id === action!.id);
        if (sIdx !== -1) {
          targetStageIndex = i;
          targetStepIndex = sIdx;
          break;
        }
      }
    }

    if (targetStageIndex !== -1) {
      if (action.type === 'STAGE') {
        if (action.isDone) {
          // Completed this stage.
          // Before and including: DONE
          for (let i = 0; i <= targetStageIndex; i++) {
            if (!allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: true } });
              allStages[i].isDone = true;
            }
            for (const stp of allStages[i].steps) {
              if (!stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: true } });
                stp.isDone = true;
              }
            }
          }
          // After: NOT DONE
          for (let i = targetStageIndex + 1; i < allStages.length; i++) {
            if (allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: false } });
              allStages[i].isDone = false;
            }
            for (const stp of allStages[i].steps) {
              if (stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: false } });
                stp.isDone = false;
              }
            }
          }
        } else {
          // Unchecked stage OR set as current.
          // Before: DONE
          for (let i = 0; i < targetStageIndex; i++) {
            if (!allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: true } });
              allStages[i].isDone = true;
            }
            for (const stp of allStages[i].steps) {
              if (!stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: true } });
                stp.isDone = true;
              }
            }
          }
          // Target and After: NOT DONE
          for (let i = targetStageIndex; i < allStages.length; i++) {
            if (allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: false } });
              allStages[i].isDone = false;
            }
            for (const stp of allStages[i].steps) {
              if (stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: false } });
                stp.isDone = false;
              }
            }
          }
        }
      } else if (action.type === 'STEP' && targetStepIndex !== -1) {
        if (action.isDone) {
          // Completed this step.
          // Before stages: DONE
          for (let i = 0; i < targetStageIndex; i++) {
            if (!allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: true } });
              allStages[i].isDone = true;
            }
            for (const stp of allStages[i].steps) {
              if (!stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: true } });
                stp.isDone = true;
              }
            }
          }
          // Same stage, steps up to target: DONE
          for (let j = 0; j <= targetStepIndex; j++) {
            if (!allStages[targetStageIndex].steps[j].isDone) {
              await (prisma as any).serviceStageStep.update({ where: { id: allStages[targetStageIndex].steps[j].id }, data: { isDone: true } });
              allStages[targetStageIndex].steps[j].isDone = true;
            }
          }
          // Same stage, steps after target: NOT DONE
          for (let j = targetStepIndex + 1; j < allStages[targetStageIndex].steps.length; j++) {
            if (allStages[targetStageIndex].steps[j].isDone) {
              await (prisma as any).serviceStageStep.update({ where: { id: allStages[targetStageIndex].steps[j].id }, data: { isDone: false } });
              allStages[targetStageIndex].steps[j].isDone = false;
            }
          }
          // After stages: NOT DONE
          for (let i = targetStageIndex + 1; i < allStages.length; i++) {
            if (allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: false } });
              allStages[i].isDone = false;
            }
            for (const stp of allStages[i].steps) {
              if (stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: false } });
                stp.isDone = false;
              }
            }
          }
        } else {
          // Unchecked step.
          // Before stages: remain untouched (they should be DONE)
          // Same stage, target step and after target: NOT DONE
          for (let j = targetStepIndex; j < allStages[targetStageIndex].steps.length; j++) {
            if (allStages[targetStageIndex].steps[j].isDone) {
              await (prisma as any).serviceStageStep.update({ where: { id: allStages[targetStageIndex].steps[j].id }, data: { isDone: false } });
              allStages[targetStageIndex].steps[j].isDone = false;
            }
          }
          // After stages: NOT DONE
          for (let i = targetStageIndex + 1; i < allStages.length; i++) {
            if (allStages[i].isDone) {
              await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isDone: false } });
              allStages[i].isDone = false;
            }
            for (const stp of allStages[i].steps) {
              if (stp.isDone) {
                await (prisma as any).serviceStageStep.update({ where: { id: stp.id }, data: { isDone: false } });
                stp.isDone = false;
              }
            }
          }
        }
      }
    }
  }

  // Evaluate each stage's isDone based on its steps
  for (let i = 0; i < allStages.length; i++) {
    const stage = allStages[i];
    if (stage.steps.length > 0) {
      const allStepsDone = stage.steps.every(stp => stp.isDone);
      if (stage.isDone !== allStepsDone) {
        await (prisma as any).serviceStage.update({ where: { id: stage.id }, data: { isDone: allStepsDone } });
        stage.isDone = allStepsDone;
      }
    }
  }

  // Find the first stage that is not done
  let currentStageIndex = allStages.findIndex(s => !s.isDone);
  if (currentStageIndex === -1) {
    currentStageIndex = allStages.length - 1;
  }

  for (let i = 0; i < allStages.length; i++) {
    const shouldBeCurrent = i === currentStageIndex;
    if (allStages[i].isCurrent !== shouldBeCurrent) {
      await (prisma as any).serviceStage.update({ where: { id: allStages[i].id }, data: { isCurrent: shouldBeCurrent } });
    }
  }
}

export async function setCurrentServiceStage(serviceId: string, stageId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  await syncServiceProgress(serviceId, stageId);
  
  const stage = await prisma.serviceStage.findUnique({
    where: { id: stageId },
    include: { service: { include: { charity: true } } }
  });
  
  if (stage) {
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
    revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}`);
    if (stage.service.department) {
      revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/${stage.service.department.toLowerCase()}`);
    }
  }
}

export async function toggleCurrentServiceStage(stageId: string, isCurrent: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  const stage = await prisma.serviceStage.update({
    where: { id: stageId },
    data: { isCurrent },
    include: { service: { include: { charity: true } } }
  });
  
  if (isCurrent) {
    await syncServiceProgress(stage.serviceId, stageId);
  } else {
    await syncServiceProgress(stage.serviceId);
  }
  
  revalidatePath(`/portal/${encodeURIComponent(stage.service.charity.name)}/services`);
}

export async function unifyCharityStagesAction(sourceCharityId: string, timelineType: string, sourceServiceId?: string, targetCharityIds?: string[]) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const isUserAdmin = isAdmin(session.role) || hasPermission(session.role, session.permissions || [], "view_all_charities");
  if (!isUserAdmin) {
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

  revalidatePath('/main');
  return { success: true };
}

export async function toggleGanttItemCompletion(type: 'stage'|'step', id: string, isDone: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");

  let serviceId: string | null = null;

  if (type === 'stage') {
    const stg = await prisma.serviceStage.findUnique({ where: { id } });
    if (!stg) return { success: false };
    serviceId = stg.serviceId;
    
    await (prisma as any).serviceStage.update({ where: { id }, data: { isDone } });
    await (prisma as any).serviceStageStep.updateMany({ where: { stageId: id }, data: { isDone } });
  } else {
    const stp = await prisma.serviceStageStep.findUnique({ where: { id }, include: { stage: true } });
    if (!stp) return { success: false };
    serviceId = stp.stage.serviceId;
    
    await (prisma as any).serviceStageStep.update({ where: { id }, data: { isDone } });
  }

  if (serviceId) {
    await syncServiceProgress(serviceId, { type: type === 'stage' ? 'STAGE' : 'STEP', id, isDone });
  }

  revalidatePath('/main');
  return { success: true };
}

export async function broadcastGanttWeek(
  sourceCharityId: string,
  timelineType: string,
  sourceServiceId: string,
  targetCharityIds: string[],
  weekStart: Date,
  weekEnd: Date,
  selectedStageIds: string[],
  selectedStepIds: string[]
) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");
  
  const sourceService = await prisma.service.findUnique({ where: { id: sourceServiceId } });
  if (!sourceService) throw new Error("الخدمة غير موجودة");

  const selectedSourceStages = await prisma.serviceStage.findMany({ where: { id: { in: selectedStageIds } } });
  const selectedSourceSteps = await prisma.serviceStageStep.findMany({ where: { id: { in: selectedStepIds } }, include: { stage: true } });

  for (const targetId of targetCharityIds) {
    let targetSvc = await prisma.service.findFirst({ 
      where: { 
        charityId: targetId, 
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
          charityId: targetId,
        }
      });
    }

    await (prisma as any).serviceStage.updateMany({
      where: { serviceId: targetSvc.id, startDate: weekStart, endDate: weekEnd },
      data: { startDate: null, endDate: null }
    });
    
    await (prisma as any).serviceStageStep.updateMany({
      where: { stage: { serviceId: targetSvc.id }, startDate: weekStart, endDate: weekEnd },
      data: { startDate: null, endDate: null }
    });

    for (const stg of selectedSourceStages) {
      let targetStage = await prisma.serviceStage.findFirst({
        where: { serviceId: targetSvc.id, name: stg.name }
      });
      if (!targetStage) {
        targetStage = await prisma.serviceStage.create({
          data: {
            serviceId: targetSvc.id, name: stg.name, description: stg.description, order: stg.order,
            isCurrent: false, isContinuous: stg.isContinuous, isActive: stg.isActive,
            startDate: weekStart, endDate: weekEnd, isDone: stg.isDone
          }
        });
      } else {
        await (prisma as any).serviceStage.update({
          where: { id: targetStage.id },
          data: { startDate: weekStart, endDate: weekEnd, isDone: stg.isDone }
        });
      }
    }

    for (const stp of selectedSourceSteps) {
      let targetStage = await prisma.serviceStage.findFirst({
        where: { serviceId: targetSvc.id, name: stp.stage.name }
      });
      if (!targetStage) {
         targetStage = await prisma.serviceStage.create({
            data: {
              serviceId: targetSvc.id, name: stp.stage.name, order: stp.stage.order,
              isCurrent: false, isContinuous: stp.stage.isContinuous, isActive: stp.stage.isActive
            }
         });
      }
      
      let targetStep = await prisma.serviceStageStep.findFirst({
         where: { stageId: targetStage.id, name: stp.name }
      });
      if (!targetStep) {
         await prisma.serviceStageStep.create({
           data: {
             stageId: targetStage.id, name: stp.name, order: stp.order, isDone: stp.isDone,
             startDate: weekStart, endDate: weekEnd
           }
         });
      } else {
         await (prisma as any).serviceStageStep.update({
           where: { id: targetStep.id },
           data: { startDate: weekStart, endDate: weekEnd, isDone: stp.isDone }
         });
      }
    }
  }
  revalidatePath('/main');
  return { success: true };
}

export async function toggleServiceComingSoon(name: string, department: string | null, isComingSoon: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!isAdmin(session.role) && !hasPermission(session.role, session.permissions || [], "manage_charity_settings")) {
    throw new Error("UNAUTHORIZED");
  }

  await (prisma.service as any).updateMany({
    where: { name, department: department || null },
    data: { isComingSoon }
  });

  return { success: true };
}

export async function toggleServiceComingSoonSingle(serviceId: string, isComingSoon: boolean) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!isAdmin(session.role) && !hasPermission(session.role, session.permissions || [], "manage_charity_settings")) {
    throw new Error("UNAUTHORIZED");
  }

  await (prisma.service as any).update({
    where: { id: serviceId },
    data: { isComingSoon }
  });

  return { success: true };
}
