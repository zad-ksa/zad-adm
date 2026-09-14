import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import RolesClient from "./RolesClient";
import { prisma } from "@/lib/db";
import { hasPermission, isAdmin, sanitizePermissions } from "@/lib/permissions";

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

  const [roles, employeeCounts, bundles] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { createdAt: 'asc' }
      ],
      include: { bundles: { select: { bundleId: true } } },
    }),
    prisma.employee.groupBy({ by: ['role'], _count: { role: true } }),
    // مجموعات الصلاحيات المُنشأة في «إدارة الصلاحيات». تُربط بالمسمى فتسري
    // على كل من يحمله حيّاً — بخلاف «الصلاحيات الافتراضية» أدناه، وهي قالبٌ
    // لا يصل الموظف إلا بمزامنةٍ صريحة تدهس ما كان له.
    prisma.permissionBundle.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, permissions: true },
    }),
  ]);

  const countsByRole = Object.fromEntries(employeeCounts.map(c => [c.role, c._count.role]));
  const rolesWithCounts = roles.map(r => ({
    ...r,
    // بلا تنقية يعدّ «٣ صلاحيات افتراضية» ومنها متقاعدةٌ لا تمنح شيئاً.
    permissions: sanitizePermissions(r.permissions),
    employeeCount: countsByRole[r.key] || 0,
    bundleIds: r.bundles.map(b => b.bundleId),
  }));

  return <RolesClient roles={rolesWithCounts} bundles={bundles} />;
}
