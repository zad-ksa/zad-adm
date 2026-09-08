"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { hasCharityPermission } from "@/lib/charityPermissions";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createAppNotification } from "./notifications";
import { logAudit } from "@/lib/auditLog";
import { logDesignEvent, logDesignEvents, SYSTEM_ACTOR } from "@/lib/designRequestLog";
import type { DesignEventActor } from "@/lib/designRequestLog";
import { REVIEW_WINDOW_MS, ZAD_COMPANY_LABEL } from "@/lib/designRequestProgress";
import { v2 as cloudinary } from "cloudinary";
import {
  toCivilDate,
  nextBusinessDay,
  addBusinessDays,
  computeDesignRequestDates,
  addDesignBusinessDays,
  formatCivilDate,
} from "@/lib/businessDays";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const REQUEST_DURATION_DAYS = 3;

/** The signed-in person, in the shape the request log stores. */
function staffActor(session: { id: string; name: string }): DesignEventActor {
  return { type: "EMPLOYEE", id: session.id, name: session.name };
}

export type DesignRequestAttachmentInput = {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  fileSize?: number;
};

export type CreateDesignRequestInput = {
  /** null = the request belongs to Zad itself rather than a charity. */
  charityId: string | null;
  title: string;
  description?: string;
  attachments: DesignRequestAttachmentInput[];
  startDate?: Date;
  /** Design types chosen for this request; their days are summed. */
  typeIds?: string[];
};

// ── guards ──────────────────────────────────────────────────────────────────

/**
 * Deleting is separated from managing on purpose.
 *
 * Every other action on a request can be walked back — a rejection can be
 * resubmitted, a schedule can be moved. Deleting destroys the brief, the
 * delivered files and the record of what was agreed, all at once and from
 * storage as well as the database. That is not the same authority as running
 * the queue day to day, so it is not the same permission.
 */
