"use server";

import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { hasCharityPermission } from "@/lib/charityPermissions";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createAppNotification } from "./notifications";
import { logAudit } from "@/lib/auditLog";
import { v2 as cloudinary } from "cloudinary";
import {
  toCivilDate,
  nextBusinessDay,
  addBusinessDays,
  computeDesignRequestDates,
  addDesignBusinessDays,
} from "@/lib/businessDays";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const REQUEST_DURATION_DAYS = 3;

export type DesignRequestAttachmentInput = {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  fileSize?: number;
};

export type CreateDesignRequestInput = {
  charityId: string;
  title: string;
  description?: string;
  attachments: DesignRequestAttachmentInput[];
  startDate?: Date;
  /** Design types chosen for this request; their days are summed. */
  typeIds?: string[];
};

// ── guards ──────────────────────────────────────────────────────────────────

async function requireDesignStaff() {
  const session = await getSession();
  if (!session || session.userType === "CHARITY_USER") {
    throw new Error("غير مصرح");
  }
  if (!(isAdmin(session.role) || hasPermission(session.role, session.permissions || [], "manage_design_requests"))) {
    throw new Error("غير مصرح لك بإدارة طلبات التصاميم");
  }
  return session;
}

// Ownership check the rest of the portal is missing (session.userType alone
// isn't enough — session.charityId must match the charity being accessed).
async function requireCharityMember(charityId: string) {
  const session = await getSession();
  if (!session || session.userType !== "CHARITY_USER") {
    throw new Error("غير مصرح");
  }
  if (session.charityId !== charityId) {
    throw new Error("غير مصرح لك بالوصول لهذه الجمعية");
  }
  const membership = await prisma.charityUserCharity.findUnique({
    where: { charityUserId_charityId: { charityUserId: session.id, charityId } },
  });
  if (!membership || !membership.isActive) {
    throw new Error("غير مصرح لك بالوصول لهذه الجمعية");
  }
  return {
    session,
    permissions: membership.permissions as string[],
    isAdmin: membership.isAdmin,
  };
}

/** A charity member holding a specific permission in THIS charity. */
async function requireCharityMemberPermission(charityId: string, permission: string) {
  const { session, permissions, isAdmin } = await requireCharityMember(charityId);
  if (!hasCharityPermission(isAdmin, permissions, permission)) {
    throw new Error("غير مصرح لك بإجراء هذه العملية");
  }
  return session;
}

// ── scheduling ──────────────────────────────────────────────────────────────

async function computeSchedule(
  tx: any,
  charityId: string,
  submittedAt: Date,
  workingDays: number
) {
  const agg = await tx.designRequest.aggregate({
    where: { charityId, status: "PENDING" },
    _max: { expectedCompletionDate: true },
  });
  const tail = agg._max.expectedCompletionDate as Date | null;
  return computeDesignRequestDates(submittedAt, tail ?? undefined, workingDays);
}

/**
 * Resolves the chosen types to a duration, or throws.
 *
 * Days are SUMMED across the selection: two deliverables are more work than
 * one, and the charity sees the resulting total before it submits.
 *
 * A type is now REQUIRED. There is no default duration to fall back on, and
 * inventing one would promise a date nobody agreed to — so an empty or
 * all-deactivated selection is refused and the submitter picks again. The
 * lookup is re-done here rather than trusting the ids the browser sent, so the
 * duration always comes from the server's own copy of the catalogue.
 */
async function resolveTypes(tx: Prisma.TransactionClient, typeIds: string[] | undefined) {
  const ids = Array.from(new Set((typeIds || []).filter(Boolean)));
  if (ids.length === 0) throw new Error("يرجى اختيار نوع التصميم");

  const types = await tx.designType.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, workingDays: true },
  });
  if (types.length === 0) {
    throw new Error("نوع التصميم المختار لم يعد متاحاً، يرجى اختيار نوع آخر");
  }

  const total = types.reduce((sum, t) => sum + t.workingDays, 0);
  return {
    ids: types.map((t) => t.id),
    workingDays: Math.max(1, total),
  };
}

