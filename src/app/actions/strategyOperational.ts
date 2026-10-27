"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { weeksBetween } from "@/lib/initiativeProgress";
import { PHASES, PRIORITIES } from "@/lib/strategyOptions";

/**
 * أفعال الخطة التشغيلية: الخطة، والمبادرات، وربطها بالأهداف والمؤشرات.
 *
 * والخطةُ هي صاحبة الزمن: منها يُشتقّ محورُ أسابيع جانت وأعمدةُ أشهر الموازنة.
 * فلا مبادرةَ بلا خطة، ورقمُ أسبوعٍ بلا تاريخ بدايةٍ لا معنى له.
 */

type Result = { error?: string };


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
  /** الملف التسويقي — يُمرَّر من نافذة التعديل، و`undefined` تعني «لا تمسّه». */
  marketing?: MarketingInput;
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

    // الملف التسويقي يُحفظ بنفس الفعل الذي يحفظه الزرّ، فلا منطقَ مكرّر.
    if (input.marketing) {
      const res = await setInitiativeMarketing(initiativeId, input.marketing);
      if (res.error) return res;
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



// ── الملف التسويقي للمبادرة ─────────────────────────────────────────────────

export type MarketingInput =
  | { kind: "LINK"; url: string }
  | { kind: "FILE"; url: string; publicId: string; resourceType: string; fileName: string }
  | { kind: "NONE" };

/**
 * رابطٌ صالحٌ للفتح: http أو https وحدهما.
 *
 * و`javascript:` و`data:` مرفوضان: الزرّ يُفتح بـ`window.open`، فرابطٌ من هذين
 * ينفّذ ما فيه في سياق الصفحة.
 */
function safeHttpUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.toString();
}

/** يحذف أصلاً من Cloudinary بأفضل جهد: فشلُ الحذف لا يمنع الاستبدال. */
async function destroyAsset(publicId: string | null, resourceType: string | null) {
  if (!publicId) return;
  try {
    const { v2: cloudinary } = await import("cloudinary");
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType || "raw" });
  } catch (err) {
    console.error("تعذّر حذف الملف التسويقي من Cloudinary", publicId, err);
  }
}

/**
 * يحفظ الملف التسويقي: رابطاً أو ملفاً مرفوعاً، أو يُزيله.
 *
 * والأصلُ القديم يُحذف من Cloudinary حين يُستبدل أو يُزال — فلا تبقى ملفاتٌ
 * يتيمةٌ تُحتسب في الحصة ولا يصل إليها أحد. ولا يُحذف إن كان الجديد هو نفسه.
 */
export async function setInitiativeMarketing(
  initiativeId: string,
  input: MarketingInput
): Promise<Result> {
  try {
    const charityId = await charityOfInitiative(initiativeId);
    await requireAccess(charityId);

    const current = await prisma.initiative.findUnique({
      where: { id: initiativeId },
      select: { marketingPublicId: true, marketingResourceType: true },
    });

    let data: Prisma.InitiativeUpdateInput;

    if (input.kind === "NONE") {
      data = {
        marketingKind: null,
        marketingUrl: null,
        marketingFileName: null,
        marketingPublicId: null,
        marketingResourceType: null,
      };
    } else if (input.kind === "LINK") {
      const url = safeHttpUrl(input.url);
      if (!url) return { error: "رابطٌ غير صالح — يبدأ بـhttp أو https" };
      data = {
        marketingKind: "LINK",
        marketingUrl: url,
        marketingFileName: null,
        marketingPublicId: null,
        marketingResourceType: null,
      };
    } else {
      if (!input.url || !input.publicId) return { error: "لم يكتمل رفع الملف" };
      data = {
        marketingKind: "FILE",
        marketingUrl: input.url,
        marketingFileName: input.fileName || null,
        marketingPublicId: input.publicId,
        marketingResourceType: input.resourceType || "raw",
      };
    }

    await prisma.initiative.update({ where: { id: initiativeId }, data });

    // يُحذف القديم بعد نجاح الكتابة لا قبلها: لو فشلت الكتابة بقي الأصل مرجوعاً إليه.
    const replaced = input.kind !== "FILE" || input.publicId !== current?.marketingPublicId;
    if (replaced) await destroyAsset(current?.marketingPublicId ?? null, current?.marketingResourceType ?? null);

    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// ── خطوات المبادرة ──────────────────────────────────────────────────────────
// الخطوة هي المُدخل الوحيد في الخطة التشغيلية: منها تُحسب نسبةُ إنجاز المبادرة
// وحالتُها ومصروفُها وشاراتُ انضباطها. وأرقام أسابيعها نسبيّةٌ إلى بداية
// الخطة — رقمُ أسبوعٍ بلا تاريخ بدايةٍ لا معنى له.


async function charityOfStep(stepId: string) {
  const row = await prisma.initiativeStep.findUnique({
    where: { id: stepId },
    select: { initiative: { select: { plan: { select: { charityId: true } } } } },
  });
  if (!row) throw new Error("خطوةٌ غير موجودة");
  return row.initiative.plan.charityId;
}

function parseWeek(value: string | undefined, weekCount: number): number | null | "invalid" {
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > weekCount) return "invalid";
  return n;
}

function parseSpan(value: string | undefined, weekCount: number): number | null | "invalid" {
  const raw = value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > weekCount) return "invalid";
  return n;
}

