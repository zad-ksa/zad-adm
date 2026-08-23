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

export type CharityPermissionDef = { id: string; label: string };
export type CharityPermissionGroup = { title: string; permissions: CharityPermissionDef[] };

export const CHARITY_PERMISSION_GROUPS: CharityPermissionGroup[] = [
  {
    title: "صلاحيات الإدارة",
    permissions: [
      { id: "manage_charity_users", label: "إدارة حسابات موظفي الجمعية" },
      { id: "manage_attendance", label: "إعداد مواقع العمل وأوقات الدوام" },
      { id: "view_attendance_reports", label: "عرض تقارير حضور جميع الموظفين" },
    ],
  },
  {
    title: "صلاحيات الصفحات",
    permissions: [
      { id: "view_services", label: "الخدمات" },
      { id: "view_governance", label: "الحوكمة" },
      { id: "view_design_requests", label: "عرض طلبات التصاميم" },
      { id: "create_design_requests", label: "رفع طلب تصميم" },
      // No `view_hr` here. Nothing reads it: the HR section is open to every
      // active member because recording your own attendance is not a privilege,
      // and the screens inside it gate themselves on manage_charity_users,
      // manage_attendance and view_attendance_reports. Offering the checkbox
      // told a manager they had removed someone's access when they had not,
      // which is worse than offering nothing. Values already stored on existing
      // memberships are inert and get dropped on the next save.
    ],
  },
];

export const ALL_CHARITY_PERMISSIONS = CHARITY_PERMISSION_GROUPS.flatMap(
  (g) => g.permissions
);

export const ALL_CHARITY_PERMISSION_IDS: string[] = ALL_CHARITY_PERMISSIONS.map(
  (p) => p.id
);

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
  if (isCharityAdmin(actorIsAdmin)) return [...ALL_CHARITY_PERMISSION_IDS];
  const held = new Set(actorPermissions || []);
  return ALL_CHARITY_PERMISSION_IDS.filter((p) => held.has(p));
}
