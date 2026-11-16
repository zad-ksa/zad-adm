"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  cleanRequestCategories,
  defaultChains,
  withoutCategories,
} from "@/lib/requestCategories";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_workflow")) {
    throw new Error("غير مصرح");
  }
  return session;
}

// ── إنشاء سلسلة جديدة ────────────────────────────────────────────────────────
/**
 * سلسلةٌ جديدةٌ معطَّلة: تُبنى مستوياتُها وتُسند خدماتُها ثم تُفعَّل.
 *
 * ولا غرضَ لها: كان لكلِّ نوعِ طلبٍ بركةُ سلاسل، فصارت بركةً واحدةً
 * والمسارُ بالخدمة. و`purpose` يبقى على قيمته الافتراضية في الصفّ ولا يُقرأ.
 */
export async function createChain(name: string) {
  await requireAdmin();
  const chain = await prisma.workflowChain.create({
    data: { name: name.trim(), isActive: false },
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

// ── تفعيل سلسلة وتعطيلها ────────────────────────────────────────────────────
/**
 * سلاسلُ تعمل معاً، ما لم تشترك في خدمة.
 *
 * **والتفعيلُ لم يبقَ حصرياً**: كان تفعيلُ سلسلةٍ يُطفئ أخواتَها، فلم يكن
 * للموقع إلا مسارٌ واحدٌ في كلِّ لحظة. وقد صارت الخدمةُ هي المسار،
 * والإسنادُ حصريٌّ أصلاً، فلا تضاربَ في تفعيلهما معاً.
 *
 * **وإنما يُمنع تعدُّدُ الافتراضيّة**: السلسلةُ المفعَّلةُ بلا خدماتٍ تدّعي
 * كلَّ ما لم يُسند، فاثنتان منها تجعلان مسارَ الخدمة غير المسندة رهنَ ترتيب
 * الصفوف. والسببُ يُقال كما هو حتى يُعرف ما يُفعل.
 */
async function chainsForDefaultCheck() {
  // والأقسامُ محروسة: عمودُها قد لا يكون أُنشئ بعد، وحينئذٍ لا يُعرف من
  // الصفوف إن كانت السلسلةُ بلا خدمات — فتُقرأ كلُّها «بلا خدمات» ويُترك
  // الفحصُ، إذ لا تعدُّدَ افتراضيّةٍ يُمنع في نظامٍ لا يعرف الخدمات بعد.
  try {
    return await prisma.workflowChain.findMany({
      select: { id: true, name: true, isActive: true, categories: true, steps: { select: { id: true } } },
    });
  } catch (error) {
    console.error("chainsForDefaultCheck", error);
    return null;
  }
}

export async function setActiveChain(chainId: string) {
  await requireAdmin();

  const rows = await chainsForDefaultCheck();
  const chain = rows?.find((c) => c.id === chainId);
  if (rows && !chain) throw new Error("السلسلة غير موجودة");

  if (rows && chain && chain.categories.length === 0) {
    const others = defaultChains(
      rows
        .filter((c) => c.id !== chainId)
        .map((c) => ({ ...c, stepCount: c.steps.length }))
    );
    if (others.length > 0) {
      throw new Error(
        `لا تعمل سلسلتان بلا خدمات: «${others[0].name}» تمر بها الخدمات غير المسندة. اسند خدمات لهذه السلسلة، او عطل تلك`
      );
    }
  }

  await prisma.workflowChain.update({ where: { id: chainId }, data: { isActive: true } });

  revalidatePath("/main/workflow-settings");
  revalidatePath("/main/approvals");
  revalidatePath("/main/financial-requests");
}

/** تعطيلُ سلسلةٍ بعينها: خدماتُها تبقى مسندةً وتسقط إلى الافتراضيّة. */
export async function deactivateChain(chainId: string) {
  await requireAdmin();
  await prisma.workflowChain.update({ where: { id: chainId }, data: { isActive: false } });
  revalidatePath("/main/workflow-settings");
  revalidatePath("/main/approvals");
  revalidatePath("/main/financial-requests");
}

// ── الخدمات التي تمر بالسلسلة ───────────────────────────────────────────────
/**
 * إسنادُ خدماتٍ إلى سلسلة — وبه يُستغنى عن التفعيل والتعطيل في كلِّ طلب.
 *
 * **والإسنادُ حصريٌّ في الموقع كلِّه**: الخدمةُ التي تُسند إلى سلسلةٍ تُنزع
 * من أخواتها، فلا يُقرأ المسارُ من ترتيب الصفوف. ولو جازت خدمةٌ في سلسلتين
 * لصار مسارُ طلبها رهنَ أيِّهما أُنشئت أوّلاً — وهو خبرٌ لا يُقرأ في الشاشة
 * ولا يُتوقَّع. وبهذا تعمل السلاسلُ معاً بلا اشتراك.
 *
 * **ولا تُترك سلسلةٌ مفعَّلةٌ بلا خدماتٍ إن كانت لغيرها**: ذاك تعدُّدُ
 * افتراضيّةٍ، وهو ما يمنعه التفعيلُ نفسُه.
 *
 * وتُنقّى المفاتيحُ قبل الحفظ (`cleanRequestCategories`): خدمةٌ لا يعرفها
 * النموذجُ لا يُرفع بها طلب، فإسنادُها يحجز مساراً لا سالكَ له.
 */
export async function setChainCategories(chainId: string, categories: string[]) {
  await requireAdmin();

  const wanted = cleanRequestCategories(categories);

  try {
    const siblings = await prisma.workflowChain.findMany({
      where: { id: { not: chainId } },
      select: { id: true, name: true, isActive: true, categories: true, steps: { select: { id: true } } },
    });

    // وتجريدُ سلسلةٍ عاملةٍ من خدماتها يجعلها افتراضيّةً ثانية.
    if (wanted.length === 0) {
      const chain = await prisma.workflowChain.findUnique({
        where: { id: chainId },
        select: { isActive: true, steps: { select: { id: true } } },
      });
      if (!chain) throw new Error("السلسلة غير موجودة");
      const others = defaultChains(siblings.map((s) => ({ ...s, stepCount: s.steps.length })));
      if (chain.isActive && chain.steps.length > 0 && others.length > 0) {
        throw new Error(
          `لا تعمل سلسلتان بلا خدمات: «${others[0].name}» تمر بها الخدمات غير المسندة. عطل احداهما قبل تجريد هذه من خدماتها`
        );
      }
    }

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
    // الرسالةُ المكتوبةُ هنا تُمرَّر كما هي: منعُ تعدُّد الافتراضيّة خبرٌ
    // يُقرأ، لا عطبٌ يُستر بـ«تعذر الحفظ».
    if (error instanceof Error && error.message.startsWith("لا تعمل")) throw error;
    if (error instanceof Error && error.message === "السلسلة غير موجودة") throw error;
    // والعمودُ قد لا يكون أُنشئ بعد — والسببُ يُقال كما هو.
    console.error("setChainCategories", error);
    throw new Error(
      "تعذر حفظ الخدمات — لم يطبق بعد prisma/sql/workflow-chain-categories.sql على قاعدة البيانات"
    );
  }

  revalidatePath("/main/workflow-settings");
  revalidatePath("/main/approvals");
  revalidatePath("/main/financial-requests");
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
