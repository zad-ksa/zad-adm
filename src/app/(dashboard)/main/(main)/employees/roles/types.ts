export type RoleRow = {
  id: string;
  key: string;
  displayName: string;
  isSystem: boolean;
  /** القالب الافتراضي: يُنسخ إلى حاملي المسمى عند المزامنة فقط. */
  permissions: string[];
  /** مجموعات المسمى: تسري حيّةً على كل من يحمله. */
  bundleIds: string[];
  /** أسماء من يحمل المسمى، ومنهم الموقوفون — الحذف يمتنع بوجود أيٍّ منهم. */
  members: string[];
};

export type RoleBundle = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  services: string[];
};
