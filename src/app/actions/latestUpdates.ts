"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { toCivilDate } from "@/lib/businessDays";
import { parseCivilDateInput, toCivilDateInput } from "@/lib/latestUpdates";
import {
  customIdOf,
  customKey,
  getLatestUpdatesScope,
  seesCell,
  seesColumn,
} from "@/lib/latestUpdatesAccess";

/**
 * أفعال «آخر المستجدات». كلٌّ منها يعيد حساب النطاق في الخادم: زرٌّ مخفيٌّ في
 * الواجهة ليس منعاً، والفعل يُنادى مباشرةً بلا واجهة.
 */

const MAX_CONTENT = 2000;
const MAX_NAME = 80;

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
  /** اسم الخدمة الفرعية إن كان الحدث عليها. */
  subColumnName: string | null;
};

type Result<T = undefined> = { success: true; data?: T } | { success: false; error: string };

function fail(error: string) {
  return { success: false as const, error };
}

async function context() {
  const session = await getSession();
  const scope = await getLatestUpdatesScope(session);
  return { session, scope };
}

function revalidate() {
  revalidatePath("/main/latest-updates", "layout");
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

function readName(value: string): string | { error: string } {
  const name = (value || "").replace(/\s+/g, " ").trim();
  if (!name) return { error: "اكتب الاسم أولاً" };
  if (name.length > MAX_NAME) return { error: `الاسم أطول من ${MAX_NAME} حرفاً` };
  return name;
}

/** الخدمة الفرعية موجودةٌ وتحت هذا العمود — لا يُضاف حدثٌ في فرعِ عمودٍ آخر. */
async function subColumnUnder(subColumnId: string, columnKey: string) {
  const sub = await prisma.latestUpdateSubColumn.findUnique({
    where: { id: subColumnId },
    select: { parentKey: true },
  });
  return sub?.parentKey === columnKey;
}

const ENTRY_SELECT = {
  id: true,
  content: true,
  eventDate: true,
  createdAt: true,
  createdByName: true,
  updatedByName: true,
  updatedById: true,
  subColumn: { select: { name: true } },
} as const;

function toEntry(row: {
  id: string;
  content: string;
  eventDate: Date;
  createdAt: Date;
  createdByName: string | null;
  updatedByName: string | null;
  updatedById: string | null;
  subColumn: { name: string } | null;
}): LatestUpdateEntry {
  return {
    id: row.id,
    content: row.content,
    eventDate: toCivilDateInput(row.eventDate),
    createdAt: row.createdAt.toISOString(),
    createdByName: row.createdByName,
    updatedByName: row.updatedByName,
    edited: row.updatedById !== null,
    subColumnName: row.subColumn?.name ?? null,
  };
}

/**
 * سجلّ الخانة كاملاً، الأحدث حدثاً أولاً.
 *
 * بلا `subColumnId` (الجدول العام): كل أحداث العمود، ما كان عليه وما كان على
 * فروعه. ومعه (الجدول الفرعي): أحداث ذلك الفرع وحده.
 */
export async function getCellHistory(
  charityId: string,
  columnKey: string,
  subColumnId?: string
): Promise<Result<LatestUpdateEntry[]>> {
  const { scope } = await context();
  if (!seesCell(scope, charityId, columnKey)) return fail("غير مصرح");

  const rows = await prisma.latestUpdate.findMany({
    where: { charityId, serviceName: columnKey, ...(subColumnId ? { subColumnId } : {}) },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    select: ENTRY_SELECT,
  });
  return { success: true, data: rows.map(toEntry) };
}

export async function addLatestUpdate(input: {
  charityId: string;
  columnKey: string;
  subColumnId?: string;
  content: string;
  eventDate: string;
}): Promise<Result> {
  try {
    const { session, scope } = await context();
    if (!session || !scope.canAdd || !seesCell(scope, input.charityId, input.columnKey)) {
      return fail("لا تملك الإضافة في هذه الخانة");
    }

    const content = readContent(input.content);
    if (typeof content !== "string") return fail(content.error);
    const eventDate = readEventDate(input.eventDate);
    if (typeof eventDate === "string") return fail(eventDate);
    if (input.subColumnId && !(await subColumnUnder(input.subColumnId, input.columnKey))) {
      return fail("الخدمة الفرعية غير موجودة — ربما حُذفت");
    }

    await prisma.latestUpdate.create({
      data: {
        charityId: input.charityId,
        serviceName: input.columnKey,
        subColumnId: input.subColumnId || null,
        content,
        eventDate,
        createdById: session.id,
        createdByName: session.name ?? null,
      },
    });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] add:", e);
    return fail("تعذّر حفظ المستجد");
  }
}

