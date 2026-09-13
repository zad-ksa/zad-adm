"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin, ALL_PERMISSION_IDS, sanitizePermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";

/**
 * مجموعات الصلاحيات: اسمٌ حرّ يختصر عدّة صلاحيات.
 *
 * ليست مسمّياتٍ وظيفية بلفظٍ آخر، والفرق عمليّ لا تسمويّ:
 *
 *   • المسمى واحدٌ للموظف؛ والمجموعات عدّة يجتمعن عليه.
 *   • «مزامنة» المسمى تنسخ صلاحياته نسخاً إلى Employee.permissions فتدهس ما
 *     كان له، ولا تسري على تعديلٍ بعدها. والمجموعة تُقرأ حيّةً في كل جلسة —
 *     تعدّلها فيسري التعديل على حامليها في اللحظة، وتنزعها فينزع ما أعطته
 *     ولا يُمَسّ ما مُنح للموظف مباشرةً.
 *   • المسمى يصف الوظيفة، والمجموعة تصف قدرة («مسؤول التحضير» مثلاً) قد
 *     يحملها أصحاب مسمّياتٍ شتّى.
 *
 * والدمج يقع في getSession وحده: صلاحيات الموظف المخزّنة ∪ مجموعاته ∪
 * مجموعات مسمّاه. فلا شيء هنا يكتب في Employee.permissions أبداً.
 */

/** إدارة المجموعات نفسها. */
async function requireBundleAuthority() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  if (
    !isAdmin(session.role) &&
    !hasPermission(session.role, session.permissions || [], "manage_permissions")
  ) {
    throw new Error("غير مصرح لك بإدارة الصلاحيات");
  }
  return session;
}

/**
 * ربط المجموعات بالمسميات يُفتح لمن يدير المسميات أيضاً.
 *
 * وإلا رسمت صفحة المسميات مُنتقياً كل نقرةٍ فيه مرفوضة — وهو الخلل الذي
 * أسقط صفحة الاجتماعات لحاملِ صلاحيتها من قبل: واجهةٌ تُعرَض وفعلٌ يُرفض.
 */
async function requireRoleLinkAuthority() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  const perms = session.permissions || [];
  if (
    !isAdmin(session.role) &&
    !hasPermission(session.role, perms, "manage_permissions") &&
    !hasPermission(session.role, perms, "manage_employees")
  ) {
    throw new Error("غير مصرح لك بربط المجموعات بالمسميات");
  }
  return session;
}

function fail(error: string) {
  return { success: false as const, error };
}

const NAME_MAX = 60;
const DESC_MAX = 200;

function cleanName(raw: string) {
  return (raw || "").trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
}

/**
 * الصلاحيات المجهولة تُرفض ولا تُصفّى بصمت.
 *
 * التصفية الصامتة تُنشئ مجموعةً تُحفَظ ناقصةً ويظنّ من أنشأها أنها كاملة —
 * وهذا في الصلاحيات أسوأ من رسالة خطأ.
 */
function checkPermissions(ids: string[]): { ok: true; ids: string[] } | { ok: false; bad: string } {
  const clean = sanitizePermissions(ids);
  const unknown = clean.find((id) => !ALL_PERMISSION_IDS.includes(id));
  if (unknown) return { ok: false, bad: unknown };
  return { ok: true, ids: clean };
}

/** أسماء الخدمات كما هي في القاعدة — تسعة أسماء عبر ثماني جمعيات اليوم. */
export async function listBundleServiceNames(): Promise<string[]> {
  await requireBundleAuthority();
  const rows = await prisma.service.findMany({
    select: { name: true },
    distinct: ["name"],
    orderBy: { name: "asc" },
  });
  return rows.map((r) => r.name).filter((n) => n.trim() !== "");
}

/**
 * الخدمة تُمنح بالاسم، والاسم يتغيّر بإعادة التسمية العامة — فيُتحقَّق من وجوده
 * عند كل حفظ. اسمٌ لم يعد موجوداً يُرفض ولا يُحفظ صامتاً في مجموعةٍ لا تفتح شيئاً.
 */
async function checkServices(
  names: string[]
): Promise<{ ok: true; names: string[] } | { ok: false; bad: string }> {
  const clean = [...new Set((names || []).map((n) => (n || "").trim()).filter(Boolean))];
  if (!clean.length) return { ok: true, names: [] };
  const rows = await prisma.service.findMany({
    where: { name: { in: clean } },
    select: { name: true },
    distinct: ["name"],
  });
  const known = new Set(rows.map((r) => r.name));
  const missing = clean.find((n) => !known.has(n));
  if (missing) return { ok: false, bad: missing };
  return { ok: true, names: clean };
}

