"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { chainPurposeOf, type ChainPurpose } from "@/lib/requestQuery";
import { cleanRequestCategories, withoutCategories } from "@/lib/requestCategories";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_workflow")) {
    throw new Error("غير مصرح");
  }
  return session;
}

// ── إنشاء سلسلة جديدة ────────────────────────────────────────────────────────
export async function createChain(name: string, purpose: ChainPurpose = "GENERAL") {
  await requireAdmin();
  const chain = await prisma.workflowChain.create({
    data: { name: name.trim(), purpose: chainPurposeOf(purpose), isActive: false },
  });
  revalidatePath("/main/workflow-settings");
  return chain;
}

// ── حذف سلسلة ────────────────────────────────────────────────────────────────
export async function deleteChain(chainId: string) {
  await requireAdmin();
  await prisma.workflowChain.delete({ where: { id: chainId } });
  revalidatePath("/main/workflow-settings");
}

// ── تفعيل سلسلة كالافتراضية (وإلغاء تفعيل الباقي) ───────────────────────────
export async function setActiveChain(chainId: string) {
  await requireAdmin();

  // الإطفاءُ محصورٌ بغرض السلسلة نفسها.
  //
  // فحين كان `updateMany` بلا شرطٍ كان تفعيلُ مسارٍ مالي يُطفئ المسار العام،
  // فتتوقّف الطلبات كلّها عن إيجاد مُراجعٍ أوّل. ولكل غرضٍ سلسلةٌ نشطةٌ واحدة.
  const chain = await prisma.workflowChain.findUnique({
    where: { id: chainId },
    select: { purpose: true },
  });
  if (!chain) throw new Error("السلسلة غير موجودة");

  await prisma.$transaction([
    prisma.workflowChain.updateMany({
      where: { purpose: chain.purpose },
      data: { isActive: false },
    }),
    prisma.workflowChain.update({ where: { id: chainId }, data: { isActive: true } }),
  ]);

  revalidatePath("/main/workflow-settings");
}

// ── إلغاء تفعيل جميع السلاسل (بدون workflow) ─────────────────────────────────
export async function clearActiveChain(purpose: ChainPurpose = "GENERAL") {
  await requireAdmin();
  await prisma.workflowChain.updateMany({
    where: { purpose: chainPurposeOf(purpose) },
    data: { isActive: false },
  });
  revalidatePath("/main/workflow-settings");
}

// ── أقسام الطلبات التي تمر بالسلسلة ─────────────────────────────────────────
/**
 * إسنادُ أقسامٍ إلى سلسلة — وبه يُستغنى عن التفعيل والتعطيل في كلِّ طلب.
 *
 * **والإسنادُ حصريٌّ في الغرض**: القسمُ الذي يُسند إلى سلسلةٍ يُنزع من
 * أخواتها، فلا يُقرأ المسارُ من ترتيب الصفوف. ولو جاز لقسمٍ أن يكون في
 * سلسلتين لصار مسارُ طلبه رهنَ أيِّهما أُنشئت أوّلاً — وهو خبرٌ لا يُقرأ
 * في الشاشة ولا يُتوقَّع.
 *
 * وتُنقّى المفاتيحُ قبل الحفظ (`cleanRequestCategories`): قسمٌ لا يعرفه
 * النموذجُ لا يُرفع به طلب، فإسنادُه يحجز مساراً لا سالكَ له.
 */
export async function setChainCategories(chainId: string, categories: string[]) {
  await requireAdmin();

  const chain = await prisma.workflowChain.findUnique({
    where: { id: chainId },
    select: { purpose: true },
  });
  if (!chain) throw new Error("السلسلة غير موجودة");

  const wanted = cleanRequestCategories(categories);

  try {
    const siblings = await prisma.workflowChain.findMany({
      where: { purpose: chain.purpose, id: { not: chainId } },
      select: { id: true, categories: true },
    });

    await prisma.$transaction([
      prisma.workflowChain.update({ where: { id: chainId }, data: { categories: wanted } }),
      ...siblings
        .filter((s) => s.categories.some((c) => wanted.includes(c)))
        .map((s) =>
          prisma.workflowChain.update({
            where: { id: s.id },
            data: { categories: withoutCategories(s.categories, wanted) },
          })
        ),
    ]);
  } catch (error) {
    // العمودُ قد لا يكون أُنشئ بعد — والسببُ يُقال كما هو لا «فشل الحفظ».
    console.error("setChainCategories", error);
    throw new Error(
      "تعذر حفظ الأقسام — لم يطبق بعد prisma/sql/workflow-chain-categories.sql على قاعدة البيانات"
    );
  }

  revalidatePath("/main/workflow-settings");
  revalidatePath("/main/approvals");
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
  revalidatePath("/main/workflow-settings");
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

  revalidatePath("/main/workflow-settings");
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

  revalidatePath("/main/workflow-settings");
}

// ── تحديث label لخطوة ────────────────────────────────────────────────────────
export async function updateStepLabel(stepId: string, label: string) {
  await requireAdmin();
  await prisma.workflowStep.update({
    where: { id: stepId },
    data: { label: label.trim() || null },
  });
  revalidatePath("/main/workflow-settings");
}

// ── تحديث اسم سلسلة ──────────────────────────────────────────────────────────
export async function updateChainName(chainId: string, name: string) {
  await requireAdmin();
  await prisma.workflowChain.update({
    where: { id: chainId },
    data: { name: name.trim() },
  });
  revalidatePath("/main/workflow-settings");
}