/** للتحرير وحده، وفي خانةٍ يراها. تاريخ الإضافة لا يُمسّ: هو يوم الإدخال. */
async function editableEntry(id: string) {
  const { session, scope } = await context();
  if (!session || !scope.canManage) return { ok: false, error: "التعديل والحذف لصاحب صلاحية التحرير" } as const;
  const row = await prisma.latestUpdate.findUnique({
    where: { id },
    select: { charityId: true, serviceName: true },
  });
  if (!row) return { ok: false, error: "المستجد غير موجود — ربما حُذف" } as const;
  if (!seesCell(scope, row.charityId, row.serviceName)) return { ok: false, error: "غير مصرح" } as const;
  return { ok: true, session } as const;
}

export async function updateLatestUpdate(
  id: string,
  input: { content: string; eventDate: string }
): Promise<Result> {
  try {
    const guard = await editableEntry(id);
    if (!guard.ok) return fail(guard.error);

    const content = readContent(input.content);
    if (typeof content !== "string") return fail(content.error);
    const eventDate = readEventDate(input.eventDate);
    if (typeof eventDate === "string") return fail(eventDate);

    await prisma.latestUpdate.update({
      where: { id },
      data: {
        content,
        eventDate,
        updatedById: guard.session.id,
        updatedByName: guard.session.name ?? null,
      },
    });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] update:", e);
    return fail("تعذّر تعديل المستجد");
  }
}

export async function deleteLatestUpdate(id: string): Promise<Result> {
  try {
    const guard = await editableEntry(id);
    if (!guard.ok) return fail(guard.error);
    await prisma.latestUpdate.deleteMany({ where: { id } });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] delete:", e);
    return fail("تعذّر حذف المستجد");
  }
}

// ── الأعمدة الخاصة ─────────────────────────────────────────────────────────
// خدماتٌ لا وجود لها خارج الجدول. والخدمات الأصلية لا تُعدَّل من هنا أبداً:
// مفتاحها اسمٌ بلا بادئة، فلا تطابقها customIdOf.

async function requireManager() {
  const { session, scope } = await context();
  if (!session || !scope.canManage) return null;
  return scope;
}

/** اسمٌ لا يكرّر خدمةً أصلية ولا عموداً خاصاً آخر — وإلا ظهر عمودان بعنوانٍ واحد. */
async function columnNameTaken(name: string, exceptId?: string) {
  const [service, custom] = await Promise.all([
    prisma.service.findFirst({ where: { name }, select: { id: true } }),
    prisma.latestUpdateColumn.findFirst({
      where: { name, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    }),
  ]);
  return !!(service || custom);
}

export async function addCustomColumn(rawName: string): Promise<Result<string>> {
  try {
    if (!(await requireManager())) return fail("إضافة الأعمدة لصاحب صلاحية التحرير");
    const name = readName(rawName);
    if (typeof name !== "string") return fail(name.error);
    if (await columnNameTaken(name)) return fail("يوجد عمودٌ أو خدمةٌ بهذا الاسم");

    const last = await prisma.latestUpdateColumn.aggregate({ _max: { position: true } });
    const column = await prisma.latestUpdateColumn.create({
      data: { name, position: (last._max.position ?? -1) + 1 },
    });
    revalidate();
    return { success: true, data: customKey(column.id) };
  } catch (e) {
    console.error("[latestUpdates] addColumn:", e);
    return fail("تعذّر إضافة العمود");
  }
}

export async function renameCustomColumn(columnKey: string, rawName: string): Promise<Result> {
  try {
    if (!(await requireManager())) return fail("تحرير الأعمدة لصاحب صلاحية التحرير");
    const id = customIdOf(columnKey);
    if (!id) return fail("الخدمات الأصلية لا تُعدَّل من هنا");
    const name = readName(rawName);
    if (typeof name !== "string") return fail(name.error);
    if (await columnNameTaken(name, id)) return fail("يوجد عمودٌ أو خدمةٌ بهذا الاسم");

    const res = await prisma.latestUpdateColumn.updateMany({ where: { id }, data: { name } });
    if (res.count === 0) return fail("العمود غير موجود — ربما حُذف");
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] renameColumn:", e);
    return fail("تعذّر تعديل العمود");
  }
}

