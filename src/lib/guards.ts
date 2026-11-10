import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  SERVICE_LINKED_CHARITY_PERMISSION_IDS,
  effectiveCharityPermissions,
  hasCharityPermission,
} from "@/lib/charityPermissions";
import { prisma } from "@/lib/db";

// Shared authorization guards for API routes and server actions.
//
// Why this exists: every exported function in a "use server" file is a real
// HTTP entry point, and every file under app/api is reachable directly — the
// route protection in src/proxy.ts only covers page navigations (/main, /portal)
// and does not run for these. Each entry point must therefore guard itself.
//
// The throwing style matches the guards already used across the codebase
// (requireSession in approvals.ts, requireAdmin in workflow.ts,
// getAuthenticatedUser in tasks.ts), which this module consolidates.

export const UNAUTHORIZED_MESSAGE = "غير مصرح";

export class AuthError extends Error {
  status: number;
  constructor(message: string = UNAUTHORIZED_MESSAGE, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Any authenticated user (employee or charity account). */
export async function requireSession() {
  const session = await getSession();
  if (!session?.id) throw new AuthError(UNAUTHORIZED_MESSAGE, 401);
  return session;
}

/** An employee — excludes charity portal accounts. */
export async function requireEmployee() {
  const session = await requireSession();
  if (session.userType === "CHARITY_USER") {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }
  return session;
}

/**
 * An employee holding a specific permission. This is the primary gate.
 * Resolution goes through hasPermission() so that developer_mode and the
 * RoleDefinition-driven permissions arrays keep working — never hardcode a
 * role list at a call site.
 */
export async function requirePermission(permission: string) {
  const session = await requireEmployee();
  if (!hasPermission(session.role, session.permissions || [], permission)) {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }
  return session;
}

/**
 * An employee holding at least one of several permissions. Used where the same
 * action is legitimately reachable from two screens gated differently — e.g.
 * toggleInstallmentPaid is called from both the contracts screen
 * (manage_contracts) and the charity finance screen (manage_finance); requiring
 * only one of them would lock out the other screen's users.
 */
export async function requireAnyPermission(permissions: string[]) {
  const session = await requireEmployee();
  const granted = permissions.some((p) =>
    hasPermission(session.role, session.permissions || [], p)
  );
  if (!granted) throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  return session;
}

/**
 * A charity portal account that actually belongs to the given charity.
 *
 * Membership is checked against the CharityUserCharity link table rather than
 * session.charityId, because an account may be linked to several charities and
 * switch between them (see selectCharitySession in actions/authCharity.ts) —
 * comparing session.charityId alone would lock those users out of their own
 * other charities.
 *
 * Returns the session together with the permissions held IN THIS CHARITY, so
 * callers never have to reach for session.permissions (which is only the active
 * charity's set and would be wrong for any other charityId).
 */
export async function requireCharityMembership(charityId: string) {
  const session = await requireSession();
  if (session.userType !== "CHARITY_USER") {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }

  const link = await prisma.charityUserCharity.findUnique({
    where: {
      charityUserId_charityId: {
        charityUserId: session.id,
        charityId,
      },
    },
    select: {
      id: true,
      charityId: true,
      permissions: true,
      isActive: true,
      isAdmin: true,
      // تفويض الخدمات: منه تُشتقّ تبويبات البوابة المربوطة بخدمات.
      services: { select: { serviceName: true } },
    },
  });

  // An inactive link is not a membership: charity HR deactivating someone must
  // cut off their access to THIS charity immediately, while leaving any other
  // charity they serve untouched.
  if (!link || !link.isActive) throw new AuthError(UNAUTHORIZED_MESSAGE, 403);

  // `isAdmin` comes from the link, so administrator standing is scoped to this
  // charity. Reading it from the account (as the old title check did) made one
  // charity's promotion apply everywhere the person was a member.
  return {
    session,
    membershipId: link.id,
    permissions: link.permissions as string[],
    isAdmin: link.isAdmin,
    services: link.services.map((s) => s.serviceName),
  };
}

/**
 * A charity portal account that belongs to the given charity AND holds a
 * permission *in that charity*.
 *
 * Permissions are read from the link row here rather than from the session, so
 * the answer is scoped to the charity named in the argument — a user who is an
 * admin of charity A gets no authority over charity B by passing B's id, and a
 * permission revoked seconds ago takes effect on the very next request.
 *
 * Call this inside every server action and every RSC page, not only in the
 * sidebar: hiding a nav item is cosmetic, the URL stays typeable.
 */
/**
 * ربطُ تبويبات البوّابة بالخدمات، كما يُحرَّر عند زاد.
 *
 * وموضعُها هنا لا في `portalAccess`: الصفحاتُ تقرؤها من هناك، والأفعالُ
 * تحتاجها من هنا — و`portalAccess` يستورد هذا الملفَّ، فلو كانت هناك لدار
 * الاستيراد. وتُصدَّر منه كما كانت ليبقى مُنادوها على حالهم.
 */
export async function charityPermissionLinks() {
  return prisma.permissionServiceLink.findMany({
    where: { permissionId: { in: SERVICE_LINKED_CHARITY_PERMISSION_IDS } },
    select: { permissionId: true, serviceName: true },
  });
}

/**
 * عضويّةٌ مع **الصلاحيّةِ الفعليّة** — المخزّنةُ بعد تطبيق قاعدة الربط.
 *
 * وهي الموضعُ الذي كان ناقصاً: `requireCharityMembership` تُرجع `services`
 * ولا تستعملها، فتبويبٌ مربوطٌ بخدمةٍ يُفتح للعضو المفوَّض — لأنّ الصفحةَ
 * تحسبه بـ`effectiveCharityPermissions` — ثمّ يرفضه الفعلُ، لأنّه يقرأ
 * المصفوفةَ المخزّنةَ وحدَها، وهي **لا تحمل** تبويبات الخدمات أصلاً
 * (`validateGrant` يُسقطها عند كل حفظ). فالنتيجةُ أسوأُ من منعٍ صريح: نموذجٌ
 * يُملأ ثمّ يُرَدّ.
 */
export async function requireCharityEffective(charityId: string) {
  const membership = await requireCharityMembership(charityId);
  const links = await charityPermissionLinks();
  return {
    ...membership,
    effective: effectiveCharityPermissions(membership.permissions, membership.services, links),
  };
}

export async function requireCharityPermission(charityId: string, permission: string) {
  const { session, permissions, effective, isAdmin } = await requireCharityEffective(charityId);
  if (!hasCharityPermission(isAdmin, effective, permission)) {
    throw new AuthError(UNAUTHORIZED_MESSAGE, 403);
  }
  // و`permissions` تبقى المخزّنةَ كما كانت لمن يعرضها أو يحفظها: الفعليّةُ
  // للسؤال «هل يجوز؟»، والمخزّنةُ هي ما يُكتب في الصفّ.
  return { session, permissions, effective, isAdmin };
}

/** Converts a guard failure into a JSON response for API route handlers. */
/**
 * ردُّ المنع. ورسالةُ `AuthError` تُنقل كما هي إن كُتبت.
 *
 * فكانت تُستبدل كلُّها بـ«غير مصرح»، فحارسٌ يقول «هذا الاستبيان ليس من إنشائك»
 * يصل صاحبَه ناقصاً — يُقال له «غير مصرح» وهو يحمل الصلاحية فيظنّها سُحبت.
 * ورسائلُ هذا الصنف مكتوبةٌ للمستخدم عربيّةً بقصد، لا آثارُ أخطاءٍ داخلية.
 */
export function authErrorResponse(error: unknown) {
  const status = error instanceof AuthError ? error.status : 401;
  const message = error instanceof AuthError ? error.message : UNAUTHORIZED_MESSAGE;
  return NextResponse.json({ error: message || UNAUTHORIZED_MESSAGE }, { status });
}
