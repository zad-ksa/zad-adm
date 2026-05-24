"use client";

import { useState, useTransition, useEffect } from "react";
import { savePerformanceMetric } from "@/app/actions/performance";
import { useRouter } from "next/navigation";

type Indicator = {
  id: string;
  code: string;
  name: string;
  status: string;
  owner: string;
  annualTarget: number;
  annualAchieved: number;
  q1Target: number; q1Achieved: number | null;
  q2Target: number; q2Achieved: number | null;
  q3Target: number; q3Achieved: number | null;
  q4Target: number; q4Achieved: number | null;
  postponed?: boolean;
};

type Goal = {
  id: string;
  code: string;
  name: string;
  indicators: Indicator[];
};

type Axis = {
  id: string;
  name: string;
  goals: Goal[];
  prefix?: string;
};

const getAxisDefaultPrefix = (axisId: string) => {
  switch (axisId) {
    case "1": return "س";
    case "2": return "ص";
    case "3": return "م";
    case "4": return "ل";
    case "5": return "ت";
    default: return "غ";
  }
};

const DEFAULT_AXES: Axis[] = [
  { id: "1", name: "المستفيدين", goals: [], prefix: "س" },
  { id: "2", name: "أصحاب المصلحة", goals: [], prefix: "ص" },
  { id: "3", name: "المالي", goals: [], prefix: "م" },
  { id: "4", name: "العمليات الداخلية", goals: [], prefix: "ل" },
  { id: "5", name: "التعلم والنمو", goals: [], prefix: "ت" },
];

