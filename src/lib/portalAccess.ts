import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuthError, requireCharityMembership } from "@/lib/guards";
import { hasCharityPermission } from "@/lib/charityPermissions";

/**
 * Resolves the charity named in a /portal/[name] URL together with the visitor's
 * authority *inside that charity*.
 *
 * Every portal page calls this, not just the sidebar. Hiding a nav item is
 * cosmetic — the URL stays typeable — and the August 17 audit's `custom-surveys`
 * finding was exactly that mistake: a guarded screen reaching an unguarded
 * route. Server actions guard themselves separately; this keeps the page from
 * rendering data the visitor may not see.
 */
export async function resolveCharityPortal(nameParam: string) {
  const charityName = decodeURIComponent(nameParam);

  const charity = await prisma.charity.findUnique({
    where: { name: charityName },
    select: { id: true, name: true },
  });
  if (!charity) notFound();

  let session: any;
  let permissions: string[];
  let isAdmin: boolean;
  try {
    const membership = await requireCharityMembership(charity.id);
    session = membership.session;
    permissions = membership.permissions;
    isAdmin = membership.isAdmin;
  } catch (error) {
    // Non-members get the same answer as a non-existent charity, so the portal
    // never confirms which charities exist to someone who is not in them.
    if (error instanceof AuthError) notFound();
    throw error;
  }

  return {
    charity,
    session,
    permissions,
    isAdmin,
    can: (permission: string) => hasCharityPermission(isAdmin, permissions, permission),
  };
}

/** Same, but refuses outright when the permission is missing. */
export async function requirePortalPermission(nameParam: string, permission: string) {
  const access = await resolveCharityPortal(nameParam);
  if (!access.can(permission)) notFound();
  return access;
}
