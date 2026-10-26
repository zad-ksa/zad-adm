"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { weeksBetween } from "@/lib/initiativeProgress";

/**
 * أفعال الخطة التشغيلية: الخطة، والمبادرات، وربطها بالأهداف والمؤشرات.
 *
 * والخطةُ هي صاحبة الزمن: منها يُشتقّ محورُ أسابيع جانت وأعمدةُ أشهر الموازنة.
 * فلا مبادرةَ بلا خطة، ورقمُ أسبوعٍ بلا تاريخ بدايةٍ لا معنى له.
 */

type Result = { error?: string };

export const PRIORITIES = ["عالية", "متوسطة", "منخفضة"] as const;

async function requireAccess(charityId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_strategy")) throw new Error("FORBIDDEN");
  await assertCharityAccess(session.id, session.role, charityId);
  return session;
}

async function charityOfPlan(planId: string) {
  const row = await prisma.operationalPlan.findUnique({ where: { id: planId }, select: { charityId: true } });
  if (!row) throw new Error("خطةٌ غير موجودة");
  return row.charityId;
}

async function charityOfInitiative(initiativeId: string) {
  const row = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: { plan: { select: { charityId: true } } },
  });
  if (!row) throw new Error("مبادرةٌ غير موجودة");
  return row.plan.charityId;
}

async function revalidateOperational(charityId: string) {
  const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
  if (charity) revalidatePath(`/main/strategy/${encodeURIComponent(charity.name)}`, "layout");
}

/** تاريخٌ من حقل `date` في المتصفّح — يُقرأ يوماً بلا منطقةٍ زمنية. */
function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDecimal(value: string | undefined): number | null | "invalid" {
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : "invalid";
}

// ── الخطة التشغيلية ─────────────────────────────────────────────────────────

