"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  REQUEST_INCLUDE,
  RELATION_JOIN,
  sortRequests,
  visibleRequestFilter,
} from "@/lib/requestQuery";
import { createAppNotification } from "./notifications";
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
      await createAppNotification(
        firstStep.approverId,
        "طلب جديد",
        `تم رفع طلب جديد للمراجعة: ${request.title}`,
        "/main/approvals"
      );
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

  revalidatePath("/main/approvals");
  return request;
}

// ── مراجعة طلب ────────────────────────────────────────────────────────────────
export async function reviewRequest(data: {
  requestId: string;
  action: "APPROVED_FINAL" | "FORWARDED" | "FORWARDED_DOWN" | "REJECTED" | "RETURNED" | "DELEGATED";
  note?: string;
  delegatedToId?: string; // مطلوب عند DELEGATED
}) {
  const session = await requireSession();

  const request = await prisma.request.findUnique({
    where: { id: data.requestId },
    include: {
      chain: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  });
  if (!request) throw new Error("الطلب غير موجود");
  if (request.status !== "PENDING") throw new Error("لا يمكن مراجعة طلب غير قيد المراجعة");

  // Authority comes from the workflow, not from a job title: the person the
  // chain named for THIS step is the one who may act, whatever permissions they
  // hold. The manage_requests holder is only a fallback for a request with no
  // chain at all, which otherwise has no approver and would never move.
  //
  // Checked here and not only in the page, because hiding a button is not a
  // permission — this action is callable directly.
  const isNamedReviewer = request.currentReviewerId === session.id;
  const isUnassignedFallback =
    request.currentReviewerId === null && isExec(session.role, session.permissions || []);
  if (!isNamedReviewer && !isUnassignedFallback) {
    throw new Error("هذا الطلب ليس بانتظار اعتمادك");
  }

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
      await createAppNotification(
        nextStep.approverId,
        "طلب للمراجعة",
        `تم تحويل طلب لمراجعتك: ${request.title}`,
        "/main/approvals"
      );
    } else {
      // Unreachable from the UI, which stops offering "forward up" at the top
      // of the chain. Kept as a refusal rather than the silent final approval
      // it used to be: choosing "pass this upwards" and getting "approved and
      // closed" is not a thing anyone asked for, and the person at the top has
      // an explicit "final approval" button for that.
      throw new Error("أنت أعلى مستوى في السلسلة — استخدم الاعتماد النهائي");
    }
  }

  if (data.action === "FORWARDED_DOWN") {
    const prevStep = request.chain?.steps.find(
      (s) => s.order === request.currentStepOrder - 1
    );

    if (!prevStep) {
      throw new Error("أنت أدنى مستوى في السلسلة — لا يوجد من تمرّر إليه");
    }

    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        currentStepOrder: prevStep.order,
        currentReviewerId: prevStep.approverId,
        reviewedById: session.id,
        reviewedAt: new Date(),
      },
    });
    await notify(data.requestId, prevStep.approverId);
    await createAppNotification(
      prevStep.approverId,
      "طلب للمراجعة",
      `تم تمرير طلب لمراجعتك: ${request.title}`,
      "/main/approvals"
    );
  }

  if (data.action === "APPROVED_FINAL") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "APPROVED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
        // Terminal: nobody is deciding this any more, so the desk is empty.
        // Leaving the last reviewer here made the column mean two different
        // things at once — «who must act» while pending, «who acted last»
        // afterwards — and every query that read it honestly got the wrong
        // answer for completed requests.
        currentReviewerId: null,
      },
    });
    await notify(data.requestId, request.createdById);
    await createAppNotification(
      request.createdById,
      "قبول طلب الاعتماد",
      `تم اعتماد طلبك بشكل نهائي: ${request.title}`,
      "/main/approvals"
    );
  } else if (data.action === "REJECTED") {
    await prisma.request.update({
      where: { id: data.requestId },
      data: {
        status: "REJECTED",
        reviewedById: session.id,
        reviewNote: data.note?.trim() || null,
        reviewedAt: new Date(),
        // Terminal, like an approval — the desk is empty.
        currentReviewerId: null,
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
        // Handed to the delegate: delegatedToId is now who holds it, and no one
        // is being asked to decide.
        currentReviewerId: null,
      },
    });
    // أشعر المحوَّل إليه والمرسل الأصلي
    await notify(data.requestId, data.delegatedToId!);
    if (data.delegatedToId !== request.createdById) {
      await notify(data.requestId, request.createdById);
    }
  }

  revalidatePath("/main/approvals");
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

  revalidatePath("/main/approvals");
}

// ── حذف طلب ──────────────────────────────────────────────────────────────────
export async function deleteRequest(requestId: string) {
  const session = await requireSession();

  const existing = await prisma.request.findUnique({
    where: { id: requestId },
    select: { createdById: true, status: true, currentReviewerId: true },
  });
  if (!existing) throw new Error("الطلب غير موجود");

  // Deleting follows the same rule as seeing: a request you cannot open is not
  // one you may destroy. manage_requests alone used to be enough for ANY
  // request in the company — which, now that the page hides most of them, meant
  // a manager could delete 47 requests they were not even shown.
  const isOwnerWhileEditable =
    existing.createdById === session.id && ["PENDING", "RETURNED"].includes(existing.status);
  const isHolder = existing.status === "PENDING" && existing.currentReviewerId === session.id;
  const isUnassignedFallback =
    existing.status === "PENDING" &&
    existing.currentReviewerId === null &&
    isExec(session.role, session.permissions || []);

  if (!isOwnerWhileEditable && !isHolder && !isUnassignedFallback) {
    throw new Error("غير مصرح بحذف هذا الطلب");
  }

  await prisma.request.delete({ where: { id: requestId } });
  revalidatePath("/main/approvals");
}

// ── جلب الطلبات (للـ polling في المكون) ──────────────────────────────────────

/**
 * Everything this person may see — what they raised, what is sitting with
 * them, and what they personally decided — and clears the unread badge.
 *
 * Shares visibleRequestFilter with the approvals page, so the 15-second poll
 * can never return a different set from the one the page rendered.
 *
 * Marking read happens here rather than only on page load: the poll used to
 * fetch requests without touching notifications, so the sidebar counter stayed
 * lit while the reader was looking straight at what it was counting.
 */
export async function getVisibleRequestsAndMarkRead() {
  const session = await requireSession();
  if (!canViewRequests(session.role, session.permissions || [])) return [];

  const [requests] = await Promise.all([
    prisma.request.findMany({
      ...RELATION_JOIN,
      where: visibleRequestFilter(session.id, isExec(session.role, session.permissions || [])),
      include: REQUEST_INCLUDE,
    }),
    prisma.requestNotification.updateMany({
      where: { employeeId: session.id, isRead: false },
      data: { isRead: true },
    }),
  ]);
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
  revalidatePath("/main/approvals");
}

export async function getUnreadNotificationsCount() {
  const session = await requireSession();
  return prisma.requestNotification.count({
    where: { employeeId: session.id, isRead: false },
  });
}
