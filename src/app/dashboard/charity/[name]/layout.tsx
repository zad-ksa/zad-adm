import { ReactNode } from "react";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

const getCachedCharityLayout = unstable_cache(
  async (name: string) => {
    return await prisma.charity.findUnique({
      where: { name },
      select: { logoUrl: true }
    });
  },
  ['charity-layout'],
  { revalidate: 300, tags: ['charity'] }
);

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

  return (
    <CharityLayoutClient charityName={decodedName} logoUrl={charity?.logoUrl || null}>
      {children}
    </CharityLayoutClient>
  );
}
