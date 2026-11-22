import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { formatCivilDate } from "@/lib/businessDays";
import { getDesignRequestProgress } from "@/lib/designRequestProgress";
import DesignRequestsPortalClient from "./DesignRequestsPortalClient";
import { requirePortalPermission } from "@/lib/portalAccess";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return { title: `طلبات التصاميم | ${decodedName}` };
}

export default async function DesignRequestsPortalPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const session = await getSession();
  if (!session || session.userType !== "CHARITY_USER") redirect("/");

  // Ownership AND permission. Membership is resolved against the link table
  // rather than session.charityId, so an account linked to several charities can
  // still open this tab in each of them.
  const { charity, can } = await requirePortalPermission(name, "view_design_requests");

  // The catalogue the submission form offers. Read here rather than in the
  // client so the form has its options on first paint.
  const designTypes = await prisma.designType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, workingDays: true },
  });

  const requests = await prisma.designRequest.findMany({
    where: { charityId: charity.id },
    include: {
      attachments: true,
      types: { select: { id: true, name: true } },
      extensions: { orderBy: { createdAt: "asc" } },
      startedBy: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  // The execution queue, exactly as Zad arranged it. The schedule IS the
  // order — each request starts where the previous one ends — so sorting the
  // queued rows by start date reproduces the sequence without storing it
  // twice and letting the two copies drift apart.
  const queued = requests
    .filter((r) => r.status === "PENDING" && !r.archivedAt)
    .sort((a, b) => a.scheduledStartDate.getTime() - b.scheduledStartDate.getTime());
  const queueOrder = new Map(queued.map((r, i) => [r.id, i + 1]));

  const items = requests.map((r) => {
    const progress = getDesignRequestProgress({
      scheduledStartDate: r.scheduledStartDate,
      expectedCompletionDate: r.expectedCompletionDate,
      status: r.status,
      deliveredAt: r.deliveredAt,
      revisionRequestedAt: r.revisionRequestedAt,
    });
    return {
      // Milliseconds, not the formatted string below: the queue is ordered by
      // how soon delivery is due, and "١٥ سبتمبر" does not sort.
      expectedCompletionAt: r.expectedCompletionDate.getTime(),
      request: {
        id: r.id,
        title: r.title,
        description: r.description,
        submittedAt: formatCivilDate(r.submittedAt),
        scheduledStartDate: formatCivilDate(r.scheduledStartDate),
        expectedCompletionDate:
          progress.daysRemaining === 0 && !progress.isOverdue && r.status !== "COMPLETED"
            ? "اليوم"
            : formatCivilDate(r.expectedCompletionDate),
        status: r.status,
        rejectionReason: r.rejectionReason,
        revisionNotes: r.revisionNotes,
        autoApproved: r.autoApproved,
        completionNote: r.completionNote,
        closedWithNotes: r.closedWithNotes,
        startedAt: r.startedAt ? formatCivilDate(r.startedAt) : null,
        startedByName: r.startedBy?.name ?? null,
        archivedAt: r.archivedAt ? formatCivilDate(r.archivedAt) : null,
        archivedByName: r.archivedByName,
        queuePosition: queueOrder.get(r.id) ?? null,
        queueTotal: queued.length || null,
        // deliveredAt is only ever set by the review cycle, so its absence
        // marks a request finished under the old flow.
        wasReviewed: !!r.deliveredAt,
        completedAt: r.completedAt ? formatCivilDate(r.completedAt) : null,
        rejectedAt: r.reviewedAt ? formatCivilDate(r.reviewedAt) : null,
        types: r.types.map((t) => ({ id: t.id, name: t.name })),
        // Ids on their own, for prefilling the resubmit form's type picker.
        typeIds: r.types.map((t) => t.id),
        totalWorkingDays: r.baseWorkingDays + r.addedDays,
        addedDays: r.addedDays,
        extensions: r.extensions.map((e) => ({
          id: e.id,
          days: e.days,
          reason: e.reason,
          createdAt: formatCivilDate(e.createdAt),
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

  // والترويسةُ في الشاشة لا هنا: زرُّها يفتح نموذجاً، والنموذجُ حالٌ عندها.
  // وكانت الصفحةُ تكتب عنواناً وتكتب الشاشةُ عنواناً ثانياً تحته.
  return (
    <DesignRequestsPortalClient
      charityId={charity.id}
      charityName={charity.name}
      initialItems={items}
      // Always true here: the page above already required this exact
      // permission. Kept as a prop rather than inlined, so the client keeps
      // reading a capability rather than assuming one.
      canCreate={can("view_design_requests")}
      designTypes={designTypes}
    />
  );
}
