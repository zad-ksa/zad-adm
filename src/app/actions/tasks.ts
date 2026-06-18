"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
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
  priority?: number;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    // Check role permissions:
    // Only ADMIN, EXECUTIVE_DIRECTOR and ADMINISTRATIVE_SECRETARIAT can assign tasks to other employees.
    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
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
        priority: data.priority ?? 3,
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

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
    // Standard employee can only delete tasks they created for themselves
    const isOwner = task.createdById === user.id && task.assignedToId === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بحذف هذه المهمة" };
    }

    if (task.proofPublicId) {
      try {
        await cloudinary.uploader.destroy(task.proofPublicId);
      } catch (err) {
        console.error("Failed to delete image from Cloudinary", err);
      }
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
    
    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
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
export async function toggleTaskCompletionAction(
  taskId: string, 
  isCompleted: boolean,
  proofUrl?: string,
  proofPublicId?: string
) {
  try {
    const user = await getAuthenticatedUser();
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isAdmin = user.role === "ADMIN";
    const isAssigned = task.assignedToId === user.id;

    if (!isAdmin && !isAssigned) {
      return { error: "إتمام المهام خاص بالموظف الذي أسندت إليه المهمة أو مدير النظام فقط" };
    }

    if (!isCompleted && task.proofPublicId) {
      try {
        await cloudinary.uploader.destroy(task.proofPublicId);
      } catch (e) {
        console.error("Failed to delete proof from Cloudinary during undo", e);
      }
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        proofUrl: isCompleted ? proofUrl || null : null,
        proofPublicId: isCompleted ? proofPublicId || null : null,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تحديث حالة المهمة" };
  }
}

// 5. Create a direct achievement
export async function createAchievementAction(data: {
  title: string;
  charityId?: string;
  isInternal: boolean;
  proofUrl?: string;
  proofPublicId?: string;
  date?: string;
  category: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    let charityName = null;
    if (!data.isInternal && data.charityId) {
      const charity = await prisma.charity.findUnique({
        where: { id: data.charityId },
      });
      if (charity) {
        charityName = charity.name;
      }
    }

    const targetDate = data.date ? new Date(data.date) : new Date();

    const achievement = await prisma.achievement.create({
      data: {
        title: data.title,
        employeeId: user.id,
        createdById: user.id,
        charityId: data.isInternal ? null : (data.charityId || null),
        charityName: data.isInternal ? null : charityName,
        isInternal: data.isInternal,
        proofUrl: data.proofUrl || null,
        proofPublicId: data.proofPublicId || null,
        date: targetDate,
      },
    });

    // Automatically publish to News
    await prisma.news.create({
      data: {
        charityName: data.isInternal ? "إدارة زاد" : (charityName || "غير محدد"),
        category: data.category,
        title: data.title,
        description: "تم تسجيل هذا كإنجاز مباشر",
        date: targetDate,
      },
    });

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard");
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

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
    const isOwner = achievement.createdById === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بحذف هذا المنجز" };
    }

    if (achievement.proofPublicId) {
      try {
        await cloudinary.uploader.destroy(achievement.proofPublicId);
      } catch (err) {
        console.error("Failed to delete image from Cloudinary", err);
      }
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

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
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

// 8. Update task priority
export async function updateTaskPriorityAction(taskId: string, priority: number) {
  try {
    const user = await getAuthenticatedUser();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
    const isOwner = task.createdById === user.id && task.assignedToId === user.id;

    if (!isDirectorOrAdmin && !isOwner) {
      return { error: "غير مصرح لك بتعديل أولوية هذه المهمة" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        priority,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل أولوية المهمة" };
  }
}

export async function createNewsAction(data: {
  charityName: string;
  category: string;
  title: string;
  description?: string;
  date?: string;
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
        date: data.date ? new Date(data.date) : new Date(),
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

export async function deleteNewsAction(newsId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const isAuthorized = ["ADMIN", "ADMINISTRATIVE_SECRETARIAT"].includes(user.role);
    if (!isAuthorized) {
      throw new Error("غير مصرح لك بحذف الأخبار أو الإنجازات");
    }

    const newsItem = await prisma.news.findUnique({
      where: { id: newsId },
    });

    if (!newsItem) {
      return { error: "الخبر غير موجود" };
    }

    await prisma.news.delete({
      where: { id: newsId },
    });

    revalidatePath("/dashboard/tasks");
    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard");
    
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف الخبر" };
  }
}

// 9. Update task status
export async function updateTaskStatusAction(taskId: string, status: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    const isAdmin = user.role === "ADMIN";
    const isAssigned = task.assignedToId === user.id;

    if (!isAdmin && !isAssigned) {
      return { error: "تغيير حالة المهمة خاص بالموظف الذي أسندت إليه المهمة أو مدير النظام فقط" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل حالة المهمة" };
  }
}

// 10. Update task charity
export async function updateTaskCharityAction(taskId: string, charityId: string | undefined, charityName: string | null, isInternal: boolean) {
  try {
    const user = await getAuthenticatedUser();
    
    if (user.role !== "ADMIN" && user.role !== "EXECUTIVE_DIRECTOR") {
      return { error: "غير مصرح لك بتغيير جمعية المهمة" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        charityId,
        charityName,
        isInternal,
      },
    });

    revalidatePath("/dashboard/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل جمعية المهمة" };
  }
}
