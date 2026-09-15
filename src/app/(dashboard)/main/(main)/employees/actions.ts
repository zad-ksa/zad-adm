"use server";

import { prisma } from "@/lib/db";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin, sanitizePermissions } from "@/lib/permissions";
import { logAudit } from "@/lib/auditLog";
import type { Prisma } from "@prisma/client";
import { listServiceNames } from "@/app/actions/serviceAccess";
import type { EmployeeInput } from "./types";

async function checkManageEmployeesAuth() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  if (!hasPermission(session.role, session.permissions || [], "manage_employees")) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * المجموعات والخدمات تُتحقَّق قبل الكتابة: مجموعةٌ حُذفت أو خدمةٌ أُعيدت تسميتها
 * تُرفض برسالة، ولا تُحفظ صامتةً فيظنّ المدير أنه منح شيئاً لا يفتح شيئاً.
 * undefined = لا تمسّ هذا الجزء.
 */
async function checkAccess(
  bundleIds?: string[],
  serviceNames?: string[]
): Promise<{ error: string } | { bundleIds?: string[]; serviceNames?: string[] }> {
  const out: { bundleIds?: string[]; serviceNames?: string[] } = {};

  if (bundleIds !== undefined) {
    const ids = [...new Set(bundleIds.filter(Boolean))];
    if (ids.length) {
      const found = await prisma.permissionBundle.count({ where: { id: { in: ids } } });
      if (found !== ids.length) return { error: "إحدى مجموعات الصلاحيات لم تعد موجودة، أعد فتح النافذة" };
    }
    out.bundleIds = ids;
  }

  if (serviceNames !== undefined) {
    const names = [...new Set(serviceNames.map((n) => n.trim()).filter(Boolean))];
    if (names.length) {
      const known = await listServiceNames();
      const unknown = names.find((n) => !known.includes(n));
      if (unknown) return { error: `خدمة غير موجودة: ${unknown}` };
    }
    out.serviceNames = names;
  }

  return out;
}

/**
 * إضافة موظف ببياناته وصلاحياته ومجموعاته وخدماته في معاملةٍ واحدة.
 *
 * كانت الإضافة نموذجاً يرسل FormData بلا مجموعات ولا خدمات، فكان الموظف الجديد
 * يُفتح مرّةً ثانية للتعديل ليُمنح ما يلزمه.
 */
export async function createEmployee(input: EmployeeInput) {
  let session;
  try {
    session = await checkManageEmployeesAuth();
  } catch {
    return { error: "ليس لديك صلاحية لإدارة الموظفين" };
  }

  const name = (input.name || "").trim();
  const phone = (input.phone || "").trim();
  if (!name || !phone) {
    return { error: "يرجى تعبئة الحقول المطلوبة: الاسم ورقم الجوال" };
  }

  // Email login is optional — an account created without it still signs in
  // with phone + OTP. What is NOT allowed is half of it.
  const emailInput = input.email || "";
  const password = input.password || "";
  const pairProblem = validateCredentialPair(emailInput, password);
  if (pairProblem) return { error: pairProblem };
  const email = emailInput.trim() ? normalizeEmail(emailInput) : null;

  const days = input.annualLeaveDays ?? 21;
  if (!Number.isInteger(days) || days < 0 || days > 365) {
    return { error: "رصيد الإجازات يجب أن يكون بين 0 و365 يوماً" };
  }

  try {
    const phoneTaken = await prisma.employee.findUnique({ where: { phone }, select: { id: true } });
    if (phoneTaken) return { error: "رقم الجوال مسجل مسبقاً" };

    if (email) {
      const emailTaken = await prisma.employee.findUnique({ where: { email }, select: { id: true } });
      if (emailTaken) return { error: "البريد الإلكتروني مسجل مسبقاً" };
    }

    const role = await prisma.roleDefinition.findUnique({ where: { key: input.role }, select: { key: true } });
    if (!role) return { error: "المسمى الوظيفي المحدد غير صالح" };

    const adminRole = isAdmin(role.key);
    const checked = await checkAccess(
      adminRole ? undefined : input.bundleIds,
      adminRole ? undefined : input.serviceNames
    );
    if ("error" in checked) return { error: checked.error };

    const permissions = sanitizePermissions(input.permissions);
    const charityIds = adminRole ? [] : [...new Set(input.charityIds ?? [])];
    const hashedPassword = email ? await hashPassword(password) : null;

    const created = await prisma.$transaction(
      async (tx) => {
        const employee = await tx.employee.create({
          data: {
            name,
            phone,
            email,
            password: hashedPassword,
            annualLeaveDays: days,
            role: role.key,
            permissions,
            isActive: true,
            ...(charityIds.length > 0 && {
              assignedCharities: { create: charityIds.map((charityId) => ({ charityId })) },
            }),
          },
          select: { id: true },
        });
        if (checked.bundleIds?.length) {
          await tx.employeeBundle.createMany({
            data: checked.bundleIds.map((bundleId) => ({ employeeId: employee.id, bundleId })),
          });
        }
        if (checked.serviceNames?.length) {
          await tx.employeeServiceAccess.createMany({
            data: checked.serviceNames.map((serviceName) => ({ employeeId: employee.id, serviceName })),
          });
        }
        return employee;
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    if (permissions.length || checked.bundleIds?.length || checked.serviceNames?.length) {
      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session.id,
        actorName: session.name,
        action: "PERMISSION_CHANGE",
        targetType: "Employee",
        targetId: created.id,
        metadata: {
          targetName: name,
          created: true,
          after: {
            role: role.key,
            permissions,
            bundles: checked.bundleIds ?? [],
            services: checked.serviceNames ?? [],
          },
        },
      });
    }

    revalidatePath("/main/employees");
    return { success: `تمت إضافة ${name}` };
  } catch (error) {
    console.error("Error creating employee:", error);
    return { error: "حدث خطأ أثناء إضافة الموظف" };
  }
}

