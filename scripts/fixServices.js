const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/actions/services.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const startIdx = content.indexOf('export async function unifyCharityStagesAction');
const endIdx = content.length;

const newFunction = `export async function unifyCharityStagesAction(sourceCharityId: string, timelineType: string, sourceServiceId?: string, targetCharityIds?: string[]) {
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
`;

content = content.substring(0, startIdx) + newFunction;
fs.writeFileSync(filePath, content, 'utf-8');
console.log("Updated services.ts");
