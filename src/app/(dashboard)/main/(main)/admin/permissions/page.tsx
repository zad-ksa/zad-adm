export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, ALL_PERMISSION_IDS } from "@/lib/permissions";
import PermissionsAdminClient from "./PermissionsAdminClient";

export const metadata: Metadata = { title: "إدارة الصلاحيات | زاد التنموية" };

/**
 * The permissions catalogue and bundle manager.
 *
 * Bundles are RoleDefinition rows — the model that already means "a named set
 * of permissions". Inventing a second concept beside it would give one idea two
 * sources of truth, and only one of them could be assigned to an employee,
 * because Employee has `role` and `permissions` and nothing else.
 *
 * The holder counts are computed here rather than in the browser: they are the
 * number this page exists to show, and shipping twelve employees' permission
 * arrays to the client to count them there would send more than it displays.
 */
export default async function PermissionsAdminPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (!hasPermission(session.role, session.permissions || [], "manage_permissions")) {
    redirect("/main/admin");
  }

  const [employees, roles] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true, permissions: true },
      orderBy: { name: "asc" },
    }),
    prisma.roleDefinition.findMany({ orderBy: [{ isSystem: "desc" }, { displayName: "asc" }] }),
  ]);

  // Who holds each permission, as stored. Implications are shown separately by
  // the client so the two are never confused: one is what was granted, the
  // other is what that grant carries with it.
  const holders: Record<string, string[]> = {};
  for (const id of ALL_PERMISSION_IDS) {
    holders[id] = employees.filter((e) => e.permissions.includes(id)).map((e) => e.name);
  }

  return (
    <PermissionsAdminClient
      holders={holders}
      employeeCount={employees.length}
      adminNames={employees.filter((e) => e.role === "ADMIN").map((e) => e.name)}
      bundles={roles.map((r) => ({
        id: r.id,
        key: r.key,
        displayName: r.displayName,
        permissions: r.permissions,
        isSystem: r.isSystem,
        memberCount: employees.filter((e) => e.role === r.key).length,
      }))}
    />
  );
}
