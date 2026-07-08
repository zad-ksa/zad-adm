"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { syncServiceProgress } from "./services";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

// ── Service ────────────────────────────────────────────────────────────
export async function addServiceStageStep(stageId: string, name: string) {
  await requireSession();
  const last = await prisma.serviceStageStep.findFirst({ where: { stageId }, orderBy: { order: "desc" } });
  const step = await prisma.serviceStageStep.create({ data: { stageId, name, order: (last?.order ?? -1) + 1 } });
  const stage = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stage) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/governance`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/finance`);
  }
  return step;
}

export async function updateServiceStageStep(stepId: string, data: { name?: string; isDone?: boolean }) {
  await requireSession();
  const step = await prisma.serviceStageStep.update({ where: { id: stepId }, data, include: { stage: { include: { service: { include: { charity: true } } } } } });
  
  if (data.isDone !== undefined) {
    await syncServiceProgress(step.stage.serviceId, { type: 'STEP', id: stepId, isDone: data.isDone });
  }
  revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/services`);
  revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/strategy`);
  revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/governance`);
  revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/finance`);
  return step;
}

export async function deleteServiceStageStep(stepId: string) {
  await requireSession();
  const step = await prisma.serviceStageStep.findUnique({ where: { id: stepId }, include: { stage: { include: { service: { include: { charity: true } } } } } });
  await prisma.serviceStageStep.delete({ where: { id: stepId } });
  if (step) {
    revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/services`);
    revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/strategy`);
    revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/governance`);
    revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/finance`);
  }
}

export async function reorderServiceStageSteps(stageId: string, orderedIds: string[]) {
  await requireSession();
  await Promise.all(orderedIds.map((id, i) => prisma.serviceStageStep.update({ where: { id }, data: { order: i } })));
  const stage = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stage) {
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/strategy`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/governance`);
    revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/finance`);
  }
}

// Aliases for legacy compatibility
export const addStrategicStageStep = addServiceStageStep;
export const updateStrategicStageStep = updateServiceStageStep;
export const deleteStrategicStageStep = deleteServiceStageStep;
export const reorderStrategicStageSteps = reorderServiceStageSteps;

export const addGovernanceStageStep = addServiceStageStep;
export const updateGovernanceStageStep = updateServiceStageStep;
export const deleteGovernanceStageStep = deleteServiceStageStep;
export const reorderGovernanceStageSteps = reorderServiceStageSteps;

export const addFinanceStageStep = addServiceStageStep;
export const updateFinanceStageStep = updateServiceStageStep;
export const deleteFinanceStageStep = deleteServiceStageStep;
export const reorderFinanceStageSteps = reorderServiceStageSteps;
