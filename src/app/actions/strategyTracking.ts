"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertCharityAccess } from "@/lib/access";
import { QUARTERS, type Quarter } from "@/lib/indicatorScore";

/**
 * قراءة متابعة الأداء وكتابتها على الجداول العلائقية.
 *
 * كان مقياس الأداء يحفظ شجرته كلّها في حقل JSON واحد لكل (اسم جمعية، سنة) —
 * فلا يُستعلم عن مؤشرٍ بعينه، ولا يُربط بمبادرة، والجمعية مربوطةٌ بالاسم نصاً.
 * وهنا تصير الشجرة صفوفاً: محورٌ وهدفٌ ومؤشر، ونتيجةٌ لكل (مؤشر، سنة، فترة).
 *
 * وعقد الواجهة لم يتغيّر: الجدول يحمل شجرته في حالته ويحفظها دفعةً واحدة بزرٍّ
 * واحد، كما كان. والفرق في موضع الحفظ لا في طريقته.
 */

export type TrackingValue = string | number | null | undefined;

export type TrackingIndicator = {
  id: string;
  code?: string;
  name: string;
  owner?: string | null;
  baseline?: TrackingValue;
  cumulative?: boolean;
  annualTarget?: TrackingValue;
  /** متحققٌ سنويٌّ أُدخل يدوياً فيتجاوز الحساب من الأرباع. */
  annualAchieved?: TrackingValue;
  annualOverride?: boolean;
  q1Target?: TrackingValue;
  q1Achieved?: TrackingValue;
  q2Target?: TrackingValue;
  q2Achieved?: TrackingValue;
  q3Target?: TrackingValue;
  q3Achieved?: TrackingValue;
  q4Target?: TrackingValue;
  q4Achieved?: TrackingValue;
  postponed?: boolean;
};

export type TrackingGoal = {
  id: string;
  code?: string;
  name: string;
  indicators: TrackingIndicator[];
};

export type TrackingAxis = {
  id: string;
  name: string;
  prefix?: string;
  goals: TrackingGoal[];
};

type Result = { success: boolean; error?: string };

/** «90%» و«90» كلتاهما ٩٠. والفراغ فراغٌ لا صفر. */
function toNumber(value: TrackingValue): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = parseFloat(raw.endsWith("%") ? raw.slice(0, -1) : raw);
  return Number.isFinite(n) ? n : null;
}

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function requireAccess(charityId: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  if (!hasPermission(session.role, session.permissions, "manage_strategy")) throw new Error("FORBIDDEN");
  await assertCharityAccess(session.id, session.role, charityId);
  return session;
}

/**
 * يحفظ الشجرة والنتائج معاً.
 *
 * ولا يحذف محوراً ولا هدفاً: الجدول لا يملك زرّ حذفٍ لهما، فحذفُهما هنا يعني
 * أن خطأً في الحِمل يمحو الدليل. أما المؤشرات فللجدول زرُّ حذفها، فما غاب من
 * حِملٍ يحمل أهدافَه يُحذف — والشرطُ أن يكون هدفُه حاضراً في الحِمل.
 */
