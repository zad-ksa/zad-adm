// Admin roles that automatically have all permissions
export const AUTO_ADMIN_ROLES = [
  "ADMIN",
  "EXECUTIVE_DIRECTOR",
  "ADMINISTRATIVE_SECRETARIAT",
];

// All available permissions grouped by category
export const PERMISSION_GROUPS = [
  {
    title: "صلاحيات لوحة التحكم",
    permissions: [
      { id: "manage_employees", label: "إدارة الموظفين" },
      { id: "manage_tasks", label: "المهام والمنجزات" },
      { id: "manage_news", label: "الأخبار والإنجازات" },
      { id: "manage_surveys", label: "الاستبيانات المخصصة" },
      { id: "view_services_overview", label: "عرض الخدمات" },
      { id: "manage_meetings", label: "محاضر الاجتماعات" },
    ],
  },
  {
    title: "صلاحيات صفحة الجمعية",
    permissions: [
      { id: "manage_strategy", label: "الاستراتيجية" },
      { id: "manage_governance", label: "الحوكمة" },
      { id: "manage_programs", label: "البرامج والمشاريع" },
      { id: "manage_finance", label: "المالية" },
      { id: "manage_hr", label: "الموارد البشرية" },
    ],
  },
];

// Flat list of all permissions
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

// Role display labels
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "المدير التنفيذي",
  GENERAL_MANAGER: "مساعد المدير",
  ADMINISTRATIVE_SECRETARIAT: "السكرتارية التنفيذية",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
  CHARITY_CLIENT: "عميل جمعية",
};

/**
 * Check if a user has a specific permission.
 * Admin roles automatically have all permissions.
 */
export function hasPermission(
  role: string,
  permissions: string[],
  required: string
): boolean {
  if (AUTO_ADMIN_ROLES.includes(role)) return true;
  return permissions.includes(required);
}
