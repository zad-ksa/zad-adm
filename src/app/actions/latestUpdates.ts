"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCivilDate } from "@/lib/businessDays";
import { parseCivilDateInput, toCivilDateInput } from "@/lib/latestUpdates";
import { canAddIn, getLatestUpdatesAccess } from "@/lib/latestUpdatesAccess";

/**
 * أفعال «آخر المستجدات». كلٌّ منها يعيد فحص الصلاحية في الخادم: زرّ «+» المخفي
 * في الواجهة ليس منعاً، والفعل يُنادى مباشرةً بلا واجهة.
 */

const MAX_CONTENT = 2000;

export type LatestUpdateEntry = {
  id: string;
  content: string;
  /** "YYYY-MM-DD" */
  eventDate: string;
  /** ISO */
  createdAt: string;
  createdByName: string | null;
  updatedByName: string | null;
  edited: boolean;
};

type Result<T = undefined> = { success: true; data?: T } | { success: false; error: string };

function fail(error: string) {
  return { success: false as const, error };
}

async function context() {
  const session = await getSession();
  const access = await getLatestUpdatesAccess(session);
  return { session, access };
}

/** يوم الحدث: تاريخٌ صحيح لا يتجاوز اليوم — المستجدّ ما وقع لا ما سيقع. */
function readEventDate(value: string): Date | string {
  const date = parseCivilDateInput(value);
  if (!date) return "تاريخ الحدث غير صحيح";
  if (date > toCivilDate(new Date())) return "تاريخ الحدث لا يكون بعد اليوم";
  return date;
}

function readContent(value: string): string | { error: string } {
  const content = (value || "").trim();
  if (!content) return { error: "اكتب المستجد أولاً" };
  if (content.length > MAX_CONTENT) return { error: `المستجد أطول من ${MAX_CONTENT} حرف` };
  return content;
}

/** الخلية قائمة: جمعيةٌ متعاقدة فيها هذه الخدمة فعلاً. */
async function cellExists(charityId: string, serviceName: string) {
  const row = await prisma.service.findFirst({
    where: { charityId, name: serviceName, charity: { isInternal: false } },
    select: { id: true },
  });
  return !!row;
}

function toEntry(row: {
  id: string;
  content: string;
  eventDate: Date;
  createdAt: Date;
  createdByName: string | null;
  updatedByName: string | null;
  updatedById: string | null;
}): LatestUpdateEntry {
  return {
    id: row.id,
    content: row.content,
    eventDate: toCivilDateInput(row.eventDate),
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdByName,
    updatedByName: row.updatedByName,
    edited: row.updatedById !== null,
  };
}

const ENTRY_SELECT = {
  id: true,
  content: true,
  eventDate: true,
  createdAt: true,
  createdByName: true,
  updatedByName: true,
  updatedById: true,
} as const;

/** سجلّ الخلية كاملاً، الأحدث حدثاً أولاً. */
export async function getCellHistory(charityId: string, serviceName: string): Promise<Result<LatestUpdateEntry[]>> {
  const { access } = await context();
  if (!access.canView) return fail("غير مصرح");

  const rows = await prisma.latestUpdate.findMany({
    where: { charityId, serviceName },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: ENTRY_SELECT,
  });
  return { success: true, data: rows.map(toEntry) };
}

export async function addLatestUpdate(input: {
  charityId: string;
  serviceName: string;
  content: string;
  eventDate: string;
}): Promise<Result> {
  try {
    const { session, access } = await context();
    if (!session || !canAddIn(access, input.charityId, input.serviceName)) {
      return fail("لا تملك الإضافة في هذه الخدمة لهذه الجمعية");
    }

    const content = readContent(input.content);
    if (typeof content !== "string") return fail(content.error);
    const eventDate = readEventDate(input.eventDate);
    if (typeof eventDate === "string") return fail(eventDate);
    if (!(await cellExists(input.charityId, input.serviceName))) {
      return fail("هذه الخدمة غير موجودة في هذه الجمعية");
    }

    await prisma.latestUpdate.create({
      data: {
        charityId: input.charityId,
        serviceName: input.serviceName,
        content,
        eventDate,
        createdById: session.id,
        createdByName: session.name ?? null,
      },
    });
    revalidatePath("/main/latest-updates");
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] add:", e);
    return fail("تعذّر حفظ المستجد");
  }
}

/** التعديل للتحرير وحده. تاريخ الإضافة لا يُمسّ: هو يوم الإدخال لا يوم الحدث. */
export async function updateLatestUpdate(
  id: string,
  input: { content: string; eventDate: string }
): Promise<Result> {
  try {
    const { session, access } = await context();
    if (!session || !access.canManage) return fail("التعديل لصاحب صلاحية التحرير");

    const content = readContent(input.content);
    if (typeof content !== "string") return fail(content.error);
    const eventDate = readEventDate(input.eventDate);
    if (typeof eventDate === "string") return fail(eventDate);

    const found = await prisma.latestUpdate.findUnique({ where: { id }, select: { id: true } });
    if (!found) return fail("المستجد غير موجود — ربما حُذف");

    await prisma.latestUpdate.update({
      where: { id },
      data: { content, eventDate, updatedById: session.id, updatedByName: session.name ?? null },
    });
    revalidatePath("/main/latest-updates");
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] update:", e);
    return fail("تعذّر تعديل المستجد");
  }
}

export async function deleteLatestUpdate(id: string): Promise<Result> {
  try {
    const { session, access } = await context();
    if (!session || !access.canManage) return fail("الحذف لصاحب صلاحية التحرير");

    await prisma.latestUpdate.deleteMany({ where: { id } });
    revalidatePath("/main/latest-updates");
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] delete:", e);
    return fail("تعذّر حذف المستجد");
  }
}