export async function saveTracking(input: {
  charityId: string;
  year: number;
  axes: TrackingAxis[];
}): Promise<Result> {
  try {
    await requireAccess(input.charityId);
    const { charityId, year, axes } = input;

    const existingPerspectives = await prisma.strategyPerspective.findMany({
      where: { charityId },
      select: { id: true, prefix: true },
    });
    const byPrefix = new Map(existingPerspectives.map((p) => [p.prefix, p.id]));

    const touchedObjectiveIds: string[] = [];
    const keptIndicatorIds: string[] = [];

    for (const [axisIndex, axis] of axes.entries()) {
      const prefix = (axis.prefix || "").trim() || `م${axisIndex + 1}`;
      const name = axis.name.trim() || `محور ${axisIndex + 1}`;

      let perspectiveId = isUuid(axis.id) ? axis.id : byPrefix.get(prefix);
      if (perspectiveId) {
        await prisma.strategyPerspective.update({
          where: { id: perspectiveId },
          data: { name, prefix, order: axisIndex + 1 },
        });
      } else {
        const created = await prisma.strategyPerspective.create({
          data: { charityId, name, prefix, order: axisIndex + 1 },
        });
        perspectiveId = created.id;
        byPrefix.set(prefix, perspectiveId);
      }

      for (const [goalIndex, goal] of axis.goals.entries()) {
        // الرمز من الدليل إن وُجد، وإلا يُشتقّ من الموضع لصفٍّ جديد — ولا
        // يُدهس رمزٌ مكتوب: رموز الوثيقة «س 1» لا «س-1».
        const code = (goal.code || "").trim() || `${prefix} ${goalIndex + 1}`;
        const goalName = goal.name.trim() || `هدف ${goalIndex + 1}`;

        let objectiveId = isUuid(goal.id) ? goal.id : null;
        if (!objectiveId) {
          const found = await prisma.strategyObjective.findFirst({
            where: { perspectiveId, code },
            select: { id: true },
          });
          objectiveId = found?.id ?? null;
        }

        if (objectiveId) {
          await prisma.strategyObjective.update({
            where: { id: objectiveId },
            data: { code, name: goalName, order: goalIndex + 1 },
          });
        } else {
          const created = await prisma.strategyObjective.create({
            data: { perspectiveId, code, name: goalName, order: goalIndex + 1 },
          });
          objectiveId = created.id;
        }
        touchedObjectiveIds.push(objectiveId);

        for (const [indicatorIndex, indicator] of goal.indicators.entries()) {
          const indicatorCode = (indicator.code || "").trim() || `${code} - ${indicatorIndex + 1}`;
          const indicatorName = indicator.name.trim() || `مؤشر ${indicatorIndex + 1}`;

          let indicatorId = isUuid(indicator.id) ? indicator.id : null;
          if (!indicatorId) {
            const found = await prisma.strategyIndicator.findFirst({
              where: { objectiveId, code: indicatorCode },
              select: { id: true },
            });
            indicatorId = found?.id ?? null;
          }

          const indicatorData = {
            code: indicatorCode,
            name: indicatorName,
            owner: indicator.owner?.trim() || null,
            baseline: toNumber(indicator.baseline),
            order: indicatorIndex + 1,
            ...(indicator.cumulative === undefined ? {} : { cumulative: indicator.cumulative }),
          };

          if (indicatorId) {
            await prisma.strategyIndicator.update({ where: { id: indicatorId }, data: indicatorData });
          } else {
            const created = await prisma.strategyIndicator.create({
              data: { ...indicatorData, objectiveId },
            });
            indicatorId = created.id;
          }
          keptIndicatorIds.push(indicatorId);

          await writeResults(indicatorId, year, indicator);
        }
      }
    }

    // حذفُ ما حذفه المستخدم من مؤشرات، في نطاق الأهداف الحاضرة وحدها.
    if (touchedObjectiveIds.length > 0) {
      await prisma.strategyIndicator.deleteMany({
        where: {
          objectiveId: { in: touchedObjectiveIds },
          ...(keptIndicatorIds.length > 0 ? { id: { notIn: keptIndicatorIds } } : {}),
        },
      });
    }

    const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
    if (charity) revalidatePath(`/main/strategy/${encodeURIComponent(charity.name)}`, "layout");

    return { success: true };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error("saveTracking failed:", raw);
    if (raw === "UNAUTHORIZED") return { success: false, error: "الجلسة منتهية — أعد الدخول" };
    if (raw === "FORBIDDEN") return { success: false, error: "لا تملك صلاحية إدارة الاستراتيجية" };
    return { success: false, error: raw };
  }
}

/**
 * نتائج مؤشرٍ واحد لسنةٍ واحدة: صفٌّ للسنة وأربعةٌ لأرباعها.
 *
 * و«مؤجل» في الجدول علامةٌ على المؤشر كلّه، فتُكتب حالةً `POSTPONED` على
 * الصفوف الخمسة — وفي القاعدة متّسعٌ لتأجيل ربعٍ وحده، وهو ما تحتاجه الوثيقة.
 */
