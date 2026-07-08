import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminRole, getAssignedCharityIds } from "@/lib/access";
import DashboardLayoutClient from "@/app/dashboard/(main)/DashboardLayoutClient";
import { hasPermission } from "@/lib/permissions";

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const session = await getSession();
  if (!session) redirect("/");

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    select: { id: true, logoUrl: true },
  });
  if (!charity) notFound();

  // Access gate: restricted roles must have this charity assigned
  if (!isAdminRole(session.role) && session.role !== "CHARITY_CLIENT") {
    const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
    if (assigned !== null && !assigned.includes(charity.id)) {
      redirect("/dashboard");
    }
  }

  // If the user is an employee, wrap with DashboardLayoutClient instead of CharityLayoutClient
  if (session.role !== "CHARITY_CLIENT") {
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

  // Fetch nav settings for this employee (actually for charity client in this fallback)
  const { getEmployeeNavSettings } = await import("@/app/actions/employeeSettings");
  const navSettings = await getEmployeeNavSettings(session.id);

  return (
    <CharityLayoutClient
      charityName={decodedName}
      logoUrl={charity.logoUrl || null}
      role={session.role}
      permissions={session.permissions || []}
      navSettings={navSettings}
      isDeveloper={session.isDeveloper}
      currentEmployeeId={session.originalId ? session.id : undefined}
    >
      {children}
    </CharityLayoutClient>
  );
}
