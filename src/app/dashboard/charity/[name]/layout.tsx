import { ReactNode } from "react";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
  });

  return (
    <CharityLayoutClient charityName={decodedName} logoUrl={charity?.logoUrl || null}>
      {children}
    </CharityLayoutClient>
  );
}
