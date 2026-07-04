import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayoutClient from "./DashboardLayoutClient";
import { Metadata } from "next";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "لوحة التحكم | زاد التنموية",
};

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // عدد الإشعارات غير المقروءة لهذا المستخدم
  const EXEC_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"];
  let unreadRequests = 0;
  const canRequests = EXEC_ROLES.includes(session.role) ||
    hasPermission(session.role, session.permissions || [], "manage_requests");
  if (canRequests) {
    unreadRequests = await prisma.requestNotification.count({
      where: { employeeId: session.id, isRead: false },
    });
  }

  return (
    <DashboardLayoutClient session={session} unreadRequests={unreadRequests}>
      {children}
    </DashboardLayoutClient>
  );
}
