import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import DashboardLayoutClient from "@/app/(dashboard)/main/(main)/DashboardLayoutClient";

export default async function DashboardRootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // If the user is a charity client, do not wrap in DashboardLayoutClient.
  // Their layout wrapper (CharityLayoutClient) will be applied by their specific layout file.
  if (session.role === "CHARITY_CLIENT") {
    return <>{children}</>;
  }

  // For employees, we wrap the dashboard with DashboardLayoutClient here.
  // This ensures the layout is shared and doesn't unmount when navigating between /main and /charity/[name].
  let unreadRequests = 0;
  if (hasPermission(session.role, session.permissions || [], "view_requests")) {
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