export type StepInputPayload = {
  id?: string;
  initiativeId: string;
  phase?: string;
  title: string;
  evidence?: string;
  owner?: string;
  cost?: string;
  actualCost?: string;
  planStartWeek?: string;
  planWeeks?: string;
  actualStartWeek?: string;
  actualWeeks?: string;
  progress?: string;
  monthlyCost?: Record<string, string>;
};

export async function saveStep(input: StepInputPayload): Promise<Result> {
  try {
    const initiative = await prisma.initiative.findUnique({
      where: { id: input.initiativeId },
      select: { plan: { select: { charityId: true, weekCount: true } } },
    });
    if (!initiative) return { error: "مبادرةٌ غير موجودة" };
    await requireAccess(initiative.plan.charityId);
    const weekCount = initiative.plan.weekCount;

    const title = input.title.trim();
    if (!title) return { error: "نصّ الخطوة مطلوب" };

    const cost = parseDecimal(input.cost);
    if (cost === "invalid") return { error: "التكلفة يجب أن تكون رقماً" };
    const actualCost = parseDecimal(input.actualCost);
    if (actualCost === "invalid") return { error: "التكلفة الفعلية يجب أن تكون رقماً" };

    const planStartWeek = parseWeek(input.planStartWeek, weekCount);
    if (planStartWeek === "invalid") return { error: `أسبوع البداية بين ١ و${weekCount}` };
    const planWeeks = parseSpan(input.planWeeks, weekCount);
    if (planWeeks === "invalid") return { error: `مدة الخطة بين ١ و${weekCount}` };
    const actualStartWeek = parseWeek(input.actualStartWeek, weekCount);
    if (actualStartWeek === "invalid") return { error: `أسبوع البداية الفعلي بين ١ و${weekCount}` };
    const actualWeeks = parseSpan(input.actualWeeks, weekCount);
    if (actualWeeks === "invalid") return { error: `مدة التنفيذ بين ١ و${weekCount}` };

    const progressRaw = input.progress?.trim();
    let progress = 0;
    if (progressRaw) {
      const n = Number(progressRaw.endsWith("%") ? progressRaw.slice(0, -1) : progressRaw);
      if (!Number.isFinite(n) || n < 0 || n > 100) return { error: "نسبة الإنجاز بين ٠ و١٠٠" };
      progress = Math.round(n);
    }

    let monthlyCost: Record<string, number> | null = null;
    if (input.monthlyCost) {
      const entries: Array<[string, number]> = [];
      for (const [key, raw] of Object.entries(input.monthlyCost)) {
        const value = parseDecimal(raw);
        if (value === "invalid") return { error: `قيمةٌ غير رقمية في شهر ${key}` };
        if (value !== null) entries.push([key, value]);
      }
      monthlyCost = entries.length > 0 ? Object.fromEntries(entries) : null;
    }

    const phase = input.phase && (PHASES as readonly string[]).includes(input.phase) ? input.phase : null;

    const data = {
      phase,
      title,
      evidence: input.evidence?.trim() || null,
      owner: input.owner?.trim() || null,
      cost,
      actualCost,
      planStartWeek,
      planWeeks,
      actualStartWeek,
      actualWeeks,
      progress,
      monthlyCost: monthlyCost ?? Prisma.DbNull,
    };

    if (input.id) {
      await prisma.initiativeStep.update({ where: { id: input.id }, data });
    } else {
      const last = await prisma.initiativeStep.findFirst({
        where: { initiativeId: input.initiativeId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      await prisma.initiativeStep.create({
        data: { ...data, initiativeId: input.initiativeId, order: (last?.order ?? 0) + 1 },
      });
    }

    await revalidateOperational(initiative.plan.charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteStep(id: string): Promise<Result> {
  try {
    const charityId = await charityOfStep(id);
    await requireAccess(charityId);
    await prisma.initiativeStep.delete({ where: { id } });
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** نسبةُ إنجاز خطوةٍ وحدها — إدخالٌ سريعٌ من الجدول بلا فتح النافذة. */
export async function setStepProgress(id: string, progress: number): Promise<Result> {
  try {
    const charityId = await charityOfStep(id);
    await requireAccess(charityId);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return { error: "نسبة الإنجاز بين ٠ و١٠٠" };
    await prisma.initiativeStep.update({ where: { id }, data: { progress: Math.round(progress) } });
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * نقلُ خطوةٍ خطوةً واحدة أعلى أو أسفل.
 *
 * ويُبادَل الترتيبان في معاملةٍ واحدة: ترتيبٌ فريدٌ لا يُحرسه المخطّط، لكن
 * كتابتين منفصلتين تتركان صفّين بترتيبٍ واحد لو فشلت الثانية.
 */
export async function moveStep(id: string, direction: "up" | "down"): Promise<Result> {
  try {
    const charityId = await charityOfStep(id);
    await requireAccess(charityId);

    const step = await prisma.initiativeStep.findUnique({
      where: { id },
      select: { id: true, order: true, initiativeId: true },
    });
    if (!step) return { error: "خطوةٌ غير موجودة" };

    const neighbour = await prisma.initiativeStep.findFirst({
      where: {
        initiativeId: step.initiativeId,
        order: direction === "up" ? { lt: step.order } : { gt: step.order },
      },
      orderBy: { order: direction === "up" ? "desc" : "asc" },
      select: { id: true, order: true },
    });
    if (!neighbour) return {};

    await prisma.$transaction([
      prisma.initiativeStep.update({ where: { id: step.id }, data: { order: neighbour.order } }),
      prisma.initiativeStep.update({ where: { id: neighbour.id }, data: { order: step.order } }),
    ]);

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
