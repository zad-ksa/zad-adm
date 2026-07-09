"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
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
  attachments?: any[];
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
      attachments: data.attachments ?? Prisma.DbNull,
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

  // الملاحظات إلزامية فقط عند الإرجاع أو الرفض
  if ((data.action === "RETURNED" || data.action === "REJECTED") && !data.note?.trim()) {
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
  attachments?: any[];
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
      attachments: data.attachments ?? Prisma.DbNull,
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

// ── جلب الطلبات (للـ polling في المكون) ──────────────────────────────────────

const REQUEST_INCLUDE = {
  createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
  reviewedBy: { select: { id: true, name: true } },
  currentReviewer: { select: { id: true, name: true, role: true } },
  delegatedTo: { select: { id: true, name: true, role: true } },
  chain: { select: { id: true, name: true } },
  logs: {
    include: {
      actor: { select: { id: true, name: true, role: true, avatarUrl: true } },
      delegatedTo: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortRequests(requests: any[]) {
  return requests.sort((a: any, b: any) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (b.status === "PENDING" && a.status !== "PENDING") return 1;
    if (a.status === "PENDING" && b.status === "PENDING") {
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getMyRequests() {
  const session = await requireSession();
  if (!canViewRequests(session.role, session.permissions || [])) return [];
  const requests = await prisma.request.findMany({
    where: { createdById: session.id },
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return requests;
}

export async function getAllRequests() {
  const session = await requireSession();
  if (!isExec(session.role, session.permissions || [])) throw new Error("غير مصرح");
  const requests = await prisma.request.findMany({ include: REQUEST_INCLUDE });
  return sortRequests(requests);
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
