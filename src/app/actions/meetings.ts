"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const TIER1 = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"];
const ALL_STAFF = [...TIER1, "GENERAL_MANAGER", "STRATEGY", "FINANCE", "GOVERNANCE"];

export async function getMeetings() {
  const session = await getSession();
  if (!session || !ALL_STAFF.includes(session.role)) throw new Error("غير مصرح");
  const isTier1 = TIER1.includes(session.role);
  return prisma.meeting.findMany({
    where: isTier1 ? {} : { isPrivate: false },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      charity: { select: { name: true } },
      meetingTasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    
    orderBy: { date: "desc" },
  });
}

export async function createMeeting(data: {
  title: string;
  meetingNumber?: number | null;
  date: string;
  location?: string;
  charityId?: string;
  rawNotes: string;
  formattedContent: string;
  summary?: string;
  attendees?: string;
  isPrivate: boolean;
}) {
  const session = await getSession();
  if (!session || !ALL_STAFF.includes(session.role)) throw new Error("غير مصرح");
  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      meetingNumber: data.meetingNumber ?? null,
      date: new Date(data.date),
      location: data.location || null,
      charityId: data.charityId || null,
      rawNotes: data.rawNotes,
      formattedContent: data.formattedContent,
      summary: data.summary || null,
      attendees: data.attendees || null,
      isPrivate: data.isPrivate,
      createdById: session.id,
    },
  });
  revalidatePath("/dashboard/meetings");
  return { success: true, id: meeting.id };
}

export async function updateMeeting(
  id: string,
  data: Partial<{
    title: string;
    formattedContent: string;
    summary: string | null;
    isPrivate: boolean;
    meetingNumber: number | null;
  }>
) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { createdBy: { select: { role: true } } },
  });
  if (!meeting) throw new Error("غير موجود");

  const isTier1 = TIER1.includes(session.role);
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);

  if (creatorIsTier1 && !isTier1) throw new Error("لا يمكنك تعديل محاضر الإدارة التنفيذية");
  if (meeting.createdById !== session.id && !isTier1) throw new Error("غير مصرح");

  await prisma.meeting.update({ where: { id }, data });
  revalidatePath("/dashboard/meetings");
  return { success: true };
}

export async function deleteMeeting(id: string) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { createdBy: { select: { role: true } } },
  });
  if (!meeting) throw new Error("غير موجود");

  const isTier1 = TIER1.includes(session.role);
  const creatorIsTier1 = TIER1.includes(meeting.createdBy.role);

  if (creatorIsTier1 && !isTier1) throw new Error("لا يمكنك حذف محاضر الإدارة التنفيذية");
  if (meeting.createdById !== session.id && !isTier1) throw new Error("غير مصرح");

  await prisma.meeting.delete({ where: { id } });
  revalidatePath("/dashboard/meetings");
  return { success: true };
}

// ── Meeting Tasks ──────────────────────────────────────────────────────────────

export async function upsertMeetingTasks(
  meetingId: string,
  tasks: { id?: string; title: string; assignedToId?: string | null; dueDays?: number | null; isDone?: boolean }[]
) {
  const session = await getSession();
  if (!session || !TIER1.includes(session.role)) throw new Error("غير مصرح");

  // حذف المهام المحذوفة (موجودة في DB لكن غير موجودة في القائمة الجديدة)
  const existingIds = tasks.filter(t => t.id).map(t => t.id!);
  await prisma.meetingTask.deleteMany({
    where: { meetingId, id: { notIn: existingIds } },
  });

  for (const t of tasks) {
    if (t.id) {
      await prisma.meetingTask.update({
        where: { id: t.id },
        data: {
          title: t.title,
          assignedToId: t.assignedToId || null,
          dueDays: t.dueDays ?? null,
          isDone: t.isDone ?? false,
        },
      });
    } else {
      await prisma.meetingTask.create({
        data: {
          meetingId,
          title: t.title,
          assignedToId: t.assignedToId || null,
          dueDays: t.dueDays ?? null,
          isDone: t.isDone ?? false,
        },
      });
    }
  }

  revalidatePath("/dashboard/meetings");
  return { success: true };
}

// تُستخدم فقط من الـ AI التلقائي — تُضيف مهام جديدة فقط إذا لم توجد مهام أصلاً، ولا تحذف شيئاً
export async function insertAiTasksIfEmpty(
  meetingId: string,
  tasks: { title: string }[]
) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const existing = await prisma.meetingTask.count({ where: { meetingId } });
  if (existing > 0) return { success: true, skipped: true };

  if (tasks.length === 0) return { success: true, skipped: true };

  await prisma.meetingTask.createMany({
    data: tasks.map(t => ({
      meetingId,
      title: t.title,
      assignedToId: null,
      dueDays: null,
      isDone: false,
    })),
  });

  revalidatePath("/dashboard/meetings");
  return { success: true, skipped: false };
}

export async function getTasksForMeeting(meetingId: string) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");
  return prisma.meetingTask.findMany({
    where: { meetingId },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function toggleMeetingTask(taskId: string, isDone: boolean) {
  const session = await getSession();
  if (!session || !TIER1.includes(session.role)) throw new Error("غير مصرح");
  await prisma.meetingTask.update({ where: { id: taskId }, data: { isDone } });
  revalidatePath("/dashboard/meetings");
  return { success: true };
}

export async function createTasksFromMeeting(
  tasks: { title: string; assignedToId: string }[]
) {
  const session = await getSession();
  if (!session || !TIER1.includes(session.role)) throw new Error("غير مصرح");
  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        assignedToId: t.assignedToId,
        createdById: session.id,
        isInternal: true,
        priority: 2,
      },
    });
  }
  revalidatePath("/dashboard/tasks");
  return { success: true };
}
