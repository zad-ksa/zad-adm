/** تبويبات الصفحة، وتُحفظ في الرابط (?tab=) ليُشارَك الموضع. */
export type PermissionsTab = "bundles" | "members" | "catalog" | "services";

export const PERMISSIONS_TABS: PermissionsTab[] = ["bundles", "members", "catalog", "services"];

export type BundleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  /** أسماء الخدمات التي تفتحها المجموعة في «عرض الخدمات». */
  services: string[];
  employeeIds: string[];
  roleIds: string[];
};

export type ServiceRow = {
  name: string;
  /** من تُفتح له الخدمة: منحٌ مباشر ∪ مجموعاته ∪ مجموعات مسمّاه. */
  holders: string[];
  bundles: string[];
};

export type PermEmployee = {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  isAdmin: boolean;
  /** مجموعاته المباشرة. */
  bundleIds: string[];
  /** مجموعات مسمّاه: يحملها بمسمّاه، وتُدار من صفحة المسميات. */
  roleBundleIds: string[];
  directCount: number;
  /** كما تحسبها الجلسة: مباشرة ∪ مجموعات ∪ اشتمال. */
  effectiveCount: number;
  serviceCount: number;
};

export type RoleRow = { id: string; key: string; displayName: string; memberCount: number };