export type BundleRow = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  services: string[];
  employeeIds: string[];
  roleIds: string[];
};

/** كل المجموعات بمن يحملها وبما ترتبط به. */
export async function listBundles(): Promise<BundleRow[]> {
  await requireBundleAuthority();
  const rows = await prisma.permissionBundle.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      services: true,
      employees: { select: { employeeId: true } },
      roles: { select: { roleId: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    services: r.services,
    employeeIds: r.employees.map((e) => e.employeeId),
    roleIds: r.roles.map((x) => x.roleId),
  }));
}

function revalidate() {
  revalidatePath("/main/admin/permissions");
  revalidatePath("/main/employees");
  revalidatePath("/main/employees/roles");
}

export async function createBundle(input: {
  name: string;
  description?: string;
  permissions: string[];
  services?: string[];
}) {
  try {
    const session = await requireBundleAuthority();

    const name = cleanName(input.name);
    if (!name) return fail("اسم المجموعة مطلوب");

    const checked = checkPermissions(input.permissions || []);
    if (!checked.ok) return fail(`صلاحية غير معروفة: ${checked.bad}`);

    const svc = await checkServices(input.services || []);
    if (!svc.ok) return fail(`خدمة غير موجودة: ${svc.bad}`);

    const clash = await prisma.permissionBundle.findUnique({ where: { name }, select: { id: true } });
    if (clash) return fail("توجد مجموعة بهذا الاسم");

    const created = await prisma.permissionBundle.create({
      data: {
        name,
        description: (input.description || "").trim().slice(0, DESC_MAX) || null,
        permissions: checked.ids,
        services: svc.names,
      },
      select: { id: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "PermissionBundle",
      targetId: created.id,
      metadata: { created: name, permissions: checked.ids, services: svc.names },
    });

    revalidate();
    return { success: true as const, id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("createBundle failed", error);
    return fail("تعذّر إنشاء المجموعة");
  }
}

export async function updateBundle(
  id: string,
  input: { name?: string; description?: string; permissions?: string[]; services?: string[] }
) {
  try {
    const session = await requireBundleAuthority();

    const before = await prisma.permissionBundle.findUnique({ where: { id } });
    if (!before) return fail("المجموعة غير موجودة");

    const data: {
      name?: string;
      description?: string | null;
      permissions?: string[];
      services?: string[];
    } = {};

    if (input.name !== undefined) {
      const name = cleanName(input.name);
      if (!name) return fail("اسم المجموعة مطلوب");
      if (name !== before.name) {
        const clash = await prisma.permissionBundle.findUnique({
          where: { name },
          select: { id: true },
        });
        if (clash) return fail("توجد مجموعة بهذا الاسم");
      }
      data.name = name;
    }

    if (input.description !== undefined) {
      data.description = input.description.trim().slice(0, DESC_MAX) || null;
    }

    if (input.permissions !== undefined) {
      const checked = checkPermissions(input.permissions);
      if (!checked.ok) return fail(`صلاحية غير معروفة: ${checked.bad}`);
      data.permissions = checked.ids;
    }

    if (input.services !== undefined) {
      const svc = await checkServices(input.services);
      if (!svc.ok) return fail(`خدمة غير موجودة: ${svc.bad}`);
      data.services = svc.names;
    }

    await prisma.permissionBundle.update({ where: { id }, data });

    // يُسجَّل تغيير الصلاحيات أو الخدمات: تعديل الاسم لا يغيّر ما يستطيعه أحد.
    if (data.permissions || data.services) {
      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session.id,
        actorName: session.name,
        action: "PERMISSION_CHANGE",
        targetType: "PermissionBundle",
        targetId: id,
        metadata: {
          bundle: before.name,
          before: { permissions: before.permissions, services: before.services },
          after: { permissions: data.permissions, services: data.services },
        },
      });
    }

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("updateBundle failed", error);
    return fail("تعذّر تحديث المجموعة");
  }
}

/**
 * الحذف يسلب ما أعطته المجموعة، ولا يمسّ ما مُنح للموظف مباشرةً.
 *
 * الروابط تُحذف بالتتالي في القاعدة. ولا يُمنع الحذف لأن المجموعة مستعملة:
 * منعُه يترك المدير عاجزاً عن سحب قدرةٍ منحها، وهو عكس الغرض. والعدد يُرجَع
 * ليعرف من يحذف ماذا يحذف.
 */
