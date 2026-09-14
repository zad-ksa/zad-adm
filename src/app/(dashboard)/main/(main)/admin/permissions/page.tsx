export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  hasPermission,
  ALL_PERMISSION_IDS,
  DEFAULT_ROLE_LABELS,
  sanitizePermissions,
} from "@/lib/permissions";
import PermissionsAdminClient from "./PermissionsAdminClient";

export const metadata: Metadata = { title: "إدارة الصلاحيات | زاد التنموية" };

/**
 * كتالوج الصلاحيات، ومجموعاتها، ومن يحملها.
 *
 * المجموعة هنا PermissionBundle لا RoleDefinition. الصفحة كانت تحرّر صفوف
 * المسميات الوظيفية نفسها، فكانت وجهاً آخر لصفحة المسميات لا صفحةً أخرى —
 * والمجموعة شيءٌ آخر: عدّة منها للموظف الواحد، وتُقرأ حيّةً في كل جلسة بلا
 * «مزامنة» تنسخ وتدهس.
 *
 * و«من يحملها» تُحسب هنا لا في المتصفح، وتُحسب كما تحسبها الجلسة بالضبط:
 * صلاحيات الموظف المخزّنة ∪ مجموعاته ∪ مجموعات مسمّاه. لو حُسبت من العمود
 * المخزّن وحده لكذبت الصفحة على قارئها بعد أول منح مجموعة.
 */
export default async function PermissionsAdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!hasPermission(session.role, session.permissions || [], "manage_permissions")) {
    redirect("/main/admin");
  }

  const [employees, roles, bundles, serviceRows, directAccess] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        permissions: true,
        bundles: { select: { bundleId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.roleDefinition.findMany({
      orderBy: [{ isSystem: "desc" }, { displayName: "asc" }],
      select: { id: true, key: true, displayName: true, isSystem: true },
    }),
    prisma.permissionBundle.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        services: true,
        employees: { select: { employeeId: true } },
        roles: { select: { roleId: true, role: { select: { key: true } } } },
      },
    }),
    // الخدمات ديناميكية: تُقرأ من الجدول لا من قائمة في الكود. والاسم هو
    // المفتاح — الخدمة الواحدة صفٌّ في كل جمعية، وكلها اسمٌ واحد.
    prisma.service.findMany({
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    }),
    prisma.employeeServiceAccess.findMany({ select: { employeeId: true, serviceName: true } }),
  ]);

  const roleKeyOf = new Map(roles.map((r) => [r.id, r.key]));
  const bundlesByRoleKey = new Map<string, typeof bundles>();
  for (const b of bundles) {
    for (const link of b.roles) {
      const key = link.role?.key ?? roleKeyOf.get(link.roleId);
      if (!key) continue;
      const list = bundlesByRoleKey.get(key) ?? [];
      list.push(b);
      bundlesByRoleKey.set(key, list);
    }
  }

  // نفس الاتحاد الذي تبنيه getSession — وإلا عرضت الصفحة شيئاً والنظام يعمل
  // بغيره.
  const effectiveOf = (e: (typeof employees)[number]) => {
    const own = new Set(e.permissions);
    const mine = new Set(e.bundles.map((x) => x.bundleId));
    for (const b of bundles) if (mine.has(b.id)) b.permissions.forEach((p) => own.add(p));
    for (const b of bundlesByRoleKey.get(e.role) ?? []) b.permissions.forEach((p) => own.add(p));
    return own;
  };

  const effective = employees.map((e) => ({ name: e.name, set: effectiveOf(e) }));

  // ── الخدمات: من تُفتح له كلُّ خدمة ──────────────────────────────────────
  //
  // بنفس اتحاد getEmployeeServiceNames: منحٌ مباشر ∪ خدمات مجموعاته ∪ خدمات
  // مجموعات مسمّاه. ومن خلا من الثلاثة فهو بلا تقييد — يرى كل خدمات جمعياته،
  // وهذا هو العُرف الذي يجعل إضافة النظام لا تسلب أحداً شيئاً.
  const serviceNames = serviceRows.map((s) => s.name).filter((n) => n.trim() !== "");
  const directByEmployee = new Map<string, string[]>();
  for (const row of directAccess) {
    const list = directByEmployee.get(row.employeeId) ?? [];
    list.push(row.serviceName);
    directByEmployee.set(row.employeeId, list);
  }

  const serviceSetOf = (e: (typeof employees)[number]) => {
    const set = new Set(directByEmployee.get(e.id) ?? []);
    const mine = new Set(e.bundles.map((x) => x.bundleId));
    for (const b of bundles) if (mine.has(b.id)) b.services.forEach((s) => set.add(s));
    for (const b of bundlesByRoleKey.get(e.role) ?? []) b.services.forEach((s) => set.add(s));
    return set;
  };

  const serviceScopes = employees.map((e) => ({ name: e.name, set: serviceSetOf(e) }));
  const unrestrictedCount = serviceScopes.filter((s) => s.set.size === 0).length;

  const services = serviceNames.map((name) => ({
    name,
    holders: serviceScopes.filter((s) => s.set.has(name)).map((s) => s.name),
    bundles: bundles.filter((b) => b.services.includes(name)).map((b) => b.name),
  }));

  const holders: Record<string, string[]> = {};
  // أيّ مجموعةٍ تمنح كل صلاحية: يفرّق للقارئ بين ما مُنح لشخصٍ بعينه وما جاءه
  // بمجموعةٍ يُسحب منها بنزعها.
  const viaBundles: Record<string, string[]> = {};
  for (const id of ALL_PERMISSION_IDS) {
    holders[id] = effective.filter((e) => e.set.has(id)).map((e) => e.name);
    viaBundles[id] = bundles.filter((b) => b.permissions.includes(id)).map((b) => b.name);
  }

  return (
    <PermissionsAdminClient
      holders={holders}
      viaBundles={viaBundles}
      adminNames={employees.filter((e) => e.role === "ADMIN").map((e) => e.name)}
      services={services}
      serviceNames={serviceNames}
      unrestrictedCount={unrestrictedCount}
      employees={employees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        roleLabel:
          roles.find((r) => r.key === e.role)?.displayName ??
          DEFAULT_ROLE_LABELS[e.role as keyof typeof DEFAULT_ROLE_LABELS] ??
          e.role,
        bundleIds: e.bundles.map((x) => x.bundleId),
        // المتقاعدات لا تُعَدّ: عددٌ يشملها يَعِد بأكثر مما يُمنح.
        directCount: sanitizePermissions(e.permissions).length,
      }))}
      roles={roles.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        memberCount: employees.filter((e) => e.role === r.key).length,
      }))}
      bundles={bundles.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        permissions: b.permissions,
        services: b.services,
        employeeIds: b.employees.map((x) => x.employeeId),
        roleIds: b.roles.map((x) => x.roleId),
      }))}
    />
  );
}
