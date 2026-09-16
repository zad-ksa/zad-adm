/**
 * Permission layer for the CHARITY side of the portal (accounts of type
 * CHARITY_USER), the counterpart of `lib/permissions.ts` on the employee side.
 *
 * One rule governs the whole layer: **every input comes from the
 * CharityUserCharity link row, never from the CharityUser account.**
 *
 * That applies to the administrator flag as much as to the permission array. It
 * used to be `CharityUser.title === "SYSTEM_ADMIN"`, which is stored per
 * account and so made someone an administrator of every charity they belonged
 * to at once — and let either charity grant or revoke that standing on the
 * other's behalf. A person can be an administrator in charity A and an ordinary
 * volunteer in charity B, and each charity decides that for itself.
 *
 * Job titles (CEO, CHAIRMAN, VOLUNTEER, …) are labels with zero authority.
 * Nothing here reads them, and no call site should test one by name —
 * hardcoding a title list is what the August 17 audit flagged.
 */

/** True when the link row marks this member an administrator of THIS charity. */
export function isCharityAdmin(isAdmin?: boolean | null): boolean {
  return isAdmin === true;
}

export function hasCharityPermission(
  isAdmin: boolean | null | undefined,
  permissions: string[] | null | undefined,
  required: string
): boolean {
  if (isCharityAdmin(isAdmin)) return true;
  return (permissions || []).includes(required);
}

import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";

export type CharityPermissionDef = { id: string; label: string };
export type CharityPermissionGroup = { title: string; permissions: CharityPermissionDef[] };

const MANAGE_PERMISSIONS: CharityPermissionDef[] = [
  { id: "manage_charity_users", label: "إدارة حسابات موظفي الجمعية" },
];

/**
 * صلاحيتا التحضير: مخفيّتان ما دام تحضير الجمعيات موقوفاً بعلَم
 * CHARITY_ATTENDANCE_ENABLED. ولم تُتقاعدا — القيم المخزّنة تبقى كما هي،
 * وتعودان إلى المُنتقي في اللحظة التي يُشغَّل فيها التحضير.
 */
const ATTENDANCE_PERMISSIONS: CharityPermissionDef[] = [
  { id: "manage_attendance", label: "إعداد مواقع العمل وأوقات الدوام" },
  { id: "view_attendance_reports", label: "عرض تقارير حضور جميع الموظفين" },
];

/**
 * تبويبات البوابة: لا تُمنح بيد أحد.
 *
 * يربط زاد كل تبويبٍ بخدمةٍ من صفحة «الصلاحيات»، ثم تفوّض الجمعية عضوها بخدمة،
 * فيرى تبويبها. ومدير الجمعية يمرّ بلا تفويض. وما دام التبويب بلا ربط، يبقى
 * على صلاحيته المخزّنة كما كان — فلا ينقطع شيء قبل أن يُربط.
 */
const PAGE_PERMISSIONS: CharityPermissionDef[] = [
  { id: "view_services", label: "الخدمات" },
  { id: "view_governance", label: "الحوكمة" },
      // Seeing the design requests and raising one are a single permission.
      // They were two, and every membership that held either held both — the
      // split described a distinction nobody was making, while giving whoever
      // grants permissions two checkboxes to keep in step by hand.
      //
      // `create_design_requests` is retired. Values still sitting in older
      // memberships are inert and drop on the next save, the same way the old
      // `view_hr` value does.
  { id: "view_design_requests", label: "طلبات التصاميم (عرض ورفع)" },
];

// No `view_hr`. Nothing reads it: the HR section is open to every active
// member because recording your own attendance is not a privilege, and the
// screens inside it gate themselves.

/** معرّفات التبويبات التي تُنال بتفويض الخدمة. */
export const SERVICE_LINKED_CHARITY_PERMISSION_IDS: string[] = PAGE_PERMISSIONS.map((p) => p.id);

/** تبويبات البوابة بوسومها — تُعرض في صفحة الصلاحيات عند زاد لربطها بالخدمات. */
export const CHARITY_PAGE_PERMISSIONS: CharityPermissionDef[] = PAGE_PERMISSIONS;

