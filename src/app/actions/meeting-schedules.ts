"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMeetingSchedule(data: {
  title: string;
  duration: number;
  availableDays: any;
  slug: string;
}) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    const existingSlug = await prisma.meetingSchedule.findUnique({ where: { slug: data.slug } });
    if (existingSlug) return { error: "هذا الرابط مستخدم بالفعل" };

    const schedule = await prisma.meetingSchedule.create({
      data: {
        title: data.title,
        slug: data.slug,
        duration: data.duration,
        availableDays: data.availableDays,
        createdById: session.id,
      }
    });

    revalidatePath("/main/charity-meetings");
    return { success: true, schedule };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getMeetingSchedules() {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك", data: [] };

    const schedules = await prisma.meetingSchedule.findMany({
      where: { createdById: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        bookings: true
      }
    });

    return { success: true, data: schedules };
  } catch (error: any) {
    return { error: error.message, data: [] };
  }
}

export async function getMeetingScheduleBySlug(slug: string) {
  try {
    const schedule = await prisma.meetingSchedule.findUnique({
      where: { slug, isActive: true },
      include: {
        bookings: true
      }
    });
    if (!schedule) return { error: "لم يتم العثور على هذا الجدول" };
    
    return { success: true, data: schedule };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function bookMeetingSlot(data: {
  scheduleId: string;
  charityName: string;
  date: string;
  startTime: string;
}) {
  try {
    const booking = await prisma.meetingBooking.create({
      data: {
        scheduleId: data.scheduleId,
        charityName: data.charityName,
        date: data.date,
        startTime: data.startTime,
      }
    });

    // We don't have the slug directly, so we need to get it to revalidate
    const schedule = await prisma.meetingSchedule.findUnique({ where: { id: data.scheduleId } });
    if (schedule) {
      revalidatePath(`/book-meeting/${schedule.slug}`);
    }
    revalidatePath("/main/charity-meetings");

    return { success: true, booking };
  } catch (error: any) {
    if (error.code === 'P2002') return { error: "عذراً، تم حجز هذا الموعد للتو" };
    return { error: error.message };
  }
}

export async function toggleMeetingScheduleActive(id: string, isActive: boolean) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    await prisma.meetingSchedule.update({
      where: { id, createdById: session.id },
      data: { isActive }
    });

    revalidatePath("/main/charity-meetings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMeetingSchedule(id: string) {
  try {
    const session = await getSession();
    if (!session || !session.id) return { error: "غير مصرح لك" };

    await prisma.meetingSchedule.delete({
      where: { id, createdById: session.id },
    });

    revalidatePath("/main/charity-meetings");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
