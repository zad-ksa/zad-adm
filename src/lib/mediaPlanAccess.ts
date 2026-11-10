import { prisma } from "@/lib/db";
import { EXTERNAL_CHARITIES } from "@/lib/charityScope";
import { getAssignedCharityIds } from "@/lib/access";
import { SECTION_SERVICES, serviceRowsWhere } from "@/lib/charityServices";
import { hasPermission, isAdmin } from "@/lib/permissions";

/**
 * نطاقُ الخطّة الإعلاميّة عند زاد: أيُّ الجمعيات يرى الموظَّفُ خططَها.
 *
 * وثلاثةُ شروطٍ مجتمعةٌ لا واحد:
 *   ١ **الصلاحية** `manage_media_plan` — تُمنح يداً.
 *   ٢ **الإسناد** — جمعياتُ الموظَّف وحدَها (`getAssignedCharityIds`).
 *   ٣ **الخدمة** — الجمعيةُ تشملها خدمةُ «الإعلامية».
 *
 * ويُستثنى ADMIN وdeveloper_mode من الثاني كما في بقيّة الموقع.
 *
 * وليس ملفَّ `"use server"` عن قصد: تستدعيه الصفحاتُ والأفعالُ المحروسة، ولو
 * صُدّر من ملفِّ أفعالٍ لصار كلُّ ما فيه مدخلاً HTTP بلا حارس.
 *
 * **والترشيحُ ليس حراسة**: هذه تقول ما يُعرض، و`requireMediaCharity` أدناه هي
 * التي تُجيز الفعلَ على جمعيةٍ بعينها — فمن كتب مسارَ جمعيةٍ ليست له يُردّ.
 */

export type MediaSession = {
  id: string;
  role: string;
  permissions?: string[];
  userType?: string;
  name?: string | null;
};

export type MediaCharity = { id: string; name: string };

export type MediaScope = {
  canManage: boolean;
  charities: MediaCharity[];
};

const EMPTY: MediaScope = { canManage: false, charities: [] };

export const MEDIA_SERVICE = SECTION_SERVICES.manage_media_plan;

export async function getMediaScope(session: MediaSession | null): Promise<MediaScope> {
  if (!session?.id || session.userType === "CHARITY_USER") return EMPTY;

  const perms = session.permissions || [];
  if (!hasPermission(session.role, perms, "manage_media_plan")) return EMPTY;

  const everything = isAdmin(session.role) || perms.includes("developer_mode");
  const assigned = everything ? null : await getAssignedCharityIds(session.id, session.role, perms);

  const charities = await prisma.charity.findMany({
    where: {
      ...EXTERNAL_CHARITIES,
      ...(assigned === null ? {} : { id: { in: assigned } }),
      services: { some: serviceRowsWhere(MEDIA_SERVICE) },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return { canManage: true, charities };
}

/**
 * جمعيةٌ بعينها، أو رفضٌ مُعلَّل.
 *
 * ترمي `AuthError`-معنىً عبر `null`: المنادي صفحةٌ تُعيد التوجيه أو فعلٌ يُرجع
 * رسالة، ولا تُرمى هنا استثناءاتٌ تُترجَم مرّتين.
 */
export async function findMediaCharity(
  session: MediaSession | null,
  charityName: string
): Promise<MediaCharity | null> {
  const scope = await getMediaScope(session);
  if (!scope.canManage) return null;
  const decoded = decodeURIComponent(charityName);
  return scope.charities.find((c) => c.name === decoded) ?? null;
}

/** والمعرّفُ وحدَه، لأفعالٍ تأتي من الشاشة بمعرّفٍ لا باسم. */
export async function mayManageCharityMedia(
  session: MediaSession | null,
  charityId: string
): Promise<boolean> {
  const scope = await getMediaScope(session);
  return scope.canManage && scope.charities.some((c) => c.id === charityId);
}