export async function deleteBundle(id: string) {
  try {
    const session = await requireBundleAuthority();

    const bundle = await prisma.permissionBundle.findUnique({
      where: { id },
      select: {
        name: true,
        permissions: true,
        services: true,
        _count: { select: { employees: true, roles: true } },
      },
    });
    if (!bundle) return fail("المجموعة غير موجودة");

    await prisma.permissionBundle.delete({ where: { id } });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "PermissionBundle",
      targetId: id,
      metadata: {
        deleted: bundle.name,
        permissions: bundle.permissions,
        services: bundle.services,
        affectedEmployees: bundle._count.employees,
        affectedRoles: bundle._count.roles,
      },
    });

    revalidate();
    return {
      success: true as const,
      affectedEmployees: bundle._count.employees,
      affectedRoles: bundle._count.roles,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("deleteBundle failed", error);
    return fail("تعذّر حذف المجموعة");
  }
}

/**
 * من جهة المجموعة: هؤلاء الموظفون يحملونها — استبدالاً لا إضافة.
 *
 * الاستبدال داخل معاملة واحدة: حذفٌ نجح وإنشاءٌ فشل يترك المجموعة بلا حامل،
 * وهو ما يُقرأ «سُحبت من الجميع» لا «فشل الحفظ».
 */
export async function setBundleEmployees(bundleId: string, employeeIds: string[]) {
  try {
    const session = await requireBundleAuthority();

    const bundle = await prisma.permissionBundle.findUnique({
      where: { id: bundleId },
      select: { name: true },
    });
    if (!bundle) return fail("المجموعة غير موجودة");

    const ids = [...new Set(employeeIds)].filter(Boolean);
    if (ids.length) {
      const found = await prisma.employee.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return fail("أحد الموظفين غير موجود");
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.employeeBundle.deleteMany({ where: { bundleId } });
        if (ids.length) {
          await tx.employeeBundle.createMany({
            data: ids.map((employeeId) => ({ employeeId, bundleId })),
          });
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "PermissionBundle",
      targetId: bundleId,
      metadata: { bundle: bundle.name, holders: ids.length },
    });

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("setBundleEmployees failed", error);
    return fail("تعذّر حفظ حاملي المجموعة");
  }
}

/** من جهة الموظف: هذه المجموعات له — وهي عدّة، لا واحدة كالمسمى. */
export async function setEmployeeBundles(employeeId: string, bundleIds: string[]) {
  try {
    const session = await requireBundleAuthority();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true },
    });
    if (!employee) return fail("الموظف غير موجود");

    const ids = [...new Set(bundleIds)].filter(Boolean);
    if (ids.length) {
      const found = await prisma.permissionBundle.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return fail("إحدى المجموعات غير موجودة");
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.employeeBundle.deleteMany({ where: { employeeId } });
        if (ids.length) {
          await tx.employeeBundle.createMany({
            data: ids.map((bundleId) => ({ employeeId, bundleId })),
          });
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "Employee",
      targetId: employeeId,
      metadata: { employee: employee.name, bundles: ids.length },
    });

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("setEmployeeBundles failed", error);
    return fail("تعذّر حفظ مجموعات الموظف");
  }
}

/**
 * من جهة المسمى الوظيفي: هذه المجموعات لكل من يحمل المسمى.
 *
 * حيٌّ بلا مزامنة — وهذا ما يفرقه عن RoleDefinition.permissions: من يحمل
 * المسمى يكسب صلاحيات مجموعاته في جلسته التالية بلا أن يُلمَس صفّه.
 */
export async function setRoleBundles(roleId: string, bundleIds: string[]) {
  try {
    const session = await requireRoleLinkAuthority();

    const role = await prisma.roleDefinition.findUnique({
      where: { id: roleId },
      select: { key: true, displayName: true },
    });
    if (!role) return fail("المسمى غير موجود");

    const ids = [...new Set(bundleIds)].filter(Boolean);
    if (ids.length) {
      const found = await prisma.permissionBundle.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return fail("إحدى المجموعات غير موجودة");
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.roleBundle.deleteMany({ where: { roleId } });
        if (ids.length) {
          await tx.roleBundle.createMany({ data: ids.map((bundleId) => ({ roleId, bundleId })) });
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "PERMISSION_CHANGE",
      targetType: "RoleDefinition",
      targetId: roleId,
      metadata: { role: role.key, displayName: role.displayName, bundles: ids.length },
    });

    revalidate();
    return { success: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("غير مصرح")) return fail(message);
    console.error("setRoleBundles failed", error);
    return fail("تعذّر حفظ مجموعات المسمى");
  }
}