export async function toggleEmployeeStatus(id: string, currentStatus: boolean) {
  try {
    await checkManageEmployeesAuth();
  } catch {
    return { error: "ليس لديك صلاحية لإدارة الموظفين" };
  }

  try {
    await prisma.employee.update({
      where: { id },
      data: { isActive: !currentStatus },
    });
    revalidatePath("/main/employees");
    return { success: true };
  } catch (error) {
    return { error: "حدث خطأ" };
  }
}

/**
 * تعديل الموظف: بياناته وصلاحياته ومجموعاته وخدماته في معاملةٍ واحدة.
 *
 * كانت الخدمات تُحفظ بفعلٍ ثانٍ بعد نجاح هذا، فإن فشل الثاني بقي الموظف
 * نصف محفوظ ورأى المدير رسالة خطأ عن تعديلٍ وقع أغلبه.
 */
export async function updateEmployee(id: string, data: EmployeeInput) {
  let session;
  try {
    session = await checkManageEmployeesAuth();
  } catch {
    return { error: "ليس لديك صلاحية لإدارة الموظفين" };
  }

  if (!data.name || !data.phone || !data.role) {
    return { error: "يرجى تعبئة الحقول المطلوبة: الاسم، الجوال، ونوع الحساب" };
  }

  try {
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        phone: data.phone,
        id: { not: id },
      },
    });

    if (existingEmployee) {
      return { error: "رقم الجوال مسجل لموظف آخر" };
    }

    // What the account already holds decides whether half a pair is enough:
    // typing only a new password is fine when an address is already stored.
    const current = await prisma.employee.findUnique({
      where: { id },
      select: { email: true, password: true },
    });

    const emailProvided = data.email !== undefined;
    const wantsEmail = !!data.email?.trim();

    const pairProblem = validateCredentialPair(data.email, data.password, {
      hasExistingEmail: !!current?.email,
      hasExistingPassword: !!current?.password,
    });
    if (pairProblem) return { error: pairProblem };

    const email = wantsEmail ? normalizeEmail(data.email!) : null;

    if (email && email !== current?.email) {
      const takenBy = await prisma.employee.findFirst({
        where: { email, id: { not: id } },
      });
      if (takenBy) return { error: "البريد الإلكتروني مسجل لموظف آخر" };
    }

    const validRoles = await prisma.roleDefinition.findMany({ select: { key: true } });
    const isValidRole = validRoles.some(r => r.key === data.role);
    if (!isValidRole) {
      return { error: "المسمى الوظيفي المحدد غير صالح" };
    }

    const adminRole = isAdmin(data.role);
    const checked = await checkAccess(
      adminRole ? undefined : data.bundleIds,
      adminRole ? undefined : data.serviceNames
    );
    if ("error" in checked) return { error: checked.error };

    const beforeEmployee = await prisma.employee.findUnique({
      where: { id },
      select: {
        name: true,
        role: true,
        permissions: true,
        bundles: { select: { bundleId: true } },
        serviceAccess: { select: { serviceName: true } },
      },
    });

    const cleanPermissions = sanitizePermissions(data.permissions);

    const updateData: Prisma.EmployeeUncheckedUpdateInput = {
      name: data.name,
      phone: data.phone,
      role: data.role,
      permissions: cleanPermissions,
    };

    // Undefined means "leave it alone" — an older caller that does not know
    // about this field must not silently reset somebody's balance to 21.
    if (data.annualLeaveDays !== undefined) {
      const days = data.annualLeaveDays;
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        return { error: "رصيد الإجازات يجب أن يكون بين 0 و365 يوماً" };
      }
      updateData.annualLeaveDays = days;
    }

    if (emailProvided) {
      updateData.email = email;
      // Clearing the address retires the login, so the hash goes with it —
      // a password nothing can reach is dead weight in the table.
      if (!email) updateData.password = null;
    }

    if (data.password && data.password.trim() !== "") {
      updateData.password = await hashPassword(data.password.trim());
    }

    if (data.charityIds && data.role !== "ADMIN") {
      updateData.assignedCharities = {
        deleteMany: {},
        create: data.charityIds.map((charityId) => ({ charityId })),
      };
    } else if (data.role === "ADMIN") {
      updateData.assignedCharities = {
        deleteMany: {},
      };
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.employee.update({ where: { id }, data: updateData });
        if (checked.bundleIds !== undefined) {
          await tx.employeeBundle.deleteMany({ where: { employeeId: id } });
          if (checked.bundleIds.length) {
            await tx.employeeBundle.createMany({
              data: checked.bundleIds.map((bundleId) => ({ employeeId: id, bundleId })),
            });
          }
        }
        if (checked.serviceNames !== undefined) {
          await tx.employeeServiceAccess.deleteMany({ where: { employeeId: id } });
          if (checked.serviceNames.length) {
            await tx.employeeServiceAccess.createMany({
              data: checked.serviceNames.map((serviceName) => ({ employeeId: id, serviceName })),
            });
          }
        }
      },
      { timeout: 20_000, maxWait: 15_000 }
    );

    const sorted = (xs: string[]) => JSON.stringify([...xs].sort());
    const beforeBundles = beforeEmployee?.bundles.map((b) => b.bundleId) ?? [];
    const beforeServices = [...new Set(beforeEmployee?.serviceAccess.map((s) => s.serviceName) ?? [])];

    const roleChanged = !!beforeEmployee && beforeEmployee.role !== data.role;
    const permissionsChanged = !!beforeEmployee && sorted(beforeEmployee.permissions) !== sorted(cleanPermissions);
    const bundlesChanged = checked.bundleIds !== undefined && sorted(beforeBundles) !== sorted(checked.bundleIds);
    const servicesChanged = checked.serviceNames !== undefined && sorted(beforeServices) !== sorted(checked.serviceNames);

    if (roleChanged || permissionsChanged || bundlesChanged || servicesChanged) {
      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session.id,
        actorName: session.name,
        action: "PERMISSION_CHANGE",
        targetType: "Employee",
        targetId: id,
        metadata: {
          targetName: data.name,
          before: {
            role: beforeEmployee?.role,
            permissions: beforeEmployee?.permissions,
            bundles: beforeBundles,
            services: beforeServices,
          },
          after: {
            role: data.role,
            permissions: cleanPermissions,
            bundles: checked.bundleIds ?? beforeBundles,
            services: checked.serviceNames ?? beforeServices,
          },
        },
      });
    }

    revalidatePath("/main/employees");
    return { success: `تم حفظ تغييرات ${data.name}` };
  } catch (error) {
    console.error("Error updating employee:", error);
    return { error: "حدث خطأ أثناء تحديث بيانات الموظف" };
  }
}

export async function deleteEmployee(id: string) {
  let session;
  try {
    session = await getSession();
    if (!session) throw new Error("Not authenticated");
    if (!hasPermission(session.role, session.permissions || [], "delete_employees")) {
      return { error: "ليس لديك صلاحية لحذف الموظفين" };
    }
  } catch {
    return { error: "ليس لديك صلاحية لحذف الموظفين" };
  }

  try {
    const target = await prisma.employee.findUnique({ where: { id }, select: { name: true } });

    // Delete employee charities first due to relation
    await prisma.employeeCharity.deleteMany({
      where: { employeeId: id },
    });

    // Check if employee has tasks or achievements
    // Instead of failing, we might want to let Prisma handle referential integrity
    // or just try to delete the employee directly if cascade delete is configured.
    // Let's assume standard behavior.
    await prisma.employee.delete({
      where: { id },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "DELETE",
      targetType: "Employee",
      targetId: id,
      metadata: { targetName: target?.name },
    });

    revalidatePath("/main/employees");
    return { success: "تم حذف الموظف بنجاح" };
  } catch (error) {
    console.error("Error deleting employee:", error);
    return { error: "لا يمكن حذف الموظف، قد يكون مرتبطاً ببيانات أخرى" };
  }
}
