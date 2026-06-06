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
  annualTarget: string | number;
  annualAchieved: string | number | null;
  q1Target: string | number; q1Achieved: string | number | null;
  q2Target: string | number; q2Achieved: string | number | null;
  q3Target: string | number; q3Achieved: string | number | null;
  q4Target: string | number; q4Achieved: string | number | null;
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
  const [zoomLevel, setZoomLevel] = useState<number>(100);

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
          annualTarget: ind.annualTarget !== undefined && ind.annualTarget !== null ? ind.annualTarget : "",
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
      router.push(`/dashboard/charity/${encodeURIComponent(charityName)}/strategy/performance?year=${newYear}&quarter=${newQuarter}`);
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
                    const updatedInd = { ...ind, [field]: value };
                    
                    // If we updated a quarterly target, automatically recalculate the annual target
                    if (field === "q1Target" || field === "q2Target" || field === "q3Target" || field === "q4Target") {
                      updatedInd.annualTarget = getAnnualTargetValue(updatedInd);
                    }
                    
                    return updatedInd;
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
  const hasData = (val: any) => val !== null && val !== undefined && String(val).trim() !== "";

  const parseValueToNumber = (val: any): number => {
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

  const isPercentageValue = (val: any) => {
    return val !== null && val !== undefined && String(val).trim().includes("%");
  };

  const getAnnualTargetValue = (ind: Indicator) => {
    const values = [ind.q1Target, ind.q2Target, ind.q3Target, ind.q4Target];
    const isPercentage = values.some(isPercentageValue);
    
    const parsedValues = values.map(parseValueToNumber);
    const activeCount = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "").length;
    
    if (activeCount === 0) return 0;
    
    if (isPercentage) {
      const sum = parsedValues.reduce((acc, curr) => acc + curr, 0);
      const roundedSum = Math.round(sum * 10) / 10;
      return `${roundedSum}%`;
    } else {
      return parsedValues.reduce((acc, curr) => acc + curr, 0);
    }
  };

  const getAnnualAchievedValue = (ind: Indicator) => {
    const values = [ind.q1Achieved, ind.q2Achieved, ind.q3Achieved, ind.q4Achieved];
    const isPercentage = values.some(isPercentageValue);
    
    const parsedValues = values.map(parseValueToNumber);
    const activeCount = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "").length;
    
    if (activeCount === 0) return null;
    
    if (isPercentage) {
      const sum = parsedValues.reduce((acc, curr) => acc + curr, 0);
      const roundedSum = Math.round(sum * 10) / 10;
      return `${roundedSum}%`;
    } else {
      return parsedValues.reduce((acc, curr) => acc + curr, 0);
    }
  };

  const getIndicatorStatus = (ind: Indicator) => {
    if (ind.postponed) return "مؤجل";
    const achieved = getQuarterAchieved(ind);
    if (!hasData(achieved)) return "لا توجد بيانات";
    const target = getQuarterTarget(ind);
    const parsedAchieved = parseValueToNumber(achieved);
    const parsedTarget = parseValueToNumber(target);
    if (parsedAchieved >= parsedTarget) return "مكتمل";
    return "جاري";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "مؤجل":
        return "bg-amber-50 text-amber-600 border border-amber-100";
      case "لا توجد بيانات":
        return "bg-slate-50 text-slate-500 border border-slate-100";
      case "مكتمل":
        return "bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20";
      case "جاري":
      default:
        return "bg-primary/10 text-primary border-primary/20";
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
  const getQuarterTarget = (ind: Indicator) => ind[`${quarter.toLowerCase()}Target` as keyof Indicator] as any;
  const getQuarterAchieved = (ind: Indicator) => ind[`${quarter.toLowerCase()}Achieved` as keyof Indicator] as any;

  const isGoalPostponed = (goal: Goal) => {
    return goal.indicators.length > 0 && goal.indicators.every(ind => ind.postponed);
  };

  const isAxisPostponed = (axis: Axis) => {
    const goalsWithIndicators = axis.goals.filter(g => g.indicators.length > 0);
    return goalsWithIndicators.length > 0 && goalsWithIndicators.every(g => isGoalPostponed(g));
  };

  const isCharityPostponed = () => {
    const axesWithIndicators = axes.filter(a => a.goals.some(g => g.indicators.length > 0));
    return axesWithIndicators.length > 0 && axesWithIndicators.every(a => isAxisPostponed(a));
  };

  const calcPercentage = (achieved: any, target: any) => {
    if (!hasData(achieved) || !hasData(target)) return 0;
    const parsedAchieved = parseValueToNumber(achieved);
    const parsedTarget = parseValueToNumber(target);
    
    if (parsedTarget === 0) {
      return parsedAchieved >= 0 ? 100 : 0;
    }
    const val = (parsedAchieved / parsedTarget) * 100;
    return Math.min(Math.round(val * 10) / 10, 100); // Max 100%
  };

  const calcIndicatorPerf = (ind: Indicator) => {
    if (ind.postponed) return 0;
    return calcPercentage(getQuarterAchieved(ind), getQuarterTarget(ind));
  };

  const calcGoalPerf = (goal: Goal) => {
    if (isGoalPostponed(goal)) return 0;
    const activeIndicators = goal.indicators.filter(ind => !ind.postponed);
    if (activeIndicators.length === 0) return 0;
    const total = activeIndicators.reduce((acc, ind) => acc + calcIndicatorPerf(ind), 0);
    return Math.round((total / activeIndicators.length) * 10) / 10;
  };

  const calcAxisPerf = (axis: Axis) => {
    if (isAxisPostponed(axis)) return 0;
    const activeGoals = axis.goals.filter(g => g.indicators.length > 0 && !isGoalPostponed(g));
    if (activeGoals.length === 0) return 0;
    const total = activeGoals.reduce((acc, goal) => acc + calcGoalPerf(goal), 0);
    return Math.round((total / activeGoals.length) * 10) / 10;
  };

  const calcCharityPerf = () => {
    if (isCharityPostponed()) return 100;
    const allAxes = axes.filter(a => a.goals.some(g => g.indicators.length > 0));
    if (allAxes.length === 0) return 0;
    const total = allAxes.reduce((acc, axis) => {
      if (isAxisPostponed(axis)) {
        return acc + 100;
      }
      return acc + calcAxisPerf(axis);
    }, 0);
    return Math.round((total / allAxes.length) * 10) / 10;
  };

  // Color logic
  const getPerfColor = (val: number, hasDataValue = true, isPostponed = false) => {
    if (isPostponed) return "bg-blue-500 text-white";
    if (!hasDataValue) return "bg-slate-100 text-slate-500";
    if (val >= 90) return "bg-[#00b050] text-white"; // Excellent
    if (val >= 70) return "bg-[#92d050] text-white"; // Good
    if (val >= 50) return "bg-[#ffc000] text-slate-900"; // Acceptable
    return "bg-[#ff0000] text-white"; // Weak
  };

  const getClassification = (val: number, hasDataValue = true, isPostponed = false) => {
    if (isPostponed) return { text: "مؤجل", icon: "⏸️", color: "text-blue-500" };
    if (!hasDataValue) return { text: "لا توجد بيانات", icon: "⚪", color: "text-slate-400" };
    if (val >= 90) return { text: "ممتاز", icon: "✅", color: "text-[#00b050]" };
    if (val >= 70) return { text: "جيد", icon: "✓", color: "text-[#71a638]" };
    if (val >= 50) return { text: "مقبول", icon: "⚠️", color: "text-[#c29300]" };
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
                annualTarget: ind.annualTarget !== undefined && ind.annualTarget !== null && String(ind.annualTarget).trim() !== "" ? ind.annualTarget : getAnnualTargetValue(ind),
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
    <div className={`space-y-6 transition-all duration-300 ${isFullScreen
        ? "fixed inset-0 z-[9999] bg-slate-50 p-6 sm:p-8 flex flex-col w-screen h-screen overflow-hidden"
        : ""
      }`}>
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm shrink-0">
        <div className="flex gap-4">
          <select
            value={year}
            onChange={(e) => handlePeriodChange(parseInt(e.target.value), quarter)}
            className="px-4 py-2.5 rounded-xl border border-slate-100 font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-slate-100 cursor-pointer"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={quarter}
            onChange={(e) => handlePeriodChange(year, e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-100 font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-slate-100 cursor-pointer"
          >
            <option value="Q1">الربع الأول</option>
            <option value="Q2">الربع الثاني</option>
            <option value="Q3">الربع الثالث</option>
            <option value="Q4">الربع الرابع</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-bold bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-100 flex items-center gap-3">
            <span className="text-slate-500">أداء الجمعية:</span>
            <span className={`px-2.5 py-1 rounded-lg font-black text-sm border ${
              isCharityPostponed()
                ? getPerfColor(0, true, true)
                : getPerfColor(totalPerf)
            } border-transparent`}>
              {isCharityPostponed() ? "مؤجل" : `${totalPerf}%`}
            </span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-50 rounded-xl border border-slate-100 p-1 gap-1">
            <button
              onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
              disabled={zoomLevel <= 70}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none active:scale-[0.9] cursor-pointer"
              title="تصغير الجدول"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span 
              onClick={() => setZoomLevel(100)}
              className="text-xs font-bold text-slate-500 px-2 min-w-[45px] text-center cursor-pointer hover:text-primary transition-colors select-none"
              title="إعادة ضبط التكبير (100%)"
            >
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              disabled={zoomLevel >= 130}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all select-none active:scale-[0.9] cursor-pointer"
              title="تكبير الجدول"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-[0.98]"
            title={isFullScreen ? "خروج من وضع ملء الشاشة (Esc)" : "تفعيل وضع ملء الشاشة"}
          >
            {isFullScreen ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4" />
                </svg>
                <span className="hidden sm:inline">خروج من ملء الشاشة</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
                <span className="hidden sm:inline">ملء الشاشة</span>
              </>
            )}
          </button>

          <button
            onClick={() => router.push(`/dashboard/charity/${encodeURIComponent(charityName)}/strategy/report?year=${year}&quarter=${quarter}`)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-[0.98]"
            title="إنشاء تقرير الأداء الاستراتيجي"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span className="hidden sm:inline">إنشاء تقرير</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98] shadow-sm flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الحفظ...
              </>
            ) : (
              "حفظ التعديلات"
            )}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl bg-white shadow-sm border border-slate-100 ${isFullScreen
          ? "flex-1 overflow-auto w-full pb-[200px]"
          : "overflow-x-auto w-full pb-[200px]"
        }`}>
        <table 
          style={{ zoom: `${zoomLevel}%` }} 
          className="w-full text-center border-collapse text-sm whitespace-nowrap"
        >
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b-2 border-slate-100">
              <th className="p-4 border-l border-slate-100 min-w-[120px]">المحور</th>
              <th className="p-4 border-l border-slate-100 w-[80px]">رمز الهدف</th>
              <th className="p-4 border-l border-slate-100 min-w-[200px]">الهدف</th>
              <th className="p-4 border-l border-slate-100 w-[80px]">رمز المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[300px]">المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[120px]">حالة المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[120px]">مالك المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-primary">المستهدف السنوي</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-primary">المحقق السنوي</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-primary">الإنجاز (سنوي)</th>
              <th className="p-4 border-l border-slate-100 min-w-[100px]">تصنيف المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-secondary">المستهدف ({quarter})</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-secondary">المتحقق ({quarter})</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] text-secondary">أداء المؤشر</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px]">أداء الهدف</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px]">أداء المحور</th>
              <th className="p-4 border-l border-slate-100 min-w-[80px] bg-primary/5 text-primary">أداء الجمعية</th>
              <th className="p-4 min-w-[80px]">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let globalGoalIndex = 0;
              return axes.map((axis, axisIndex) => {
                const axisRowSpan = Math.max(1, axis.goals.reduce((acc, g) => acc + Math.max(1, g.indicators.length), 0));
                const aPerf = calcAxisPerf(axis);
                const aPrefix = axis.prefix || getAxisDefaultPrefix(axis.id);

                return (
                  <>
                    {axis.goals.length === 0 ? (
                      <tr key={axis.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="border-l border-slate-100 p-2 bg-primary text-white font-bold align-middle w-12" rowSpan={1}>
                          <div className="flex flex-col items-center gap-3 py-4">
                            <span className="text-center font-bold tracking-wider leading-loose" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{axis.name}</span>
                            <span className="text-[10px] text-white/90 font-bold bg-white/20 px-2 py-0.5 rounded-md mt-1 shadow-sm">الرمز: {aPrefix}</span>
                            <button onClick={() => addGoal(axis.id)} className="bg-white/20 hover:bg-white/30 text-white text-xs w-8 h-8 rounded-lg mt-2 flex items-center justify-center transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                          </div>
                        </td>
                        <td colSpan={17} className="p-8 text-slate-400 bg-slate-50/30">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="text-3xl opacity-30">🎯</div>
                            <p>لا توجد أهداف في هذا المحور. أضف هدفاً للبدء.</p>
                            <button onClick={() => addGoal(axis.id)} className="mt-2 bg-white border border-slate-200 text-slate-700 hover:text-primary hover:border-primary/30 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                              إضافة هدف
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {axis.goals.map((goal, goalIndex) => {
                      const goalRowSpan = Math.max(1, goal.indicators.length);
                      const gPerf = calcGoalPerf(goal);
                      const goalCode = `${aPrefix}-${goalIndex + 1}`;
                      const currentGoalIndex = globalGoalIndex++;
                      const isOddGoal = currentGoalIndex % 2 !== 0;

                      return (
                        <>
                          {goal.indicators.length === 0 ? (
                            <tr
                              key={goal.id}
                              className={`border-b border-slate-100 transition-colors group
                                ${goalIndex > 0 ? "border-t-2 border-t-slate-200" : ""}
                                ${isOddGoal 
                                  ? "bg-slate-100/70 hover:bg-slate-200/50" 
                                  : "bg-white hover:bg-slate-50"
                                }
                              `}
                            >
                              {goalIndex === 0 && (
                                <td className="border-l border-slate-100 p-2 bg-primary text-white font-bold align-middle w-12" rowSpan={axisRowSpan}>
                                  <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[150px] py-4">
                                    <span className="text-center font-bold tracking-wider leading-loose" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{axis.name}</span>
                                    <span className="text-[10px] text-white/90 font-bold bg-white/20 px-2 py-0.5 rounded-md mt-1 shadow-sm">الرمز: {aPrefix}</span>
                                    <button onClick={() => addGoal(axis.id)} title="إضافة هدف" className="bg-white/20 hover:bg-white/30 text-white text-xs w-8 h-8 rounded-lg mt-2 flex items-center justify-center transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td
                                onClick={() => handleAxisPrefixClick(axis.id, axis.name, aPrefix)}
                                title="انقر لتعديل رمز المحور"
                                className={`border-l border-slate-100 p-3 font-bold text-slate-500 w-[80px] cursor-pointer select-none hover:bg-slate-100/50 transition-colors text-center text-sm ${isOddGoal ? "bg-slate-100/70" : "bg-white"}`}
                              >
                                <div className="bg-white border border-slate-200 rounded px-2 py-1 inline-block shadow-sm group-hover:border-primary/30 transition-colors">{goalCode}</div>
                              </td>
                              <td className={`border-l border-slate-100 p-2 font-bold text-slate-700 text-right ${isOddGoal ? "bg-slate-100/70" : "bg-white"}`}>
                                <input type="text" value={goal.name} onChange={e => updateGoal(axis.id, goal.id, "name", e.target.value)} className="w-full bg-transparent hover:bg-white/50 focus:bg-white border border-transparent focus:border-primary/30 rounded-lg outline-none px-3 py-2 transition-all" />
                              </td>
                              <td colSpan={15} className="p-4 text-slate-400">
                                <button onClick={() => addIndicator(axis.id, goal.id)} className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                  إضافة مؤشر
                                </button>
                              </td>
                            </tr>
                          ) : null}

                          {goal.indicators.map((ind, indIndex) => {
                            const isFirstInd = indIndex === 0;
                            const isFirstGoal = goalIndex === 0 && isFirstInd;

                          const annualTarget = ind.annualTarget !== undefined && ind.annualTarget !== null && String(ind.annualTarget).trim() !== "" ? ind.annualTarget : getAnnualTargetValue(ind);
                          const annualAchieved = getAnnualAchievedValue(ind);
                          const annualPerf = calcPercentage(annualAchieved, annualTarget);
                          const indPerf = calcIndicatorPerf(ind);
                          const classification = getClassification(indPerf, hasData(getQuarterAchieved(ind)), ind.postponed);

                          const targetField = `${quarter.toLowerCase()}Target` as keyof Indicator;
                          const achievedField = `${quarter.toLowerCase()}Achieved` as keyof Indicator;

                          const isNewGoalRow = isFirstInd && !isFirstGoal;

                          return (
                            <tr
                              key={ind.id}
                              className={`border-b border-slate-100 transition-colors group
                                ${isNewGoalRow ? "border-t-2 border-t-slate-200" : ""}
                                ${ind.postponed
                                  ? "bg-slate-50/80 text-slate-400 font-medium opacity-80"
                                  : isOddGoal
                                    ? "bg-slate-100/70 hover:bg-slate-200/50"
                                    : "bg-white hover:bg-slate-50"
                                }
                              `}
                            >
                              {isFirstGoal && (
                                <td className="border-l border-slate-100 p-2 bg-primary text-white font-bold align-middle w-12" rowSpan={axisRowSpan}>
                                  <div className="flex flex-col items-center justify-center gap-3 h-full py-4 min-h-[200px]">
                                    <span className="text-center font-bold tracking-wider leading-loose" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{axis.name}</span>
                                    <span className="text-[10px] text-white/90 font-bold bg-white/20 px-2 py-0.5 rounded-md mt-1 shadow-sm">الرمز: {aPrefix}</span>
                                    <button onClick={() => addGoal(axis.id)} title="إضافة هدف" className="bg-white/20 hover:bg-white/30 text-white text-xs w-8 h-8 rounded-lg mt-2 flex items-center justify-center transition-colors">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                  </div>
                                </td>
                              )}

                              {isFirstInd && (
                                <>
                                  <td
                                    onClick={() => handleAxisPrefixClick(axis.id, axis.name, aPrefix)}
                                    title="انقر لتعديل رمز المحور"
                                    className={`border-l border-slate-100 p-2 font-bold text-slate-500 text-center w-[80px] cursor-pointer select-none hover:bg-slate-100/50 transition-colors text-sm ${isOddGoal ? "bg-slate-100/70" : "bg-white"}`}
                                    rowSpan={goalRowSpan}
                                  >
                                    <div className="bg-white border border-slate-200 rounded px-2 py-1 inline-block shadow-sm group-hover:border-primary/30 transition-colors">{goalCode}</div>
                                  </td>
                                  <td className={`border-l border-slate-100 p-3 font-bold text-slate-700 text-right leading-tight max-w-[200px] whitespace-normal ${isOddGoal ? "bg-slate-100/70" : "bg-white"}`} rowSpan={goalRowSpan}>
                                    <textarea value={goal.name} onChange={e => updateGoal(axis.id, goal.id, "name", e.target.value)} className="w-full h-full min-h-[60px] bg-transparent hover:bg-white/50 focus:bg-white border border-transparent focus:border-primary/30 rounded-lg outline-none p-3 resize-none transition-all" />
                                    <div className="mt-2 text-center">
                                      <button onClick={() => addIndicator(axis.id, goal.id)} className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors inline-flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        إضافة مؤشر
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}

                              <td className="border-l border-slate-100 p-2 font-bold text-slate-500 w-[80px] text-[13px]">
                                {goalCode}-{indIndex + 1}
                              </td>
                              <td className="border-l border-slate-100 p-2 text-right whitespace-normal min-w-[250px]">
                                <textarea value={ind.name} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, "name", e.target.value)} className="w-full h-full min-h-[44px] bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-primary/30 outline-none p-2 resize-none rounded-lg disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all font-medium text-[13px]" />
                              </td>
                              <td className="border-l border-slate-100 p-2 align-middle">
                                {(() => {
                                  const status = getIndicatorStatus(ind);
                                  return (
                                    <span className={`px-3 py-1 rounded-md text-[11px] font-bold inline-block border ${getStatusBadgeClass(status)}`}>
                                      {status}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="border-l border-slate-100 p-2">
                                <input type="text" value={ind.owner} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, "owner", e.target.value)} placeholder={ind.postponed ? "مؤجل" : "اسم المالك"} className="w-full text-center bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-primary/30 outline-none p-2 rounded-lg text-xs font-semibold disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all" />
                              </td>

                              {/* Annual Metrics */}
                              <td className="border-l border-slate-100 p-2 bg-primary/5 font-bold">
                                <input 
                                  type="text" 
                                  value={annualTarget ?? ""} 
                                  disabled={ind.postponed} 
                                  onChange={e => updateIndicator(axis.id, goal.id, ind.id, "annualTarget", e.target.value)} 
                                  className="w-16 text-center bg-white border border-slate-200 focus:border-primary outline-none rounded-md py-1 px-1 text-sm disabled:bg-transparent disabled:border-transparent disabled:text-slate-700 shadow-sm disabled:shadow-none transition-all font-bold" 
                                />
                              </td>
                              <td className="border-l border-slate-100 p-2 font-bold text-slate-700 bg-primary/5">
                                {annualAchieved ?? "-"}
                              </td>
                              <td className="border-l border-slate-100 p-2 font-black text-slate-700 bg-primary/5">
                                {ind.postponed ? "مؤجل" : `${annualPerf}%`}
                              </td>

                              {/* Quarter Metrics & Classification */}
                              <td className={`border-l border-slate-100 p-2 font-bold text-sm ${classification.color}`}>
                                {classification.icon} {classification.text}
                              </td>
                              <td className="border-l border-slate-100 p-2 bg-secondary/5 font-bold">
                                <input type="text" value={(ind[targetField] as any) ?? ""} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, targetField, e.target.value === "" ? null : e.target.value)} className="w-16 text-center bg-white border border-slate-200 focus:border-secondary outline-none rounded-md py-1 px-1 text-sm disabled:bg-transparent disabled:border-transparent disabled:text-slate-400 shadow-sm disabled:shadow-none transition-all" />
                              </td>
                              <td className="border-l border-slate-100 p-2 bg-secondary/5 font-bold">
                                <input type="text" value={(ind[achievedField] as any) ?? ""} disabled={ind.postponed} onChange={e => updateIndicator(axis.id, goal.id, ind.id, achievedField, e.target.value === "" ? null : e.target.value)} className="w-16 text-center bg-white border border-slate-200 focus:border-secondary outline-none rounded-md py-1 px-1 text-sm disabled:bg-transparent disabled:border-transparent disabled:text-slate-400 shadow-sm disabled:shadow-none transition-all" />
                              </td>

                              {/* Performances */}
                              <td className={`border-l border-slate-100 p-3 font-black text-sm text-center ${getPerfColor(indPerf, hasData(getQuarterAchieved(ind)), ind.postponed)}`}>
                                {ind.postponed ? "مؤجل" : `${indPerf}%`}
                              </td>

                              {isFirstInd && (
                                <td 
                                  className={`border-l border-slate-100 p-3 font-black text-sm text-center ${
                                    isGoalPostponed(goal)
                                      ? getPerfColor(0, true, true)
                                      : getPerfColor(gPerf)
                                  }`}
                                  rowSpan={goalRowSpan}
                                >
                                  {isGoalPostponed(goal) ? "مؤجل" : `${gPerf}%`}
                                </td>
                              )}

                              {isFirstGoal && (
                                <td 
                                  className={`border-l border-slate-100 p-3 font-black text-sm text-center ${
                                    isAxisPostponed(axis)
                                      ? getPerfColor(0, true, true)
                                      : getPerfColor(aPerf)
                                  }`}
                                  rowSpan={axisRowSpan}
                                >
                                  {isAxisPostponed(axis) ? "مؤجل" : `${aPerf}%`}
                                </td>
                              )}

                              {isFirstGoal && axisIndex === 0 && (
                                <td 
                                  className={`border-l border-slate-100 p-3 font-black text-lg text-center ${
                                    isCharityPostponed()
                                      ? getPerfColor(0, true, true)
                                      : getPerfColor(totalPerf)
                                  }`}
                                  rowSpan={axes.reduce((acc, a) => acc + Math.max(1, a.goals.reduce((gacc, g) => gacc + Math.max(1, g.indicators.length), 0)), 0)}
                                >
                                  {isCharityPostponed() ? "مؤجل" : `${totalPerf}%`}
                                </td>
                              )}

                              <td className="p-2">
                                <div className="flex gap-2 justify-center items-center">
                                  <button
                                    onClick={() => togglePostponeIndicator(axis.id, goal.id, ind.id)}
                                    className={`p-2 rounded-lg transition-colors border ${ind.postponed
                                        ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                        : "bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-50 shadow-sm"
                                      }`}
                                    title={ind.postponed ? "تنشيط المؤشر" : "تأجيل المؤشر"}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      {ind.postponed ? (
                                        <>
                                          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                                        </>
                                      ) : (
                                        <>
                                          <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                                          <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                                        </>
                                      )}
                                    </svg>
                                  </button>
                                  <button onClick={() => deleteIndicator(axis.id, goal.id, ind.id)} className="text-red-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 p-2 rounded-lg transition-colors shadow-sm" title="حذف المؤشر">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"></polyline>
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
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
            });
          })()}
          </tbody>
        </table>
      </div>

      {/* Custom Modal for editing Axis Prefix */}
      {editingAxis && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 p-4" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full overflow-hidden shadow-xl transform scale-100 transition-all duration-300">
            {/* Modal Header */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">تعديل رمز المحور</h3>
                <p className="text-slate-500 text-xs mt-1 font-medium">{editingAxis.name}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-xl">
                ✏️
              </div>
            </div>
 
            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-5 text-right">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الرمز أو البادئة الجديدة للمحور:</label>
                <input
                  type="text"
                  value={modalInput}
                  onChange={(e) => setModalInput(e.target.value.slice(0, 5))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-center font-bold text-xl transition-all shadow-sm"
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
              </div>
              
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  سيتم استخدام هذا الرمز كأساس لترقيم جميع أهداف ومؤشرات هذا المحور تلقائياً (مثال: <span className="font-bold text-primary">{modalInput || "غ"}-1</span>، <span className="font-bold text-primary">{modalInput || "غ"}-1-1</span>).
                </p>
              </div>
            </div>
 
            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-5 flex flex-row-reverse gap-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const trimmed = modalInput.trim();
                  if (trimmed) {
                    updateAxisPrefix(editingAxis.id, trimmed);
                  }
                  setEditingAxis(null);
                }}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer flex-1"
              >
                حفظ التعديلات
              </button>
              <button
                onClick={() => setEditingAxis(null)}
                className="bg-white hover:bg-slate-100 text-slate-600 font-bold px-6 py-2.5 rounded-xl text-sm border border-slate-200 transition-all cursor-pointer flex-1 shadow-sm"
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
