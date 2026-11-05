import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AuthError, charityPermissionLinks, requireCharityMembership } from "@/lib/guards";
import { effectiveCharityPermissions } from "@/lib/charityPermissions";

/**
 * ربطُ تبويبات البوابة بالخدمات، كما يُحرَّر عند زاد.
 *
 * ومُصدَّرةٌ لأنّ تخطيطَ البوابة يحتاجها كما تحتاجها هذه الدالّة: الشريطُ
 * الجانبيُّ يُقرِّر ما يَعرض، وهذه تُقرِّر ما يُفتَح، فإن لم يقرآ الربطَ نفسَه
 * افترق المعروضُ عن المسموح.
 *
 * ومصدرُها الآن `guards.ts`: الأفعالُ تحتاجها أيضاً — وهذا الملفُّ يستورد
 * `guards`، فلو بقي الاستعلامُ هنا لدار الاستيراد. ويبقى الاسمُ مُصدَّراً من
 * هنا لمن كان يستورده.
 */
export { charityPermissionLinks as portalPermissionLinks } from "@/lib/guards";

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
  let services: string[] = [];
  try {
    const membership = await requireCharityMembership(charity.id);
    session = membership.session;
    permissions = membership.permissions;
    isAdmin = membership.isAdmin;
    services = membership.services;
  } catch (error) {
    // Non-members get the same answer as a non-existent charity, so the portal
    // never confirms which charities exist to someone who is not in them.
    if (error instanceof AuthError) notFound();
    throw error;
  }

  // القاعدةُ في `effectiveCharityPermissions` وحدَها: تبويبٌ مربوطٌ بخدمةٍ
  // يُنال بتفويضها، وتبويبٌ لم يُربط بعد يبقى على المخزّن. وكانت مكتوبةً هنا
  // ومكتوبةً في الشريط الجانبيّ، فافترق المعروضُ عن المسموح.
  const links = await charityPermissionLinks();
  const effective = effectiveCharityPermissions(permissions, services, links);

  const can = (permission: string) => {
    // مدير الجمعية مرتبطٌ بكل خدماتها، فلا تفويض عليه.
    if (isAdmin) return true;
    return effective.includes(permission);
  };

  return {
    charity,
    session,
    permissions,
    /** المخزّنةُ بعد تطبيق قاعدة الربط — وهي ما يُمرَّر إلى الشريط. */
    effective,
    isAdmin,
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
