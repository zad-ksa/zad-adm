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

  // Watching the whole pipeline, without gaining any power over it.
  const canReviewAll = hasPermission(
    session.role,
    session.permissions || [],
    "review_all_requests"
  );

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
  const [requests, allEmployees, , activeChain] = await Promise.all([
    prisma.request.findMany({
      ...RELATION_JOIN,
      where: visibleRequestFilter(session.id, { canReviewAll }),
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
    // لا طلب بلا سلسلة: الخادم يرفض الرفع، والواجهة تقول السبب بدل أن تُفشل
    // الإرسال بعد تعبئة النموذج.
    prisma.workflowChain.findFirst({
      where: { isActive: true },
      select: { steps: { select: { id: true }, take: 1 } },
    }),
  ]);

  const hasActiveChain = (activeChain?.steps.length ?? 0) > 0;

  const sorted = sortRequests(requests);

  // The employee list is fetched unconditionally above — 12 rows, and asking for
  // it conditionally cost a second sequential round trip — but it is only handed
  // to the client when there is actually something to delegate.
  const hasSomethingToReview = sorted.some(
    (r) =>
      r.status === "PENDING" &&
      r.currentReviewerId === session.id
  );

  return (
    <RequestsClient
      requests={sorted as any}
      hasActiveChain={hasActiveChain}
      canReviewAll={canReviewAll}
      sessionId={session.id}
      allEmployees={hasSomethingToReview ? (allEmployees as any) : []}
    />
  );
}
