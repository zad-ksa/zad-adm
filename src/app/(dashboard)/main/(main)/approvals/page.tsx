import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  REQUEST_INCLUDE,
  RELATION_JOIN,
  sortRequests,
  visibleRequestFilter,
} from "@/lib/requestQuery";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/main");
  }

  // Seeing everything is no longer what a permission buys. A request is visible
  // to the person who raised it, to whoever it is sitting with, and to anyone
  // who personally decided it — nobody else, whatever their title. What
  // manage_requests still grants is the fallback for a request that has no
  // workflow chain and therefore no named approver.
  const canManage = hasPermission(session.role, session.permissions || [], "manage_requests");

  // علّم إشعاراتك مقروءة
  await prisma.requestNotification.updateMany({
    where: { employeeId: session.id, isRead: false },
    data: { isRead: true },
  });

  const requests = await prisma.request.findMany({
    ...RELATION_JOIN,
    where: visibleRequestFilter(session.id, canManage),
    include: REQUEST_INCLUDE,
  });
  const sorted = sortRequests(requests);

  // The delegation picker only means anything to someone who actually has a
  // request to act on, so it is fetched on that condition rather than on a role.
  const hasSomethingToReview = sorted.some(
    (r) =>
      r.status === "PENDING" &&
      (r.currentReviewerId === session.id || (r.currentReviewerId === null && canManage))
  );

  const allEmployees = hasSomethingToReview
    ? await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <RequestsClient
      requests={sorted as any}
      canManage={canManage}
      sessionId={session.id}
      allEmployees={allEmployees as any}
    />
  );
}
