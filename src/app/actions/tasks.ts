"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission, isAdmin } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { createAppNotification } from "./notifications";
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

/**
 * How many archived rows one "load more" brings in, per table.
 *
 * The archive view merges completed tasks with standalone achievements and
 * sorts the result by date, so a page is not exactly ARCHIVE_PAGE_SIZE items —
 * it is that many from each table. That is why the UI offers "load more"
 * rather than numbered pages: with an append-only list the merge stays correct
 * no matter how the two tables interleave, which numbered pages over a merged
 * ordering could not guarantee without a shared cursor.
 */
const ARCHIVE_PAGE_SIZE = 20;

const TASK_INCLUDE = { updates: { orderBy: { createdAt: "asc" as const } } };
const PERMANENT_INCLUDE = { assignedTo: { select: { id: true, name: true, avatarUrl: true } } };

/**
 * Everything the tasks page shows for one employee — or for everybody, when
 * `employeeId` is "all".
 *
 * The page used to load every task, achievement and permanent task that had
 * ever been created, then throw most of it away in the browser: the view is
 * filtered by employee client-side and opens on the signed-in user, so a
 * director was shipped 146 tasks to look at their own dozen. Filtering here
 * instead is both smaller and the only way pagination can be correct — a limit
 * applied before a client-side filter truncates the wrong rows.
 *
 * Active tasks and permanent tasks are returned in full and deliberately not
 * paginated. They are the working set: bounded in practice because they leave
 * it by being completed, and the header counters are only right if all of them
 * are present. What grows without limit is the archive, and that is what pages.
 */
export async function getTasksForEmployee(employeeId: string, archivePage = 1) {
  const user = await getAuthenticatedUser();

  const canViewAll = hasPermission(user.role, user.permissions || [], "view_all_tasks");

  // Without view_all_tasks the only readable scope is your own, whatever the
  // client asks for. This is the authorization boundary for this action.
  const scope = canViewAll ? employeeId : user.id;
  const taskWhere = scope === "all" ? {} : { assignedToId: scope };
  const achievementWhere = scope === "all" ? {} : { employeeId: scope };

  const skip = (archivePage - 1) * ARCHIVE_PAGE_SIZE;
  // One extra row per table answers "is there another page?" without a count().
  const take = ARCHIVE_PAGE_SIZE + 1;

  const [activeTasks, permanentTasks, completedPlusOne, achievementsPlusOne] = await Promise.all([
    prisma.task.findMany({
      where: { ...taskWhere, isCompleted: false },
      orderBy: { createdAt: "desc" },
      include: TASK_INCLUDE,
    }),
    prisma.permanentTask.findMany({
      where: taskWhere,
      orderBy: { createdAt: "desc" },
      include: PERMANENT_INCLUDE,
    }),
    prisma.task.findMany({
      where: { ...taskWhere, isCompleted: true },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      include: TASK_INCLUDE,
    }),
    prisma.achievement.findMany({
      where: achievementWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const completedTasks = completedPlusOne.slice(0, ARCHIVE_PAGE_SIZE);
  const achievements = achievementsPlusOne.slice(0, ARCHIVE_PAGE_SIZE);

  return {
    activeTasks,
    permanentTasks,
    completedTasks,
    achievements,
    archivePage,
    archiveHasMore:
      completedPlusOne.length > ARCHIVE_PAGE_SIZE || achievementsPlusOne.length > ARCHIVE_PAGE_SIZE,
  };
}

// 1. Create a new task
export async function createTaskAction(data: {
  title: string;
  assignedToId: string;
  charityId?: string;
  isInternal: boolean;
  priority?: number;
  /** Optional image describing the task, uploaded before this call. */
  attachmentUrl?: string;
  attachmentPublicId?: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    // Check role permissions:
    // Only ADMIN, EXECUTIVE_DIRECTOR and ADMINISTRATIVE_SECRETARIAT can assign tasks to other employees.
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
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
        attachmentUrl: data.attachmentUrl || null,
        attachmentPublicId: data.attachmentPublicId || null,
        isCompleted: false,
        priority: data.priority ?? 3,
      },
    });

    if (finalAssignedToId !== user.id) {
      await createAppNotification(
        finalAssignedToId,
        "مهمة جديدة",
        `تم إسناد مهمة جديدة لك: ${data.title}`,
        "/main/tasks"
      );
    }

    revalidatePath("/main/tasks");
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

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
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

    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف المهمة" };
  }
}

// 3. Reassign/Move task to another employee (Executive Director / Admin only)
export async function reassignTaskAction(taskId: string, newEmployeeId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بنقل المهام" };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة غير موجودة" };
    }

    let logUpdate = null;
    if (task.assignedToId !== newEmployeeId) {
      const [oldEmp, newEmp] = await Promise.all([
        prisma.employee.findUnique({ where: { id: task.assignedToId }, select: { name: true } }),
        prisma.employee.findUnique({ where: { id: newEmployeeId }, select: { name: true } }),
      ]);
      logUpdate = await prisma.taskUpdate.create({
        data: {
          taskId,
          authorId: user.id,
          content: `↔ تم نقل المهمة من "${oldEmp?.name || "غير معروف"}" إلى "${newEmp?.name || "غير معروف"}"`,
        },
      });
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedToId: newEmployeeId,
      },
    });

    if (newEmployeeId !== user.id) {
      await createAppNotification(
        newEmployeeId,
        "إسناد مهمة",
        `تم تحويل مهمة إليك: ${task.title}`,
        "/main/tasks"
      );
    }

    revalidatePath("/main/tasks");
    return { success: true, update: logUpdate };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء نقل المهمة" };
  }
}

