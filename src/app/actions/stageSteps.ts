"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

// ── Strategic ──────────────────────────────────────────────────────────
export async function addStrategicStageStep(stageId: string, name: string) {
  await requireSession();
  const last = await prisma.strategicStageStep.findFirst({ where: { stageId }, orderBy: { order: "desc" } });
  const step = await prisma.strategicStageStep.create({ data: { stageId, name, order: (last?.order ?? -1) + 1 } });
  const stage = await prisma.strategicStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
  return step;
}

export async function updateStrategicStageStep(stepId: string, data: { name?: string; isDone?: boolean }) {
  await requireSession();
  const step = await prisma.strategicStageStep.update({ where: { id: stepId }, data, include: { stage: { include: { charity: true } } } });
  revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
  return step;
}

export async function deleteStrategicStageStep(stepId: string) {
  await requireSession();
  const step = await prisma.strategicStageStep.findUnique({ where: { id: stepId }, include: { stage: { include: { charity: true } } } });
  await prisma.strategicStageStep.delete({ where: { id: stepId } });
  if (step) revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
}

export async function reorderStrategicStageSteps(stageId: string, orderedIds: string[]) {
  await requireSession();
  await Promise.all(orderedIds.map((id, i) => prisma.strategicStageStep.update({ where: { id }, data: { order: i } })));
  const stage = await prisma.strategicStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
}

// ── Governance ─────────────────────────────────────────────────────────
export async function addGovernanceStageStep(stageId: string, name: string) {
  await requireSession();
  const last = await prisma.governanceStageStep.findFirst({ where: { stageId }, orderBy: { order: "desc" } });
  const step = await prisma.governanceStageStep.create({ data: { stageId, name, order: (last?.order ?? -1) + 1 } });
  const stage = await prisma.governanceStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
  return step;
}

export async function updateGovernanceStageStep(stepId: string, data: { name?: string; isDone?: boolean }) {
  await requireSession();
  const step = await prisma.governanceStageStep.update({ where: { id: stepId }, data, include: { stage: { include: { charity: true } } } });
  revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
  return step;
}

export async function deleteGovernanceStageStep(stepId: string) {
  await requireSession();
  const step = await prisma.governanceStageStep.findUnique({ where: { id: stepId }, include: { stage: { include: { charity: true } } } });
  await prisma.governanceStageStep.delete({ where: { id: stepId } });
  if (step) revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
}

export async function reorderGovernanceStageSteps(stageId: string, orderedIds: string[]) {
  await requireSession();
  await Promise.all(orderedIds.map((id, i) => prisma.governanceStageStep.update({ where: { id }, data: { order: i } })));
  const stage = await prisma.governanceStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
}

// ── Finance ────────────────────────────────────────────────────────────
export async function addFinanceStageStep(stageId: string, name: string) {
  await requireSession();
  const last = await prisma.financeStageStep.findFirst({ where: { stageId }, orderBy: { order: "desc" } });
  const step = await prisma.financeStageStep.create({ data: { stageId, name, order: (last?.order ?? -1) + 1 } });
  const stage = await prisma.financeStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
  return step;
}

export async function updateFinanceStageStep(stepId: string, data: { name?: string; isDone?: boolean }) {
  await requireSession();
  const step = await prisma.financeStageStep.update({ where: { id: stepId }, data, include: { stage: { include: { charity: true } } } });
  revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
  return step;
}

export async function deleteFinanceStageStep(stepId: string) {
  await requireSession();
  const step = await prisma.financeStageStep.findUnique({ where: { id: stepId }, include: { stage: { include: { charity: true } } } });
  await prisma.financeStageStep.delete({ where: { id: stepId } });
  if (step) revalidatePath(`/charity/${encodeURIComponent(step.stage.charity.name)}/services`);
}

export async function reorderFinanceStageSteps(stageId: string, orderedIds: string[]) {
  await requireSession();
  await Promise.all(orderedIds.map((id, i) => prisma.financeStageStep.update({ where: { id }, data: { order: i } })));
  const stage = await prisma.financeStage.findUnique({ where: { id: stageId }, include: { charity: true } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.charity.name)}/services`);
}

// ── Service ────────────────────────────────────────────────────────────
export async function addServiceStageStep(stageId: string, name: string) {
  await requireSession();
  const last = await prisma.serviceStageStep.findFirst({ where: { stageId }, orderBy: { order: "desc" } });
  const step = await prisma.serviceStageStep.create({ data: { stageId, name, order: (last?.order ?? -1) + 1 } });
  const stage = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
  return step;
}

export async function updateServiceStageStep(stepId: string, data: { name?: string; isDone?: boolean }) {
  await requireSession();
  const step = await prisma.serviceStageStep.update({ where: { id: stepId }, data, include: { stage: { include: { service: { include: { charity: true } } } } } });
  revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/services`);
  return step;
}

export async function deleteServiceStageStep(stepId: string) {
  await requireSession();
  const step = await prisma.serviceStageStep.findUnique({ where: { id: stepId }, include: { stage: { include: { service: { include: { charity: true } } } } } });
  await prisma.serviceStageStep.delete({ where: { id: stepId } });
  if (step) revalidatePath(`/charity/${encodeURIComponent(step.stage.service.charity.name)}/services`);
}

export async function reorderServiceStageSteps(stageId: string, orderedIds: string[]) {
  await requireSession();
  await Promise.all(orderedIds.map((id, i) => prisma.serviceStageStep.update({ where: { id }, data: { order: i } })));
  const stage = await prisma.serviceStage.findUnique({ where: { id: stageId }, include: { service: { include: { charity: true } } } });
  if (stage) revalidatePath(`/charity/${encodeURIComponent(stage.service.charity.name)}/services`);
}
