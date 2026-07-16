import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

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

  // Access gate: restricted to CHARITY_USER ONLY
  if (session.userType !== "CHARITY_USER") {
    redirect("/main");
  }

  // Fetch charities for this user to pass to sidebar for quick switching
  const user = await prisma.charityUser.findUnique({
    where: { id: session.id },
    include: { charities: { include: { charity: true } } }
  });

  const availableCharities = user?.charities.map(c => ({
    id: c.charityId,
    name: c.charity.name
  })) || [];

  return (
    <CharityLayoutClient
      charityName={decodedName}
      logoUrl={charity.logoUrl || null}
      role={session.role}
      userType={session.userType}
      availableCharities={availableCharities}
      isDeveloper={session.isDeveloper}
      currentEmployeeId={session.originalId ? session.id : undefined}
    >
      {children}
    </CharityLayoutClient>
  );
}
