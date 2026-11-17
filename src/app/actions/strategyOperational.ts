"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storageDelete";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { initiativeAccess } from "@/lib/initiativeAccess";
import { planSpan, plannedCost, spanDates, weeksBetween, weeksLabel } from "@/lib/initiativeProgress";
import { PRIORITIES } from "@/lib/strategyOptions";
import { isStepField, parseStepField, parseStepFields } from "@/lib/initiativeStepFields";

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

/**
 * حارسُ مبادرةٍ بعينها: قسمُ الاستراتيجية في جمعيتها، أو تكليفُ المبادرة.
 *
 * فمن كُتب اسمُه «مدير المبادرة» يُعدّل مبادرتَه وخطواتِها ولو لم يكن من
 * أهل القسم — انظر `initiativeAccess`. وما سواها لا يُفتح له: الخطةُ
 * والكشّافُ ومبادراتُ غيره تبقى على `requireAccess`، وكذلك حذفُ المبادرة.
 *
 * ولا تُفحص خدمةُ الجمعية هنا: أفعالُ هذا الملف لم تفحصها قطّ، وإنما
 * تُفحص في بابِ الصفحة — فلا يُشدَّد على من كان يعمل.
 */
async function requireInitiativeAccess(initiativeId: string) {
  const access = await initiativeAccess(initiativeId, { requireService: false });
  if (!access) throw new Error("FORBIDDEN_INITIATIVE");
  return access;
}