// 4. Complete/Undo Completion of a task
export async function toggleTaskCompletionAction(
  taskId: string, 
  isCompleted: boolean,
  proofUrl?: string,
  proofPublicId?: string,
  completionNote?: string
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
        completionNote: isCompleted ? completionNote || null : null,
        status: isCompleted ? "COMPLETED" : "IN_PROGRESS",
      },
    });

    if ((task as any).meetingTaskId) {
      try {
        await prisma.meetingTask.update({
          where: { id: (task as any).meetingTaskId },
          data: { isDone: isCompleted },
        });
      } catch (e) {}
    }

    revalidatePath("/main/tasks");
    revalidatePath("/main/meetings");
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

    revalidatePath("/main/tasks");
    revalidatePath("/main/news");
    revalidatePath("/main");
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

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
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

    revalidatePath("/main/tasks");
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

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
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

    revalidatePath("/main/tasks");
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

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
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

    revalidatePath("/main/tasks");
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

    const isAuthorized = isAdmin(user.role) || hasPermission(user.role, user.permissions || [], "manage_news");
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

    revalidatePath("/main/tasks");
    revalidatePath("/main/news");
    revalidatePath("/main");
    
    return { success: true, newsItem };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة الخبر/الإنجاز" };
  }
}

export async function deleteNewsAction(newsId: string) {
  try {
    const user = await getAuthenticatedUser();

    const isAuthorized = isAdmin(user.role) || hasPermission(user.role, user.permissions || [], "manage_news");
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

    revalidatePath("/main/tasks");
    revalidatePath("/main/news");
    revalidatePath("/main");
    
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
        isCompleted: status === "COMPLETED",
      },
    });

    if ((task as any).meetingTaskId) {
      try {
        await prisma.meetingTask.update({
          where: { id: (task as any).meetingTaskId },
          data: { isDone: status === "COMPLETED" },
        });
      } catch (e) {}
    }

    revalidatePath("/main/tasks");
    revalidatePath("/main/meetings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل حالة المهمة" };
  }
}

