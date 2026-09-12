// ADMIN is the only role with automatic, unconditional access to everything.
// Every other role (including former "admin-like" roles such as
// EXECUTIVE_DIRECTOR / GENERAL_MANAGER / ADMINISTRATIVE_SECRETARIAT) must be
// granted access explicitly through its permissions array / RoleDefinition,
// otherwise edits to a role's permissions have no visible effect.
export function isAdmin(role?: string | null): boolean {
  return role === "ADMIN";
}

// "Tier 1" (elevated meeting authority) now follows the same rule: ADMIN, or
// anyone explicitly granted "developer_mode" (full-access override), no
// longer any hardcoded role list.
export function isTier1(role?: string | null, permissions: string[] = []): boolean {
  if (isAdmin(role)) return true;
  return permissions.includes("developer_mode");
}


// All available permissions grouped by category
export const PERMISSION_GROUPS = [
  {
    title: "صلاحيات النظام الخاصة",
    permissions: [
      { id: "developer_mode", label: "صلاحية المطور (الوصول الشامل)" },
      { id: "view_all_charities", label: "الوصول الشامل لجميع الجمعيات" },
    ],
  },
  {
    title: "صلاحيات لوحة التحكم",
    permissions: [
      { id: "view_charities", label: "عرض تبويب الجمعيات (القائمة الجانبية)" },
      // Checked in nineteen places and defined in none, so nobody could be
      // granted it — and the "إدارة الجمعيات المتعاقدة" page was reachable only
      // by a developer_mode holder, not even by the ADMIN account.
      { id: "manage_charities", label: "إضافة وتعديل وحذف الجمعيات المتعاقدة" },
      { id: "manage_charity_accounts", label: "إدارة حسابات الجمعيات" },
      // edit_contracts merged in here. The pair was never granted apart, and
      // the names were inverted: manage_ meant "view" while edit_ meant
      // "manage". One permission, named for what it actually does.
      { id: "manage_contracts", label: "العقود (عرض وإدارة)" },
      { id: "manage_employees", label: "إدارة الموظفين" },
      { id: "delete_employees", label: "حذف الموظفين" },
      { id: "manage_tasks", label: "المهام والمنجزات" },
      { id: "view_all_tasks", label: "عرض وإدارة جميع مهام الموظفين" },
      { id: "manage_news", label: "الأخبار والإنجازات" },
      { id: "manage_surveys", label: "الاستبيانات المخصصة" },
      { id: "view_services_overview", label: "عرض الخدمات" },
      { id: "manage_meetings", label: "محاضر الاجتماعات" },
      { id: "manage_communication", label: "إدارة التواصل" },
      { id: "manage_design_requests", label: "طلبات التصاميم" },
      { id: "delete_design_requests", label: "حذف طلبات التصاميم نهائياً" },
      { id: "view_requests", label: "الاعتمادات (رفع طلب ومتابعته)" },
      { id: "manage_requests", label: "إدارة الاعتمادات (اعتماد / إرجاع)" },
      { id: "review_all_requests", label: "متابعة جميع الاعتمادات وأين وصلت (اطّلاع فقط)" },
      { id: "manage_workflow", label: "إعداد سلاسل اعتماد الطلبات" },
      { id: "manage_knowledge_tree", label: "مكتبة النماذج (إضافة وتعديل)" },
      // تحضير موظفي زاد. تسجيل الحضور نفسه ليس صلاحية — كل موظف نشط
      // يسجّل حضوره؛ هاتان لمن يضبط النظام ومن يقرأ سجلات الآخرين.
      { id: "manage_zad_attendance", label: "إدارة تحضير موظفي زاد (المواقع والدوام والتقويم والإجازات)" },
      { id: "view_zad_attendance_reports", label: "عرض تقارير حضور جميع موظفي زاد" },
      { id: "manage_landing", label: "التحكم في الواجهة الرئيسية" },
      { id: "manage_permissions", label: "إدارة الصلاحيات ومجموعاتها" },
    ],
  },
  {
    title: "صلاحيات صفحة الجمعية",
    permissions: [
      { id: "manage_charity_settings", label: "إعدادات تبويبات الجمعيات" },
      { id: "manage_strategy", label: "الاستراتيجية" },
      { id: "manage_governance", label: "الحوكمة" },
      { id: "manage_programs", label: "البرامج والمشاريع" },
      { id: "manage_finance", label: "المالية" },
      // No manage_hr. It was offered for months, granted to four people, and
      // checked by not one line in the project — so granting it opened nothing
      // and withholding it closed nothing. Same fault, same fix, as view_hr on
      // the charity side.
    ],
  },
];