export default function PerformanceTable({ 
  charityName, 
  year, 
  quarter, 
  initialData 
}: { 
  charityName: string; 
  year: number; 
  quarter: string; 
  initialData: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Exit fullscreen on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [axes, setAxes] = useState<Axis[]>(() => {
    if (!initialData) return DEFAULT_AXES;
    
    let loadedAxes: Axis[] = [];
    if (Array.isArray(initialData)) {
      loadedAxes = initialData;
    } else if (initialData && typeof initialData === "object" && "axes" in initialData) {
      loadedAxes = (initialData as any).axes || DEFAULT_AXES;
    } else {
      return DEFAULT_AXES;
    }

    // Initialize prefix, falling back to new defaults and normalise indicators
    return loadedAxes.map(axis => ({
      ...axis,
      prefix: axis.prefix || getAxisDefaultPrefix(axis.id),
      goals: (axis.goals || []).map(goal => ({
        ...goal,
        indicators: (goal.indicators || []).map(ind => ({
          ...ind,
          postponed: ind.postponed || false,
          q1Achieved: ind.q1Achieved === undefined ? null : ind.q1Achieved,
          q2Achieved: ind.q2Achieved === undefined ? null : ind.q2Achieved,
          q3Achieved: ind.q3Achieved === undefined ? null : ind.q3Achieved,
          q4Achieved: ind.q4Achieved === undefined ? null : ind.q4Achieved,
        }))
      }))
    }));
  });

  const updateAxisPrefix = (axisId: string, value: string) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return { ...axis, prefix: value };
      }
      return axis;
    }));
  };

  const [editingAxis, setEditingAxis] = useState<{ id: string; name: string; prefix: string } | null>(null);
  const [modalInput, setModalInput] = useState<string>("");

  const handleAxisPrefixClick = (axisId: string, axisName: string, currentPrefix: string) => {
    setEditingAxis({ id: axisId, name: axisName, prefix: currentPrefix });
    setModalInput(currentPrefix);
  };

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Update URL params
  const handlePeriodChange = (newYear: number, newQuarter: string) => {
    startTransition(() => {
      router.push(`/dashboard/charity/${encodeURIComponent(charityName)}/performance?year=${newYear}&quarter=${newQuarter}`);
    });
  };

  // Add Goal
  const addGoal = (axisId: string) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: [...axis.goals, { id: generateId(), code: "غ-١", name: "هدف جديد", indicators: [] }]
        };
      }
      return axis;
    }));
  };

  // Add Indicator
  const addIndicator = (axisId: string, goalId: string) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: axis.goals.map(goal => {
            if (goal.id === goalId) {
              return {
                ...goal,
                indicators: [...goal.indicators, {
                  id: generateId(),
                  code: "م-١",
                  name: "مؤشر جديد",
                  status: "لا توجد بيانات",
                  owner: "",
                  annualTarget: 0,
                  annualAchieved: 0,
                  q1Target: 0, q1Achieved: null,
                  q2Target: 0, q2Achieved: null,
                  q3Target: 0, q3Achieved: null,
                  q4Target: 0, q4Achieved: null,
                  postponed: false,
                }]
              };
            }
            return goal;
          })
        };
      }
      return axis;
    }));
  };

  // Update Field
  const updateIndicator = (axisId: string, goalId: string, indId: string, field: keyof Indicator, value: any) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: axis.goals.map(goal => {
            if (goal.id === goalId) {
              return {
                ...goal,
                indicators: goal.indicators.map(ind => {
                  if (ind.id === indId) {
                    return { ...ind, [field]: value };
                  }
                  return ind;
                })
              };
            }
            return goal;
          })
        };
      }
      return axis;
    }));
  };

  const updateGoal = (axisId: string, goalId: string, field: keyof Goal, value: any) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: axis.goals.map(goal => {
            if (goal.id === goalId) {
              return { ...goal, [field]: value };
            }
            return goal;
          })
        };
      }
      return axis;
    }));
  }

  const deleteIndicator = (axisId: string, goalId: string, indId: string) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: axis.goals.map(goal => {
            if (goal.id === goalId) {
              return { ...goal, indicators: goal.indicators.filter(i => i.id !== indId) };
            }
            return goal;
          })
        };
      }
      return axis;
    }));
  };

  // Helpers
  const hasData = (val: any) => val !== null && val !== undefined && val !== "";

  const getAnnualTargetValue = (ind: Indicator) => {
    return (ind.q1Target || 0) + (ind.q2Target || 0) + (ind.q3Target || 0) + (ind.q4Target || 0);
  };

  const getAnnualAchievedValue = (ind: Indicator) => {
    if (ind.q1Achieved === null && ind.q2Achieved === null && ind.q3Achieved === null && ind.q4Achieved === null) {
      return null;
    }
    return (ind.q1Achieved || 0) + (ind.q2Achieved || 0) + (ind.q3Achieved || 0) + (ind.q4Achieved || 0);
  };

  const getIndicatorStatus = (ind: Indicator) => {
    if (ind.postponed) return "مؤجل";
    const achieved = getQuarterAchieved(ind);
    if (!hasData(achieved)) return "لا توجد بيانات";
    const target = getQuarterTarget(ind) || 0;
    if (Number(achieved) >= target) return "مكتمل";
    return "جاري";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "مؤجل":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "لا توجد بيانات":
        return "bg-slate-100 text-slate-500 border border-slate-200";
      case "مكتمل":
        return "bg-emerald-50 text-emerald-600 border border-emerald-200";
      case "جاري":
      default:
        return "bg-blue-50 text-blue-600 border border-blue-200";
    }
  };

  const togglePostponeIndicator = (axisId: string, goalId: string, indId: string) => {
    setAxes(prev => prev.map(axis => {
      if (axis.id === axisId) {
        return {
          ...axis,
          goals: axis.goals.map(goal => {
            if (goal.id === goalId) {
              return {
                ...goal,
                indicators: goal.indicators.map(ind => {
                  if (ind.id === indId) {
                    return { ...ind, postponed: !ind.postponed };
                  }
                  return ind;
                })
              };
            }
            return goal;
          })
        };
      }
      return axis;
    }));
  };

  // Calculations
  const getQuarterTarget = (ind: Indicator) => ind[`${quarter.toLowerCase()}Target` as keyof Indicator] as number;
  const getQuarterAchieved = (ind: Indicator) => ind[`${quarter.toLowerCase()}Achieved` as keyof Indicator] as number | null;

  const calcPercentage = (achieved: number | null, target: number) => {
    if (!hasData(achieved)) return 0;
    if (target === 0) return achieved !== null && achieved >= 0 ? 100 : 0;
    const val = (Number(achieved) / target) * 100;
    return Math.min(Math.round(val * 10) / 10, 100); // Max 100%
  };

  const calcIndicatorPerf = (ind: Indicator) => {
    if (ind.postponed) return 0;
    return calcPercentage(getQuarterAchieved(ind), getQuarterTarget(ind));
  };

  const calcGoalPerf = (goal: Goal) => {
    const activeIndicators = goal.indicators.filter(ind => !ind.postponed);
    if (activeIndicators.length === 0) return 0;
    const total = activeIndicators.reduce((acc, ind) => acc + calcIndicatorPerf(ind), 0);
    return Math.round((total / activeIndicators.length) * 10) / 10;
  };

  const calcAxisPerf = (axis: Axis) => {
    const goalsWithActiveIndicators = axis.goals.filter(g => g.indicators.some(ind => !ind.postponed));
    if (goalsWithActiveIndicators.length === 0) return 0;
    const total = goalsWithActiveIndicators.reduce((acc, goal) => acc + calcGoalPerf(goal), 0);
    return Math.round((total / goalsWithActiveIndicators.length) * 10) / 10;
  };

  const calcCharityPerf = () => {
    const axesWithActiveData = axes.filter(a => a.goals.some(g => g.indicators.some(ind => !ind.postponed)));
    if (axesWithActiveData.length === 0) return 0;
    const total = axesWithActiveData.reduce((acc, axis) => acc + calcAxisPerf(axis), 0);
    return Math.round((total / axesWithActiveData.length) * 10) / 10;
  };

  // Color logic
  const getPerfColor = (val: number, hasDataValue = true, isPostponed = false) => {
    if (isPostponed) return "bg-amber-100 text-amber-700 border border-amber-200";
    if (!hasDataValue) return "bg-slate-100 text-slate-500 border border-slate-200";
    if (val >= 90) return "bg-[#00b050] text-white"; // Excellent
    if (val >= 70) return "bg-[#92d050] text-slate-800"; // Good
    if (val >= 50) return "bg-[#ffc000] text-slate-800"; // Acceptable
    return "bg-[#ff0000] text-white"; // Weak
  };

  const getClassification = (val: number, hasDataValue = true, isPostponed = false) => {
    if (isPostponed) return { text: "مؤجل", icon: "⏸️", color: "text-amber-600" };
    if (!hasDataValue) return { text: "لا توجد بيانات", icon: "⚪", color: "text-slate-400" };
    if (val >= 90) return { text: "ممتاز", icon: "✅", color: "text-[#00b050]" };
    if (val >= 70) return { text: "جيد", icon: "✓", color: "text-[#92d050]" };
    if (val >= 50) return { text: "مقبول", icon: "⚠️", color: "text-[#ffc000]" };
    return { text: "ضعيف", icon: "❌", color: "text-[#ff0000]" };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedAxes = axes.map(axis => {
        const aPrefix = axis.prefix || getAxisDefaultPrefix(axis.id);
        return {
          ...axis,
          prefix: aPrefix,
          goals: axis.goals.map((goal, goalIndex) => {
            const gCode = `${aPrefix}-${goalIndex + 1}`;
            return {
              ...goal,
              code: gCode,
              indicators: goal.indicators.map((ind, iIdx) => ({
                ...ind,
                code: `${gCode}-${iIdx + 1}`,
                status: getIndicatorStatus(ind),
                annualTarget: getAnnualTargetValue(ind),
                annualAchieved: getAnnualAchievedValue(ind) ?? 0
              }))
            };
          })
        };
      });

      const res = await savePerformanceMetric(charityName, year, updatedAxes);
      if (res.success) {
        alert("تم الحفظ بنجاح");
      } else {
        alert(`حدث خطأ أثناء الحفظ: ${res.error}`);
      }
    } catch (e: any) {
      alert(`حدث خطأ أثناء الحفظ: ${e?.message || String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const totalPerf = calcCharityPerf();

  return (
    <div className={`space-y-6 transition-all duration-300 ${
      isFullScreen 
        ? "fixed inset-0 z-[9999] bg-slate-50 p-6 sm:p-8 flex flex-col w-screen h-screen overflow-hidden" 
        : ""
    }`}>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-100 p-4 rounded-xl border border-slate-200 shrink-0">
        <div className="flex gap-4">
          <select
            value={year}
            onChange={(e) => handlePeriodChange(parseInt(e.target.value), quarter)}
            className="px-4 py-2 rounded-lg border border-slate-300 font-bold bg-white"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={quarter}
            onChange={(e) => handlePeriodChange(year, e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-300 font-bold bg-white"
          >
            <option value="Q1">الربع الأول</option>
            <option value="Q2">الربع الثاني</option>
            <option value="Q3">الربع الثالث</option>
            <option value="Q4">الربع الرابع</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-bold bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <span>أداء الجمعية:</span>
            <span className={`px-2 py-0.5 rounded font-black ${getPerfColor(totalPerf)}`}>
              {totalPerf}%
            </span>
          </div>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded-lg font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer select-none active:scale-[0.98]"
            title={isFullScreen ? "خروج من وضع ملء الشاشة (Esc)" : "تفعيل وضع ملء الشاشة"}
          >
            {isFullScreen ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
                </svg>
                <span>خروج من ملء الشاشة</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                <span>ملء الشاشة</span>
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`border border-slate-300 rounded-xl shadow-sm bg-white ${
        isFullScreen 
          ? "flex-1 overflow-auto w-full pb-[200px]" 
          : "overflow-x-auto w-full pb-[200px]"
      }`}>
        <table className="w-full text-center border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-[#1f4e78] text-white font-bold text-xs">
              <th className="border border-slate-400 p-2 min-w-[120px]">المحور</th>
              <th className="border border-slate-400 p-2 w-[80px]">رمز الهدف</th>
              <th className="border border-slate-400 p-2 min-w-[200px]">الهدف</th>
              <th className="border border-slate-400 p-2 w-[80px]">رمز المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[300px]">المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[120px]">حالة المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[120px]">مالك المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#2f75b5]">المستهدف السنوي</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#2f75b5]">المحقق السنوي</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#2f75b5]">نسبة الإنجاز (سنوي)</th>
              <th className="border border-slate-400 p-2 min-w-[100px] bg-[#2f75b5]">تصنيف المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#00b0f0]">المستهدف ({quarter})</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#00b0f0]">المتحقق ({quarter})</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#00b0f0]">أداء المؤشر</th>
              <th className="border border-slate-400 p-2 min-w-[80px]">أداء الهدف</th>
              <th className="border border-slate-400 p-2 min-w-[80px]">أداء المحور</th>
              <th className="border border-slate-400 p-2 min-w-[80px] bg-[#385723]">أداء الجمعية</th>
              <th className="border border-slate-400 p-2 min-w-[80px]">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {axes.map((axis, axisIndex) => {
              const axisRowSpan = Math.max(1, axis.goals.reduce((acc, g) => acc + Math.max(1, g.indicators.length), 0));
              const aPerf = calcAxisPerf(axis);
              const aPrefix = axis.prefix || getAxisDefaultPrefix(axis.id);

              return (
                <>
                  {axis.goals.length === 0 ? (
                    <tr key={axis.id} className="border-b border-slate-300 hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 bg-[#2f75b5] text-white font-bold align-middle w-12" rowSpan={1}>
                        <div className="flex flex-col items-center gap-2">
                          <span className="writing-vertical text-center">{axis.name}</span>
                          <span className="text-[10px] text-white/80 font-bold bg-white/10 px-1.5 py-0.5 rounded mt-1">الرمز: {aPrefix}</span>
                          <button onClick={() => addGoal(axis.id)} className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded mt-1">+</button>
                        </div>
                      </td>
                      <td colSpan={17} className="border border-slate-300 p-4 text-slate-400">
                        لا توجد أهداف في هذا المحور. أضف هدفاً للبدء.
                        <button onClick={() => addGoal(axis.id)} className="mr-4 text-primary underline font-bold">إضافة هدف</button>
                      </td>
                    </tr>
                  ) : null}

                  {axis.goals.map((goal, goalIndex) => {
                    const goalRowSpan = Math.max(1, goal.indicators.length);
                    const gPerf = calcGoalPerf(goal);
                    const goalCode = `${aPrefix}-${goalIndex + 1}`;

                    return (
                      <>
                        {goal.indicators.length === 0 ? (
                          <tr 
                            key={goal.id} 
                            className={`border-b border-slate-300 transition-colors group
                              ${goalIndex > 0 ? "border-t-2 border-t-slate-400/80" : ""}
                              ${goalIndex % 2 !== 0 ? "bg-slate-100/30 hover:bg-blue-50/50" : "bg-white hover:bg-blue-50/50"}
                            `}
                          >
                            {goalIndex === 0 && (
                              <td className="border border-slate-300 p-2 bg-[#2f75b5] text-white font-bold align-middle w-12" rowSpan={axisRowSpan}>
                                <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[100px]">
                                  <span className="text-center font-bold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{axis.name}</span>
                                  <span className="text-[10px] text-white/80 font-bold bg-white/10 px-1.5 py-0.5 rounded mt-1">الرمز: {aPrefix}</span>
                                  <button onClick={() => addGoal(axis.id)} className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded mt-2">م. جديد</button>
                                </div>
                              </td>
                            )}
                            <td 
                              onClick={() => handleAxisPrefixClick(axis.id, axis.name, aPrefix)}
                              title="انقر لتعديل رمز المحور"
                              className="border border-slate-300 p-1 font-bold text-slate-600 bg-slate-50 w-[80px] cursor-pointer select-none hover:bg-slate-200 transition-colors text-center"
                            >
                              {goalCode}
                            </td>
                            <td className="border border-slate-300 p-1 bg-[#d9e1f2] font-semibold text-right">
                              <input type="text" value={goal.name} onChange={e => updateGoal(axis.id, goal.id, "name", e.target.value)} className="w-full bg-transparent focus:bg-white border-0 outline-none p-1" />
                            </td>
                            <td colSpan={15} className="border border-slate-300 p-2 text-slate-400">
                              <button onClick={() => addIndicator(axis.id, goal.id)} className="text-primary underline font-bold">إضافة مؤشر</button>
                            </td>
                          </tr>
                        ) : null}

                        {goal.indicators.map((ind, indIndex) => {
                          const isFirstInd = indIndex === 0;
                          const isFirstGoal = goalIndex === 0 && isFirstInd;

                          const annualTarget = getAnnualTargetValue(ind);
                          const annualAchieved = getAnnualAchievedValue(ind);
                          const annualPerf = calcPercentage(annualAchieved, annualTarget);
                          const indPerf = calcIndicatorPerf(ind);
                          const classification = getClassification(indPerf, hasData(getQuarterAchieved(ind)), ind.postponed);

                          const targetField = `${quarter.toLowerCase()}Target` as keyof Indicator;
                          const achievedField = `${quarter.toLowerCase()}Achieved` as keyof Indicator;

                          const isOddGoal = goalIndex % 2 !== 0;
                          const isNewGoalRow = isFirstInd && !isFirstGoal;

                          return (
                            <tr 
                              key={ind.id} 
                              className={`border-b border-slate-300 transition-colors group
                                ${isNewGoalRow ? "border-t-2 border-t-slate-400/80" : ""}
                                ${
                                  ind.postponed 
                                    ? "bg-slate-50/80 text-slate-400 font-medium italic" 
                                    : isOddGoal
                                      ? "bg-slate-100/30 hover:bg-blue-50/50" 
                                      : "bg-white hover:bg-blue-50/50"
                                }
                              `}
                            >
                              {isFirstGoal && (
                                <td className="border border-slate-300 p-2 bg-[#1f4e78] text-white font-bold align-middle w-12" rowSpan={axisRowSpan}>
                                  <div className="flex flex-col items-center justify-center gap-3 h-full">
                                    <span className="text-center font-bold tracking-widest leading-loose" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{axis.name}</span>
                                    <span className="text-[10px] text-white/80 font-bold bg-white/10 px-1.5 py-0.5 rounded mt-1">الرمز: {aPrefix}</span>
                                    <button onClick={() => addGoal(axis.id)} title="إضافة هدف" className="bg-white/20 hover:bg-white/30 text-white text-xs px-2 py-1 rounded">+</button>
                                  </div>
                                </td>
                              )}

                              {isFirstInd && (
                                <>
                                  <td 
                                    onClick={() => handleAxisPrefixClick(axis.id, axis.name, aPrefix)}
                                    title="انقر لتعديل رمز المحور"
                                    className="border border-slate-300 p-1 font-bold text-slate-700 bg-slate-50 text-center w-[80px] cursor-pointer select-none hover:bg-slate-200 transition-colors"
                                    rowSpan={goalRowSpan}
                                  >
                                    {goalCode}
                                  </td>
                                  <td className="border border-slate-300 p-1 bg-[#d9e1f2] font-bold text-slate-800 text-right leading-tight max-w-[200px] whitespace-normal" rowSpan={goalRowSpan}>
                                    <textarea value={goal.name} onChange={e => updateGoal(axis.id, goal.id, "name", e.target.value)} className="w-full h-full min-h-[60px] bg-transparent focus:bg-white border-0 outline-none p-1 resize-none rounded" />
                                    <div className="mt-1">
                                      <button onClick={() => addIndicator(axis.id, goal.id)} className="text-xs text-primary bg-primary/10 px-2 py-1 rounded hover:bg-primary/20">+ مؤشر</button>
                                    </div>
                                  </td>
                                </>
                              )}

                              <td className="border border-slate-300 p-1 font-semibold text-slate-500 bg-slate-50/50 w-[80px]">
                                {goalCode}-{indIndex + 1}
                              </td>
                              <td className="border border-slate-300 p-1 text-right whitespace-normal">
                                <textarea value={ind.name} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, "name", e.target.value)} className="w-full h-full min-h-[40px] bg-transparent focus:bg-white border-0 outline-none p-1 resize-none rounded disabled:text-slate-400 disabled:cursor-not-allowed" />
                              </td>
                              <td className="border border-slate-300 p-1.5 align-middle">
                                {(() => {
                                  const status = getIndicatorStatus(ind);
                                  return (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block shadow-sm ${getStatusBadgeClass(status)}`}>
                                      {status}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="border border-slate-300 p-1">
                                <input type="text" value={ind.owner} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, "owner", e.target.value)} placeholder={ind.postponed ? "مؤجل" : "اسم المالك"} className="w-full text-center bg-transparent focus:bg-white border-0 outline-none p-1 rounded text-xs disabled:text-slate-400 disabled:cursor-not-allowed" />
                              </td>

                              {/* Annual Metrics */}
                              <td className="border border-slate-300 p-2 font-semibold text-slate-700 bg-slate-50/50">
                                {annualTarget}
                              </td>
                              <td className="border border-slate-300 p-2 font-semibold text-slate-700 bg-slate-50/50">
                                {annualAchieved ?? "-"}
                              </td>
                              <td className="border border-slate-300 p-2 font-bold text-slate-700 bg-slate-100">
                                {ind.postponed ? "مؤجل" : `${annualPerf}%`}
                              </td>

                              {/* Quarter Metrics & Classification */}
                              <td className={`border border-slate-300 p-2 font-bold text-sm ${classification.color} bg-slate-50`}>
                                {classification.icon} {classification.text}
                              </td>
                              <td className="border border-slate-300 p-1 bg-blue-50/30 font-semibold">
                                <input type="number" value={(ind[targetField] as number | null) ?? ""} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, targetField, e.target.value === "" ? null : Number(e.target.value))} className="w-16 text-center bg-transparent focus:bg-white border-b border-transparent focus:border-primary outline-none disabled:text-slate-400 disabled:cursor-not-allowed" />
                              </td>
                              <td className="border border-slate-300 p-1 bg-blue-50/30 font-semibold">
                                <input type="number" value={(ind[achievedField] as number | null) ?? ""} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, achievedField, e.target.value === "" ? null : Number(e.target.value))} className="w-16 text-center bg-transparent focus:bg-white border-b border-transparent focus:border-primary outline-none disabled:text-slate-400 disabled:cursor-not-allowed" />
                              </td>

                              {/* Performances */}
                              <td className={`border border-slate-300 p-2 font-bold ${getPerfColor(indPerf, hasData(getQuarterAchieved(ind)), ind.postponed)}`}>
                                {ind.postponed ? "مؤجل" : `${indPerf}%`}
                              </td>

                              {isFirstInd && (
                                <td className={`border border-slate-300 p-2 font-bold ${getPerfColor(gPerf)}`} rowSpan={goalRowSpan}>
                                  {gPerf}%
                                </td>
                              )}

                              {isFirstGoal && (
                                <td className={`border border-slate-300 p-2 font-bold ${getPerfColor(aPerf)}`} rowSpan={axisRowSpan}>
                                  {aPerf}%
                                </td>
                              )}

                              {isFirstGoal && axisIndex === 0 && (
                                <td className={`border border-slate-300 p-2 font-black text-lg ${getPerfColor(totalPerf)}`} rowSpan={axes.reduce((acc, a) => acc + Math.max(1, a.goals.reduce((gacc, g) => gacc + Math.max(1, g.indicators.length), 0)), 0)}>
                                  {totalPerf}%
                                </td>
                              )}

                              <td className="border border-slate-300 p-2">
                                <div className="flex gap-1.5 justify-center items-center">
                                  <button 
                                    onClick={() => togglePostponeIndicator(axis.id, goal.id, ind.id)} 
                                    className={`p-1.5 rounded transition-colors ${
                                      ind.postponed 
                                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`} 
                                    title={ind.postponed ? "تنشيط المؤشر" : "تأجيل المؤشر"}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      {ind.postponed ? (
                                        <>
                                          {/* Play / Activate icon */}
                                          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                                        </>
                                      ) : (
                                        <>
                                          {/* Pause / Postpone icon */}
                                          <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                                          <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                                        </>
                                      )}
                                    </svg>
                                  </button>
                                  <button onClick={() => deleteIndicator(axis.id, goal.id, ind.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors" title="حذف المؤشر">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Custom Modal for editing Axis Prefix */}
      {editingAxis && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full mx-4 overflow-hidden transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#2f75b5] to-[#1f4e78] p-6 text-white text-right">
              <h3 className="text-xl font-bold">تعديل رمز المحور</h3>
              <p className="text-slate-100 text-xs mt-1">{editingAxis.name}</p>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4 text-right">
              <label className="block text-sm font-bold text-slate-700">الرمز أو البادئة الجديدة للمحور:</label>
              <input 
                type="text" 
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value.slice(0, 5))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-[#1f4e78] focus:ring-2 focus:ring-[#1f4e78]/20 outline-none text-center font-bold text-lg transition-all"
                placeholder="أدخل الرمز هنا (مثال: س)"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = modalInput.trim();
                    if (trimmed) {
                      updateAxisPrefix(editingAxis.id, trimmed);
                    }
                    setEditingAxis(null);
                  }
                }}
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                سيتم استخدام هذا الرمز كأساس لترقيم جميع أهداف ومؤشرات هذا المحور تلقائياً (مثال: {modalInput || "غ"}-1، {modalInput || "غ"}-1-1).
              </p>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100">
              <button 
                onClick={() => {
                  const trimmed = modalInput.trim();
                  if (trimmed) {
                    updateAxisPrefix(editingAxis.id, trimmed);
                  }
                  setEditingAxis(null);
                }}
                className="bg-[#1f4e78] hover:bg-[#153551] text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm cursor-pointer"
              >
                تحديث الرمز
              </button>
              <button 
                onClick={() => setEditingAxis(null)}
                className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-sm border border-slate-300 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
