import { unstable_cache } from "next/cache";
import { ReactNode } from "react";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const getCachedCharityLayout = async (name: string) => {
    return await prisma.charity.findUnique({
      where: { name },
      select: { logoUrl: true }
    });
};

export default async function CharityLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  const charity = await getCachedCharityLayout(decodedName);
  const session = await getSession();

  return (
    <CharityLayoutClient 
      charityName={decodedName} 
      logoUrl={charity?.logoUrl || null}
      role={session?.role}
      permissions={session?.permissions || []}
    >
      {children}
    </CharityLayoutClient>
  );
}
