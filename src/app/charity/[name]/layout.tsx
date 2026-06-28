import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminRole, getAssignedCharityIds } from "@/lib/access";

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
    const assigned = await getAssignedCharityIds(session.id, session.role);
    if (assigned !== null && !assigned.includes(charity.id)) {
      redirect("/dashboard");
    }
  }

  return (
    <CharityLayoutClient
      charityName={decodedName}
      logoUrl={charity.logoUrl || null}
      role={session.role}
      permissions={session.permissions || []}
      navOrder={session.navOrder || []}
    >
      {children}
    </CharityLayoutClient>
  );
}
