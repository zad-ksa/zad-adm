"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getUnreadNotifications() {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    const notifications = await prisma.appNotification.findMany({
      where: { employeeId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20, // Limit to recent 20

    });

    const count = await prisma.appNotification.count({
      where: { employeeId: session.id, isRead: false },
    });

    return { notifications, count };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء جلب الإشعارات" };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    await prisma.appNotification.updateMany({
      where: { id, employeeId: session.id },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء التحديث" };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    await prisma.appNotification.updateMany({
      where: { employeeId: session.id, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء التحديث" };
  }
}

export async function createAppNotification(employeeId: string, title: string, message: string, link?: string) {
  // Intended as an internal helper, but being exported from a "use server"
  // file makes it a public endpoint — without this it accepted anonymous
  // requests and could be used to push forged notifications to any employee.
  // Every internal caller (approvals, designRequests) is already authenticated,
  // so the guard is transparent to them.
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };
  } catch {
    return { error: "غير مصرح" };
  }

  try {
    await prisma.appNotification.create({
      data: {
        employeeId,
        title,
        message,
        link,
      },
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteNotification(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    await prisma.appNotification.deleteMany({
      where: { id, employeeId: session.id },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء الحذف" };
  }
}

export async function deleteAllNotifications() {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    await prisma.appNotification.deleteMany({
      where: { employeeId: session.id },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "حدث خطأ أثناء حذف الإشعارات" };
  }
}
