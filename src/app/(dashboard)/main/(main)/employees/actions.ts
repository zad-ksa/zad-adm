"use server";

import { prisma } from "@/lib/db";
import { hashPassword, normalizeEmail, validateCredentialPair } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/auditLog";

async function checkManageEmployeesAuth() {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  if (!hasPermission(session.role, session.permissions || [], "manage_employees")) {
    throw new Error("FORBIDDEN");
  }
}

export async function addEmployee(prevState: any, formData: FormData) {
  try {
    await checkManageEmployeesAuth();
  } catch (err: any) {
    return { error: "ليس لديك صلاحية لإدارة الموظفين" };
  }

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const emailInput = (formData.get("email") as string) || "";
  const role = formData.get("role") as string;
  
  // Extract permissions
  const permissions: string[] = [];
  const charityIds: string[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("permission_") && value === "on") {
      permissions.push(key.replace("permission_", ""));
    } else if (key.startsWith("charity_") && value === "on") {
      charityIds.push(key.replace("charity_", ""));
    }
  });

  if (!name || !phone) {
    return { error: "يرجى تعبئة الحقول المطلوبة: الاسم ورقم الجوال" };
  }

  // Email login is optional — an account created without it still signs in
  // with phone + OTP. What is NOT allowed is half of it: an address with no
  // password opens nothing, and a password with no address cannot be reached,
  // yet either one would leave its owner believing email login was set up.
  const pairProblem = validateCredentialPair(emailInput, password);
  if (pairProblem) return { error: pairProblem };

  const email = emailInput.trim() ? normalizeEmail(emailInput) : null;

  try {
    const existingEmployee = await prisma.employee.findUnique({
      where: { phone },
    });

    if (existingEmployee) {
      return { error: "رقم الجوال مسجل مسبقاً" };
    }

    if (email) {
      const existingEmail = await prisma.employee.findUnique({ where: { email } });
      if (existingEmail) {
        return { error: "البريد الإلكتروني مسجل مسبقاً" };
      }
    }

    const hashedPassword = email ? await hashPassword(password) : null;

    // Validate role against RoleDefinition
    const validRoles = await prisma.roleDefinition.findMany({ select: { key: true } });
    const isValidRole = validRoles.some(r => r.key === role);
    const dbRole = isValidRole ? role : "STRATEGY";

    await prisma.employee.create({
      data: {
        name,
        phone,
        email,
        password: hashedPassword,
        role: dbRole,
        permissions,
        isActive: true,
        ...(charityIds.length > 0 && dbRole !== "ADMIN" && {
          assignedCharities: {
            create: charityIds.map((charityId) => ({ charityId })),
          },
        }),
      },
    });

    revalidatePath("/main/employees");
    return { success: "تمت إضافة الموظف بنجاح" };
  } catch (error) {
    return { error: "حدث خطأ أثناء إضافة الموظف" };
  }
}

export async function toggleEmployeeStatus(id: string, currentStatus: boolean) {
  try {
    await checkManageEmployeesAuth();
  } catch (err: any) {
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



export async function updateEmployee(
  id: string,
  data: {
    name: string;
    phone: string;
    role: string;
    permissions: string[];
    email?: string | null;
    password?: string;
    charityIds?: string[];
  }
) {
  try {
    await checkManageEmployeesAuth();
  } catch (err: any) {
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

    const beforeEmployee = await prisma.employee.findUnique({
      where: { id },
      select: { name: true, role: true, permissions: true },
    });

    const updateData: any = {
      name: data.name,
      phone: data.phone,
      role: data.role as any,
      permissions: data.permissions,
    };

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

    await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    const roleChanged = beforeEmployee && beforeEmployee.role !== data.role;
    const permissionsChanged =
      beforeEmployee &&
      JSON.stringify([...beforeEmployee.permissions].sort()) !== JSON.stringify([...data.permissions].sort());

    if (roleChanged || permissionsChanged) {
      const session = await getSession();
      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session?.id,
        actorName: session?.name,
        action: "PERMISSION_CHANGE",
        targetType: "Employee",
        targetId: id,
        metadata: {
          targetName: data.name,
          before: { role: beforeEmployee?.role, permissions: beforeEmployee?.permissions },
          after: { role: data.role, permissions: data.permissions },
        },
      });
    }

    revalidatePath("/main/employees");
    return { success: "تم تحديث بيانات الموظف وصلاحياته بنجاح" };
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return { error: error.message || "حدث خطأ أثناء تحديث بيانات الموظف" };
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
  } catch (err: any) {
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
  } catch (error: any) {
    console.error("Error deleting employee:", error);
    return { error: "لا يمكن حذف الموظف، قد يكون مرتبطاً ببيانات أخرى" };
  }
}
