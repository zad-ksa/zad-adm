"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";

type Stage = {
  id: string;
  charityId: string;
  name: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  duration?: string | null;
  order: number;
  isCurrent: boolean;
  isContinuous?: boolean;
};

type ServiceWithStages = {
  id: string;
  charityId: string;
  name: string;
  stages: Stage[];
};

type Charity = {
  id: string;
  name: string;
};

type Props = {
  charities: Charity[];
  stagesData: Record<string, Stage[]>;
  allServices: ServiceWithStages[];
  activeTab: string;
  activeLabel: string;
  isGenericTab: boolean;
  genericSvcName?: string | null;
  deptColors: Record<string, string>;
  onClose: () => void;
};

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const CELL_W = 48; // px per month column
const ROW_H = 36;  // px per charity row
const LABEL_W = 180; // px for charity name column

function parseDuration(dur: string | null | undefined): number {
  // expects formats like "3 أشهر", "6 أسابيع", "45 يوم" — returns days
  if (!dur) return 30;
  const n = parseInt(dur);
  if (isNaN(n)) return 30;
  if (dur.includes("أسبوع") || dur.includes("week")) return n * 7;
  if (dur.includes("شهر") || dur.includes("month")) return n * 30;
  return n; // assume days
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function dayOffset(base: Date, d: Date): number {
  return (d.getTime() - base.getTime()) / (1000 * 60 * 60 * 24);
}

export default function GanttChart({
  charities, stagesData, allServices, activeTab, activeLabel,
  isGenericTab, genericSvcName, deptColors, onClose,
}: Props) {

  // Collect stages per charity
  const rows = useMemo(() => {
    return charities.map(c => {
      let stages: Stage[] = [];
      if (!isGenericTab) {
        stages = (stagesData[activeTab] || []).filter(s => s.charityId === c.id);
      } else {
        const svc = allServices.find(s => s.name === genericSvcName && s.charityId === c.id);
        stages = svc ? svc.stages : [];
      }
      // sort by order
      stages = [...stages].sort((a, b) => a.order - b.order);
      return { charity: c, stages };
    }).filter(r => r.stages.length > 0);
  }, [charities, stagesData, allServices, activeTab, isGenericTab, genericSvcName]);

  // Build timeline: find min/max dates, fallback to order-based layout
  const { minDate, maxDate, useOrderFallback } = useMemo(() => {
    const dates: Date[] = [];
    rows.forEach(r => r.stages.forEach(s => {
      if (s.startDate) dates.push(new Date(s.startDate));
      if (s.endDate) dates.push(new Date(s.endDate));
    }));

    if (dates.length === 0) {
      // no dates at all — use order-based fallback
      return { minDate: new Date(), maxDate: new Date(), useOrderFallback: true };
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    // extend a bit
    min.setDate(1);
    max.setMonth(max.getMonth() + 1, 1);
    return { minDate: min, maxDate: max, useOrderFallback: false };
  }, [rows]);

  const totalMonths = useOrderFallback ? 0 : Math.max(monthsBetween(minDate, maxDate), 1);
  const totalDays = useOrderFallback ? 0 : Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const chartWidth = useOrderFallback
    ? Math.max(...rows.map(r => r.stages.length)) * 120 + LABEL_W
    : totalMonths * CELL_W + LABEL_W;

  // Month headers
  const monthHeaders = useMemo(() => {
    if (useOrderFallback) return [];
    const headers: { label: string; col: number }[] = [];
    const cur = new Date(minDate);
    let col = 0;
    while (cur < maxDate) {
      headers.push({ label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`, col });
      cur.setMonth(cur.getMonth() + 1);
      col++;
    }
    return headers;
  }, [minDate, maxDate, useOrderFallback]);

  const today = new Date();
  const todayOffset = useOrderFallback ? null : Math.max(0, dayOffset(minDate, today));
  const todayX = todayOffset !== null ? LABEL_W + (todayOffset / Math.max(totalDays, 1)) * (totalMonths * CELL_W) : null;

  const deptKey = ["STRATEGY","GOVERNANCE","FINANCE"].includes(activeTab) ? activeTab : "PROGRAMS";
  const barColor = deptColors[deptKey] || "bg-primary";
  const barColorHex = barColor.includes("blue") ? "#3b82f6"
    : barColor.includes("purple") ? "#a855f7"
    : barColor.includes("emerald") ? "#10b981"
    : barColor.includes("amber") ? "#f59e0b"
    : "#6366f1";

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">مخطط غانت — {activeLabel}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {useOrderFallback
                ? "لا توجد تواريخ مسجلة — العرض بحسب ترتيب المراحل"
                : `من ${MONTH_NAMES[minDate.getMonth()]} ${minDate.getFullYear()} إلى ${MONTH_NAMES[maxDate.getMonth()]} ${maxDate.getFullYear()}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            لا توجد بيانات لعرضها
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4">
            <div style={{ minWidth: chartWidth }} className="relative select-none">

              {/* Month header row */}
              {!useOrderFallback && (
                <div className="flex" style={{ paddingRight: LABEL_W }}>
                  {monthHeaders.map((m, i) => (
                    <div
                      key={i}
                      style={{ width: CELL_W, flexShrink: 0 }}
                      className="text-[10px] font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 pb-2 text-center"
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              )}

              {/* Order-fallback header */}
              {useOrderFallback && (
                <div className="flex" style={{ paddingRight: LABEL_W }}>
                  {Array.from({ length: Math.max(...rows.map(r => r.stages.length)) }).map((_, i) => (
                    <div key={i} style={{ width: 120, flexShrink: 0 }}
                      className="text-[10px] font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800 pb-2 text-center">
                      المرحلة {i + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Rows */}
              {rows.map(({ charity, stages }) => {
                const currentIdx = stages.findIndex(s => s.isCurrent);
                const startFrom = currentIdx >= 0 ? currentIdx : 0;
                const orderedStages = [
                  ...stages.slice(startFrom),
                  ...stages.slice(0, startFrom),
                ];

                return (
                  <div key={charity.id} className="flex items-center border-t border-slate-100 dark:border-slate-800" style={{ height: ROW_H }}>
                    {/* Charity name */}
                    <div
                      style={{ width: LABEL_W, minWidth: LABEL_W, flexShrink: 0 }}
                      className="text-xs font-bold text-slate-700 dark:text-slate-200 px-3 truncate"
                      title={charity.name}
                    >
                      {charity.name}
                    </div>

                    {/* Bars */}
                    <div className="flex-1 relative" style={{ height: ROW_H }}>
                      {useOrderFallback ? (
                        // Order-based: each stage = fixed 120px box
                        <div className="flex h-full items-center gap-0.5">
                          {orderedStages.map((stage, i) => {
                            const isCur = stage.isCurrent;
                            const isPast = !isCur && i < (currentIdx >= 0 ? stages.length - startFrom : 0);
                            return (
                              <div
                                key={stage.id}
                                style={{ width: 116, flexShrink: 0, ...(isCur ? { backgroundColor: barColorHex } : {}) }}
                                onMouseEnter={e => setTooltip({ x: (e.target as HTMLElement).getBoundingClientRect().left, y: (e.target as HTMLElement).getBoundingClientRect().top - 36, text: stage.name })}
                                onMouseLeave={() => setTooltip(null)}
                                className={`h-6 rounded text-[9px] font-bold flex items-center justify-center px-1 cursor-default truncate border transition-all ${
                                  isCur
                                    ? "text-white border-transparent shadow-sm"
                                    : isPast
                                    ? "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                                    : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50"
                                }`}
                              >
                                {stage.name}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Date-based positioning
                        orderedStages.map((stage, i) => {
                          let start: Date | null = stage.startDate ? new Date(stage.startDate) : null;
                          let end: Date | null = stage.endDate ? new Date(stage.endDate) : null;

                          // Fallback: infer from duration or sequential
                          if (!start && i === 0) start = new Date(minDate);
                          if (!start && i > 0) {
                            const prev = orderedStages[i - 1];
                            start = prev.endDate ? new Date(prev.endDate) : null;
                          }
                          if (start && !end) {
                            end = addDays(start, parseDuration(stage.duration));
                          }
                          if (!start || !end) return null;

                          const left = (dayOffset(minDate, start) / totalDays) * (totalMonths * CELL_W);
                          const width = Math.max((dayOffset(start, end) / totalDays) * (totalMonths * CELL_W), 8);
                          const isCur = stage.isCurrent;

                          return (
                            <div
                              key={stage.id}
                              style={{
                                position: "absolute",
                                right: left,
                                width,
                                top: 6,
                                height: ROW_H - 12,
                                backgroundColor: isCur ? barColorHex : undefined,
                                borderColor: isCur ? barColorHex : undefined,
                              }}
                              onMouseEnter={e => {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setTooltip({ x: rect.left, y: rect.top - 40, text: stage.name });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                              className={`rounded text-[9px] font-bold flex items-center justify-center px-1 cursor-default overflow-hidden border transition-all ${
                                isCur
                                  ? "text-white border-transparent shadow"
                                  : "text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"
                              }`}
                            >
                              <span className="truncate">{stage.name}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Today line */}
              {todayX !== null && todayX > LABEL_W && todayX < chartWidth && (
                <div
                  style={{ position: "absolute", right: todayX - LABEL_W, top: 0, bottom: 0, width: 1 }}
                  className="bg-red-400 dark:bg-red-500 opacity-70 pointer-events-none"
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3 rounded" style={{ backgroundColor: barColorHex }} />
                <span>المرحلة الحالية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-3 rounded bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
                <span>مراحل أخرى</span>
              </div>
              {todayX !== null && (
                <div className="flex items-center gap-1.5">
                  <div className="w-0.5 h-3 bg-red-400" />
                  <span>اليوم</span>
                </div>
              )}
              {useOrderFallback && (
                <div className="text-amber-500 font-bold">* المراحل مرتبة بالترتيب لعدم وجود تواريخ</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[90] bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
