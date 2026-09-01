export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { resolveCharityPortal } from "@/lib/portalAccess";
import CharityProfileClient from "./CharityProfileClient";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `بيانات الدخول | ${decodeURIComponent(name)}` };
}

/**
 * Every member of a charity may open this — it edits nothing but their own
 * credentials, so there is no permission to hold. resolveCharityPortal still
 * runs, to prove they belong to the charity in the URL.
 */
export default async function CharityProfilePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { session } = await resolveCharityPortal(name);

  const account = await prisma.charityUser.findUnique({
    where: { id: session.id },
    select: { name: true, phone: true, email: true, password: true },
  });

  return (
    <CharityProfileClient
      name={account?.name ?? session.name}
      phone={account?.phone ?? session.phone}
      initialEmail={account?.email ?? ""}
      hasPassword={!!account?.password}
    />
  );
}