export async function savePlan(input: {
  id?: string;
  charityId: string;
  label: string;
  startDate: string;
  endDate: string;
}): Promise<Result> {
  try {
    await requireAccess(input.charityId);

    const label = input.label.trim();
    if (!label) return { error: "اسم الخطة مطلوب" };

    const startDate = parseDate(input.startDate);
    const endDate = parseDate(input.endDate);
    if (!startDate || !endDate) return { error: "تاريخا البداية والنهاية مطلوبان" };
    if (endDate < startDate) return { error: "تاريخ النهاية قبل البداية" };

    const clash = await prisma.operationalPlan.findFirst({
      where: { charityId: input.charityId, label, ...(input.id ? { NOT: { id: input.id } } : {}) },
      select: { id: true },
    });
    if (clash) return { error: "توجد خطةٌ بهذا الاسم" };

    // عددُ الأسابيع مشتقٌّ من التاريخين لا مُدخَلاً: رقمان يُحدَّدان وثالثٌ
    // يُحسب منهما لا يتناقضان.
    const data = { label, startDate, endDate, weekCount: weeksBetween(startDate, endDate) };

    if (input.id) {
      await prisma.operationalPlan.update({ where: { id: input.id }, data });
    } else {
      await prisma.operationalPlan.create({ data: { ...data, charityId: input.charityId } });
    }

    await revalidateOperational(input.charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deletePlan(id: string): Promise<Result> {
  try {
    const charityId = await charityOfPlan(id);
    await requireAccess(charityId);
    await prisma.operationalPlan.delete({ where: { id } });
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// ── المبادرات ───────────────────────────────────────────────────────────────

export type InitiativeInput = {
  id?: string;
  planId: string;
  name: string;
  description?: string;
  objectiveId?: string | null;
  /** مؤشراتٌ عدّة: الوثيقة تذكرها بالجمع. */
  indicatorIds?: string[];
  durationText?: string;
  managerName?: string;
  owningDept?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  /** توزيع الموازنة على أشهر الخطة: { "2026-08": 18150 } */
  monthlyBudget?: Record<string, string>;
};

export async function saveInitiative(input: InitiativeInput): Promise<Result> {
  try {
    const charityId = await charityOfPlan(input.planId);
    await requireAccess(charityId);

    const name = input.name.trim();
    if (!name) return { error: "اسم المبادرة مطلوب" };

    const budget = parseDecimal(input.budget);
    if (budget === "invalid") return { error: "الموازنة يجب أن تكون رقماً" };

    const startDate = parseDate(input.startDate);
    const endDate = parseDate(input.endDate);
    if (startDate && endDate && endDate < startDate) return { error: "تاريخ النهاية قبل البداية" };

    const priority = input.priority && (PRIORITIES as readonly string[]).includes(input.priority) ? input.priority : null;

    // التوزيع الشهري: ما فرغ من الأشهر يُحذف مفتاحه، فلا يُخزَّن فراغ.
    let monthlyBudget: Record<string, number> | null = null;
    if (input.monthlyBudget) {
      const entries: Array<[string, number]> = [];
      for (const [key, raw] of Object.entries(input.monthlyBudget)) {
        const value = parseDecimal(raw);
        if (value === "invalid") return { error: `قيمةٌ غير رقمية في شهر ${key}` };
        if (value !== null) entries.push([key, value]);
      }
      monthlyBudget = entries.length > 0 ? Object.fromEntries(entries) : null;
    }

    // الهدف والمؤشرات يجب أن تكون من الجمعية نفسها — وإلا رُبطت مبادرةٌ بهدف
    // جمعيةٍ أخرى بتمريرِ مُعرِّفٍ في الطلب.
    if (input.objectiveId) {
      const owns = await prisma.strategyObjective.findFirst({
        where: { id: input.objectiveId, perspective: { charityId } },
        select: { id: true },
      });
      if (!owns) return { error: "الهدف المختار ليس من أهداف هذه الجمعية" };
    }

    const indicatorIds = [...new Set(input.indicatorIds ?? [])];
    if (indicatorIds.length > 0) {
      const owned = await prisma.strategyIndicator.count({
        where: { id: { in: indicatorIds }, objective: { perspective: { charityId } } },
      });
      if (owned !== indicatorIds.length) return { error: "مؤشرٌ مختارٌ ليس من مؤشرات هذه الجمعية" };
    }

    const data = {
      name,
      description: input.description?.trim() || null,
      objectiveId: input.objectiveId || null,
      durationText: input.durationText?.trim() || null,
      managerName: input.managerName?.trim() || null,
      owningDept: input.owningDept?.trim() || null,
      priority,
      startDate,
      endDate,
      budget,
    };

    let initiativeId = input.id ?? null;
    if (initiativeId) {
      await prisma.initiative.update({
        where: { id: initiativeId },
        data: { ...data, monthlyBudget: monthlyBudget ?? Prisma.DbNull },
      });
    } else {
      const last = await prisma.initiative.findFirst({
        where: { planId: input.planId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const created = await prisma.initiative.create({
        data: { ...data, monthlyBudget: monthlyBudget ?? Prisma.DbNull, planId: input.planId, number: (last?.number ?? 0) + 1 },
        select: { id: true },
      });
      initiativeId = created.id;
    }

    // الربط يُستبدل لا يُضاف إليه: الصفحة تُرسل القائمة كاملةً.
    await prisma.initiativeIndicator.deleteMany({ where: { initiativeId } });
    if (indicatorIds.length > 0) {
      await prisma.initiativeIndicator.createMany({
        data: indicatorIds.map((indicatorId) => ({ initiativeId: initiativeId!, indicatorId })),
      });
    }

    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteInitiative(id: string): Promise<Result> {
  try {
    const charityId = await charityOfInitiative(id);
    await requireAccess(charityId);
    await prisma.initiative.delete({ where: { id } });
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** الأولوية وحدها — إدخالٌ سريعٌ من الكشاف بلا فتح النافذة. */
export async function setInitiativePriority(id: string, priority: string | null): Promise<Result> {
  try {
    const charityId = await charityOfInitiative(id);
    await requireAccess(charityId);
    const value = priority && (PRIORITIES as readonly string[]).includes(priority) ? priority : null;
    await prisma.initiative.update({ where: { id }, data: { priority: value } });
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

function message(e: unknown) {
  const raw = e instanceof Error ? e.message : "تعذّر إتمام العملية";
  if (raw === "UNAUTHORIZED") return "الجلسة منتهية — أعد الدخول";
  if (raw === "FORBIDDEN") return "لا تملك صلاحية إدارة الاستراتيجية";
  return raw;
}