// 10. Update task charity
export async function updateTaskCharityAction(taskId: string, charityId: string | undefined, charityName: string | null, isInternal: boolean) {
  try {
    const user = await getAuthenticatedUser();

    if (!isAdmin(user.role) && !hasPermission(user.role, user.permissions || [], "view_all_tasks")) {
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

    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل جمعية المهمة" };
  }
}

// Add a progress update to a task
export async function addTaskUpdateAction(taskId: string, content: string) {
  try {
    const user = await getAuthenticatedUser();

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { error: "المهمة غير موجودة" };

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin && task.assignedToId !== user.id) {
      return { error: "غير مصرح لك بإضافة تحديث لهذه المهمة" };
    }

    const update = await prisma.taskUpdate.create({
      data: { taskId, authorId: user.id, content: content.trim() },
    });

    revalidatePath("/main/tasks");
    return { success: true, update };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة التحديث" };
  }
}

// Delete a task update
export async function deleteTaskUpdateAction(updateId: string) {
  try {
    const user = await getAuthenticatedUser();
    const update = await prisma.taskUpdate.findUnique({ where: { id: updateId } });
    if (!update) return { error: "التحديث غير موجود" };

    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin && update.authorId !== user.id) {
      return { error: "غير مصرح لك بحذف هذا التحديث" };
    }

    await prisma.taskUpdate.delete({ where: { id: updateId } });
    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف التحديث" };
  }
}

// ----------------------------------------------------------------------------------
// Permanent Tasks Actions
// ----------------------------------------------------------------------------------

export async function createPermanentTaskAction(data: {
  title: string;
  description?: string;
  recurrenceRate: string;
  assignedToId: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    
    // Check role permissions:
    // Only those who can manage tasks (Admin, Executive Director, Admin Sec) can create permanent tasks
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بإضافة مهام وظيفية" };
    }

    const task = await prisma.permanentTask.create({
      data: {
        title: data.title,
        description: data.description || null,
        recurrenceRate: data.recurrenceRate,
        assignedToId: data.assignedToId,
        createdById: user.id,
      },
    });

    if (data.assignedToId !== user.id) {
      await createAppNotification(
        data.assignedToId,
        "مهمة وظيفية جديدة",
        `تم إسناد مهمة وظيفية جديدة لك: ${data.title}`,
        "/main/tasks"
      );
    }

    revalidatePath("/main/tasks");
    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء إضافة المهمة الوظيفية" };
  }
}

export async function updatePermanentTaskAction(
  taskId: string,
  data: {
    title: string;
    description?: string;
    recurrenceRate: string;
  }
) {
  try {
    const user = await getAuthenticatedUser();
    
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بتعديل المهام الوظيفية" };
    }

    const task = await prisma.permanentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة الوظيفية غير موجودة" };
    }

    await prisma.permanentTask.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description || null,
        recurrenceRate: data.recurrenceRate,
      },
    });

    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء تعديل المهمة الوظيفية" };
  }
}

export async function deletePermanentTaskAction(taskId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بحذف المهام الوظيفية" };
    }

    const task = await prisma.permanentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة الوظيفية غير موجودة" };
    }

    await prisma.permanentTask.delete({
      where: { id: taskId },
    });

    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف المهمة الوظيفية" };
  }
}

export async function reassignPermanentTaskAction(taskId: string, newEmployeeId: string) {
  try {
    const user = await getAuthenticatedUser();
    
    const isDirectorOrAdmin = hasPermission(user.role, user.permissions || [], "view_all_tasks");
    if (!isDirectorOrAdmin) {
      return { error: "غير مصرح لك بنقل المهام الوظيفية" };
    }

    const task = await prisma.permanentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { error: "المهمة الوظيفية غير موجودة" };
    }

    await prisma.permanentTask.update({
      where: { id: taskId },
      data: {
        assignedToId: newEmployeeId,
      },
    });

    if (newEmployeeId !== user.id) {
      await createAppNotification(
        newEmployeeId,
        "إسناد مهمة وظيفية",
        `تم تحويل مهمة وظيفية إليك: ${task.title}`,
        "/main/tasks"
      );
    }

    revalidatePath("/main/tasks");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء نقل المهمة الوظيفية" };
  }
}
