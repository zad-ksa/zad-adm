import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
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

  if (!canAccess) {
    redirect("/main");
  }

  const [charities, requests] = await Promise.all([
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.designRequest.findMany({
      include: {
        charity: { select: { id: true, name: true } },
        attachments: true,
      },
      orderBy: [{ scheduledStartDate: "asc" }, { submittedAt: "asc" }],
    }),
  ]);

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
        submittedAt: formatCivilDateTime(r.submittedAt),
        scheduledStartDate: formatCivilDateTime(r.scheduledStartDate),
        expectedCompletionDate: formatCivilDateTime(r.expectedCompletionDate),
        charityId: r.charity.id,
        charityName: r.charity.name,
        status: r.status,
        attachments: r.attachments.map((a) => ({
          id: a.id,
          fileUrl: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize,
        })),
      },
      progress,
    };
  });

  return <DesignRequestsClient initialItems={items} charities={charities} />;
}
