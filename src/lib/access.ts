import { prisma } from "@/lib/db";

const ADMIN_ROLES = [
  "ADMIN",
  "EXECUTIVE_DIRECTOR",
  "GENERAL_MANAGER",
  "ADMINISTRATIVE_SECRETARIAT",
];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Returns null for admins (unrestricted access).
 * Returns string[] for restricted employees — may be empty (no access).
 */
export async function getAssignedCharityIds(
  employeeId: string,
  role: string
): Promise<string[] | null> {
  if (isAdminRole(role) || role === "CHARITY_CLIENT") return null;
  const rows = await prisma.employeeCharity.findMany({
    where: { employeeId },
    select: { charityId: true },
  });
  return rows.map((r) => r.charityId);
}

export async function assertCharityAccess(
  employeeId: string,
  role: string,
  charityId: string
): Promise<void> {
  const assigned = await getAssignedCharityIds(employeeId, role);
  if (assigned === null) return;
  if (!assigned.includes(charityId)) throw new Error("FORBIDDEN");
}
