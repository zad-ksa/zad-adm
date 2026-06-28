"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { assertCharityAccess } from "@/lib/access";

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

export async function unifyCharityStagesAction(sourceCharityId: string, timelineType: string, sourceServiceId?: string, targetCharityIds?: string[]) {
  // 1. Get source stages
  let sourceStages: {
    name: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    duration: string | null;
    order: number;
    isCurrent: boolean;
    isContinuous: boolean;
    isActive: boolean;
  }[] = [];

  if (timelineType === "STRATEGY") {
    const stages = await prisma.strategicStage.findMany({
      where: { charityId: sourceCharityId },
      orderBy: { order: "asc" }
    });
    sourceStages = stages.map(s => ({
      name: s.name,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      duration: s.duration,
      order: s.order,
      isCurrent: s.isCurrent,
      isContinuous: s.isContinuous,
      isActive: s.isActive
    }));
  } else if (timelineType === "GOVERNANCE") {
    const stages = await prisma.governanceStage.findMany({
      where: { charityId: sourceCharityId },
      orderBy: { order: "asc" }
    });
    sourceStages = stages.map(s => ({
      name: s.name,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      duration: s.duration,
      order: s.order,
      isCurrent: s.isCurrent,
      isContinuous: s.isContinuous,
      isActive: s.isActive
    }));
  } else if (timelineType === "FINANCE") {
    const stages = await prisma.financeStage.findMany({
      where: { charityId: sourceCharityId },
      orderBy: { order: "asc" }
    });
    sourceStages = stages.map(s => ({
      name: s.name,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      duration: s.duration,
      order: s.order,
      isCurrent: s.isCurrent,
      isContinuous: s.isContinuous,
      isActive: s.isActive
    }));
  } else if (timelineType === "CUSTOM") {
    if (!sourceServiceId) throw new Error("لم يتم تحديد الخدمة المصدر");
    const stages = await prisma.serviceStage.findMany({
      where: { serviceId: sourceServiceId },
      orderBy: { order: "asc" }
    });
    sourceStages = stages.map(s => ({
      name: s.name,
      description: s.description,
      startDate: s.startDate,
      endDate: s.endDate,
      duration: s.duration,
      order: s.order,
      isCurrent: s.isCurrent,
      isContinuous: s.isContinuous,
      isActive: s.isActive
    }));
  }

  if (sourceStages.length === 0) {
    if (timelineType === "CUSTOM" && !sourceServiceId) {
      throw new Error("لم يتم العثور على خدمة مطابقة لهذه الجمعية");
    }
    throw new Error("لا توجد مراحل في المخطط الزمني المختار لنسخها");
  }

  // Find target charities (specific list or all except source)
  const otherCharities = await prisma.charity.findMany({
    where: targetCharityIds?.length
      ? { id: { in: targetCharityIds } }
      : { id: { not: sourceCharityId } }
  });

  if (otherCharities.length === 0) {
    return { success: true };
  }

  // IDs of charities we will actually overwrite
  const targetIds = otherCharities.map(c => c.id);

  // 2. Perform transaction to clear and write stages to other charities for the SAME timeline
  if (timelineType === "STRATEGY") {
    await prisma.$transaction([
      prisma.strategicStage.deleteMany({ where: { charityId: { in: targetIds } } }),
      prisma.strategicStage.createMany({
        data: otherCharities.flatMap(c => sourceStages.map(s => ({ ...s, charityId: c.id })))
      })
    ]);
  } else if (timelineType === "GOVERNANCE") {
    await prisma.$transaction([
      prisma.governanceStage.deleteMany({ where: { charityId: { in: targetIds } } }),
      prisma.governanceStage.createMany({
        data: otherCharities.flatMap(c => sourceStages.map(s => ({ ...s, charityId: c.id })))
      })
    ]);
  } else if (timelineType === "FINANCE") {
    await prisma.$transaction([
      prisma.financeStage.deleteMany({ where: { charityId: { in: targetIds } } }),
      prisma.financeStage.createMany({
        data: otherCharities.flatMap(c => sourceStages.map(s => ({ ...s, charityId: c.id })))
      })
    ]);
  } else if (timelineType === "CUSTOM" && sourceServiceId) {
    const sourceService = await prisma.service.findUnique({
      where: { id: sourceServiceId }
    });
    if (sourceService) {
      for (const targetCharity of otherCharities) {
        // Find existing service with same name in this charity
        let targetSvc = await prisma.service.findFirst({
          where: {
            charityId: targetCharity.id,
            name: sourceService.name
          }
        });

        // If it doesn't exist yet, create it so stages can be copied
        if (!targetSvc) {
          targetSvc = await prisma.service.create({
            data: {
              name: sourceService.name,
              department: sourceService.department,
              charityId: targetCharity.id
            }
          });
        }

        await prisma.$transaction([
          prisma.serviceStage.deleteMany({ where: { serviceId: targetSvc.id } }),
          prisma.serviceStage.createMany({
            data: sourceStages.map(s => ({ ...s, serviceId: targetSvc!.id }))
          })
        ]);
      }
    }
  }

  // Get charity name for revalidation path
  const sourceCharity = await prisma.charity.findUnique({
    where: { id: sourceCharityId }
  });

  if (sourceCharity) {
    // For simplicity, we can just revalidate paths for all charities if needed, 
    // but in Next.js App Router we can just rely on router.refresh() from the client side 
    // or revalidate the specific paths for the dashboard.
    // Dashboard overview
    revalidatePath(`/dashboard/services-overview`);
    // Revalidate for all charities (optimistic, or we can just let client router.refresh handle it)
    revalidatePath(`/charity/[name]/services`, 'page');
    revalidatePath(`/charity/[name]/strategy`, 'page');
    revalidatePath(`/charity/[name]/governance`, 'page');
    revalidatePath(`/charity/[name]/finance`, 'page');
    revalidatePath(`/charity/[name]/programs`, 'page');
  }

  return { success: true };
}
