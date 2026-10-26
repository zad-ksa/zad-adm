import { prisma } from "@/lib/db";
import { QUARTERS, entryCompletion, type IndicatorScoreInput, type PeriodResult, type ResultState } from "./indicatorScore";

/**
 * أرقام صفحة الاستراتيجية ومربّعاتها — في موضعٍ واحد كي لا تتفرّق الاستعلامات
 * على خمس صفحاتٍ فتختلف أرقامها.
 *
 * ولا شيء منها مخزَّن: كلّها عدٌّ وحساب عند العرض.
 */

export type StrategySummary = {
  perspectives: number;
  objectives: number;
  indicators: number;
  initiatives: number;
  plans: number;
  /** نسبة المؤشرات التي أُدخل لها متحقق في السنة المطلوبة. */
  entryCompletion: number | null;
  readinessResponses: number;
  hexagonalResponses: number;
  visionMissionResponses: number;
};

/** السنة الافتراضية: سنة اليوم. ولا تُثبَّت في عمودٍ ولا في اسم حقل. */
export const currentPlanYear = () => new Date().getFullYear();

export async function getStrategySummary(charityId: string, charityName: string, year = currentPlanYear()): Promise<StrategySummary> {
  const [perspectives, objectives, indicators, initiatives, plans, readiness, hexagonal, visionMission, results] =
    await Promise.all([
      prisma.strategyPerspective.count({ where: { charityId } }),
      prisma.strategyObjective.count({ where: { perspective: { charityId } } }),
      prisma.strategyIndicator.count({ where: { objective: { perspective: { charityId } } } }),
      prisma.initiative.count({ where: { plan: { charityId } } }),
      prisma.operationalPlan.count({ where: { charityId } }),
      // الجدولان القديمان يربطان بالاسم نصاً، فالمطابقة بلا حساسيةٍ للحالة كما
      // في صفحتيهما. وإصلاح الربط بـcharityId مرحلةٌ مستقلّة في الخطة.
      prisma.surveyResponse.count({ where: { charityName: { equals: charityName, mode: "insensitive" } } }),
      prisma.hexagonalResponse.count({ where: { charityName: { equals: charityName, mode: "insensitive" } } }),
      prisma.visionMissionResponse.count({ where: { charityId } }),
      prisma.indicatorResult.findMany({
        where: { year, indicator: { objective: { perspective: { charityId } } } },
        select: { indicatorId: true, period: true, target: true, actual: true, state: true, isOverride: true },
      }),
    ]);

  return {
    perspectives,
    objectives,
    indicators,
    initiatives,
    plans,
    entryCompletion: entryCompletion(toScoreInputs(results)),
    readinessResponses: readiness,
    hexagonalResponses: hexagonal,
    visionMissionResponses: visionMission,
  };
}

type ResultRow = {
  indicatorId: string;
  period: string;
  target: unknown;
  actual: unknown;
  state: string;
  isOverride?: boolean;
};

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toState = (v: string): ResultState =>
  v === "POSTPONED" || v === "NO_DATA" ? v : "ACTIVE";

const EMPTY: PeriodResult = { target: null, actual: null, state: "ACTIVE" };

/**
 * صفوف `IndicatorResult` المسطّحة إلى مُدخلات دالّة الحساب — بتجميعها على
 * المؤشر. و`cumulative` لا تلزم هنا: `entryCompletion` لا تقرأها.
 */
export function toScoreInputs(rows: ResultRow[], cumulativeById: Record<string, boolean> = {}): IndicatorScoreInput[] {
  const byIndicator = new Map<string, IndicatorScoreInput>();

  for (const row of rows) {
    let entry = byIndicator.get(row.indicatorId);
    if (!entry) {
      entry = { cumulative: cumulativeById[row.indicatorId] ?? false, year: { ...EMPTY }, quarters: {} };
      byIndicator.set(row.indicatorId, entry);
    }
    const value: PeriodResult = {
      target: toNumber(row.target),
      actual: toNumber(row.actual),
      state: toState(row.state),
      isOverride: row.isOverride ?? false,
    };
    if (row.period === "YEAR") entry.year = value;
    else if ((QUARTERS as readonly string[]).includes(row.period)) {
      entry.quarters[row.period as (typeof QUARTERS)[number]] = value;
    }
  }

  return [...byIndicator.values()];
}
