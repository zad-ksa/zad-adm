"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

/**
 * Who may see which service in «عرض الخدمات».
 *
 * The grant is keyed on the service NAME, not on a Service row id. A service as
 * a person means it is a group of rows — nine names across eight charities
 * today — and the row ids change when services are unified, by the admission of
 * the client's own comment. The name is what both screens already group by.
 *
 * Granted from either side, over one table: from the service (these employees
 * may access it) or from the employee (these services are open to them). Two
 * doors, one room — the alternative was two tables that would disagree.
 *
 * ABSENCE MEANS UNRESTRICTED. An employee with no rows here sees every service
 * of the charities assigned to them, exactly as before this table existed. That
 * is deliberate: it is the same convention getAssignedCharityIds uses when it
 * returns null, and it is what keeps adding this from silently emptying the
 * page for the six people who hold view_services_overview today. Restriction
 * begins at the first grant.
 */

/**
 * Either screen may grant. Both sit behind لوحة التحكم, and the permission that
 * opens each one is the permission that may hand out what that screen shows.
 */
async function requireGrantAuthority() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  const perms = session.permissions || [];
  const allowed =
    hasPermission(session.role, perms, "manage_charity_settings") ||
    hasPermission(session.role, perms, "manage_charities") ||
    hasPermission(session.role, perms, "manage_employees");
  if (!allowed) throw new Error("غير مصرح لك بإدارة صلاحيات الخدمات");
  return session;
}

function fail(error: string) {
  return { success: false as const, error };
}

/** Distinct service names, as the management screen groups them. */
export async function listServiceNames(): Promise<string[]> {
  const rows = await prisma.service.findMany({
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });
  return rows.map((r) => r.name).filter((n) => n.trim() !== "");
}

/**
 * What one employee is restricted to, or null when they are not restricted.
 *
 * Returning null rather than the full list of names is what makes "no grants"
 * mean "everything": a caller that gets null must not filter at all, and cannot
 * mistake an empty array for it.
 */
export async function getEmployeeServiceNames(employeeId: string): Promise<string[] | null> {
  const rows = await prisma.employeeServiceAccess.findMany({
    where: { employeeId },
    select: { serviceName: true },
  });
  if (rows.length === 0) return null;
  return [...new Set(rows.map((r) => r.serviceName))];
}

/** The whole picture for the two granting screens: name → granted employee ids. */
export async function getServiceAccessMap(): Promise<Record<string, string[]>> {
  await requireGrantAuthority();
  const rows = await prisma.employeeServiceAccess.findMany({
    select: { serviceName: true, employeeId: true },
  });
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    (map[r.serviceName] ??= []).push(r.employeeId);
  }
  return map;
}

function revalidate() {
  revalidatePath("/main/services-overview");
  revalidatePath("/main/manage-services");
  revalidatePath("/main/employees");
}

/** From the service side: exactly these employees may access this service. */
export async function setServiceEmployees(serviceName: string, employeeIds: string[]) {
  try {
    await requireGrantAuthority();

    const name = (serviceName || "").trim();
    if (!name) return fail("اسم الخدمة مطلوب");

    const known = await listServiceNames();
    if (!known.includes(name)) return fail("هذه الخدمة غير موجودة");

    const ids = [...new Set(employeeIds)];
    if (ids.length > 0) {
      const found = await prisma.employee.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return fail("أحد الموظفين غير موجود");
    }

    // Replace the set for this service in one transaction: a delete followed by
    // a create that failed would leave the service granted to nobody, which
    // reads as "restricted to nobody" rather than as the failure it was.
    await prisma.$transaction(
      async (tx) => {
        await tx.employeeServiceAccess.deleteMany({ where: { serviceName: name } });
        if (ids.length > 0) {
          await tx.employeeServiceAccess.createMany({
            data: ids.map((employeeId) => ({ employeeId, serviceName: name })),
          });
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("setServiceEmployees failed", error);
    return fail("تعذّر حفظ صلاحيات الخدمة");
  }
}

/** From the employee side: exactly these services are open to this employee. */
export async function setEmployeeServices(employeeId: string, serviceNames: string[]) {
  try {
    await requireGrantAuthority();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!employee) return fail("الموظف غير موجود");

    const known = await listServiceNames();
    const names = [...new Set(serviceNames.map((n) => n.trim()).filter(Boolean))];
    const unknown = names.filter((n) => !known.includes(n));
    if (unknown.length > 0) return fail(`خدمة غير موجودة: ${unknown[0]}`);

    await prisma.$transaction(
      async (tx) => {
        await tx.employeeServiceAccess.deleteMany({ where: { employeeId } });
        if (names.length > 0) {
          await tx.employeeServiceAccess.createMany({
            data: names.map((serviceName) => ({ employeeId, serviceName })),
          });
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("setEmployeeServices failed", error);
    return fail("تعذّر حفظ خدمات الموظف");
  }
}
