"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createAppNotification } from "./notifications";
import { v2 as cloudinary } from "cloudinary";
import { toCivilDate, nextBusinessDay, addBusinessDays, computeDesignRequestDates } from "@/lib/businessDays";

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
  if (!membership) {
    throw new Error("غير مصرح لك بالوصول لهذه الجمعية");
  }
  return session;
}

// ── scheduling ──────────────────────────────────────────────────────────────

async function computeSchedule(tx: any, charityId: string, submittedAt: Date) {
  const agg = await tx.designRequest.aggregate({
    where: { charityId, status: "PENDING" },
    _max: { expectedCompletionDate: true },
  });
  const tail = agg._max.expectedCompletionDate as Date | null;
  return computeDesignRequestDates(submittedAt, tail ?? undefined);
}

async function createDesignRequest(params: {
  charityId: string;
  title: string;
  description?: string;
  attachments: DesignRequestAttachmentInput[];
  charityUserId?: string;
  createdByEmployeeId?: string;
  startDate?: Date;
}) {
  return prisma.$transaction(
    async (tx) => {
      const submittedAt = params.startDate || new Date();
      const { scheduledStartDate, expectedCompletionDate } = await computeSchedule(tx, params.charityId, submittedAt);

      return tx.designRequest.create({
        data: {
          charityId: params.charityId,
          title: params.title.trim(),
          description: params.description?.trim() || null,
          submittedAt,
          scheduledStartDate,
          expectedCompletionDate,
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
    const session = await requireCharityMember(input.charityId);

    if (!input.title?.trim()) return { error: "يرجى إدخال عنوان الطلب" };
    if (input.attachments.length > 10) return { error: "الحد الأقصى 10 مرفقات لكل طلب" };

    const charity = await prisma.charity.findUnique({ where: { id: input.charityId }, select: { name: true } });
    if (!charity) return { error: "الجمعية غير موجودة" };

    const created = await createDesignRequest({
      charityId: input.charityId,
      title: input.title,
      description: input.description,
      attachments: input.attachments,
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
  await requireCharityMember(charityId);
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
