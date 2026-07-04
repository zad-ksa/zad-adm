"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

// ── helpers ───────────────────────────────────────────────────────────────────

function canViewRequests(role: string, permissions: string[]) {
  return hasPermission(role, permissions, "view_requests");
}
function isExec(role: string, permissions: string[]) {
  return hasPermission(role, permissions, "manage_requests");
}

async function requireSession() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  return session;
}

// أرسل إشعاراً لشخص واحد (upsert حتى لا يتكرر)
async function notify(requestId: string, employeeId: string) {
  await prisma.requestNotification.upsert({
    where: { requestId_employeeId: { requestId, employeeId } },
    create: { requestId, employeeId, isRead: false },
    update: { isRead: false },
  });
}

// ── إنشاء طلب جديد ───────────────────────────────────────────────────────────
export async function createRequest(data: {
  title: string;
  category?: string;
  body?: string;
  fileUrl?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await requireSession();
  if (!canViewRequests(session.role, session.permissions || [])) {
    throw new Error("غير مصرح");
  }

  // هل يوجد workflow نشط؟
  const chain = await prisma.workflowChain.findFirst({
    where: { isActive: true },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  const firstStep = chain?.steps[0] ?? null;

  const request = await prisma.request.create({
    data: {
      title: data.title.trim(),
      category: data.category?.trim() || null,
      body: data.body?.trim() || null,
      fileUrl: data.fileUrl?.trim() || null,
      priority: data.priority,
      status: "PENDING",
      createdById: session.id,
      chainId: chain?.id ?? null,
      currentStepOrder: 1,
      currentReviewerId: firstStep?.approverId ?? null,
    },
  });

  // سجل الإنشاء
  await prisma.requestLog.create({
    data: {
      requestId: request.id,
      stepOrder: 0,
      actorId: session.id,
      action: "SUBMITTED",
    },
  });

  // إشعار: إذا وُجد workflow → أشعر الخطوة الأولى فقط؛ وإلا أشعر كل الإدارة
  if (firstStep) {
    if (firstStep.approverId !== session.id) {
      await notify(request.id, firstStep.approverId);
    }
  } else {
    const execs = await prisma.employee.findMany({
      where: {
        isActive: true,
        role: { in: ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT", "ADMIN"] },
        id: { not: session.id },
      },
      select: { id: true },
    });
    for (const e of execs) {
      await notify(request.id, e.id);
    }
  }

  revalidatePath("/dashboard/requests");
  return request;
}

// ── مراجعة طلب ────────────────────────────────────────────────────────────────
export async function reviewRequest(data: {
  requestId: string;
  action: "APPROVED_FINAL" | "FORWARDED" | "REJECTED" | "RETURNED" | "DELEGATED";
  note?: string;
  delegatedToId?: string; // مطلوب عند DELEGATED
}) {
  const session = await requireSession();
  if (!isExec(session.role, session.permissions || [])) {
    throw new Error("غير مصرح");
  }

  const request = await prisma.request.findUnique({
    where: { id: data.requestId },
    include: {
      chain: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });
  if (!request) throw new Error("الطلب غير موجود");
  if (request.status !== "PENDING") throw new Error("لا يمكن مراجعة طلب غير قيد المراجعة");

  if (data.action !== "APPROVED_FINAL" && data.action !== "DELEGATED" && !data.note?.trim()) {
    throw new Error("يجب ذكر السبب أو الملاحظات");
  }
  if (data.action === "DELEGATED" && !data.delegatedToId) {
    throw new Error("يجب اختيار الشخص المحوَّل إليه");
  }

  // سجل الخطوة
  await prisma.requestLog.create({
    data: {
      requestId: data.requestId,
      stepOrder: request.currentStepOrder,
      actorId: session.id,
      action: data.action,
      note: data.note?.trim() || null,
      delegatedToId: data.delegatedToId ?? null,
    },
  });

  if (data.action === "FORWARDED") {
    // ابحث عن الخطوة التالية
    const nextStep = request.chain?.steps.find(
      (s) => s.order === request.currentStepOrder + 1
    );

    if (nextStep) {
      await prisma.request.update({
        where: { id: data.requestId },
        data: {
          currentStepOrder: nextStep.order,
          currentReviewerId: nextStep.approverId,
          reviewedById: session.id,
          reviewedAt: new Date(),
        },
      });
      await notify(data.requestId, nextStep.approverId);
    } else {
      // لا توجد خطوة تالية — اعتمد نهائياً
      await prisma.request.update({
        where: { id: data.requestId },
        data: {
          status: "APPROVED",
          reviewedById: session.id,
          reviewNote: data.note?.trim() || null,
          reviewedAt: new Date(),
        },
      });
      await notify(data.requestId, request.createdById);
    }
  } else if (data.action === "APPROVED_FINAL") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "APPROVED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    await notify(data.requestId, request.createdById);
  } else if (data.action === "REJECTED") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "REJECTED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
      },
    });
    await notify(data.requestId, request.createdById);
  } else if (data.action === "RETURNED") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "RETURNED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
        currentStepOrder: 0,
        currentReviewerId: null,
      },
    });
    await notify(data.requestId, request.createdById);
  } else if (data.action === "DELEGATED") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "DELEGATED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
        delegatedToId: data.delegatedToId,
      },
    });
    // أشعر المحوَّل إليه والمرسل الأصلي
    await notify(data.requestId, data.delegatedToId!);
    if (data.delegatedToId !== request.createdById) {
      await notify(data.requestId, request.createdById);
    }
  }

  revalidatePath("/dashboard/requests");
}