async function requireDesignDeletePermission() {
  const session = await getSession();
  if (!session || session.userType === "CHARITY_USER") {
    throw new Error("غير مصرح");
  }
  if (!hasPermission(session.role, session.permissions || [], "delete_design_requests")) {
    throw new Error("غير مصرح لك بحذف طلبات التصاميم");
  }
  return session;
}

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
  charityId: string | null,
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
  charityId: string | null;
  title: string;
  description?: string;
  attachments: DesignRequestAttachmentInput[];
  charityUserId?: string;
  createdByEmployeeId?: string;
  startDate?: Date;
  typeIds?: string[];
  status: "PENDING" | "UNDER_REVIEW";
}) {
  return prisma.$transaction(
    async (tx) => {
      const submittedAt = params.startDate || new Date();
      // For an UNDER_REVIEW request these dates are only an estimate: the row
      // is not counted by computeSchedule, so it holds no place in the queue,
      // and approveDesignRequest recomputes them against the queue as it stands
      // at that moment.
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
          status: params.status,
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
    // The Zad-company option exists only on the staff form; a charity
    // cannot raise a request that belongs to nobody.
    const charityId = input.charityId;
    if (!charityId) return { error: "يرجى اختيار الجمعية" };

    const session = await requireCharityMemberPermission(charityId, "view_design_requests");

    if (!input.title?.trim()) return { error: "يرجى إدخال عنوان الطلب" };
    if (input.attachments.length > 10) return { error: "الحد الأقصى 10 مرفقات لكل طلب" };

    const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
    if (!charity) return { error: "الجمعية غير موجودة" };

    const created = await createDesignRequest({
      charityId,
      title: input.title,
      description: input.description,
      attachments: input.attachments,
      typeIds: input.typeIds,
      charityUserId: session.id,
      // Charity submissions wait for a member of staff to confirm the timeline
      // (or reject with a reason) before they enter the queue.
      status: "UNDER_REVIEW",
    });

    await notifyDesignStaff(charity.name, input.title.trim());

    await logDesignEvent({
      requestId: created.id,
      kind: "CREATED",
      actor: { type: "CHARITY_USER", id: session.id, name: session.name },
      note: "بانتظار اعتماد زاد للجدولة",
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(charity?.name);
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
    // Only checked for undefined: null is a real choice here (Zad company),
    // and a falsy test would reject exactly the option this adds.
    if (input.charityId === undefined) return { error: "يرجى اختيار الجهة" };

    // No lookup for a Zad-company request — there is nothing to look up.
    const charity = input.charityId
      ? await prisma.charity.findUnique({ where: { id: input.charityId }, select: { name: true } })
      : null;
    if (input.charityId && !charity) return { error: "الجمعية غير موجودة" };

    const created = await createDesignRequest({
      charityId: input.charityId,
      title: input.title,
      description: input.description,
      attachments: input.attachments,
      typeIds: input.typeIds,
      createdByEmployeeId: session.id,
      // No review step: a member of staff creating the request is the approval.
      status: "PENDING",
      startDate: input.startDate,
    });

    await logDesignEvent({
      requestId: created.id,
      kind: "CREATED",
      actor: staffActor(session),
      note: "أُنشئ من قبل فريق زاد ودخل الطابور مباشرة",
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(charity?.name);
    return { success: true, id: created.id };
  } catch (error: any) {
    console.error("Error creating design request by staff:", error);
    return { error: error.message || "حدث خطأ أثناء إضافة الطلب" };
  }
}

/**
 * Marks a request delivered, optionally with the finished files attached.
 *
 * The deliverables are what the charity came for, so they are stored as
 * DELIVERABLE and survive — while the charity's own BRIEF files are still
 * cleared from storage, because those were inputs whose purpose has ended.
 * Scoping the delete by kind is the whole reason the kind exists; deleting
 * every attachment here would erase the delivery along with the brief.
 *
 * Attaching is optional: plenty of work is handed over outside the system, and
 * refusing to close the request without a file would just push staff to upload
 * a placeholder.
 */
/**
 * Approves a charity's request and commits it to the queue.
 *
 * The dates the charity saw on submission were an estimate — an UNDER_REVIEW
 * row is invisible to computeSchedule, so it never held a slot. The schedule is
 * therefore computed here, against the queue as it stands now, which is what
 * makes the confirmed date honest: requests approved while this one waited are
 * already ahead of it.
 *
 * `workingDaysOverride` lets the reviewer disagree with the total the chosen
 * design types imply. It is written to `baseWorkingDays` rather than to
 * `addedDays`, because this is the original estimate being corrected before any
 * commitment was made — `addedDays` means an extension of a promise already
 * given, and conflating the two would make the extension history misleading.
 */
export async function approveDesignRequest(id: string, workingDaysOverride?: number) {
  try {
    const session = await requireDesignStaff();

    if (workingDaysOverride !== undefined) {
      if (!Number.isInteger(workingDaysOverride) || workingDaysOverride < 1 || workingDaysOverride > 365) {
        return { error: "عدد الأيام يجب أن يكون رقماً صحيحاً بين 1 و365" };
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const request = await tx.designRequest.findUnique({
          where: { id },
          select: { id: true, status: true, charityId: true, submittedAt: true, baseWorkingDays: true },
        });
        if (!request) return { error: "الطلب غير موجود" };
        if (request.status !== "UNDER_REVIEW") return { error: "هذا الطلب ليس قيد المراجعة" };

        const workingDays = workingDaysOverride ?? request.baseWorkingDays;

        const { scheduledStartDate, expectedCompletionDate } = await computeSchedule(
          tx,
          request.charityId,
          new Date(),
          workingDays
        );

        await tx.designRequest.update({
          where: { id },
          data: {
            status: "PENDING",
            baseWorkingDays: workingDays,
            scheduledStartDate,
            expectedCompletionDate,
            reviewedAt: new Date(),
            reviewedById: session.id,
            rejectionReason: null,
          },
        });

        await logDesignEvent(
          {
            requestId: id,
            kind: "APPROVED",
            actor: staffActor(session),
            note: `المدة ${workingDays} يوم عمل`,
          },
          tx
        );

        return { success: true as const };
      },
      { isolationLevel: "Serializable" }
    );

    if ("error" in result) return result;

    revalidatePath("/main/design-requests");
    revalidatePath("/portal", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error approving design request:", error);
    return { error: error instanceof Error ? error.message : "حدث خطأ أثناء اعتماد الطلب" };
  }
}

/**
 * Rejects a request with a written reason the charity will read.
 *
 * The reason is required, not optional: a rejection the charity cannot act on
 * is worse than none, because they resubmit the same thing.
 */
export async function rejectDesignRequest(id: string, reason: string) {
  try {
    const session = await requireDesignStaff();

    const trimmed = (reason || "").trim();
    if (trimmed.length < 5) return { error: "يرجى كتابة سبب الرفض (5 أحرف على الأقل)" };
    if (trimmed.length > 2000) return { error: "سبب الرفض طويل جداً" };

    const request = await prisma.designRequest.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (request.status !== "UNDER_REVIEW") return { error: "هذا الطلب ليس قيد المراجعة" };

    await prisma.designRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: trimmed,
        reviewedAt: new Date(),
        reviewedById: session.id,
      },
    });

    await logDesignEvent({
      requestId: id,
      kind: "REJECTED",
      actor: staffActor(session),
      note: trimmed,
    });

    revalidatePath("/main/design-requests");
    revalidatePath("/portal", "layout");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting design request:", error);
    return { error: error instanceof Error ? error.message : "حدث خطأ أثناء رفض الطلب" };
  }
}

/**
 * Sends a rejected request back for review after the charity has fixed it.
 *
 * This reopens the existing row rather than creating a copy. Cloning looked
 * simpler, but the attachments live in Cloudinary and a copy would leave two
 * rows pointing at the same files — and completing one request destroys its
 * BRIEF attachments, which would silently break the other. Reopening also keeps
 * the charity's list free of a dead rejected twin for every retry.
 *
 * The cost is that the old rejection reason is cleared: the request is no
 * longer rejected, so displaying it would be wrong, and there is no history
 * table for design requests to move it into.
 */
export async function resubmitDesignRequest(input: {
  requestId: string;
  title: string;
  description?: string;
  typeIds?: string[];
  /** Ids of existing BRIEF attachments to drop. */
  removeAttachmentIds?: string[];
  /** Newly uploaded files to add. */
  addAttachments?: DesignRequestAttachmentInput[];
}) {
  try {
    const existing = await prisma.designRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true, charityId: true, status: true, charity: { select: { name: true } } },
    });
    if (!existing) return { error: "الطلب غير موجود" };

    if (!existing.charityId) return { error: "هذا الطلب لا يتبع جمعية" };
    const session = await requireCharityMemberPermission(existing.charityId, "view_design_requests");

    // Only a rejected request can be resubmitted. Without this, the same button
    // could be used to drag an approved request back out of the queue.
    if (existing.status !== "REJECTED") return { error: "لا يمكن إعادة رفع هذا الطلب" };

    if (!input.title?.trim()) return { error: "يرجى إدخال عنوان الطلب" };

    const keptCount = await prisma.designRequestAttachment.count({
      where: { requestId: input.requestId, kind: "BRIEF", id: { notIn: input.removeAttachmentIds ?? [] } },
    });
    if (keptCount + (input.addAttachments?.length ?? 0) > 10) {
      return { error: "الحد الأقصى 10 مرفقات لكل طلب" };
    }

    await prisma.$transaction(
      async (tx) => {
        const { ids: typeIds, workingDays } = await resolveTypes(tx, input.typeIds);

        if (input.removeAttachmentIds?.length) {
          await tx.designRequestAttachment.deleteMany({
            where: { requestId: input.requestId, kind: "BRIEF", id: { in: input.removeAttachmentIds } },
          });
        }

        await tx.designRequest.update({
          where: { id: input.requestId },
          data: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            baseWorkingDays: workingDays,
            // set, not connect: the charity may have changed which types apply.
            types: { set: typeIds.map((typeId: string) => ({ id: typeId })) },
            status: "UNDER_REVIEW",
            rejectionReason: null,
            reviewedAt: null,
            reviewedById: null,
            // Resubmitting restarts the clock, so the queue estimate is taken
            // from now rather than from the original submission months ago.
            submittedAt: new Date(),
            attachments: input.addAttachments?.length
              ? { create: input.addAttachments.map((a) => ({ ...a })) }
              : undefined,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    await notifyDesignStaff(existing.charity?.name ?? ZAD_COMPANY_LABEL, input.title.trim());

    await logDesignEvent({
      requestId: input.requestId,
      kind: "RESUBMITTED",
      actor: { type: "CHARITY_USER", id: session.id, name: session.name },
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(existing.charity?.name);
    return { success: true };
  } catch (error) {
    console.error("Error resubmitting design request:", error);
    return { error: error instanceof Error ? error.message : "حدث خطأ أثناء إعادة رفع الطلب" };
  }
}

/**
 * Deletes a request's BRIEF attachments from Cloudinary and from the database.
 *
 * The single place this happens. It used to sit inside "mark complete", which
 * made delivery irreversible the instant a designer pressed the button — before
 * the charity had seen anything. Now it is only reached once the delivery is
 * genuinely final: approved by the charity, approved automatically after the
 * deadline, or delivered after the one permitted revision round.
 *
 * The DELIVERABLE files are never touched — they are what the charity keeps.
 */
async function purgeBriefAttachments(requestId: string) {
  const briefs = await prisma.designRequestAttachment.findMany({
    where: { requestId, kind: "BRIEF" },
    select: { id: true, publicId: true, resourceType: true },
  });

  // Best effort per file: one asset that refuses to delete must not leave the
  // request stuck half-finalised.
  for (const att of briefs) {
    try {
      await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || "raw" });
    } catch (err) {
      console.error("Failed to delete design-request attachment from Cloudinary", att.publicId, err);
    }
  }

  await prisma.designRequestAttachment.deleteMany({ where: { requestId, kind: "BRIEF" } });
}

/** A Zad-company request has no portal to revalidate. */
function revalidateCharityPortal(charityName: string | null | undefined) {
  if (!charityName) return;
  revalidatePath(`/portal/${encodeURIComponent(charityName)}/design-requests`);
}


/**
 * The charity signs off on a delivery. This is the point of no return: the
 * brief attachments go, and only the delivered files remain.
 */
export async function approveDeliveryByCharity(id: string) {
  try {
    const request = await prisma.designRequest.findUnique({
      where: { id },
      select: { id: true, charityId: true, status: true, charity: { select: { name: true } } },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (!request.charityId) return { error: "هذا الطلب لا يتبع جمعية" };

    const session = await requireCharityMemberPermission(request.charityId, "view_design_requests");

    if (request.status !== "AWAITING_REVIEW") return { error: "هذا الطلب ليس بانتظار مراجعتك" };

    await prisma.designRequest.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await purgeBriefAttachments(id);

    await logDesignEvent({
      requestId: id,
      kind: "CHARITY_APPROVED",
      actor: { type: "CHARITY_USER", id: session.id, name: session.name },
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error) {
    console.error("Error approving delivery:", error);
    return { error: error instanceof Error ? error.message : "حدث خطأ أثناء الاعتماد" };
  }
}

/**
 * The charity sends the delivery back once, with notes.
 *
 * Allowed exactly once — the next delivery from Zad is final. That is why the
 * guard is on AWAITING_REVIEW alone: a request that has already been through a
 * revision round never returns to that state, so it can never be sent back
 * twice without any extra bookkeeping.
 *
 * Attachments may be pruned and added here, the same as when resubmitting a
 * rejected request — the charity is re-briefing, not just commenting.
 */
export async function requestDesignRevision(input: {
  requestId: string;
  notes: string;
  removeAttachmentIds?: string[];
  addAttachments?: DesignRequestAttachmentInput[];
}) {
  try {
    const request = await prisma.designRequest.findUnique({
      where: { id: input.requestId },
      select: { id: true, charityId: true, status: true, charity: { select: { name: true } } },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (!request.charityId) return { error: "هذا الطلب لا يتبع جمعية" };

    const session = await requireCharityMemberPermission(request.charityId, "view_design_requests");

    if (request.status !== "AWAITING_REVIEW") return { error: "لا يمكن طلب التعديل على هذا الطلب" };

    const notes = (input.notes || "").trim();
    if (notes.length < 5) return { error: "يرجى كتابة ملاحظات التعديل (5 أحرف على الأقل)" };
    if (notes.length > 2000) return { error: "الملاحظات طويلة جداً" };

    const remove = input.removeAttachmentIds ?? [];
    if (remove.length) {
      // Removed for real, storage included — the charity is saying these are
      // no longer part of the brief.
      const gone = await prisma.designRequestAttachment.findMany({
        where: { requestId: input.requestId, kind: "BRIEF", id: { in: remove } },
        select: { publicId: true, resourceType: true },
      });
      for (const att of gone) {
        try {
          await cloudinary.uploader.destroy(att.publicId, { resource_type: att.resourceType || "raw" });
        } catch (err) {
          console.error("Failed to delete design-request attachment from Cloudinary", att.publicId, err);
        }
      }
      await prisma.designRequestAttachment.deleteMany({
        where: { requestId: input.requestId, kind: "BRIEF", id: { in: remove } },
      });
    }

    await prisma.designRequest.update({
      where: { id: input.requestId },
      data: {
        status: "REVISION_REQUESTED",
        revisionRequestedAt: new Date(),
        revisionNotes: notes,
        attachments: input.addAttachments?.length
          ? { create: input.addAttachments.map((a) => ({ ...a, kind: "BRIEF" as const })) }
          : undefined,
      },
    });

    await logDesignEvent({
      requestId: input.requestId,
      kind: "REVISION_REQUESTED",
      actor: { type: "CHARITY_USER", id: session.id, name: session.name },
      note: notes,
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error) {
    console.error("Error requesting revision:", error);
    return { error: error instanceof Error ? error.message : "حدث خطأ أثناء طلب التعديل" };
  }
}

/**
 * Finalises every delivery whose 24-hour review window has passed.
 *
 * Called by the hourly cron. Lives here rather than in the route so it shares
 * purgeBriefAttachments with the manual paths — three ways to finalise a
 * request, one implementation of what finalising means.
 *
 * Each request is settled on its own: one charity whose Cloudinary assets
 * refuse to delete must not stop the rest of the sweep.
 */
export async function finalizeExpiredDeliveries() {
  const cutoff = new Date(Date.now() - REVIEW_WINDOW_MS);

  const due = await prisma.designRequest.findMany({
    where: { status: "AWAITING_REVIEW", deliveredAt: { lt: cutoff } },
    select: { id: true, charity: { select: { name: true } } },
  });

  let approved = 0;
  for (const request of due) {
    try {
      // Re-checked in the update itself: a charity approving in the same
      // minute this runs should win, and the status filter here means the
      // second writer changes nothing.
      const res = await prisma.designRequest.updateMany({
        where: { id: request.id, status: "AWAITING_REVIEW" },
        data: { status: "COMPLETED", completedAt: new Date(), autoApproved: true },
      });
      if (res.count === 0) continue;

      await purgeBriefAttachments(request.id);

      await logDesignEvent({
        requestId: request.id,
        kind: "AUTO_APPROVED",
        actor: SYSTEM_ACTOR,
        note: "مرّت ٢٤ ساعة دون ردّ من الجمعية",
      });

      revalidateCharityPortal(request.charity?.name);
      approved++;
    } catch (err) {
      console.error("Failed to auto-approve design request", request.id, err);
    }
  }

  if (approved) revalidatePath("/main/design-requests");
  return { checked: due.length, approved };
}

export async function markDesignRequestComplete(
  id: string,
  deliverables: DesignRequestAttachmentInput[] = [],
  /** Free-text note from whoever is delivering — shown to the charity. */
  note?: string
) {
  try {
    const session = await requireDesignStaff();

    if (deliverables.length > 10) return { error: "الحد الأقصى 10 ملفات" };

    const trimmedNote = note?.trim() || null;
    if (trimmedNote && trimmedNote.length > 2000) return { error: "الملاحظة طويلة جداً" };

    const request = await prisma.designRequest.findUnique({
      where: { id },
      include: {
        attachments: { where: { kind: "BRIEF" } },
        charity: { select: { name: true } },
      },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (request.status === "COMPLETED") return { success: true };

    // Where the delivery lands depends on whether this is the first one.
    //
    // First time: the charity gets 24 hours to look at it, so nothing is
    // deleted and the request waits in AWAITING_REVIEW. After a revision round:
    // the charity has already had its say and revision is allowed once, so this
    // delivery is final and the brief attachments go now.
    const isRevisionDelivery = request.status === "REVISION_REQUESTED";

    await prisma.$transaction([
      ...(deliverables.length
        ? [
            prisma.designRequestAttachment.createMany({
              data: deliverables.map((d) => ({ ...d, requestId: id, kind: "DELIVERABLE" as const })),
            }),
          ]
        : []),
      prisma.designRequest.update({
        where: { id },
        data: isRevisionDelivery
          ? {
              status: "COMPLETED",
              completedAt: new Date(),
              completedById: session.id,
              completionNote: trimmedNote,
            }
          : {
              status: "AWAITING_REVIEW",
              deliveredAt: new Date(),
              completedById: session.id,
              completionNote: trimmedNote,
            },
      }),
    ]);

    // After the transaction, so a failed Cloudinary call cannot leave the
    // request unchanged while its files are already gone.
    if (isRevisionDelivery) await purgeBriefAttachments(id);

    // A second delivery closes the request outright; a first one starts the
    // charity's 24-hour window. The log has to say which of the two happened.
    await logDesignEvent({
      requestId: id,
      kind: isRevisionDelivery ? "COMPLETED" : "DELIVERED",
      actor: staffActor(session),
      // The phase explains what happened; the free text, when there is one,
      // is what staff actually wanted the charity — or the next reader of
      // this log — to know about it.
      note:
        (isRevisionDelivery
          ? "تسليم التعديل — اعتماد نهائي"
          : "بانتظار ردّ الجمعية خلال ٢٤ ساعة") + (trimmedNote ? ` — ${trimmedNote}` : ""),
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error: any) {
    console.error("Error completing design request:", error);
    return { error: error.message || "حدث خطأ أثناء إنهاء الطلب" };
  }
}

/**
 * Removes a request and every file that belongs to it.
 *
 * `attachments` is fetched unfiltered — both the BRIEF the charity sent and
 * the DELIVERABLE Zad produced. Deleting only one kind would leave the other
 * orphaned in Cloudinary with no row left pointing at it, which is unbillable
 * storage nobody can ever find again.
 */
export async function deleteDesignRequest(id: string) {
  try {
    await requireDesignDeletePermission();

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
    revalidateCharityPortal(request.charity?.name);
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

    await logDesignEvent({
      requestId: id,
      kind: "RESCHEDULED",
      actor: staffActor(session),
      note: `بدء ${formatCivilDate(scheduledStartDate)} · تسليم ${formatCivilDate(expectedCompletionDate)}`,
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error: any) {
    console.error("Error rescheduling design request:", error);
    return { error: error.message || "حدث خطأ أثناء إعادة جدولة الطلب" };
  }
}

/**
 * Closes the gaps in one charity's queue, without moving its head.
 *
 * The anchor is the FIRST queued request's own start date — not a date somebody
 * types. That is the only anchor that cannot surprise anyone: the request that
 * was next stays next, and starts when it was already going to start. Everything
 * behind it is re-chained end-to-start, which is what removes the holes left by a
 * middle request being finished early or deleted.
 *
 * Two things this deliberately preserves:
 *   - Each request keeps its OWN duration (its types plus any extension). The
 *     previous version passed none, so every request was re-scheduled as the
 *     default three days and a five-day design silently became a three-day one.
 *   - A request already under a designer keeps its dates exactly. Its start
 *     actually happened; re-deriving it would be rewriting history, so the
 *     queue re-chains around it instead.
 */
export async function rescheduleCharityQueue(charityId: string | null) {
  try {
    const session = await requireDesignStaff();

    const charity = charityId
      ? await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } })
      : null;
    if (charityId && !charity) return { error: "الجمعية غير موجودة" };

    return await prisma.$transaction(
      async (tx) => {
        // Ordered by the schedule itself, because the schedule IS the order.
        const requests = await tx.designRequest.findMany({
          where: { charityId, status: "PENDING" },
          orderBy: { scheduledStartDate: "asc" },
          select: {
            id: true,
            startedAt: true,
            submittedAt: true,
            baseWorkingDays: true,
            addedDays: true,
            scheduledStartDate: true,
            expectedCompletionDate: true,
          },
        });

        if (requests.length === 0) return { error: "لا توجد طلبات في الدور" as const };

        // The head of the queue defines the anchor and does not move.
        let tail: Date = requests[0].scheduledStartDate;

        const schedule: { id: string; start: Date; finish: Date }[] = [];

        for (const req of requests) {
          if (req.startedAt) {
            // Under way — left exactly where it is; the rest queue behind it.
            tail =
              req.expectedCompletionDate > tail ? req.expectedCompletionDate : tail;
            continue;
          }

          const days = req.baseWorkingDays + req.addedDays;
          const dates = computeDesignRequestDates(req.submittedAt, tail, days);
          tail = dates.expectedCompletionDate;

          schedule.push({
            id: req.id,
            start: dates.scheduledStartDate,
            finish: dates.expectedCompletionDate,
          });
        }

        if (schedule.length === 0) {
          return { error: "كل الطلبات في الدور قيد التنفيذ بالفعل" as const };
        }

        // One statement, not one per request. The loop used to await an update
        // per row against a database in ap-southeast-2, which spent the whole
        // interactive-transaction budget on round trips before finishing.
        await tx.$executeRaw`
          UPDATE "DesignRequest" AS d
             SET "scheduledStartDate"     = v.start,
                 "expectedCompletionDate" = v.finish,
                 "updatedAt"              = NOW()
            FROM (VALUES ${Prisma.join(
                    schedule.map(
                      (u) => Prisma.sql`(${u.id}, ${u.start}::timestamp, ${u.finish}::timestamp)`
                    )
                  )}) AS v(id, start, finish)
           WHERE d.id = v.id`;

        await logDesignEvents(
          schedule.map((u, i) => ({
            requestId: u.id,
            kind: "QUEUE_REORDERED" as const,
            actor: staffActor(session),
            note: `رصّ الدور — الترتيب ${i + 1} من ${schedule.length}`,
          })),
          tx
        );

        revalidatePath("/main/design-requests");
        revalidateCharityPortal(charity?.name);
        return { success: true as const, moved: schedule.length };
      },
      { isolationLevel: "Serializable", timeout: 20_000, maxWait: 10_000 }
    );
  } catch (error: any) {
    console.error("Error compacting charity queue:", error);
    return { error: error.message || "تعذّرت إعادة ترتيب الدور" };
  }
}

/**
 * A designer picks the request up.
 *
 * Two things follow, and the second is the point of the button. The card starts
 * saying work is under way — so nobody starts it twice — and the charity loses
 * the ability to edit its own brief, because changing the brief underneath a
 * designer mid-execution is how two people end up building different things.
 *
 * Only a PENDING request can be started: one still under review has not been
 * scheduled, and one already delivered is past this point.
 */
export async function startDesignRequest(id: string) {
  try {
    const session = await requireDesignStaff();

    const request = await prisma.designRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startedAt: true,
        startedBy: { select: { name: true } },
        charity: { select: { name: true } },
      },
    });
    if (!request) return { error: "الطلب غير موجود" };

    // Not an error worth undoing anything for — say who has it and stop.
    if (request.startedAt) {
      return {
        error: request.startedBy?.name
          ? `بدأ العمل على هذا الطلب بالفعل — ${request.startedBy.name}`
          : "بدأ العمل على هذا الطلب بالفعل",
      };
    }

    if (request.status !== "PENDING") {
      return { error: "لا يمكن بدء التنفيذ إلا على طلب معتمد في الطابور" };
    }

    await prisma.designRequest.update({
      where: { id },
      data: { startedAt: new Date(), startedById: session.id },
    });

    await logDesignEvent({
      requestId: id,
      kind: "STARTED",
      actor: staffActor(session),
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DESIGN_REQUEST_STARTED",
      targetType: "DesignRequest",
      targetId: id,
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error: any) {
    console.error("Error starting design request:", error);
    return { error: error.message || "تعذّر بدء التنفيذ" };
  }
}

/**
 * The queue for one charity, in the order staff just arranged it.
 *
 * Order is not stored in a column. The schedule IS the order: each request
 * starts where the previous one finishes, so writing the dates in sequence
 * writes the order too, and there is no second source of truth to drift from
 * the first.
 *
 * Only requests that have NOT been started can move. One already under a
 * designer's hand has a start date that actually happened, and shuffling it
 * would rewrite history rather than plan; those keep their place and the ones
 * behind them queue up after the last of them.
 *
 * A charity may arrange its OWN queue — which of its designs matters most this
 * week is its call, not Zad's, and the constraint that keeps this safe is the
 * one already here: nothing that has been started can move, so reordering can
 * never disturb work in progress. It can only change what comes next, and only
 * within that charity's own designs.
 *
 * The Zad company queue (charityId null) has no charity to own it, so it stays
 * with staff.
 */
export async function reorderCharityQueue(input: {
  /** null for the Zad company queue, which has no charity row. */
  charityId: string | null;
  /** Ids of the not-yet-started requests, in their new order. */
  orderedIds: string[];
}) {
  try {
    const charity = input.charityId
      ? await prisma.charity.findUnique({ where: { id: input.charityId }, select: { name: true } })
      : null;
    if (input.charityId && !charity) return { error: "الجمعية غير موجودة" };

    // Staff first, then the owning charity. Scoped to input.charityId rather
    // than to whatever charity the caller claims, so membership in one charity
    // grants nothing over another's queue.
    let actor: DesignEventActor;
    try {
      const session = await requireDesignStaff();
      actor = staffActor(session);
    } catch (staffErr) {
      if (!input.charityId) throw staffErr;
      const session = await requireCharityMemberPermission(
        input.charityId,
        "view_design_requests"
      );
      actor = { type: "CHARITY_USER", id: session.id, name: session.name };
    }

    if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
      return { error: "لا توجد طلبات لإعادة ترتيبها" };
    }

    return await prisma.$transaction(
      async (tx) => {
        const pending = await tx.designRequest.findMany({
          where: { charityId: input.charityId, status: "PENDING" },
          orderBy: { scheduledStartDate: "asc" },
          select: {
            id: true,
            submittedAt: true,
            startedAt: true,
            baseWorkingDays: true,
            addedDays: true,
            expectedCompletionDate: true,
          },
        });

        const started = pending.filter((r) => r.startedAt);
        const movable = pending.filter((r) => !r.startedAt);
        const movableById = new Map(movable.map((r) => [r.id, r]));

        // The submitted order must name exactly the movable set. A mismatch
        // means the screen was looking at a stale queue — someone started a
        // request, or a new one arrived — and applying it anyway would schedule
        // against a picture that is no longer true.
        const requested = input.orderedIds.filter((id) => movableById.has(id));
        if (requested.length !== movable.length || new Set(requested).size !== movable.length) {
          return { error: "تغيّر الطابور منذ فتح النافذة، يرجى تحديث الصفحة" };
        }

        // Work queues up behind whatever is already under way.
        let tail: Date | undefined = started.length
          ? started.reduce(
              (latest, r) => (r.expectedCompletionDate > latest ? r.expectedCompletionDate : latest),
              started[0].expectedCompletionDate
            )
          : undefined;

        // Dates first, with no database round trip in the loop — the chaining
        // is pure arithmetic and each step only needs the previous tail.
        const schedule: { id: string; start: Date; finish: Date }[] = [];
        for (let i = 0; i < requested.length; i++) {
          const req = movableById.get(requested[i])!;
          const days = req.baseWorkingDays + req.addedDays;

          // The head of the queue may start now rather than waiting on a tail;
          // everything after it begins where its predecessor ends.
          const dates = computeDesignRequestDates(
            tail ? req.submittedAt : new Date(),
            tail,
            days
          );
          tail = dates.expectedCompletionDate;

          schedule.push({
            id: req.id,
            start: dates.scheduledStartDate,
            finish: dates.expectedCompletionDate,
          });
        }

        // Then ONE statement rather than one per request.
        //
        // The loop used to await an update per row. The database is in
        // ap-southeast-2, so thirteen rows — a real queue, measured — spent
        // 6.4 s on round trips and blew the 5 s interactive-transaction budget
        // before reaching the end. The reorder failed and rolled back, on the
        // queues long enough to be worth reordering.
        await tx.$executeRaw`
          UPDATE "DesignRequest" AS d
             SET "scheduledStartDate"     = v.start,
                 "expectedCompletionDate" = v.finish,
                 "updatedAt"              = NOW()
            FROM (VALUES ${Prisma.join(
                    schedule.map(
                      (u) => Prisma.sql`(${u.id}, ${u.start}::timestamp, ${u.finish}::timestamp)`
                    )
                  )}) AS v(id, start, finish)
           WHERE d.id = v.id`;

        // One line per request, so each design's own history records the move
        // and its new dates — not just the queue as a whole.
        await logDesignEvents(
          requested.map((id, i) => ({
            requestId: id,
            kind: "QUEUE_REORDERED" as const,
            actor,
            note: `الترتيب ${i + 1} من ${requested.length}`,
          })),
          tx
        );

        revalidatePath("/main/design-requests");
        revalidateCharityPortal(charity?.name);
        return { success: true as const };
      },
      // Headroom over the 5 s default: the reads, the bulk write and the log
      // all cross a region boundary, and a reorder that times out half way is
      // the one failure this must not have.
      { isolationLevel: "Serializable", timeout: 20_000, maxWait: 10_000 }
    );
  } catch (error: any) {
    console.error("Error reordering charity queue:", error);
    return { error: error.message || "تعذّرت إعادة ترتيب الطابور" };
  }
}

/**
 * One request's history, oldest first.
 *
 * Readable by design staff and by the charity that owns the request — it is
 * their design, and "who changed my delivery date" is a fair question to be
 * able to answer without asking anyone.
 */
export async function getDesignRequestLog(requestId: string) {
  const request = await prisma.designRequest.findUnique({
    where: { id: requestId },
    select: { id: true, charityId: true, title: true },
  });
  if (!request) return { error: "الطلب غير موجود" as const };

  try {
    await requireDesignStaff();
  } catch {
    if (!request.charityId) return { error: "غير مصرح" as const };
    await requireCharityMemberPermission(request.charityId, "view_design_requests");
  }

  const events = await prisma.designRequestEvent.findMany({
    where: { requestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      actorType: true,
      actorName: true,
      note: true,
      createdAt: true,
    },
  });

  return { success: true as const, title: request.title, events };
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

    await logDesignEvent({
      requestId: id,
      kind: "EXTENDED",
      actor: staffActor(session),
      note: `+${days} يوم عمل — ${trimmedReason}`,
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error) {
    console.error("Error extending design request:", error);
    return { error: error instanceof Error ? error.message : "تعذّر تمديد الطلب" };
  }
}

/**
 * Edits a pending request's description and its attachments.
 *
 * Open to both sides on purpose: the charity that raised it and the Zad staff
 * working on it. A brief that cannot be corrected after submitting is a brief
 * that gets deleted and re-raised, which loses the queue position the charity
 * has already waited for.
 *
 * PENDING only. Once a request is delivered its brief is history — and the
 * BRIEF files are removed from storage at completion anyway, so there would be
 * nothing left to edit.
 *
 * Deliverables are untouchable here: `kind: "BRIEF"` scopes every attachment
 * operation, so a charity cannot delete the finished files Zad handed them and
 * staff cannot lose them by editing the brief.
 *
 * Title, type and dates are deliberately out of scope. The type determines the
 * promised duration and the queue is already built on it; changing it silently
 * would move a date the charity was given.
 */
export async function updateDesignRequestDetails(input: {
  requestId: string;
  /** The request's name. Undefined leaves it alone. */
  title?: string;
  description?: string;
  /** Ids of existing BRIEF attachments to remove. */
  removeAttachmentIds?: string[];
  /** Newly uploaded files to add as BRIEF. */
  addAttachments?: DesignRequestAttachmentInput[];
}) {
  try {
    const request = await prisma.designRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        status: true,
        charityId: true,
        startedAt: true,
        charity: { select: { name: true } },
        attachments: { where: { kind: "BRIEF" }, select: { id: true, publicId: true, resourceType: true } },
      },
    });
    if (!request) return { error: "الطلب غير موجود" };
    if (request.status !== "PENDING") {
      return { error: "لا يمكن تعديل طلب منجز" };
    }

    // Either side may edit, so try the staff gate and fall back to the charity
    // one. Both throw on failure, which is why this is a try/catch rather than
    // a boolean — and why the charity check is scoped to the request's OWN
    // charity, not whichever charity the caller claims.
    let actor: { type: "EMPLOYEE" | "CHARITY_USER"; id: string; name: string };
    try {
      const session = await requireDesignStaff();
      actor = { type: "EMPLOYEE", id: session.id, name: session.name };
    } catch {
      if (!request.charityId) throw new Error("هذا الطلب لا يتبع جمعية");
      const session = await requireCharityMemberPermission(
        request.charityId,
        "view_design_requests"
      );
      actor = { type: "CHARITY_USER", id: session.id, name: session.name };

      // Staff may still edit a request they are working on — they are the ones
      // holding it. The charity may not: changing the brief underneath a
      // designer mid-execution is how two people end up building different
      // things. The message names the way out rather than just refusing.
      if (request.startedAt) {
        return {
          error:
            "الطلب جاري العمل عليه حالياً، وللتعديل يرجى التواصل مع المسؤول من شركة زاد",
        };
      }
    }

    const removeIds = (input.removeAttachmentIds || []).filter(Boolean);
    const adding = input.addAttachments || [];

    // Only this request's own BRIEF attachments can be removed — an id from
    // somewhere else simply does not match and is ignored rather than deleted.
    const removable = request.attachments.filter((a) => removeIds.includes(a.id));

    const remaining = request.attachments.length - removable.length + adding.length;
    if (remaining > 10) return { error: "الحد الأقصى 10 مرفقات لكل طلب" };

    // Storage first, and best-effort: a Cloudinary failure must not block the
    // edit, but a row deleted without its file would orphan the file forever
    // with nothing left pointing at it.
    for (const att of removable) {
      try {
        await cloudinary.uploader.destroy(att.publicId, {
          resource_type: att.resourceType || "raw",
        });
      } catch (err) {
        console.error("Failed to delete design-request attachment from Cloudinary", att.publicId, err);
      }
    }

    const description =
      input.description === undefined ? undefined : input.description.trim() || null;

    // A request with no name is unreadable in every list it appears in, so an
    // empty title is refused rather than quietly stored as null the way an
    // empty description is.
    let title: string | undefined;
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) return { error: "عنوان الطلب مطلوب" };
      if (trimmed.length > 200) return { error: "عنوان الطلب طويل جداً" };
      title = trimmed;
    }

    await prisma.$transaction([
      ...(removable.length
        ? [
            prisma.designRequestAttachment.deleteMany({
              where: { id: { in: removable.map((a) => a.id) }, requestId: request.id, kind: "BRIEF" },
            }),
          ]
        : []),
      ...(adding.length
        ? [
            prisma.designRequestAttachment.createMany({
              data: adding.map((a) => ({ ...a, requestId: request.id, kind: "BRIEF" as const })),
            }),
          ]
        : []),
      // An empty object is a valid no-op update — the transaction still needs
      // its third statement when only attachments changed.
      prisma.designRequest.update({
        where: { id: request.id },
        data: {
          ...(title === undefined ? {} : { title }),
          ...(description === undefined ? {} : { description }),
        },
      }),
    ]);

    await logAudit({
      actorType: actor.type,
      actorId: actor.id,
      actorName: actor.name,
      action: "DESIGN_REQUEST_EDITED",
      targetType: "DesignRequest",
      targetId: request.id,
      metadata: {
        charityId: request.charityId,
        titleChanged: title !== undefined,
        descriptionChanged: description !== undefined,
        removed: removable.length,
        added: adding.length,
      },
    });

    await logDesignEvent({
      requestId: request.id,
      kind: "EDITED",
      actor,
      note: [
        title !== undefined ? "العنوان" : null,
        description !== undefined ? "الوصف" : null,
        removable.length ? `حذف ${removable.length} مرفق` : null,
        adding.length ? `إضافة ${adding.length} مرفق` : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    });

    revalidatePath("/main/design-requests");
    revalidateCharityPortal(request.charity?.name);
    return { success: true };
  } catch (error) {
    console.error("Error editing design request:", error);
    return {
      error: error instanceof Error ? error.message : "تعذّر حفظ التعديل",
    };
  }
}
