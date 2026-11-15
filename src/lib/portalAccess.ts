import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuthError, requireCharityMembership } from "@/lib/guards";
import { effectiveCharityPermissions, hasCharityPermission } from "@/lib/charityPermissions";

// `portalPermissionLinks` زالت: ربطُ تبويبات البوّابة بالخدمات في جدولٍ صار
// كتالوجاً في الشِّفرة (`CHARITY_SERVICE_PERMISSIONS`) — فالصلاحيّةُ تتبع خدمتَها
// بتعريفها، لا بصفٍّ يُحرَّر فيُنسى.


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
  let isOfficial: boolean;
  let services: string[] = [];
  try {
    const membership = await requireCharityMembership(charity.id);
    session = membership.session;
    permissions = membership.permissions;
    isOfficial = membership.isOfficial;
    services = membership.services;
  } catch (error) {
    // Non-members get the same answer as a non-existent charity, so the portal
    // never confirms which charities exist to someone who is not in them.
    if (error instanceof AuthError) notFound();
    throw error;
  }

  // القاعدةُ في `effectiveCharityPermissions` وحدَها: حسابُ الجمعية يُوسَّع إلى
  // كلِّ الصلاحيات، وصلاحيّةُ خدمةٍ تخمد ما لم تكن الخدمةُ مفوَّضة. وكانت مكتوبةً
  // هنا ومكتوبةً في الشريط الجانبيّ، فافترق المعروضُ عن المسموح.
  const effective = effectiveCharityPermissions(permissions, services, isOfficial);

  // ولا صفةَ تُفحص هنا: المصفوفةُ الفعليّةُ وحدَها. فكان العلَمُ يتجاوز الفحصَ
  // في هذا السطر وينسى في الشريط، فتُقبل الصفحةُ ولا يُعرض رابطُها.
  const can = (permission: string) => hasCharityPermission(effective, permission);

  return {
    charity,
    session,
    permissions,
    /** الفعليّةُ — وهي ما يُمرَّر إلى الشريط وما تُفحص به الأفعال. */
    effective,
    /** حسابُ الجمعية الرسميُّ: يمنح الصلاحياتِ، ويحمل كلَّها. */
    isOfficial,
    services,
    can,
  };
}

/**
 * Same, but a member without this permission is sent to the portal's own
 * "no access" screen instead of a 404.
 *
 * It used to be notFound(), which was wrong twice over. The section exists —
 * saying otherwise to someone whose colleague uses it daily just reads as a
 * broken link. And 404 renders outside the portal layout, so it arrived with
 * no sidebar: there was no way to reach any other tab from it.
 *
 * Non-membership is still notFound(), one level up in resolveCharityPortal.
 * That distinction is the point: an outsider is told nothing, a member is
 * told exactly what they are missing and where they may go instead.
 */
export async function requirePortalPermission(nameParam: string, permission: string) {
  const access = await resolveCharityPortal(nameParam);
  if (!access.can(permission)) {
    redirect(
      `/portal/${encodeURIComponent(access.charity.name)}/no-access?need=${encodeURIComponent(permission)}`
    );
  }
  return access;
}
