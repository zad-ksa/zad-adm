import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { grantableCharityPermissions } from "@/lib/charityPermissions";
import { resolveCharityPortal } from "@/lib/portalAccess";
import HrNav from "./HrNav";
import StaffManagerClient from "./StaffManagerClient";
import { HrPageHeader } from "./ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `الموارد البشرية | ${decodeURIComponent(name)}` };
}

export default async function HrStaffPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { charity, session, permissions, isAdmin, can } = await resolveCharityPortal(name);

  // Someone who can only record their own attendance lands on the check-in
  // screen instead of an empty "not allowed" page — that IS their HR page.
  if (!can("manage_charity_users")) {
    redirect(`/portal/${encodeURIComponent(charity.name)}/hr/attendance`);
  }

  const links = await prisma.charityUserCharity.findMany({
    where: { charityId: charity.id },
    include: {
      user: { select: { id: true, name: true, phone: true, title: true, isActive: true } },
    },
    orderBy: { assignedAt: "asc" },
  });

  const staff = links.map((l) => ({
    id: l.user.id,
    name: l.user.name,
    phone: l.user.phone,
    title: l.user.title as string,
    permissions: l.permissions,
    isActive: l.isActive,
    isAdmin: l.isAdmin,
    isAccountActive: l.user.isActive,
  }));

  return (
    <>
      <HrPageHeader
        icon={Users}
        eyebrow="الموارد البشرية"
        title="الموظفون"
        context={charity.name}
      />

      <HrNav
        charityName={charity.name}
        canManageUsers
        canManageAttendance={can("manage_attendance")}
        canViewReports={can("view_attendance_reports")}
      />

      <StaffManagerClient
        charityId={charity.id}
        currentUserId={session.id}
        actorIsAdmin={isAdmin}
        // The grantable set is computed on the SERVER and only used to render
        // the editor. The same rule is enforced again in the action, because a
        // client can send whatever it likes regardless of what it was shown.
        grantablePermissions={grantableCharityPermissions(isAdmin, permissions)}
        initialStaff={staff}
      />
    </>
  );
}
