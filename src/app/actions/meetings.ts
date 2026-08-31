"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createAppNotification } from "./notifications";
import { isTier1, hasPermission } from "@/lib/permissions";

/**
 * Gate on the permission, not on a hand-written list of roles.
 *
 * This file used to keep its own ALL_STAFF array and check membership in it.
 * The sidebar and the page both gate the meetings screen on manage_meetings,
 * so granting that permission to an employee whose role was not in the array —
 * an ACCOUNTANT, say — showed them the tab, let them open the page, and then
 * threw from getMeetings, which took the whole page down with it. Three places
 * decided the same question by two different rules.
 *
 * The array also predates roles becoming data. Every role added since from the
 * roles screen (ACCOUNTANT, DESIGNER) fell outside it automatically, so this
 * would have recurred with each new one.
 */
function canManageMeetings(session: { role?: string | null; permissions?: string[] } | null) {
  if (!session) return false;
  return hasPermission(session.role ?? "", session.permissions || [], "manage_meetings");
}

/**
 * May this person change this meeting — its content or its tasks?
 *
 * The tasks used to demand isTier1 (the ADMIN role or developer_mode) with no
 * ownership escape at all, so four of the six people holding manage_meetings
 * were told «غير مصرح» on the minutes they had written themselves. Meanwhile
 * the meeting body used a different, ownership-based rule — two answers to one
 * question, and the tasks half of the screen refused what the other half
 * allowed.
 *
 * The rule kept is the ownership one, because it is the one that was written
 * deliberately: your own minutes are yours, an executive's minutes are theirs.
 * Tasks now follow the meeting they belong to.
 */
async function requireMeetingEditAccess(meetingId: string) {
  const session = await getSession();
  if (!canManageMeetings(session)) throw new Error("غير مصرح");

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { createdBy: { select: { role: true, permissions: true } } },
  });
  if (!meeting) throw new Error("غير موجود");

  const userIsTier1 = isTier1(session!.role, session!.permissions || []);
  const creatorIsTier1 = isTier1(meeting.createdBy.role, meeting.createdBy.permissions || []);

  if (creatorIsTier1 && !userIsTier1) throw new Error("لا يمكنك تعديل محاضر الإدارة التنفيذية");
  if (meeting.createdById !== session!.id && !userIsTier1) throw new Error("غير مصرح");

  return { session: session!, meeting };
}

export async function getMeetings() {
  const session = await getSession();
  if (!canManageMeetings(session)) throw new Error("غير مصرح");
  const userIsTier1 = isTier1(session.role, session.permissions || []);
  const meetings = await prisma.meeting.findMany({
    where: userIsTier1 ? {} : { isPrivate: false },
    include: {
      createdBy: { select: { id: true, name: true, role: true, permissions: true } },
      charity: { select: { name: true } },
      meetingTasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },

    orderBy: { date: "desc" },
  });

  return meetings.map(({ createdBy, ...meeting }) => ({
    ...meeting,
    createdBy: { id: createdBy.id, name: createdBy.name, role: createdBy.role },
    creatorIsTier1: isTier1(createdBy.role, createdBy.permissions || []),
  }));
}

export async function createMeeting(data: {
  title: string;
  date: string;
  location?: string;
  charityId?: string;
  meetingContext?: string;
  rawNotes: string;
  formattedContent: string;
  summary?: string;
  attendees?: string;
  isPrivate: boolean;
}) {
  const session = await getSession();
  if (!canManageMeetings(session)) throw new Error("غير مصرح");
  const meeting = await prisma.meeting.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      location: data.location || null,
      charityId: data.charityId || null,
      meetingContext: data.meetingContext || null,
      rawNotes: data.rawNotes,
      formattedContent: data.formattedContent,
      summary: data.summary || null,
      attendees: data.attendees || null,
      isPrivate: data.isPrivate,
      createdById: session.id,
    },
  });
  revalidatePath("/main/meetings");
  return { success: true, id: meeting.id };
}

export async function updateMeeting(
  id: string,
  data: Partial<{
    title: string;
    date: string;
    location: string | null;
    charityId: string | null;
    meetingContext: string | null;
    attendees: string | null;
    rawNotes: string;
    formattedContent: string;
    summary: string | null;
    isPrivate: boolean;
  }>
) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { createdBy: { select: { role: true, permissions: true } } },
  });
  if (!meeting) throw new Error("غير موجود");

  const userIsTier1 = isTier1(session.role, session.permissions || []);
  const creatorIsTier1 = isTier1(meeting.createdBy.role, meeting.createdBy.permissions || []);

  if (creatorIsTier1 && !userIsTier1) throw new Error("لا يمكنك تعديل محاضر الإدارة التنفيذية");
  if (meeting.createdById !== session.id && !userIsTier1) throw new Error("غير مصرح");

  const { date, ...rest } = data;
  await prisma.meeting.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });
  revalidatePath("/main/meetings");
  return { success: true };
}