async function createDesignRequest(params: {
  charityId: string;
  title: string;
  description?: string;
  attachments: DesignRequestAttachmentInput[];
  charityUserId?: string;
  createdByEmployeeId?: string;
  startDate?: Date;
  typeIds?: string[];
}) {
  return prisma.$transaction(
    async (tx) => {
      const submittedAt = params.startDate || new Date();
      const { ids: typeIds, workingDays } = await resolveTypes(tx, params.typeIds);
      const { scheduledStartDate, expectedCompletionDate } = await computeSchedule(
        tx,
        params.charityId,
        submittedAt,
        workingDays
      );

      return tx.designRequest.create({
        data: {
          charityId: params.charityId,
          title: params.title.trim(),
          description: params.description?.trim() || null,
          submittedAt,
          scheduledStartDate,
          expectedCompletionDate,
          baseWorkingDays: workingDays,
          types: typeIds.length
            ? { connect: typeIds.map((typeId: string) => ({ id: typeId })) }
            : undefined,
          charityUserId: params.charityUserId ?? null,
          createdByEmployeeId: params.createdByEmployeeId ?? null,
          attachments: params.attachments.length
            ? { create: params.attachments.map((a) => ({ ...a })) }
            : undefined,
        },
        select: { id: true },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

async function notifyDesignStaff(charityName: string, title: string) {
  const staff = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, role: true, permissions: true },
  });
  const recipients = staff.filter(
    (e) => isAdmin(e.role) || hasPermission(e.role, e.permissions || [], "manage_design_requests")
  );
  for (const e of recipients) {
    await createAppNotification(e.id, "طلب تصميم جديد", `${charityName} — ${title}`, "/main/design-requests");
  }
}

// ── actions ─────────────────────────────────────────────────────────────────

export async function createDesignRequestFromPortal(input: CreateDesignRequestInput) {
  try {
    const session = await requireCharityMemberPermission(input.charityId, "create_design_requests");

    if (!input.title?.trim()) return { error: "يرجى إدخال عنوان الطلب" };
    if (input.attachments.length > 10) return { error: "الحد الأقصى 10 مرفقات لكل طلب" };

    const charity = await prisma.charity.findUnique({ where: { id: input.charityId }, select: { name: true } });
    if (!charity) return { error: "الجمعية غير موجودة" };

    const created = await createDesignRequest({
      charityId: input.charityId,
      title: input.title,
      description: input.description,
      attachments: input.attachments,
      typeIds: input.typeIds,
      charityUserId: session.id,
    });

    await notifyDesignStaff(charity.name, input.title.trim());

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/design-requests`);
    return { success: true, id: created.id };
  } catch (error: any) {
    console.error("Error creating design request from portal:", error);
    return { error: error.message || "حدث خطأ أثناء إرسال الطلب" };
  }
}

export async function createDesignRequestByStaff(input: CreateDesignRequestInput) {
  try {
    const session = await requireDesignStaff();

    if (!input.title?.trim()) return { error: "يرجى إدخال عنوان الطلب" };
    if (!input.charityId) return { error: "يرجى اختيار الجمعية" };

    const charity = await prisma.charity.findUnique({ where: { id: input.charityId }, select: { name: true } });
    if (!charity) return { error: "الجمعية غير موجودة" };

    const created = await createDesignRequest({
      charityId: input.charityId,
      title: input.title,
      description: input.description,
      attachments: input.attachments,
      typeIds: input.typeIds,
      createdByEmployeeId: session.id,
      startDate: input.startDate,
    });

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(charity.name)}/design-requests`);
    return { success: true, id: created.id };
  } catch (error: any) {
    console.error("Error creating design request by staff:", error);
    return { error: error.message || "حدث خطأ أثناء إضافة الطلب" };
  }
}

export async function markDesignRequestComplete(id: string) {
  try {
    const session = await requireDesignStaff();

    const request = await prisma.designRequest.findUnique({
      where: { id },
      include: { attachments: true, charity: { select: { name: true } } },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (request.status === "COMPLETED") return { success: true };

    // Best-effort — never blocks marking the request complete.
    for (const att of request.attachments) {
      try {
        await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || "raw" });
      } catch (err) {
        console.error("Failed to delete design-request attachment from Cloudinary", att.publicId, err);
      }
    }

    await prisma.$transaction([
      prisma.designRequestAttachment.deleteMany({ where: { requestId: id } }),
      prisma.designRequest.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date(), completedById: session.id },
      }),
    ]);

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(request.charity.name)}/design-requests`);
    return { success: true };
  } catch (error: any) {
    console.error("Error completing design request:", error);
    return { error: error.message || "حدث خطأ أثناء إنهاء الطلب" };
  }
}

export async function deleteDesignRequest(id: string) {
  try {
    const session = await requireDesignStaff();
    void session;

    const request = await prisma.designRequest.findUnique({
      where: { id },
      include: { attachments: true, charity: { select: { name: true } } },
    });
    if (!request) return { error: "الطلب غير موجود" };

    for (const att of request.attachments) {
      try {
        await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || "raw" });
      } catch (err) {
        console.error("Failed to delete design-request attachment from Cloudinary", att.publicId, err);
      }
    }

    await prisma.designRequest.delete({ where: { id } });

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(request.charity.name)}/design-requests`);
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting design request:", error);
    return { error: error.message || "حدث خطأ أثناء حذف الطلب" };
  }
}

