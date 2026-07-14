import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminRole, getAssignedCharityIds } from "@/lib/access";
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

  // Access gate: restricted to CHARITY_CLIENT ONLY
  if (session.role !== "CHARITY_CLIENT") {
    redirect("/main");
  }

  // Fetch nav settings for this employee (actually for charity client in this fallback)
  const { getCharityGlobalNavSettings } = await import("@/app/actions/globalSettings");
  const navSettings = await getCharityGlobalNavSettings();

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
