"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper to verify user session and roles
async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || !session.id) {
    throw new Error("غير مصرح لك بالوصول");
  }
  return session;
}

// 1. Create a new task
export async function createTaskAction(data: {
  title: string;
  assignedToId: string;
  charityId?: string;
  isInternal: boolean;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    // Check role permissions:
    // Only ADMIN and EXECUTIVE_DIRECTOR can assign tasks to other employees.
    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    const finalAssignedToId = isDirectorOrAdmin ? data.assignedToId : user.id;

    let charityName = null;
    if (!data.isInternal && data.charityId) {
      const charity = await prisma.charity.findUnique({
        where: { id: data.charityId },
      });
      if (charity) {
        charityName = charity.name;
      }
    }

    const task = await prisma.task.create({
      data: {
        title: data.title,
        assignedToId: finalAssignedToId,
        createdById: user.id,
        charityId: data.isInternal ? null : (data.charityId || null),
        charityName: data.isInternal ? null : charityName,
        isInternal: data.isInternal,
        isCompleted: false,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة المهمة" };
  }
}

// 2. Delete a task
export async function deleteTaskAction(taskId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    // Standard employee can only delete tasks they created for themselves
    const isOwner = task.createdById === user.id && task.assignedToId === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بحذف هذه المهمة" };
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف المهمة" };
  }
}

// 3. Reassign/Move task to another employee (Executive Director / Admin only)
export async function reassignTaskAction(taskId: string, newEmployeeId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بنقل المهام" };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedToId: newEmployeeId,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء نقل المهمة" };
  }
}

// 4. Complete/Undo Completion of a task
export async function toggleTaskCompletionAction(taskId: string, isCompleted: boolean) {
  try {
    const user = await getAuthenticatedUser();
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    const isAssigned = task.assignedToId === user.id;

    if (!isDirectorOrAdmin && !isAssigned) {
      return { error: "غير مصرح لك بتعديل هذه المهمة" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تحديث حالة المهمة" };
  }
}

// 5. Create a direct achievement
export async function createAchievementAction(title: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const achievement = await prisma.achievement.create({
      data: {
        title,
        employeeId: user.id,
        createdById: user.id,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true, achievement };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة المنجز" };
  }
}

// 6. Delete a direct achievement
export async function deleteAchievementAction(achievementId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });

    if (!achievement) {
      return { error: "المنجز غير موجود" };
    }

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    const isOwner = achievement.createdById === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بحذف هذا المنجز" };
    }

    await prisma.achievement.delete({
      where: { id: achievementId },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف المنجز" };
  }
}

// 7. Update task title
export async function updateTaskTitleAction(taskId: string, newTitle: string) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!newTitle || !newTitle.trim()) {
      return { error: "يرجى كتابة مسمى المهمة" };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR"].includes(user.role);
    // Standard employee can only edit tasks they created for themselves
    const isOwner = task.createdById === user.id && task.assignedToId === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بتعديل مسمى هذه المهمة" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: newTitle.trim(),
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل مسمى المهمة" };
  }
}

export async function createNewsAction(data: {
  charityName: string;
  category: string;
  title: string;
  description?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    const isAuthorized = ["ADMIN", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
    if (!isAuthorized) {
      throw new Error("غير مصرح لك بنشر الأخبار أو الإنجازات");
    }

    const { charityName, category, title, description } = data;

    if (!charityName || !charityName.trim()) {
      return { error: "يرجى تحديد الجمعية" };
    }

    if (!category || !category.trim()) {
      return { error: "يرجى تحديد القسم" };
    }

    if (!title || !title.trim()) {
      return { error: "يرجى إدخال العنوان" };
    }

    const newsItem = await prisma.news.create({
      data: {
        charityName: charityName.trim(),
        category: category.trim(),
        title: title.trim(),
        description: description ? description.trim() : null,
      },
    });

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard");
    
    return { success: true, newsItem };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة الخبر/الإنجاز" };
  }
}
