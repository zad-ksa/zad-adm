import { redirect } from "next/navigation";
import { resolveCharityPortal } from "@/lib/portalAccess";

export const dynamic = "force-dynamic";

/**
 * The portal has no landing screen of its own — it opens on a tab.
 *
 * Which tab depends on the reader. This used to redirect everyone to
 * /services, so a member without view_services was thrown at a wall by the
 * act of opening the portal at all, with no way to steer anywhere else.
 *
 * Ordered by how central each section is, not alphabetically: whoever holds
 * several lands on the one they most likely came for.
 */
export default async function PortalRootRedirectPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const { charity, can } = await resolveCharityPortal(name);

  const base = `/portal/${encodeURIComponent(charity.name)}`;

  const first =
    [
      { path: "/services", allowed: can("view_services") },
      { path: "/governance", allowed: can("view_governance") },
      { path: "/design-requests", allowed: can("view_design_requests") },
      // HR is open to every member; its inner screens gate themselves.
      { path: "/hr", allowed: true },
    ].find((t) => t.allowed)?.path ?? "/no-access";

  redirect(base + first);
}