/** ما يُعرض في مُنتقي عضو الجمعية: الإدارة وحدها. */
export const CHARITY_PERMISSION_GROUPS: CharityPermissionGroup[] = [
  {
    title: "صلاحيات الإدارة",
    permissions: [...MANAGE_PERMISSIONS, ...(CHARITY_ATTENDANCE_ENABLED ? ATTENDANCE_PERMISSIONS : [])],
  },
];

/** كل المعرّفات المعروفة ومنها المخفيّة اليوم — للتحقق والوسم، لا للعرض. */
export const ALL_CHARITY_PERMISSIONS: CharityPermissionDef[] = [
  ...MANAGE_PERMISSIONS,
  ...ATTENDANCE_PERMISSIONS,
  ...PAGE_PERMISSIONS,
];

export const ALL_CHARITY_PERMISSION_IDS: string[] = ALL_CHARITY_PERMISSIONS.map(
  (p) => p.id
);

/** ما يجوز منحه يدوياً: المعروض في المُنتقي وحده. */
export const GRANTABLE_CHARITY_PERMISSION_IDS: string[] = CHARITY_PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.id)
);

/**
 * Ids that existed once and no longer do.
 *
 * They are still sitting in stored permission arrays on live memberships, and
 * something has to decide what happens when one of those rows is saved again.
 * Rejecting them as "unknown" was the first answer and it was wrong: it made
 * every existing member unsavable the moment a permission was retired — you
 * could open the editor, change nothing, and be told the data you were handed
 * is invalid.
 *
 * So a retired id is DROPPED silently, while a genuinely unrecognised one is
 * still refused. The difference matters: one is our own history, the other is
 * a client sending something nobody ever defined.
 */
export const RETIRED_CHARITY_PERMISSION_IDS: string[] = [
  // Merged into view_design_requests.
  "create_design_requests",
  // Never gated anything; see the note in the groups above.
  "view_hr",
];

/** Strips retired ids and de-duplicates. Does not judge the rest. */
export function sanitizeCharityPermissions(ids: string[] | null | undefined): string[] {
  return [...new Set(ids || [])].filter(
    (id) => !RETIRED_CHARITY_PERMISSION_IDS.includes(id)
  );
}

export function charityPermissionLabel(id: string): string {
  return ALL_CHARITY_PERMISSIONS.find((p) => p.id === id)?.label ?? id;
}

/**
 * Job titles a charity may assign. Pure labels — none of them grants anything.
 *
 * SYSTEM_ADMIN is absent on purpose: administrator standing is now the
 * per-charity `isAdmin` flag on the membership, so offering a title by that
 * name would promise authority the title no longer carries. It remains in the
 * Prisma enum and in the label lookup below because accounts created before the
 * change still hold it.
 */
export const CHARITY_USER_TITLES: { id: string; label: string }[] = [
  { id: "CHAIRMAN", label: "رئيس مجلس إدارة" },
  { id: "CEO", label: "مدير تنفيذي" },
  { id: "FULL_TIME", label: "موظف بدوام كامل" },
  { id: "PART_TIME", label: "موظف بدوام جزئي" },
  { id: "VOLUNTEER", label: "متطوع" },
];

const LEGACY_TITLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "مدير النظام (مسمى سابق)",
};

export function charityTitleLabel(title: string): string {
  return (
    CHARITY_USER_TITLES.find((t) => t.id === title)?.label ??
    LEGACY_TITLE_LABELS[title] ??
    title
  );
}

/**
 * The set a given actor is allowed to hand out — the subset rule from §3.4 of
 * the plan. An administrator of this charity may grant anything within it;
 * everyone else may only grant permissions they themselves hold, so nobody can
 * bootstrap authority they were never given.
 */
export function grantableCharityPermissions(
  actorIsAdmin: boolean | null | undefined,
  actorPermissions: string[] | null | undefined
): string[] {
  if (isCharityAdmin(actorIsAdmin)) return [...GRANTABLE_CHARITY_PERMISSION_IDS];
  const held = new Set(actorPermissions || []);
  return GRANTABLE_CHARITY_PERMISSION_IDS.filter((p) => held.has(p));
}
