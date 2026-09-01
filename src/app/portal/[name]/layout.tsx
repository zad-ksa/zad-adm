import { ReactNode } from "react";
import { redirect, notFound } from "next/navigation";
import CharityLayoutClient from "./CharityLayoutClient";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import SetEmailBanner from "@/components/SetEmailBanner";

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
    include: {
      // Deactivated memberships are excluded here rather than filtered in the
      // UI, so a deactivated employee neither sees the charity in the switcher
      // nor passes the ownership gate below.
      charities: { where: { isActive: true }, include: { charity: true } },
    },
  });

  const availableCharities = user?.charities.map(c => ({
    id: c.charityId,
    name: c.charity.name
  })) || [];

  // Ownership gate: the check above only proves the visitor is *a* charity
  // account, not that this charity is theirs — without this, any logged-in
  // charity account could read another charity's portal by typing its name in
  // the URL.
  //
  // Membership is tested against the full linked-charities list rather than
  // session.charityId, because an account may be linked to several charities
  // and switch between them (selectCharitySession); comparing the single
  // session.charityId would lock those users out of their own other charities.
  const isMember = availableCharities.some((c) => c.id === charity.id);
  if (!isMember) {
    notFound();
  }

  // Permissions for THIS charity, not session.permissions — the session carries
  // only the currently-selected charity's set, which is the wrong answer while
  // the user is browsing a different one of their charities.
  const membership = user?.charities.find((c) => c.charityId === charity.id);

  // Same reminder as the Zad dashboard, pointing at the portal's own screen.
  const needsEmail = !user?.email;

  return (
    <CharityLayoutClient
      charityName={decodedName}
      logoUrl={charity.logoUrl || null}
      role={session.role}
      userType={session.userType}
      availableCharities={availableCharities}
      isDeveloper={session.isDeveloper}
      currentEmployeeId={session.originalId ? session.id : undefined}
      permissions={membership?.permissions ?? []}
      title={session.title}
      isAdmin={membership?.isAdmin ?? false}
    >
      {needsEmail && (
        <div className="mb-4">
          <SetEmailBanner href={`/portal/${encodeURIComponent(decodedName)}/profile`} />
        </div>
      )}
      {children}
    </CharityLayoutClient>
  );
}
