import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hasPermission, sanitizePermissions } from "@/lib/permissions";
import { consoleFontClass } from "@/components/console/fonts";
import RolesClient from "./RolesClient";
import type { RoleBundle, RoleRow } from "./types";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getSession();

  // hasPermission يمرّر مدير النظام، فهي بوابة زرّ الصفحة نفسها في «الموظفين».
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_employees")) {
    redirect("/main");
  }

  const [roles, employees, bundleRows] = await Promise.all([
    prisma.roleDefinition.findMany({
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        key: true,
        displayName: true,
        permissions: true,
        isSystem: true,
        bundles: { select: { bundleId: true } },
      },
    }),
    // الموقوفون معدودون: deleteRole يرفض الحذف بوجود أي موظف يحمل المسمى.
    prisma.employee.findMany({ select: { name: true, role: true }, orderBy: { name: "asc" } }),
    // مجموعات الصلاحيات المُنشأة في «الصلاحيات». تُربط بالمسمى فتسري على كل من
    // يحمله حيّاً — بخلاف القالب الافتراضي الذي لا يصل إلا بمزامنةٍ صريحة.
    prisma.permissionBundle.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, permissions: true, services: true },
    }),
  ]);

  const membersOf = new Map<string, string[]>();
  for (const e of employees) {
    const list = membersOf.get(e.role) ?? [];
    list.push(e.name);
    membersOf.set(e.role, list);
  }

  const rows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    key: r.key,
    displayName: r.displayName,
    isSystem: r.isSystem,
    // بلا تنقية يعدّ القالب صلاحياتٍ متقاعدة لا تمنح شيئاً.
    permissions: sanitizePermissions(r.permissions),
    bundleIds: r.bundles.map((b) => b.bundleId),
    members: membersOf.get(r.key) ?? [],
  }));

  const bundles: RoleBundle[] = bundleRows.map((b) => ({ ...b, permissions: sanitizePermissions(b.permissions) }));

  return (
    <div dir="rtl" className={`${consoleFontClass} mx-auto w-full max-w-6xl`}>
      <RolesClient
        roles={rows}
        bundles={bundles}
        canManagePermissions={hasPermission(session.role, session.permissions || [], "manage_permissions")}
      />
    </div>
  );
}