/** مبادرةُ الخطوة: الخطواتُ تُعدَّل بإذن مبادرتها. */
async function initiativeOfStep(stepId: string) {
  const row = await prisma.initiativeStep.findUnique({
    where: { id: stepId },
    select: { initiativeId: true, initiative: { select: { plan: { select: { charityId: true } } } } },
  });
  if (!row) throw new Error("خطوةٌ غير موجودة");
  return { initiativeId: row.initiativeId, charityId: row.initiative.plan.charityId };
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

    // تعديلُ مبادرةٍ قائمةٍ بالبابين، وإنشاءُ مبادرةٍ جديدةٍ بالقسم وحدَه:
    // المكلَّفُ يُعدّل عملَه لا يُضيف إلى خطة الجمعية.
    if (input.id) {
      const access = await requireInitiativeAccess(input.id);
      if (access.via === "MANAGER") {
        // والمكلَّفُ يُعدّلها في خطّتها لا ينقلها: `planId` المُرسَل يُطابَق
        // بالمحفوظ، وإلا لنُقلت مبادرةٌ إلى خطةِ جمعيةٍ أخرى بتمريرِ مُعرِّف.
        const stored = await prisma.initiative.findUnique({
          where: { id: input.id },
          select: { planId: true },
        });
        if (stored?.planId !== input.planId) throw new Error("FORBIDDEN_INITIATIVE");
      }
    } else {
      await requireAccess(charityId);
    }

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
    await requireInitiativeAccess(id);
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

/**
 * يحذف الأصلَ من حيث يسكن بأفضل جهد: فشلُ الحذف لا يمنع الاستبدال.
 *
 * والرابطُ يُمرَّر لا المُعرِّفُ وحدَه: المزوّدان متعايشان، والمُعرِّفُ لا
 * يقول من أيِّهما هو.
 */
async function destroyAsset(
  url: string | null,
  publicId: string | null,
  resourceType: string | null
) {
  if (!url && !publicId) return;
  await deleteStoredFile({ url, cloudinaryPublicId: publicId, resourceType }, "ملف تسويقي");
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
    await requireInitiativeAccess(initiativeId);

    const current = await prisma.initiative.findUnique({
      where: { id: initiativeId },
      select: { marketingUrl: true, marketingPublicId: true, marketingResourceType: true },
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
    if (replaced)
      await destroyAsset(
        current?.marketingUrl ?? null,
        current?.marketingPublicId ?? null,
        current?.marketingResourceType ?? null
      );

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


/**
 * تحديثُ ما تشتقّه المبادرةُ من خطواتها: فترتُها ومدّتُها وموازنتُها.
 *
 * **ولمَ يُكتب في صفِّها ولا يُحسب عند العرض وحدَه**: هذه الثلاثةُ تُقرأ في
 * كشّاف المبادرات، وفي لوحة معلوماتها، وفي «مبادراتي» — فلو حُسبت في صفحة
 * المبادرة وحدَها لقرأ القارئُ رقمين مختلفين لشيءٍ واحدٍ بحسب الصفحة التي فتحها.
 *
 * **والفترةُ من مخطّط جانت**: أوّلُ أسبوعِ خطةٍ لخطواتها وآخرُ أسبوعٍ تنتهي فيه،
 * محسوبةً على بداية الخطة التشغيلية. والمدّةُ عددُ أسابيع ذلك المدى. والموازنةُ
 * مجموعُ تكاليف الخطوات المقدَّرة.
 *
 * **ولا يُمحى ما لا يُشتقّ**: خطواتٌ بلا أسابيعَ لا مدى لها، فتبقى الفترةُ
 * والمدّةُ كما كُتبتا — والمحوُ هنا يُفقد بياناتِ مبادراتٍ قديمةٍ لم تُجدول
 * خطواتُها بعد.
 */
async function syncInitiativeFromSteps(initiativeId: string) {
  const initiative = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: {
      plan: { select: { startDate: true } },
      steps: { select: { cost: true, planStartWeek: true, planWeeks: true } },
    },
  });
  if (!initiative) return;

  const steps = initiative.steps.map((step) => ({
    progress: 0,
    cost: step.cost === null ? null : Number(step.cost),
    planStartWeek: step.planStartWeek,
    planWeeks: step.planWeeks,
  }));

  const data: Prisma.InitiativeUpdateInput = {};

  const span = planSpan(steps);
  if (span) {
    const { start, end } = spanDates(initiative.plan.startDate, span);
    data.startDate = start;
    data.endDate = end;
    data.durationText = weeksLabel(span.weeks);
  }

  // وموازنةٌ صفرٌ تُكتب: خطواتٌ مُحيت تكاليفُها موازنتُها صفرٌ لا رقمٌ قديم.
  // أمّا مبادرةٌ لا خطوةَ لها فلا تُمسّ: الصفرُ فيها خبرٌ كاذب.
  if (steps.length > 0) data.budget = plannedCost(steps);

  if (Object.keys(data).length > 0) {
    await prisma.initiative.update({ where: { id: initiativeId }, data });
  }
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
    await requireInitiativeAccess(input.initiativeId);
    const weekCount = initiative.plan.weekCount;

    // والفحصُ واحدٌ للبابين: النافذةِ هنا، والخليّةِ في `updateStepField`.
    const parsed = parseStepFields(
      {
        phase: input.phase,
        title: input.title,
        evidence: input.evidence,
        owner: input.owner,
        cost: input.cost,
        actualCost: input.actualCost,
        planStartWeek: input.planStartWeek,
        planWeeks: input.planWeeks,
        actualStartWeek: input.actualStartWeek,
        actualWeeks: input.actualWeeks,
        progress: input.progress,
      },
      weekCount
    );
    if ("error" in parsed) return { error: parsed.error };

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

    const values = parsed.values;
    const data = {
      phase: values.phase as string | null,
      title: values.title as string,
      evidence: values.evidence as string | null,
      owner: values.owner as string | null,
      cost: values.cost as number | null,
      actualCost: values.actualCost as number | null,
      planStartWeek: values.planStartWeek as number | null,
      planWeeks: values.planWeeks as number | null,
      actualStartWeek: values.actualStartWeek as number | null,
      actualWeeks: values.actualWeeks as number | null,
      progress: (values.progress as number | null) ?? 0,
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

    await syncInitiativeFromSteps(input.initiativeId);
    await revalidateOperational(initiative.plan.charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteStep(id: string): Promise<Result> {
  try {
    // وحذفُ الخطوةِ تعديلٌ في المبادرة لا حذفٌ لها: يُقبل من المكلَّف.
    const { initiativeId, charityId } = await initiativeOfStep(id);
    await requireInitiativeAccess(initiativeId);
    await prisma.initiativeStep.delete({ where: { id } });
    await syncInitiativeFromSteps(initiativeId);
    await revalidateOperational(charityId);
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * حقلٌ واحدٌ في خطوةٍ واحدة — تحريرٌ مباشرٌ من الجدول بلا فتح النافذة.
 *
 * **ويُرسَل الحقلُ المعدَّلُ وحدَه** لا الصفُّ كلُّه: صفّان يُحرَّران معاً في
 * شاشتين لا يمحو أحدُهما عملَ الآخر، ولا يُعاد كتابةُ عشرة أعمدةٍ لتغيير رقم.
 *
 * واسمُ الحقل يُفحص قبل أن يُكتب (`isStepField`): ما يأتي من الشاشة نصٌّ، ولا
 * يُبنى منه مفتاحُ عمودٍ في القاعدة بلا سؤال.
 *
 * والحارسُ هو حارسُ النافذة نفسُه، والفحصُ فحصُها — فلا يُقبل من بابٍ ما يُردّ
 * من الآخر.
 */
export async function updateStepField(id: string, field: string, value: string): Promise<Result> {
  try {
    if (!isStepField(field)) return { error: "حقلٌ غير معروف" };

    const row = await prisma.initiativeStep.findUnique({
      where: { id },
      select: {
        initiativeId: true,
        initiative: { select: { plan: { select: { charityId: true, weekCount: true } } } },
      },
    });
    if (!row) return { error: "خطوةٌ غير موجودة" };

    const { charityId, weekCount } = row.initiative.plan;
    await requireInitiativeAccess(row.initiativeId);

    const parsed = parseStepField(field, value, weekCount);
    if ("error" in parsed) return { error: parsed.error };

    await prisma.initiativeStep.update({ where: { id }, data: { [field]: parsed.value } });
    await syncInitiativeFromSteps(row.initiativeId);
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
    const { initiativeId, charityId } = await initiativeOfStep(id);
    await requireInitiativeAccess(initiativeId);

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
  if (raw === "FORBIDDEN_INITIATIVE") return "لا تملك صلاحية تعديل هذه المبادرة";
  return raw;
}
