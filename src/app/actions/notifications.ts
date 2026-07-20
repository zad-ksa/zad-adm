"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function getUnreadNotifications() {
  try {
    const session = await getSession();
    if (!session) return { error: "غير مصرح" };

    const notifications = await prisma.appNotification.findMany({
      where: { employeeId: session.id, isRead: false },
      orderBy: { createdAt: "desc" },
      take: 20, // Limit to recent 20 unread
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