export async function getDesignRequestsForCharity(charityId: string) {
  await requireCharityMemberPermission(charityId, "view_design_requests");
  return prisma.designRequest.findMany({
    where: { charityId },
    include: { attachments: true },
    orderBy: { submittedAt: "desc" },
  });
}

export async function rescheduleDesignRequest(id: string, newStartDate: Date) {
  try {
    const session = await requireDesignStaff();
    void session;

    const request = await prisma.designRequest.findUnique({
      where: { id },
      include: { charity: { select: { name: true } } },
    });
    if (!request) return { error: "الطلب غير موجود" };

    const { scheduledStartDate, expectedCompletionDate } = computeDesignRequestDates(newStartDate);

    await prisma.designRequest.update({
      where: { id },
      data: {
        submittedAt: newStartDate,
        scheduledStartDate,
        expectedCompletionDate,
      },
    });

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(request.charity.name)}/design-requests`);
    return { success: true };
  } catch (error: any) {
    console.error("Error rescheduling design request:", error);
    return { error: error.message || "حدث خطأ أثناء إعادة جدولة الطلب" };
  }
}

export async function rescheduleCharityQueue(charityId: string, startDate: Date) {
  try {
    const session = await requireDesignStaff();
    void session;

    const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
    if (!charity) return { error: "الجمعية غير موجودة" };

    return prisma.$transaction(
      async (tx) => {
        // Fetch all PENDING requests for this charity, ordered by submittedAt
        const requests = await tx.designRequest.findMany({
          where: { charityId, status: "PENDING" },
          orderBy: { submittedAt: "asc" },
        });

        let currentTail: Date | undefined = undefined;

        for (let i = 0; i < requests.length; i++) {
          const req = requests[i];
          
          // The first request uses the startDate. 
          // The subsequent requests use the currentTail (which is the expectedCompletionDate of the previous request).
          // But wait, computeDesignRequestDates takes `submittedAt` and `baseTailDate`.
          // If we pass `req.submittedAt` and `currentTail`, it handles it correctly!
          // BUT for the first request, we want it to start EXACTLY at `startDate` regardless of its original `submittedAt`.
          // So for the first request, we pass `startDate` as `submittedAt` and NO tail.
          
          let dates;
          if (i === 0) {
            dates = computeDesignRequestDates(startDate);
          } else {
            dates = computeDesignRequestDates(req.submittedAt, currentTail);
          }

          currentTail = dates.expectedCompletionDate;

          await tx.designRequest.update({
            where: { id: req.id },
            data: {
              scheduledStartDate: dates.scheduledStartDate,
              expectedCompletionDate: dates.expectedCompletionDate,
              // We could also update submittedAt to startDate for the first one, but let's just leave submittedAt as is
              // because submittedAt is meant to be the real submission date.
            },
          });
        }

        revalidatePath("/main/design-requests");
        revalidatePath(`/portal/${encodeURIComponent(charity.name)}/design-requests`);
        return { success: true };
      },
      { isolationLevel: "Serializable" }
    );
  } catch (error: any) {
    console.error("Error rescheduling charity queue:", error);
    return { error: error.message || "حدث خطأ أثناء إعادة جدولة طابور الجمعية" };
  }
}

// ── أنواع التصاميم ──────────────────────────────────────────────────────────

/**
 * The catalogue every request picks from. Readable by any signed-in account,
 * because the charity portal's submission form needs it to show the options and
 * the resulting duration; only design staff may change it.
 */
export async function listDesignTypes(includeInactive = false) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  return prisma.designType.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, workingDays: true, isActive: true, sortOrder: true },
  });
}

export async function saveDesignType(input: {
  id?: string;
  name: string;
  workingDays: number;
  isActive?: boolean;
  sortOrder?: number;
}) {
  try {
    const session = await requireDesignStaff();

    const name = (input.name || "").trim();
    if (!name) return { error: "اسم النوع مطلوب" };
    if (name.length > 60) return { error: "اسم النوع طويل جداً" };

    const workingDays = Math.round(Number(input.workingDays));
    if (!Number.isFinite(workingDays) || workingDays < 1 || workingDays > 90) {
      return { error: "عدد أيام العمل يجب أن يكون بين 1 و 90" };
    }

    // The name is unique, so a clash is reported plainly instead of surfacing a
    // Prisma constraint error to the user.
    const clash = await prisma.designType.findFirst({
      where: { name, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true },
    });
    if (clash) return { error: "يوجد نوع بهذا الاسم بالفعل" };

    const data = {
      name,
      workingDays,
      isActive: input.isActive ?? true,
      sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    };

    const saved = input.id
      ? await prisma.designType.update({ where: { id: input.id }, data })
      : await prisma.designType.create({ data });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: input.id ? "DESIGN_TYPE_UPDATED" : "DESIGN_TYPE_CREATED",
      targetType: "DesignType",
      targetId: saved.id,
      metadata: { name, workingDays, isActive: data.isActive },
    });

    revalidatePath("/main/design-requests");
    return { success: true, id: saved.id };
  } catch (error) {
    console.error("Error saving design type:", error);
    return { error: error instanceof Error ? error.message : "تعذّر حفظ نوع التصميم" };
  }
}

/**
 * Retires a type. Never deletes: requests already reference it, and their
 * history has to keep being able to say what was asked for.
 */
export async function setDesignTypeActive(id: string, isActive: boolean) {
  try {
    const session = await requireDesignStaff();

    const updated = await prisma.designType.update({
      where: { id },
      data: { isActive },
      select: { id: true, name: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: isActive ? "DESIGN_TYPE_ACTIVATED" : "DESIGN_TYPE_DEACTIVATED",
      targetType: "DesignType",
      targetId: updated.id,
      metadata: { name: updated.name },
    });

    revalidatePath("/main/design-requests");
    return { success: true };
  } catch (error) {
    console.error("Error toggling design type:", error);
    return { error: error instanceof Error ? error.message : "تعذّر تحديث حالة النوع" };
  }
}

/**
 * Extends a request's deadline by whole business days, leaving the start date
 * exactly where it was.
 *
 * That is the whole point: rescheduleDesignRequest moves the start and drags
 * the deadline along with it, which is the wrong tool when the work simply
 * turned out to be bigger than the type predicted. Here the deadline is
 * recomputed from the ORIGINAL start over a longer duration, so the queue
 * position and everything already communicated about when work begins survive.
 */
export async function extendDesignRequestDays(id: string, extraDays: number, reason: string) {
  try {
    const session = await requireDesignStaff();

    const days = Math.round(Number(extraDays));
    if (!Number.isFinite(days) || days < 1 || days > 60) {
      return { error: "عدد الأيام المضافة يجب أن يكون بين 1 و 60" };
    }

    // Required, because the charity reads it. A deadline that moves without a
    // stated reason is the thing this whole feature exists to avoid.
    const trimmedReason = (reason || "").trim();
    if (trimmedReason.length < 3) return { error: "سبب التمديد مطلوب" };
    if (trimmedReason.length > 500) return { error: "سبب التمديد طويل جداً" };

    const request = await prisma.designRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        scheduledStartDate: true,
        baseWorkingDays: true,
        addedDays: true,
        charity: { select: { name: true } },
      },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (request.status !== "PENDING") return { error: "لا يمكن تمديد طلب منجز" };

    const addedDays = request.addedDays + days;
    const expectedCompletionDate = addDesignBusinessDays(
      request.scheduledStartDate,
      request.baseWorkingDays + addedDays
    );

    await prisma.$transaction([
      prisma.designRequest.update({
        where: { id },
        data: { addedDays, expectedCompletionDate },
      }),
      prisma.designRequestExtension.create({
        data: {
          requestId: id,
          days,
          reason: trimmedReason,
          createdById: session.id,
          createdByName: session.name,
        },
      }),
    ]);

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DESIGN_REQUEST_EXTENDED",
      targetType: "DesignRequest",
      targetId: id,
      metadata: {
        addedNow: days,
        addedTotal: addedDays,
        baseWorkingDays: request.baseWorkingDays,
        reason: trimmedReason,
      },
    });

    revalidatePath("/main/design-requests");
    revalidatePath(`/portal/${encodeURIComponent(request.charity.name)}/design-requests`);
    return { success: true };
  } catch (error) {
    console.error("Error extending design request:", error);
    return { error: error instanceof Error ? error.message : "تعذّر تمديد الطلب" };
  }
}
