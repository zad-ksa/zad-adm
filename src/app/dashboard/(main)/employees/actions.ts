"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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

  if (!name || !phone || !password) {
    return { error: "يرجى تعبئة الحقول المطلوبة: الاسم، الجوال، وكلمة المرور" };
  }

  try {
    const existingEmployee = await prisma.employee.findUnique({
      where: { phone },
    });

    if (existingEmployee) {
      return { error: "رقم الجوال مسجل مسبقاً" };
    }

    const hashedPassword = await hash(password, 10);

    const validRoles = ["EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT", "STRATEGY", "FINANCE", "ADMIN"];
    const dbRole = validRoles.includes(role) ? (role as any) : "STRATEGY";

    await prisma.employee.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: dbRole,
        permissions,
        isActive: true,
        ...(charityIds.length > 0 && dbRole !== "ADMIN" && dbRole !== "CHARITY_CLIENT" && {
          assignedCharities: {
            create: charityIds.map((charityId) => ({ charityId })),
          },
        }),
      },
    });

    revalidatePath("/dashboard/employees");
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
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (error) {
    return { error: "حدث خطأ" };
  }
}

export async function updateEmployeeCharities(
  employeeId: string,
  charityIds: string[]
) {
  try {
    await checkManageEmployeesAuth();
  } catch (err: any) {
    throw new Error("FORBIDDEN");
  }

  await prisma.$transaction([
    prisma.employeeCharity.deleteMany({ where: { employeeId } }),
    ...(charityIds.length > 0
      ? [prisma.employeeCharity.createMany({
          data: charityIds.map((charityId) => ({ employeeId, charityId })),
        })]
      : []),
  ]);

  revalidatePath("/dashboard/employees");
  return { success: true };
}

export async function updateEmployee(
  id: string,
  data: {
    name: string;
    phone: string;
    role: string;
    permissions: string[];
    password?: string;
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

    const updateData: any = {
      name: data.name,
      phone: data.phone,
      role: data.role as any,
      permissions: data.permissions,
    };

    if (data.password && data.password.trim() !== "") {
      updateData.password = await hash(data.password, 10);
    }

    await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/dashboard/employees");
    return { success: "تم تحديث بيانات الموظف وصلاحياته بنجاح" };
  } catch (error: any) {
    console.error("Error updating employee:", error);
    return { error: error.message || "حدث خطأ أثناء تحديث بيانات الموظف" };
  }
}