async function writeResults(indicatorId: string, year: number, indicator: TrackingIndicator) {
  const state = indicator.postponed ? "POSTPONED" : "ACTIVE";

  const rows: Array<{ period: string; target: number | null; actual: number | null; isOverride: boolean }> = [
    {
      period: "YEAR",
      target: toNumber(indicator.annualTarget),
      actual: indicator.annualOverride ? toNumber(indicator.annualAchieved) : null,
      isOverride: Boolean(indicator.annualOverride),
    },
  ];

  const quarterField = (q: Quarter, kind: "Target" | "Achieved") =>
    indicator[`${q.toLowerCase()}${kind}` as keyof TrackingIndicator] as TrackingValue;

  for (const q of QUARTERS) {
    rows.push({
      period: q,
      target: toNumber(quarterField(q, "Target")),
      actual: toNumber(quarterField(q, "Achieved")),
      isOverride: false,
    });
  }

  for (const row of rows) {
    const empty = row.target === null && row.actual === null && state === "ACTIVE";
    const existing = await prisma.indicatorResult.findUnique({
      where: { indicatorId_year_period: { indicatorId, year, period: row.period } },
      select: { id: true, note: true },
    });

    // صفٌّ فارغٌ تماماً لا يُنشأ: فراغٌ محفوظٌ وفراغٌ غير محفوظ سواء، وإنشاؤه
    // يُضخّم الجدول بخمسة صفوفٍ لكل مؤشرٍ لم يُدخل له شيء.
    if (!existing && empty) continue;

    if (existing) {
      await prisma.indicatorResult.update({
        where: { id: existing.id },
        data: { target: row.target, actual: row.actual, state, isOverride: row.isOverride },
      });
    } else {
      await prisma.indicatorResult.create({
        data: { indicatorId, year, period: row.period, target: row.target, actual: row.actual, state, isOverride: row.isOverride },
      });
    }
  }
}

/**
 * شجرة متابعة الأداء لسنةٍ واحدة، بشكل الجدول نفسه — فالواجهة لم تتغيّر.
 */
export async function getTracking(charityId: string, year: number): Promise<TrackingAxis[]> {
  const perspectives = await prisma.strategyPerspective.findMany({
    where: { charityId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      objectives: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          code: true,
          name: true,
          indicators: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              code: true,
              name: true,
              owner: true,
              baseline: true,
              cumulative: true,
              results: { where: { year }, select: { period: true, target: true, actual: true, state: true, isOverride: true } },
            },
          },
        },
      },
    },
  });

  const text = (v: unknown) => (v === null || v === undefined ? null : String(v));

  return perspectives.map((p) => ({
    id: p.id,
    name: p.name,
    prefix: p.prefix,
    goals: p.objectives.map((o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      indicators: o.indicators.map((i) => {
        const byPeriod = new Map(i.results.map((r) => [r.period, r]));
        const yearRow = byPeriod.get("YEAR");
        const q = (period: Quarter, kind: "target" | "actual") => text(byPeriod.get(period)?.[kind]);

        return {
          id: i.id,
          code: i.code,
          name: i.name,
          owner: i.owner,
          baseline: text(i.baseline),
          cumulative: i.cumulative,
          annualTarget: text(yearRow?.target),
          annualAchieved: text(yearRow?.actual),
          annualOverride: Boolean(yearRow?.isOverride),
          q1Target: q("Q1", "target"),
          q1Achieved: q("Q1", "actual"),
          q2Target: q("Q2", "target"),
          q2Achieved: q("Q2", "actual"),
          q3Target: q("Q3", "target"),
          q3Achieved: q("Q3", "actual"),
          q4Target: q("Q4", "target"),
          q4Achieved: q("Q4", "actual"),
          postponed: i.results.some((r) => r.state === "POSTPONED"),
        };
      }),
    })),
  }));
}
