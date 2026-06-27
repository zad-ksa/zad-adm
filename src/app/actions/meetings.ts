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
    },
    orderBy: { date: "desc" },
  });
}

export async function createMeeting(data: {
  title: string;
  date: string;
  location?: string;
  charityId?: string;
  rawNotes: string;
  formattedContent: string;
  attendees?: string;
  isPrivate: boolean;
}) {
  const session = await getSession();
  if (!session || !ALL_STAFF.includes(session.role)) throw new Error("غير مصرح");
  await prisma.meeting.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      location: data.location || null,
      charityId: data.charityId || null,
      rawNotes: data.rawNotes,
      formattedContent: data.formattedContent,
      attendees: data.attendees || null,
      isPrivate: data.isPrivate,
      createdById: session.id,
    },
  });
  revalidatePath("/dashboard/meetings");
  return { success: true };
}

export async function updateMeeting(
  id: string,
  data: Partial<{ title: string; formattedContent: string; isPrivate: boolean }>
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
