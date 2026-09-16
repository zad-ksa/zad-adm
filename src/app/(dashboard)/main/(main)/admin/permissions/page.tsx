export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  hasPermission,
  ALL_PERMISSION_IDS,
  DEFAULT_ROLE_LABELS,
  effectivePermissions,
  sanitizePermissions,
} from "@/lib/permissions";
import { consoleFontClass } from "@/components/console/fonts";
import PermissionsAdminClient from "./PermissionsAdminClient";
import { PERMISSIONS_TABS, type PermissionsTab } from "./types";

export const metadata: Metadata = { title: "الصلاحيات | زاد التنموية" };

/**
 * الصلاحيات: المجموعات، ومن يحملها، والكتالوج، والخدمات.
 *
 * المجموعة هنا PermissionBundle لا RoleDefinition: عدّة منها للموظف الواحد،
 * وتُقرأ حيّةً في كل جلسة بلا «مزامنة» تنسخ وتدهس.
 *
 * و«من يحملها» تُحسب هنا لا في المتصفح، وكما تحسبها الجلسة بالضبط: صلاحيات
 * الموظف المخزّنة ∪ مجموعاته ∪ مجموعات مسمّاه. لو حُسبت من العمود المخزّن وحده
 * لكذبت الصفحة على قارئها بعد أول منح مجموعة.
 */
export default async function PermissionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  if (!hasPermission(session.role, session.permissions || [], "manage_permissions")) {
    redirect("/main/admin");
  }

  const { tab } = await searchParams;
  const initialTab: PermissionsTab = PERMISSIONS_TABS.includes(tab as PermissionsTab) ? (tab as PermissionsTab) : "bundles";

  const [employees, roles, bundleRows, serviceRows, directAccess, links] = await Promise.all([
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
      select: { id: true, key: true, displayName: true },
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
    prisma.service.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
    prisma.employeeServiceAccess.findMany({ select: { employeeId: true, serviceName: true } }),
    prisma.permissionServiceLink.findMany({ select: { permissionId: true, serviceName: true } }),
  ]);

  // ربط الصلاحيات بالخدمات — يُحرَّر من لوحة الصلاحية. ويُحسب هنا كما تحسبه
  // الجلسة تماماً، وإلا عرضت الصفحة حامليها ناقصين.
  const permissionsByService = new Map<string, string[]>();
  const linkedServices: Record<string, string[]> = {};
  for (const link of links) {
    const holders = permissionsByService.get(link.serviceName) ?? [];
    holders.push(link.permissionId);
    permissionsByService.set(link.serviceName, holders);
    const services = linkedServices[link.permissionId] ?? [];
    services.push(link.serviceName);
    linkedServices[link.permissionId] = services;
  }

  const bundles = bundleRows.map((b) => ({ ...b, permissions: sanitizePermissions(b.permissions) }));

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

  // نفس الاتحاد الذي تبنيه getSession — وإلا عرضت الصفحة شيئاً والنظام يعمل بغيره.
  const permissionSetOf = (e: (typeof employees)[number]) => {
    const own = new Set(sanitizePermissions(e.permissions));
    const mine = new Set(e.bundles.map((x) => x.bundleId));
    for (const b of bundles) if (mine.has(b.id)) b.permissions.forEach((p) => own.add(p));
    for (const b of bundlesByRoleKey.get(e.role) ?? []) b.permissions.forEach((p) => own.add(p));
    return own;
  };

  // وبنفس اتحاد getEmployeeServiceNames: منحٌ مباشر ∪ خدمات مجموعاته ∪ مجموعات مسمّاه.
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

  const scopes = employees.map((e) => {
    const services = serviceSetOf(e);
    const permissions = permissionSetOf(e);
    for (const name of services) {
      for (const id of permissionsByService.get(name) ?? []) permissions.add(id);
    }
    return { employee: e, permissions: new Set(effectivePermissions([...permissions])), services };
  });

  const serviceNames = serviceRows.map((s) => s.name).filter((n) => n.trim() !== "");
  const services = serviceNames.map((name) => ({
    name,
    holders: scopes.filter((s) => s.services.has(name)).map((s) => s.employee.name),
    bundles: bundles.filter((b) => b.services.includes(name)).map((b) => b.name),
  }));

  const holders: Record<string, string[]> = {};
  // أيّ مجموعةٍ تمنح كل صلاحية: يفرّق بين ما مُنح لشخصٍ بعينه وما جاءه بمجموعة.
  const viaBundles: Record<string, string[]> = {};
  for (const id of ALL_PERMISSION_IDS) {
    holders[id] = scopes.filter((s) => s.permissions.has(id)).map((s) => s.employee.name);
    viaBundles[id] = bundles.filter((b) => b.permissions.includes(id)).map((b) => b.name);
  }

  return (
    <div dir="rtl" className={`${consoleFontClass} mx-auto w-full max-w-6xl`}>
      <PermissionsAdminClient
        initialTab={initialTab}
        holders={holders}
        viaBundles={viaBundles}
        adminNames={employees.filter((e) => e.role === "ADMIN").map((e) => e.name)}
        services={services}
        serviceNames={serviceNames}
        linkedServices={linkedServices}
        canManageEmployees={hasPermission(session.role, session.permissions || [], "manage_employees")}
        employees={scopes.map(({ employee: e, permissions, services: svc }) => ({
          id: e.id,
          name: e.name,
          role: e.role,
          roleLabel:
            roles.find((r) => r.key === e.role)?.displayName ??
            DEFAULT_ROLE_LABELS[e.role as keyof typeof DEFAULT_ROLE_LABELS] ??
            e.role,
          isAdmin: e.role === "ADMIN",
          bundleIds: e.bundles.map((x) => x.bundleId),
          roleBundleIds: (bundlesByRoleKey.get(e.role) ?? []).map((b) => b.id),
          // المتقاعدات لا تُعَدّ: عددٌ يشملها يَعِد بأكثر مما يُمنح.
          directCount: sanitizePermissions(e.permissions).length,
          effectiveCount: permissions.size,
          serviceCount: svc.size,
        }))}
        roles={roles.map((r) => ({
          id: r.id,
          key: r.key,
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
    </div>
  );
}
