"use server";

import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function addEmployee(prevState: any, formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;
  
  // Extract permissions
  const permissions: string[] = [];
  formData.forEach((value, key) => {
    if (key.startsWith("permission_") && value === "on") {
      permissions.push(key.replace("permission_", ""));
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