// Flat list of all permissions
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

export const ALL_PERMISSION_IDS: string[] = ALL_PERMISSIONS.map((p) => p.id);

/**
 * Ids that existed once and no longer do.
 *
 * They are still sitting in stored arrays on live employees, and something has
 * to decide what happens when one of those rows is saved again. The charity
 * side learned this the hard way: rejecting retired ids as "unknown" made
 * nineteen of twenty memberships unsavable — you could open the editor, change
 * nothing, and be told the data you were handed is invalid.
 *
 * So a retired id is DROPPED silently on the next save. Nothing is rewritten in
 * bulk: an id that grants nothing is harmless where it sits, and a migration
 * touching every employee row to delete a no-op is more risk than the no-op.
 */
export const RETIRED_PERMISSION_IDS: string[] = [
  // Merged into manage_contracts.
  "edit_contracts",
  // Never gated anything; see the note in the groups above.
  "manage_hr",
];

/** Strips retired ids and de-duplicates. Does not judge the rest. */
export function sanitizePermissions(ids: string[] | null | undefined): string[] {
  return [...new Set(ids || [])].filter((id) => !RETIRED_PERMISSION_IDS.includes(id));
}

/**
 * Which permissions each one carries with it.
 *
 * This replaces a growing pile of `if (required === X && has(Y))` inside
 * hasPermission — there were three, all for view_requests, while every other
 * relationship in the system lived only in the head of whoever granted them.
 *
 * Every entry below was checked against live data first: in each case nobody
 * holds the implying permission without already holding the implied one. So
 * declaring these grants no one anything they did not already have. What it
 * changes is that the two can no longer drift apart, and that the grantor has
 * one fewer checkbox to keep in step by hand.
 */
export const IMPLIES: Record<string, string[]> = {
  // Deciding a request means being able to open the page that lists them.
  manage_requests: ["view_requests"],
  review_all_requests: ["view_requests"],
  // Whoever configures attendance reads its reports.
  manage_zad_attendance: ["view_zad_attendance_reports"],
  // Both of these act on charities, so both need the tab that leads there.
  manage_charity_settings: ["view_charities"],
  manage_charities: ["view_charities"],
  // A destructive action implies the ordinary one it destroys from.
  delete_employees: ["manage_employees"],
  delete_design_requests: ["manage_design_requests"],
  // Seeing everyone's tasks implies having the tasks screen at all.
  view_all_tasks: ["manage_tasks"],
  // manage_programs has no page of its own and no entry in the sidebar's
  // service list. Its entire effect is the SERVICES tab being editable inside
  // /main/services-overview — so without access to that page, granting it
  // changed nothing at all, which is the worst thing a permission can do.
  manage_programs: ["view_services_overview"],
};

/** Everything a stored array actually grants, once implications are applied. */
export function effectivePermissions(permissions: string[]): string[] {
  const out = new Set(permissions);
  for (const held of permissions) {
    for (const implied of IMPLIES[held] ?? []) out.add(implied);
  }
  return [...out];
}

// Role display labels
export { DEFAULT_ROLE_LABELS } from "./constants";

/**
 * Check if a user has a specific permission.
 *
 * ADMIN passes unconditionally, which is what the comment at the top of this
 * file has always promised — but the promise was not implemented here: `role`
 * was accepted and never read. The ADMIN account was therefore treated as an
 * ordinary employee everywhere the call site did not separately remember to
 * check isAdmin(), and only fourteen files did. The most visible symptom was
 * that the "إدارة الجمعيات المتعاقدة" page was closed to the system
 * administrator.
 */
export function hasPermission(
  role: string,
  permissions: string[],
  required: string
): boolean {
  if (isAdmin(role)) return true;
  if (permissions.includes("developer_mode")) return true;
  if (permissions.includes(required)) return true;
  return permissions.some((held) => IMPLIES[held]?.includes(required));
}