export async function checkDateConflict(date: string, excludeId?: string) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");
  const d = new Date(date);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  const conflicts = await prisma.meeting.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, title: true },
  });
  return conflicts;
}

export async function deleteMeeting(id: string) {
  const session = await getSession();
  if (!session) throw new Error("غير مصرح");

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { createdBy: { select: { role: true, permissions: true } } },
  });
  if (!meeting) throw new Error("غير موجود");

  const userIsTier1 = isTier1(session.role, session.permissions || []);
  const creatorIsTier1 = isTier1(meeting.createdBy.role, meeting.createdBy.permissions || []);

  if (creatorIsTier1 && !userIsTier1) throw new Error("لا يمكنك حذف محاضر الإدارة التنفيذية");
  if (meeting.createdById !== session.id && !userIsTier1) throw new Error("غير مصرح");

  await prisma.meeting.delete({ where: { id } });
  revalidatePath("/main/meetings");
  return { success: true };
}

// ── Meeting Tasks ──────────────────────────────────────────────────────────────

export async function upsertMeetingTasks(
  meetingId: string,
  tasks: { id?: string; title: string; assignedToId?: string | null; dueDays?: number | null; isDone?: boolean }[]
) {
  const session = await getSession();
  await requireMeetingEditAccess(meetingId);

  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  const oldTasks = await prisma.meetingTask.findMany({ where: { meetingId } });

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

      if (t.assignedToId) {
        await prisma.task.upsert({
          where: { meetingTaskId: t.id },
          create: {
            meetingTaskId: t.id,
            title: t.title,
            assignedToId: t.assignedToId,
            createdById: session.id,
            isInternal: true,
            status: t.isDone ? "COMPLETED" : "NOT_STARTED",
            priority: 2,
            charityId: meeting?.charityId || null,
          },
          update: {
            title: t.title,
            assignedToId: t.assignedToId,
            status: t.isDone ? "COMPLETED" : "NOT_STARTED",
          }
        });
        
        const oldMt = oldTasks.find(o => o.id === t.id);
        if (oldMt?.assignedToId !== t.assignedToId && t.assignedToId !== session.id) {
          await createAppNotification(
            t.assignedToId,
            "مهمة محضر جديدة",
            `تم تكليفك بمهمة من المحضر: ${t.title}`,
            "/main/tasks"
          );
        }
      } else {
        await prisma.task.deleteMany({ where: { meetingTaskId: t.id } });
      }
    } else {
      const newMt = await prisma.meetingTask.create({
        data: {
          meetingId,
          title: t.title,
          assignedToId: t.assignedToId || null,
          dueDays: t.dueDays ?? null,
          isDone: t.isDone ?? false,
        },
      });

      if (t.assignedToId) {
        await prisma.task.create({
          data: {
            meetingTaskId: newMt.id,
            title: `[مهمة محضر] ${t.title}`,
            assignedToId: t.assignedToId,
            createdById: session.id,
            isInternal: true,
            status: t.isDone ? "COMPLETED" : "NOT_STARTED",
            priority: 2,
            charityId: meeting?.charityId || null,
          }
        });

        if (t.assignedToId !== session.id) {
          await createAppNotification(
            t.assignedToId,
            "مهمة محضر جديدة",
            `تم تكليفك بمهمة من المحضر: ${t.title}`,
            "/main/tasks"
          );
        }
      }
    }
  }

  revalidatePath("/main/meetings");
  revalidatePath("/main/tasks");
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

  revalidatePath("/main/meetings");
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
  // Ticking a task is an edit of its meeting, so it answers to the same rule
  // — which means finding the meeting the task belongs to first.
  const task = await prisma.meetingTask.findUnique({
    where: { id: taskId },
    select: { meetingId: true },
  });
  if (!task) throw new Error("غير موجود");
  await requireMeetingEditAccess(task.meetingId);
  await prisma.meetingTask.update({ where: { id: taskId }, data: { isDone } });
  
  await prisma.task.updateMany({
    where: { meetingTaskId: taskId },
    data: { status: isDone ? "COMPLETED" : "NOT_STARTED" }
  });

  revalidatePath("/main/meetings");
  revalidatePath("/main/tasks");
  return { success: true };
}

export async function createTasksFromMeeting(
  tasks: { title: string; assignedToId: string }[]
) {
  // Not tied to one meeting — it turns a list into ordinary internal tasks —
  // so it answers to the meetings permission itself rather than to the
  // per-meeting ownership rule.
  const session = await getSession();
  if (!canManageMeetings(session)) throw new Error("غير مصرح");
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
  revalidatePath("/main/tasks");
  return { success: true };
}
