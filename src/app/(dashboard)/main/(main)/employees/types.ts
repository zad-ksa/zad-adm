/** صفّ الموظف كما تستلمه الواجهة — بلا كلمة المرور المشفّرة ولا غيرها مما لا يُعرض. */
export type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  /** null = لم يُضبط الدخول بالبريد، فيدخل برمز الجوال. */
  email: string | null;
  role: string;
  /** الصلاحيات الممنوحة مباشرةً، بعد التنقية من المُعرّفات المتقاعدة. */
  permissions: string[];
  annualLeaveDays: number;
  isActive: boolean;
  /** تاريخ الإضافة منسّقاً على الخادم، كي لا يختلف بين الخادم والمتصفح. */
  createdLabel: string;
  charityIds: string[];
  /** الخدمات الممنوحة مباشرةً. */
  serviceNames: string[];
  /** المجموعات الممنوحة كاملةً مباشرةً (لا عبر المسمى). */
  bundleIds: string[];
};

export type RoleOption = {
  id: string;
  key: string;
  displayName: string;
  permissions: string[];
  /** مجموعات المسمى: يحملها كل صاحب مسمى، وتُدار من صفحة المسميات. */
  bundleIds: string[];
};

export type BundleOption = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  services: string[];
};

export type CharityOption = { id: string; name: string };

/** ما يرسله نموذج الإضافة والتعديل. undefined في bundleIds أو serviceNames = لا تمسّها. */
export type EmployeeInput = {
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  email?: string | null;
  password?: string;
  annualLeaveDays?: number;
  charityIds?: string[];
  bundleIds?: string[];
  serviceNames?: string[];
};
