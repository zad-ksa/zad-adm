import { Axis, Goal, Indicator } from "./types";

export const hasData = (val: any) => val !== null && val !== undefined && String(val).trim() !== "";

export const parseValueToNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  if (str.endsWith("%")) {
    const num = parseFloat(str.replace("%", ""));
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export const getQuarterTarget = (ind: Indicator, quarter: string) => ind[`${quarter.toLowerCase()}Target` as keyof Indicator] as any;
export const getQuarterAchieved = (ind: Indicator, quarter: string) => ind[`${quarter.toLowerCase()}Achieved` as keyof Indicator] as any;

export const isGoalPostponed = (goal: Goal) => {
  return goal.indicators.length > 0 && goal.indicators.every(ind => ind.postponed);
};

export const isAxisPostponed = (axis: Axis) => {
  const goalsWithIndicators = axis.goals.filter(g => g.indicators.length > 0);
  return goalsWithIndicators.length > 0 && goalsWithIndicators.every(g => isGoalPostponed(g));
};

export const isCharityPostponed = (axes: Axis[]) => {
  const axesWithIndicators = axes.filter(a => a.goals.some(g => g.indicators.length > 0));
  return axesWithIndicators.length > 0 && axesWithIndicators.every(a => isAxisPostponed(a));
};

export const calcPercentage = (achieved: any, target: any) => {
  if (!hasData(achieved) || !hasData(target)) return 0;
  const parsedAchieved = parseValueToNumber(achieved);
  const parsedTarget = parseValueToNumber(target);
  
  if (parsedTarget === 0) {
    return parsedAchieved >= 0 ? 100 : 0;
  }
  const val = (parsedAchieved / parsedTarget) * 100;
  return Math.min(Math.round(val * 10) / 10, 100); // Max 100%
};

export const calcIndicatorPerf = (ind: Indicator, quarter: string) => {
  if (ind.postponed) return 0;
  return calcPercentage(getQuarterAchieved(ind, quarter), getQuarterTarget(ind, quarter));
};

export const calcGoalPerf = (goal: Goal, quarter: string) => {
  if (isGoalPostponed(goal)) return 0;
  const activeIndicators = goal.indicators.filter(ind => !ind.postponed);
  if (activeIndicators.length === 0) return 0;
  const total = activeIndicators.reduce((acc, ind) => acc + calcIndicatorPerf(ind, quarter), 0);
  return Math.round((total / activeIndicators.length) * 10) / 10;
};

export const calcAxisPerf = (axis: Axis, quarter: string) => {
  if (isAxisPostponed(axis)) return 0;
  const activeGoals = axis.goals.filter(g => g.indicators.length > 0 && !isGoalPostponed(g));
  if (activeGoals.length === 0) return 0;
  const total = activeGoals.reduce((acc, goal) => acc + calcGoalPerf(goal, quarter), 0);
  return Math.round((total / activeGoals.length) * 10) / 10;
};

export const calcCharityPerf = (axes: Axis[], quarter: string) => {
  if (isCharityPostponed(axes)) return 0;
  const activeAxes = axes.filter(a => a.goals.some(g => g.indicators.length > 0) && !isAxisPostponed(a));
  if (activeAxes.length === 0) return 0;
  const total = activeAxes.reduce((acc, axis) => acc + calcAxisPerf(axis, quarter), 0);
  return Math.round((total / activeAxes.length) * 10) / 10;
};

// Colors and badges logic based on user request:
// - Target Met (>= 90%): Green
// - Acceptable (70% - 89%): Yellow/Orange
// - At Risk (0% - 69%): Red
// - No Data: Grey
// - Postponed: Blue (The original app used Amber for postponed, but the user explicitly requested "اللون: أزرق" for postponed here, so we will use Blue).

export const getReportClassification = (val: number, hasDataValue = true, isPostponed = false) => {
  if (isPostponed) return { text: "مؤجل", color: "bg-blue-100 text-blue-700 border-blue-200", hex: "#3b82f6" };
  if (!hasDataValue) return { text: "لا توجد بيانات", color: "bg-gray-100 text-gray-500 border-gray-200", hex: "#9ca3af" };
  if (val >= 90) return { text: "ممتاز", color: "bg-emerald-100 text-emerald-700 border-emerald-200", hex: "#10b981" };
  if (val >= 70) return { text: "مقبول", color: "bg-amber-100 text-amber-700 border-amber-200", hex: "#f59e0b" };
  return { text: "خطر", color: "bg-red-100 text-red-700 border-red-200", hex: "#ef4444" };
};
