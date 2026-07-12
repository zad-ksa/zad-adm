import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import RequestsClient from "./RequestsClient";

const REQUEST_INCLUDE = {
  createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
  reviewedBy: { select: { id: true, name: true } },
  currentReviewer: { select: { id: true, name: true, role: true } },
  delegatedTo: { select: { id: true, name: true, role: true } },
  chain: { select: { id: true, name: true } },
  logs: {
    include: {
      actor: { select: { id: true, name: true, role: true, avatarUrl: true } },
      delegatedTo: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortRequests(requests: any[]) {
  return requests.sort((a, b) => {
    if (a.status === "PENDING" && b.status !== "PENDING") return -1;
    if (b.status === "PENDING" && a.status !== "PENDING") return 1;
    if (a.status === "PENDING" && b.status === "PENDING") {
      const pa = PRIORITY_ORDER[a.priority] ?? 3;
      const pb = PRIORITY_ORDER[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default async function RequestsPage() {
  const session = await getSession();
  const perms = session?.permissions || [];

  if (!session) {
    redirect("/main");
  }

  const isExec = hasPermission(session.role, perms, "manage_requests");

  // علّم إشعاراتك مقروءة
  await prisma.requestNotification.updateMany({
    where: { employeeId: session.id, isRead: false },
    data: { isRead: true },
  });

  // جلب قائمة الموظفين للتحويل (للإدارة فقط)
  const allEmployees = isExec
    ? await prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      })
    : [];

  if (isExec) {
    // الإدارة: ترى كل الطلبات
    const requests = await prisma.request.findMany({
      include: REQUEST_INCLUDE,
    });
    const sorted = sortRequests(requests);
    return (
      <RequestsClient
        requests={sorted as any}
        isExec={true}
        sessionId={session.id}
        allEmployees={allEmployees as any}
      />
    );
  } else {
    // الموظف: طلباته فقط
    const requests = await prisma.request.findMany({
      where: { createdById: session.id },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return (
      <RequestsClient
        requests={requests as any}
        isExec={false}
        sessionId={session.id}
        allEmployees={[]}
      />
    );
  }
}