/** يحذف العمود وكل مستجداته وخدماته الفرعية — والواجهة تسأل قبله. */
export async function deleteCustomColumn(columnKey: string): Promise<Result> {
  try {
    if (!(await requireManager())) return fail("حذف الأعمدة لصاحب صلاحية التحرير");
    const id = customIdOf(columnKey);
    if (!id) return fail("الخدمات الأصلية لا تُحذف من هنا");

    await prisma.$transaction([
      prisma.latestUpdate.deleteMany({ where: { serviceName: columnKey } }),
      prisma.latestUpdateSubColumn.deleteMany({ where: { parentKey: columnKey } }),
      prisma.latestUpdateColumn.deleteMany({ where: { id } }),
    ]);
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] deleteColumn:", e);
    return fail("تعذّر حذف العمود");
  }
}

// ── الخدمات الفرعية ────────────────────────────────────────────────────────

export async function addSubColumn(columnKey: string, rawName: string): Promise<Result> {
  try {
    const scope = await requireManager();
    if (!scope) return fail("إضافة الخدمات الفرعية لصاحب صلاحية التحرير");
    if (!seesColumn(scope, columnKey)) return fail("غير مصرح");
    const name = readName(rawName);
    if (typeof name !== "string") return fail(name.error);

    const taken = await prisma.latestUpdateSubColumn.findFirst({
      where: { parentKey: columnKey, name },
      select: { id: true },
    });
    if (taken) return fail("توجد خدمةٌ فرعية بهذا الاسم");

    const last = await prisma.latestUpdateSubColumn.aggregate({
      where: { parentKey: columnKey },
      _max: { position: true },
    });
    await prisma.latestUpdateSubColumn.create({
      data: { parentKey: columnKey, name, position: (last._max.position ?? -1) + 1 },
    });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] addSub:", e);
    return fail("تعذّر إضافة الخدمة الفرعية");
  }
}

async function managedSub(id: string) {
  const scope = await requireManager();
  if (!scope) return { ok: false, error: "تحرير الخدمات الفرعية لصاحب صلاحية التحرير" } as const;
  const sub = await prisma.latestUpdateSubColumn.findUnique({
    where: { id },
    select: { parentKey: true },
  });
  if (!sub) return { ok: false, error: "الخدمة الفرعية غير موجودة — ربما حُذفت" } as const;
  if (!seesColumn(scope, sub.parentKey)) return { ok: false, error: "غير مصرح" } as const;
  return { ok: true, parentKey: sub.parentKey } as const;
}

export async function renameSubColumn(id: string, rawName: string): Promise<Result> {
  try {
    const guard = await managedSub(id);
    if (!guard.ok) return fail(guard.error);
    const name = readName(rawName);
    if (typeof name !== "string") return fail(name.error);

    const taken = await prisma.latestUpdateSubColumn.findFirst({
      where: { parentKey: guard.parentKey, name, id: { not: id } },
      select: { id: true },
    });
    if (taken) return fail("توجد خدمةٌ فرعية بهذا الاسم");

    await prisma.latestUpdateSubColumn.update({ where: { id }, data: { name } });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] renameSub:", e);
    return fail("تعذّر تعديل الخدمة الفرعية");
  }
}

/** يحذف الخدمة الفرعية ومستجداتها (بالتسلسل في القاعدة) — والواجهة تسأل قبله. */
export async function deleteSubColumn(id: string): Promise<Result> {
  try {
    const guard = await managedSub(id);
    if (!guard.ok) return fail(guard.error);
    await prisma.latestUpdateSubColumn.delete({ where: { id } });
    revalidate();
    return { success: true };
  } catch (e) {
    console.error("[latestUpdates] deleteSub:", e);
    return fail("تعذّر حذف الخدمة الفرعية");
  }
}
