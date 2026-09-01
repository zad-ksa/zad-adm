import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import DashboardLayoutClient from "@/app/(dashboard)/main/(main)/DashboardLayoutClient";
import { getRoleLabels } from "@/app/actions/settings";
import { RoleLabelsProvider } from "@/components/RoleLabelsProvider";
import SetEmailBanner from "@/components/SetEmailBanner";

export default async function DashboardRootLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Block CHARITY_USER from accessing the main Zad dashboard completely.
  if (session.userType === "CHARITY_USER") {
    redirect("/charity-login");
  }

  // For employees, we wrap the dashboard with DashboardLayoutClient here.
  // This ensures the layout is shared and doesn't unmount when navigating between /main and /charity/[name].
  let unreadRequests = 0;
  if (hasPermission(session.role, session.permissions || [], "view_requests")) {
    unreadRequests = await prisma.requestNotification.count({
      where: { employeeId: session.id, isRead: false },
    });
  }

  const unreadMails = await prisma.mailRecipient.count({
    where: { employeeId: session.id, isRead: false, isDeleted: false },
  });

  const roleLabels = await getRoleLabels();

  // Email login is optional, so this is a reminder rather than a gate. Read
  // fresh each request rather than from the session cookie, which is a
  // snapshot from login time and would keep nagging after the address was set.
  const account = await prisma.employee.findUnique({
    where: { id: session.id },
    select: { email: true },
  });
  const needsEmail = !account?.email;

  return (
    <RoleLabelsProvider labels={roleLabels}>
      <DashboardLayoutClient session={session} unreadRequests={unreadRequests} unreadMails={unreadMails}>
        {needsEmail && (
          <div className="mb-4">
            <SetEmailBanner href="/main/profile" />
          </div>
        )}
        {children}
      </DashboardLayoutClient>
    </RoleLabelsProvider>
  );
}