// ── إعادة إرسال طلب مرجع ─────────────────────────────────────────────────────
export async function resubmitRequest(data: {
  requestId: string;
  title: string;
  category?: string;
  body?: string;
  fileUrl?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: data.requestId },
    include: { chain: { include: { steps: { orderBy: { order: "asc" } } } } },
  });
  if (!existing || existing.createdById !== session.id) throw new Error("غير مصرح");
  if (existing.status !== "RETURNED") throw new Error("لا يمكن إعادة إرسال هذا الطلب");

  const firstStep = existing.chain?.steps[0] ?? null;

  await prisma.request.update({
    where: { id: data.requestId },
    data: {
      title: data.title.trim(),
      category: data.category?.trim() || null,
      body: data.body?.trim() || null,
      fileUrl: data.fileUrl?.trim() || null,
      priority: data.priority,
      status: "PENDING",
      reviewedById: null,
      reviewNote: null,
      reviewedAt: null,
      currentStepOrder: 1,
      currentReviewerId: firstStep?.approverId ?? null,
    },
  });

  await prisma.requestLog.create({
    data: {
      requestId: data.requestId,
      stepOrder: 0,
      actorId: session.id,
      action: "RESUBMITTED",
    },
  });

  // إعادة الإشعار
  if (firstStep) {
    await notify(data.requestId, firstStep.approverId);
  } else {
    const execs = await prisma.employee.findMany({
      where: {
        isActive: true,
        role: { in: ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT", "ADMIN"] },
        id: { not: session.id },
      },
      select: { id: true },
    });
    for (const e of execs) {
      await notify(data.requestId, e.id);
    }
  }

  revalidatePath("/dashboard/requests");
}

// ── حذف طلب ──────────────────────────────────────────────────────────────────
export async function deleteRequest(requestId: string) {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: requestId },
    select: { createdById: true, status: true },
  });
  if (!existing) throw new Error("الطلب غير موجود");

  const canDelete =
    (existing.createdById === session.id && ["PENDING", "RETURNED"].includes(existing.status)) ||
    isExec(session.role, session.permissions || []);

  if (!canDelete) throw new Error("غير مصرح بحذف هذا الطلب");

  await prisma.request.delete({ where: { id: requestId } });
  revalidatePath("/dashboard/requests");
}

// ── إشعارات ──────────────────────────────────────────────────────────────────
export async function markNotificationsRead() {
  const session = await requireSession();
  if (!canViewRequests(session.role, session.permissions || [])) return;
  await prisma.requestNotification.updateMany({
    where: { employeeId: session.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/requests");
}

export async function getUnreadNotificationsCount() {
  const session = await requireSession();
  return prisma.requestNotification.count({
    where: { employeeId: session.id, isRead: false },
  });
}
