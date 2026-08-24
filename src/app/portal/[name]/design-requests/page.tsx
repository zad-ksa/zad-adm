import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { Palette } from "lucide-react";
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
  const decodedName = decodeURIComponent(name);

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
    },
    orderBy: { submittedAt: "desc" },
  });

  const items = requests.map((r) => {
    const progress = getDesignRequestProgress({
      scheduledStartDate: r.scheduledStartDate,
      expectedCompletionDate: r.expectedCompletionDate,
      status: r.status,
    });
    return {
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
        types: r.types.map((t) => ({ id: t.id, name: t.name })),
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

  return (
    <div className="design-requests-ui space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="w-12 h-12 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center shrink-0">
          <Palette className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1
            className="font-bold text-primary dark:text-primary"
            style={{ fontSize: "var(--dr-fs-h1)", letterSpacing: "var(--dr-tracking-h1)" }}
          >
            طلبات التصاميم
          </h1>
          <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: "var(--dr-fs-meta)" }}>
            {decodedName}
          </p>
        </div>
      </div>

      <DesignRequestsPortalClient
        charityId={charity.id}
        initialItems={items}
        canCreate={can("create_design_requests")}
        designTypes={designTypes}
      />
    </div>
  );
}
