"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission, AUTO_ADMIN_ROLES } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

const EXEC_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"];

function isExec(role: string, permissions: string[]) {
  return EXEC_ROLES.includes(role) || permissions.includes("developer_mode");
}

async function requireSession() {
  const session = await getSession();
  if (!session?.id) throw new Error("غير مصرح");
  return session;
}

// ── إنشاء طلب جديد ───────────────────────────────────────────────────────────
export async function createRequest(data: {
  title: string;
  body?: string;
  fileUrl?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await requireSession();
  if (!hasPermission(session.role, session.permissions || [], "manage_requests")) {
    throw new Error("غير مصرح");
  }

  const request = await prisma.request.create({
    data: {
      title: data.title.trim(),
      body: data.body?.trim() || null,
      fileUrl: data.fileUrl?.trim() || null,
      priority: data.priority,
      status: "PENDING",
      createdById: session.id,
    },
  });

  // أرسل إشعاراً لكل أعضاء الإدارة التنفيذية
  const execs = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: { in: ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT", "ADMIN"] },
      id: { not: session.id }, // لا ترسل لنفسك إن كنت إدارة
    },
    select: { id: true },
  });

  if (execs.length > 0) {
    await prisma.requestNotification.createMany({
      data: execs.map((e) => ({
        requestId: request.id,
        employeeId: e.id,
        isRead: false,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard/requests");
  return request;
}

// ── جلب طلبات المستخدم الحالي ─────────────────────────────────────────────────
export async function getMyRequests() {
  const session = await requireSession();
  if (!hasPermission(session.role, session.permissions || [], "manage_requests")) {
    throw new Error("غير مصرح");
  }

  return prisma.request.findMany({
    where: { createdById: session.id },
    include: {
      reviewedBy: { select: { id: true, name: true } },
      _count: { select: { notifications: true } },
    },
    orderBy: [
      { status: "asc" },
      { createdAt: "desc" },
    ],
  });
}

// ── جلب كل الطلبات للإدارة التنفيذية ─────────────────────────────────────────
export async function getAllRequests() {
  const session = await requireSession();
  if (!isExec(session.role, session.permissions || [])) {
    throw new Error("غير مصرح");
  }

  const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const requests = await prisma.request.findMany({
    include: {
      createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: "asc" }, // PENDING أولاً
      { createdAt: "asc" },
    ],
  });

  // رتّب حسب الأهمية ثم الوقت
  return requests.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (b.status === "PENDING" && a.status !== "PENDING") return 1;
    if (a.status === "PENDING" && b.status === "PENDING") {
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ── مراجعة طلب (قبول / رفض / إرجاع) ─────────────────────────────────────────
export async function reviewRequest(data: {
  requestId: string;
  action: "APPROVED" | "REJECTED" | "RETURNED";
  reviewNote?: string;
}) {
  const session = await requireSession();
  if (!isExec(session.role, session.permissions || [])) {
    throw new Error("غير مصرح");
  }
  if (data.action !== "APPROVED" && !data.reviewNote?.trim()) {
    throw new Error("يجب ذكر سبب الرفض أو ملاحظات الإرجاع");
  }

  const request = await prisma.request.update({
    where: { id: data.requestId },
    data: {
      status: data.action,
      reviewedById: session.id,
      reviewNote: data.reviewNote?.trim() || null,
      reviewedAt: new Date(),
    },
    select: { createdById: true },
  });

  // أرسل إشعاراً لصاحب الطلب
  await prisma.requestNotification.upsert({
    where: { requestId_employeeId: { requestId: data.requestId, employeeId: request.createdById } },
    create: { requestId: data.requestId, employeeId: request.createdById, isRead: false },
    update: { isRead: false },
  });

  revalidatePath("/dashboard/requests");
}

// ── تحرير طلب مرجع وإعادة إرساله ────────────────────────────────────────────
export async function resubmitRequest(data: {
  requestId: string;
  title: string;
  body?: string;
  fileUrl?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: data.requestId },
    select: { createdById: true, status: true },
  });
  if (!existing || existing.createdById !== session.id) throw new Error("غير مصرح");
  if (existing.status !== "RETURNED") throw new Error("لا يمكن إعادة إرسال هذا الطلب");

  await prisma.request.update({
    where: { id: data.requestId },
    data: {
      title: data.title.trim(),
      body: data.body?.trim() || null,
      fileUrl: data.fileUrl?.trim() || null,
      priority: data.priority,
      status: "PENDING",
      reviewedById: null,
      reviewNote: null,
      reviewedAt: null,
    },
  });

  // إعادة إشعار الإدارة
  const execs = await prisma.employee.findMany({
    where: {
      isActive: true,
      role: { in: ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT", "ADMIN"] },
      id: { not: session.id },
    },
    select: { id: true },
  });

  if (execs.length > 0) {
    await prisma.requestNotification.createMany({
      data: execs.map((e) => ({
        requestId: data.requestId,
        employeeId: e.id,
        isRead: false,
      })),
      skipDuplicates: true,
    });
    // تحديث القديمة لغير مقروء
    await prisma.requestNotification.updateMany({
      where: { requestId: data.requestId, employeeId: { in: execs.map((e) => e.id) } },
      data: { isRead: false },
    });
  }

  revalidatePath("/dashboard/requests");
}

// ── حذف طلب (من صاحبه فقط إذا كان PENDING أو RETURNED) ─────────────────────
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

// ── عدد الإشعارات غير المقروءة للمستخدم الحالي ───────────────────────────────
export async function getUnreadNotificationsCount() {
  const session = await requireSession();
  return prisma.requestNotification.count({
    where: { employeeId: session.id, isRead: false },
  });
}

// ── تعليم الإشعارات مقروءة (عند فتح الصفحة) ─────────────────────────────────
export async function markNotificationsRead() {
  const session = await requireSession();
  await prisma.requestNotification.updateMany({
    where: { employeeId: session.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/dashboard/requests");
}
