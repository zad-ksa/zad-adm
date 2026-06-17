export interface Task {
  id: string;
  title: string;
  assignedToId: string;
  createdById: string;
  charityId: string | null;
  charityName: string | null;
  isInternal: boolean;
  isCompleted: boolean;
  status: string;
  priority: number;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export interface Achievement {
  id: string;
  title: string;
  employeeId: string;
  createdById: string;
  charityId?: string | null;
  charityName?: string | null;
  isInternal: boolean;
  proofUrl?: string | null;
  proofPublicId?: string | null;
  createdAt: Date | string;
  date: Date | string;
  category: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatarUrl: string | null;
}

export interface Charity {
  id: string;
  name: string;
}

// Session type derived from auth logic
export interface Session {
  id: string;
  phone: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  exp?: number;
  iat?: number;
}
