import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RolesClient from "./RolesClient";
import { prisma } from "@/lib/db";
import { hasPermission, isAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getSession();

  // Verify access exactly like the button in EmployeesClient
  const hasAccess = session && (
    isAdmin(session.role) ||
    hasPermission(session.role, session.permissions || [], "manage_employees")
  );

  if (!hasAccess) {
    redirect("/main");
  }

  const [roles, employeeCounts] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'asc' }
      ]
    }),
    prisma.employee.groupBy({ by: ['role'], _count: { role: true } }),
  ]);

  const countsByRole = Object.fromEntries(employeeCounts.map(c => [c.role, c._count.role]));
  const rolesWithCounts = roles.map(r => ({ ...r, employeeCount: countsByRole[r.key] || 0 }));

  return <RolesClient roles={rolesWithCounts} />;
}
