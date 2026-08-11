// Admin roles that automatically have all permissions
export const AUTO_ADMIN_ROLES = [
  "ADMIN",
];

// Roles that automatically have executive-level permissions (manage_requests etc.)
export const EXECUTIVE_ROLES = [
  "EXECUTIVE_DIRECTOR",
  "GENERAL_MANAGER",
  "ADMINISTRATIVE_SECRETARIAT",
];

// Permissions granted automatically to EXECUTIVE_ROLES without explicit assignment
const EXECUTIVE_AUTO_PERMISSIONS: string[] = [];

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
      { id: "manage_charity_accounts", label: "إدارة حسابات الجمعيات" },
      { id: "manage_contracts", label: "عرض العقود" },
      { id: "edit_contracts", label: "تعديل وإدارة العقود" },
      { id: "manage_employees", label: "إدارة الموظفين" },
      { id: "delete_employees", label: "حذف الموظفين" },
      { id: "manage_tasks", label: "المهام والمنجزات" },
      { id: "view_all_tasks", label: "عرض وإدارة جميع مهام الموظفين" },
      { id: "manage_news", label: "الأخبار والإنجازات" },
      { id: "manage_surveys", label: "الاستبيانات المخصصة" },
      { id: "view_services_overview", label: "عرض الخدمات" },
      { id: "manage_meetings", label: "محاضر الاجتماعات" },
      { id: "manage_communication", label: "إدارة التواصل" },
      { id: "view_requests", label: "الطلبات والاعتماد (رفع طلب ومتابعته)" },
      { id: "manage_requests", label: "إدارة الطلبات (اعتماد / رفض / إرجاع)" },
      { id: "manage_workflow", label: "إعداد سلاسل اعتماد الطلبات" },
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
      { id: "manage_hr", label: "الموارد البشرية" },
    ],
  },
];

// Flat list of all permissions
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

// Role display labels
export { DEFAULT_ROLE_LABELS } from "./constants";

/**
 * Check if a user has a specific permission.
 * Developer mode bypasses all permission checks.
 */
export function hasPermission(
  role: string,
  permissions: string[],
  required: string
): boolean {
  if (permissions.includes("developer_mode")) return true;
  // manage_requests يشمل view_requests تلقائياً
  if (required === "view_requests" && permissions.includes("manage_requests")) return true;
  return permissions.includes(required);
}
