"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission, isAdmin } from "@/lib/permissions";

// Utility for checking manage roles permission
function canManageRoles(session: any) {
  return session && (
    isAdmin(session.role) ||
    hasPermission(session.role, session.permissions || [], "manage_employees")
  );
}

// Type checking for inputs
export async function getRoles() {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");
  
  return prisma.roleDefinition.findMany({
    orderBy: { createdAt: "asc" }
  });
}

export async function createRole(data: { key: string; displayName: string; permissions: string[] }) {
  const session = await getSession();
  if (!canManageRoles(session)) {
    return { error: "غير مصرح لك بإضافة مسميات" };
  }

  if (!data.key || !data.displayName) {
    return { error: "المعرف والاسم مطلوبان" };
  }

  // Ensure key doesn't have spaces and is uppercase for consistency
  const cleanKey = data.key.trim().toUpperCase().replace(/\s+/g, '_');

  try {
    const existing = await prisma.roleDefinition.findUnique({
      where: { key: cleanKey }
    });

    if (existing) {
      return { error: "المعرف موجود مسبقاً" };
    }

    await prisma.roleDefinition.create({
      data: {
        key: cleanKey,
        displayName: data.displayName,
        permissions: data.permissions || [],
        isSystem: false, // Custom roles are never system by default
      }
    });

    revalidatePath("/main/employees/roles");
    return { success: "تمت إضافة المسمى بنجاح" };
  } catch (error: any) {
    console.error("Create role error:", error);
    return { error: "حدث خطأ أثناء الإضافة" };
  }
}

export async function updateRole(id: string, data: { displayName?: string; permissions?: string[] }) {
  const session = await getSession();
  if (!canManageRoles(session)) {
    return { error: "غير مصرح لك بالتعديل" };
  }

  try {
    const role = await prisma.roleDefinition.findUnique({ where: { id } });
    if (!role) return { error: "المسمى غير موجود" };

    // System roles can only update displayName (and maybe permissions depending on business logic)
    // For now, allow updating displayName and permissions for all roles
    await prisma.roleDefinition.update({
      where: { id },
      data: {
        displayName: data.displayName !== undefined ? data.displayName : undefined,
        permissions: data.permissions !== undefined ? data.permissions : undefined,
      }
    });

    revalidatePath("/main/employees/roles");
    return { success: "تم تحديث المسمى بنجاح" };
  } catch (error: any) {
    console.error("Update role error:", error);
    return { error: "حدث خطأ أثناء التحديث" };
  }
}

export async function syncRolePermissions(id: string) {
  const session = await getSession();
  if (!canManageRoles(session)) {
    return { error: "غير مصرح لك بالمزامنة" };
  }

  try {
    const role = await prisma.roleDefinition.findUnique({ where: { id } });
    if (!role) return { error: "المسمى غير موجود" };

    const result = await prisma.employee.updateMany({
      where: { role: role.key },
      data: { permissions: role.permissions },
    });

    revalidatePath("/main/employees");
    revalidatePath("/main/employees/roles");
    return { success: `تمت مزامنة الصلاحيات مع ${result.count} موظف` };
  } catch (error: any) {
    console.error("Sync role permissions error:", error);
    return { error: "حدث خطأ أثناء المزامنة" };
  }
}

export async function deleteRole(id: string) {
  const session = await getSession();
  if (!canManageRoles(session)) {
    return { error: "غير مصرح لك بالحذف" };
  }

  try {
    const role = await prisma.roleDefinition.findUnique({ where: { id } });
    if (!role) return { error: "المسمى غير موجود" };

    if (role.isSystem) {
      return { error: "لا يمكن حذف الأدوار الأساسية للنظام" };
    }

    // Check if any employees are using this role
    const employeesCount = await prisma.employee.count({
      where: { role: role.key }
    });

    if (employeesCount > 0) {
      return { error: `لا يمكن الحذف، يوجد ${employeesCount} موظف مرتبط بهذا المسمى` };
    }

    await prisma.roleDefinition.delete({ where: { id } });
    revalidatePath("/main/employees/roles");
    return { success: "تم حذف المسمى بنجاح" };
  } catch (error: any) {
    console.error("Delete role error:", error);
    return { error: "حدث خطأ أثناء الحذف" };
  }
}
