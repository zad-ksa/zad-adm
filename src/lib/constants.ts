// Roles that have admin or director level access
export const ADMIN_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];

// Map roles to human-readable labels
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "المدير التنفيذي",
  GENERAL_MANAGER: "مساعد المدير",
  ADMINISTRATIVE_SECRETARIAT: "السكرتارية الإدارية",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
};

// Task Statuses
export const TASK_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "لم يتم التنفيذ",
  IN_PROGRESS: "جاري التنفيذ",
  COMPLETED: "منجزة",
};

// Task Priorities
export const TASK_PRIORITIES = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

export const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: "عاجلة ومهمة",
  2: "أولوية متوسطة",
  3: "أولوية منخفضة",
};
