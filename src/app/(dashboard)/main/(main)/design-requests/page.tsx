import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ZAD_COMPANY_LABEL } from "@/lib/designRequestProgress";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { formatCivilDateTime } from "@/lib/businessDays";
import { getDesignRequestProgress } from "@/lib/designRequestProgress";
import DesignRequestsClient from "./DesignRequestsClient";

export const dynamic = "force-dynamic";

export default async function DesignRequestsPage() {
  const session = await getSession();
  const canAccess =
    session &&
    session.userType !== "CHARITY_USER" &&
    hasPermission(session.role, session.permissions || [], "manage_design_requests");

  // Separate from managing: destroying a request and its files is its own
  // authority. Passed down so the button and the action agree.
  const canDelete =
    !!session &&
    session.userType !== "CHARITY_USER" &&
    hasPermission(session.role, session.permissions || [], "delete_design_requests");

  if (!canAccess) {
    redirect("/main");
  }

  const [charities, requests, designTypes] = await Promise.all([
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.designRequest.findMany({
      include: {
        charity: { select: { id: true, name: true } },
        attachments: true,
        types: { select: { id: true, name: true } },
        extensions: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ scheduledStartDate: "asc" }, { submittedAt: "asc" }],
    }),
    // Inactive types are included here: the management panel has to show them
    // to allow reactivating one, unlike the submission form.
    prisma.designType.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, workingDays: true, isActive: true },
    }),
  ]);

  const items = requests.map((r) => {
    const progress = getDesignRequestProgress({
      scheduledStartDate: r.scheduledStartDate,
      expectedCompletionDate: r.expectedCompletionDate,
      status: r.status,
      deliveredAt: r.deliveredAt,
      revisionRequestedAt: r.revisionRequestedAt,
    });

    return {
      // Milliseconds, not the formatted string above: the current-requests tab
      // is ordered by how soon delivery is due, and "١٥ سبتمبر" does not sort.
      expectedCompletionAt: r.expectedCompletionDate.getTime(),
      request: {
        id: r.id,
        title: r.title,
        description: r.description,
        submittedAt: formatCivilDateTime(r.submittedAt),
        scheduledStartDate: formatCivilDateTime(r.scheduledStartDate),
        expectedCompletionDate: formatCivilDateTime(r.expectedCompletionDate),
        // null means the request belongs to Zad itself, not to a charity.
        charityId: r.charity?.id ?? "",
        charityName: r.charity?.name ?? ZAD_COMPANY_LABEL,
        status: r.status,
        rejectionReason: r.rejectionReason,
        revisionNotes: r.revisionNotes,
        autoApproved: r.autoApproved,
        // deliveredAt is only ever set by the review cycle, so its absence
        // marks a request finished under the old flow.
        wasReviewed: !!r.deliveredAt,
        // Formatted here like every other date on the card — the component
        // must never format, or the server and the browser disagree.
        completedAt: r.completedAt ? formatCivilDateTime(r.completedAt) : null,
        // reviewedAt is stamped by both approve and reject; only a REJECTED
        // row displays it, and there it can only mean the refusal.
        rejectedAt: r.reviewedAt ? formatCivilDateTime(r.reviewedAt) : null,
        types: r.types.map((t) => ({ id: t.id, name: t.name })),
        totalWorkingDays: r.baseWorkingDays + r.addedDays,
        addedDays: r.addedDays,
        extensions: r.extensions.map((e) => ({
          id: e.id,
          days: e.days,
          reason: e.reason,
          createdAt: formatCivilDateTime(e.createdAt),
        })),
        // Split by kind: the brief is what the charity sent, the deliverables
        // are what Zad handed back. They read very differently on the card.
        attachments: r.attachments
          .filter((a) => a.kind === "BRIEF")
          .map((a) => ({
            id: a.id,
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            fileSize: a.fileSize,
          })),
        deliverables: r.attachments
          .filter((a) => a.kind === "DELIVERABLE")
          .map((a) => ({
            id: a.id,
            fileUrl: a.fileUrl,
            fileName: a.fileName,
            fileSize: a.fileSize,
          })),
      },
      progress,
    };
  });

  return (
    <DesignRequestsClient
      initialItems={items}
      charities={charities}
      designTypes={designTypes}
      canDelete={canDelete}
    />
  );
}
