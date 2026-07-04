import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, EXECUTIVE_ROLES } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import RequestsClient from "./RequestsClient";

export default async function RequestsPage() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_requests")) {
    redirect("/dashboard");
  }

  // الإدارة التنفيذية ترى طلبات الجميع — الباقون يرون طلباتهم فقط
  const isExec = EXECUTIVE_ROLES.includes(session.role) || (session.permissions || []).includes("developer_mode");

  // علّم إشعاراتك مقروءة عند فتح الصفحة
  await prisma.requestNotification.updateMany({
    where: { employeeId: session.id, isRead: false },
    data: { isRead: true },
  });

  if (isExec) {
    // الإدارة: جلب كل الطلبات مرتبة بالأهمية
    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    const requests = await prisma.request.findMany({
      include: {
        createdBy: { select: { id: true, name: true, role: true, avatarUrl: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const sorted = requests.sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (b.status === "PENDING" && a.status !== "PENDING") return 1;
      if (a.status === "PENDING" && b.status === "PENDING") {
        const pa = priorityOrder[a.priority] ?? 3;
        const pb = priorityOrder[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return <RequestsClient requests={sorted as any} isExec={true} sessionId={session.id} />;
  } else {
    // الموظف: طلباته فقط
    const requests = await prisma.request.findMany({
      where: { createdById: session.id },
      include: {
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return <RequestsClient requests={requests as any} isExec={false} sessionId={session.id} />;
  }
}
