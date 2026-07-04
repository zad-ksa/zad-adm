"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_workflow")) {
    throw new Error("غير مصرح");
  }
  return session;
}

// ── إنشاء سلسلة جديدة ────────────────────────────────────────────────────────
export async function createChain(name: string) {
  await requireAdmin();
  const chain = await prisma.workflowChain.create({
    data: { name: name.trim(), isActive: false },
  });
  revalidatePath("/dashboard/workflow-settings");
  return chain;
}

// ── حذف سلسلة ────────────────────────────────────────────────────────────────
export async function deleteChain(chainId: string) {
  await requireAdmin();
  await prisma.workflowChain.delete({ where: { id: chainId } });
  revalidatePath("/dashboard/workflow-settings");
}

// ── تفعيل سلسلة كالافتراضية (وإلغاء تفعيل الباقي) ───────────────────────────
export async function setActiveChain(chainId: string) {
  await requireAdmin();
  await prisma.workflowChain.updateMany({ data: { isActive: false } });
  await prisma.workflowChain.update({
    where: { id: chainId },
    data: { isActive: true },
  });
  revalidatePath("/dashboard/workflow-settings");
}

// ── إلغاء تفعيل جميع السلاسل (بدون workflow) ─────────────────────────────────
export async function clearActiveChain() {
  await requireAdmin();
  await prisma.workflowChain.updateMany({ data: { isActive: false } });
  revalidatePath("/dashboard/workflow-settings");
}

// ── إضافة خطوة لسلسلة ────────────────────────────────────────────────────────
export async function addStep(data: {
  chainId: string;
  approverId: string;
  label?: string;
}) {
  await requireAdmin();

  // أوجد أعلى order حالي
  const last = await prisma.workflowStep.findFirst({
    where: { chainId: data.chainId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (last?.order ?? 0) + 1;

  await prisma.workflowStep.create({
    data: {
      chainId: data.chainId,
      approverId: data.approverId,
      label: data.label?.trim() || null,
      order: nextOrder,
    },
  });
  revalidatePath("/dashboard/workflow-settings");
}

// ── حذف خطوة ─────────────────────────────────────────────────────────────────
export async function removeStep(stepId: string) {
  await requireAdmin();
  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
  if (!step) throw new Error("الخطوة غير موجودة");

  await prisma.workflowStep.delete({ where: { id: stepId } });

  // أعد ترقيم الخطوات التالية
  await prisma.$executeRaw`
    UPDATE "WorkflowStep"
    SET "order" = "order" - 1
    WHERE "chainId" = ${step.chainId} AND "order" > ${step.order}
  `;

  revalidatePath("/dashboard/workflow-settings");
}

// ── تبديل ترتيب خطوتين ───────────────────────────────────────────────────────
export async function reorderSteps(stepId: string, direction: "up" | "down") {
  await requireAdmin();

  const step = await prisma.workflowStep.findUnique({ where: { id: stepId } });
  if (!step) throw new Error("الخطوة غير موجودة");

  const targetOrder = direction === "up" ? step.order - 1 : step.order + 1;
  if (targetOrder < 1) return;

  const sibling = await prisma.workflowStep.findUnique({
    where: { chainId_order: { chainId: step.chainId, order: targetOrder } },
  });
  if (!sibling) return;

  // تبديل الترتيب
  await prisma.$transaction([
    prisma.workflowStep.update({ where: { id: step.id }, data: { order: targetOrder } }),
    prisma.workflowStep.update({ where: { id: sibling.id }, data: { order: step.order } }),
  ]);

  revalidatePath("/dashboard/workflow-settings");
}

// ── تحديث label لخطوة ────────────────────────────────────────────────────────
export async function updateStepLabel(stepId: string, label: string) {
  await requireAdmin();
  await prisma.workflowStep.update({
    where: { id: stepId },
    data: { label: label.trim() || null },
  });
  revalidatePath("/dashboard/workflow-settings");
}

// ── تحديث اسم سلسلة ──────────────────────────────────────────────────────────
export async function updateChainName(chainId: string, name: string) {
  await requireAdmin();
  await prisma.workflowChain.update({
    where: { id: chainId },
    data: { name: name.trim() },
  });
  revalidatePath("/dashboard/workflow-settings");
}
