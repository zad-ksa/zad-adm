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

  // Everything below is independent of everything else below, so it goes out at
  // once.
  //
  // These used to be three awaits in a row. The database is in ap-southeast-2,
  // so each costs a full round trip, and the page could not send a single byte
  // until the last returned — 2.2 seconds during which the browser still showed
  // the PREVIOUS page, because loading.tsx cannot appear before the server
  // starts streaming. Run together, the wait is the slowest one, not their sum.
  //
  // Marking notifications read is a side effect, not an input: nothing rendered
  // here depends on it, so it has no business delaying the render.
  const [requests, allEmployees] = await Promise.all([
    prisma.request.findMany({
      ...RELATION_JOIN,
      where: visibleRequestFilter(session.id, canManage),
      include: REQUEST_INCLUDE,
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.requestNotification.updateMany({
      where: { employeeId: session.id, isRead: false },
      data: { isRead: true },
    }),
  ]);

  const sorted = sortRequests(requests);

  // The employee list is fetched unconditionally above — 12 rows, and asking for
  // it conditionally cost a second sequential round trip — but it is only handed
  // to the client when there is actually something to delegate.
  const hasSomethingToReview = sorted.some(
    (r) =>
      r.status === "PENDING" &&
      (r.currentReviewerId === session.id || (r.currentReviewerId === null && canManage))
  );

  return (
    <RequestsClient
      requests={sorted as any}
      canManage={canManage}
      sessionId={session.id}
      allEmployees={hasSomethingToReview ? (allEmployees as any) : []}
    />
  );
}
