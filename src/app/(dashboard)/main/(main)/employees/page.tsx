import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { EmployeesClient } from "./EmployeesClient";
import { hasPermission, sanitizePermissions } from "@/lib/permissions";
import { consoleFontClass } from "@/components/console/fonts";
import type { BundleOption, EmployeeRow, RoleOption } from "./types";

const dateLabel = new Intl.DateTimeFormat("ar-SA", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Riyadh",
});

export default async function EmployeesPage() {
  const session = await getSession();

  // Protect route: only users with manage_employees permission
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_employees")) {
    redirect("/main");
  }

  const [employees, allCharities, roleDefinitions, serviceRows, bundleRows] = await Promise.all([
    // select لا include: كان الصفّ كله يُرسل إلى المتصفح، ومعه كلمة المرور المشفّرة.
    prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        permissions: true,
        annualLeaveDays: true,
        isActive: true,
        createdAt: true,
        assignedCharities: { select: { charityId: true } },
        serviceAccess: { select: { serviceName: true } },
        bundles: { select: { bundleId: true } },
      },
    }),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.roleDefinition.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        key: true,
        displayName: true,
        permissions: true,
        bundles: { select: { bundleId: true } },
      },
    }),
    // Distinct service names, the same identity the grant is keyed on.
    prisma.service.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
    // المجموعات تُقرأ هنا لا عبر listBundles: تلك محروسة بـmanage_permissions،
    // وهذه الصفحة لمن يدير الموظفين.
    prisma.permissionBundle.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, permissions: true, services: true },
    }),
  ]);

  // المصفوفات المخزّنة قد تحمل مُعرّفات متقاعدة إلى أن يُحفظ الموظف مرّةً أخرى،
  // والتنقية هنا تجعل الشاشة كلها تعمل على ما يعني شيئاً اليوم.
  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    email: e.email,
    role: e.role,
    permissions: sanitizePermissions(e.permissions),
    annualLeaveDays: e.annualLeaveDays,
    isActive: e.isActive,
    createdLabel: dateLabel.format(e.createdAt),
    charityIds: e.assignedCharities.map((c) => c.charityId),
    serviceNames: [...new Set(e.serviceAccess.map((s) => s.serviceName))],
    bundleIds: e.bundles.map((b) => b.bundleId),
  }));

  const roles: RoleOption[] = roleDefinitions.map((r) => ({
    id: r.id,
    key: r.key,
    displayName: r.displayName,
    permissions: sanitizePermissions(r.permissions),
    bundleIds: r.bundles.map((b) => b.bundleId),
  }));

  const bundles: BundleOption[] = bundleRows.map((b) => ({
    ...b,
    permissions: sanitizePermissions(b.permissions),
  }));

  const perms = session.permissions || [];

  return (
    <div dir="rtl" className={`${consoleFontClass} mx-auto w-full max-w-6xl`}>
      <EmployeesClient
        employees={rows}
        roles={roles}
        bundles={bundles}
        allCharities={allCharities}
        allServiceNames={serviceRows.map((r) => r.name).filter((n) => n.trim() !== "")}
        sessionId={session.id}
        sessionRole={session.role}
        canDelete={hasPermission(session.role, perms, "delete_employees")}
        canManagePermissions={hasPermission(session.role, perms, "manage_permissions")}
      />
    </div>
  );
}
