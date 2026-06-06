"use client";

import React, { useState } from 'react';
import { Axis, Goal, Indicator } from './types';
import { calcIndicatorPerf, getQuarterAchieved, hasData, getReportClassification, calcGoalPerf, isGoalPostponed } from './logic';

type ReportDataTableProps = {
  axis: Axis;
  quarter: string;
};

export default function ReportDataTable({ axis, quarter }: ReportDataTableProps) {
  // Local state for analysis and recommendations
  const [goalAnalyses, setGoalAnalyses] = useState<Record<string, string>>({});
  const [indicatorAnalyses, setIndicatorAnalyses] = useState<Record<string, string>>({});
  const [indicatorRecommendations, setIndicatorRecommendations] = useState<Record<string, string>>({});

  if (!axis.goals || axis.goals.length === 0) return null;

  return (
    <div className="mb-10 print:break-inside-avoid">
      {/* Axis Header */}
      <div className="flex items-center gap-3 mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-sm">
          {axis.prefix || "غ"}
        </div>
        <h3 className="text-slate-800 font-bold text-2xl">
          {axis.name}
        </h3>
      </div>

      <div className="space-y-8 pl-4 md:pl-8 border-r-2 border-indigo-100">
        {axis.goals.map((goal) => {
          if (!goal.indicators || goal.indicators.length === 0) return null;

          const goalPerf = calcGoalPerf(goal, quarter);
          const goalPostponed = isGoalPostponed(goal);
          const goalClassification = getReportClassification(goalPerf, true, goalPostponed);

          return (
            <div key={goal.id} className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow print:shadow-none print:border-slate-300">
              {/* Connector line from axis */}
              <div className="absolute -right-[18px] md:-right-[34px] top-8 w-4 md:w-8 h-0.5 bg-indigo-100 print:hidden"></div>
              
              {/* Goal Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="bg-white border border-slate-200 text-slate-500 font-bold px-3 py-1.5 rounded-lg text-sm shrink-0 shadow-sm">
                    {goal.code}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1">الهدف الاستراتيجي</span>
                    <h4 className="text-slate-800 font-bold text-lg leading-snug">{goal.name}</h4>
                  </div>
                </div>

                {/* Goal Performance Badge */}
                <div className="flex items-center gap-3 shrink-0 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                  <div className="text-xs font-bold text-slate-500">الأداء العام للهدف</div>
                  <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border flex items-center gap-2 ${goalClassification.color}`}>
                    <span>{goalPostponed ? "مؤجل" : `${goalPerf}%`}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50"></span>
                    <span>{goalClassification.text}</span>
                  </div>
                </div>
              </div>

              {/* Goal Analysis Field */}
              <div className="p-5 bg-indigo-50/30 border-b border-slate-100">
                <label className="text-slate-700 font-bold mb-2 flex items-center gap-1.5 text-sm">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center print:border print:border-indigo-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </span>
                  تحليل أداء الهدف
                </label>
                <textarea
                  className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm text-slate-700 outline-none focus:border-indigo-400 transition-all resize-none min-h-[80px] print:hidden shadow-sm"
                  placeholder="اكتب تحليلاً لأداء هذا الهدف الاستراتيجي..."
                  value={goalAnalyses[goal.id] || ""}
                  onChange={(e) => setGoalAnalyses(prev => ({ ...prev, [goal.id]: e.target.value }))}
                />
                {goalAnalyses[goal.id] ? (
                  <div className="hidden print:block whitespace-pre-wrap text-sm text-slate-700 bg-white border border-slate-100 rounded-xl p-3 min-h-[80px]">
                    {goalAnalyses[goal.id]}
                  </div>
                ) : (
                  <div className="hidden print:block text-sm text-slate-400 italic">
                    (لم يتم إدخال تحليل للهدف)
                  </div>
                )}
              </div>

              {/* Indicators List */}
              <div className="p-5">
                <h5 className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500">{goal.indicators.length}</span>
                  مؤشرات القياس
                </h5>
                <div className="space-y-4">
                  {goal.indicators.map((ind, indIndex) => {
                    const achieved = getQuarterAchieved(ind, quarter);
                    const perf = calcIndicatorPerf(ind, quarter);
                    const classification = getReportClassification(perf, hasData(achieved), ind.postponed);
                    const indCode = ind.code || `${goal.code}-${indIndex + 1}`;

                    return (
                      <div key={ind.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 print:break-inside-avoid print:bg-white print:border-slate-300">
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-bold bg-white text-slate-500 px-2 py-1 rounded border border-slate-200 mt-0.5 shadow-sm" dir="ltr">
                              {indCode}
                            </span>
                            <div className="font-semibold text-slate-800 text-sm md:text-base leading-relaxed">
                              {ind.name}
                            </div>
                          </div>
                          
                          <div className="shrink-0 flex items-center gap-2 self-start md:self-auto">
                             <div className="text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">النتيجة: <span className="font-bold text-slate-800" dir="ltr">{hasData(achieved) ? achieved : "-"}</span></div>
                            <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border ${classification.color} whitespace-nowrap shadow-sm`}>
                              {ind.postponed ? "مؤجل" : `${perf}%`} ({classification.text})
                            </span>
                          </div>
                        </div>

                        {/* Indicator Analysis & Recommendations */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 border-dashed">
                          {/* Analysis */}
                          <div>
                            <label className="text-slate-600 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                              تحليل المؤشر
                            </label>
                            <textarea
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-300 transition-all resize-none min-h-[70px] print:hidden shadow-sm"
                              placeholder="اكتب تحليلاً لهذا المؤشر..."
                              value={indicatorAnalyses[ind.id] || ""}
                              onChange={(e) => setIndicatorAnalyses(prev => ({ ...prev, [ind.id]: e.target.value }))}
                            />
                            {indicatorAnalyses[ind.id] ? (
                              <div className="hidden print:block whitespace-pre-wrap text-xs text-slate-700 bg-white border border-slate-100 rounded-lg p-2.5 min-h-[70px]">
                                {indicatorAnalyses[ind.id]}
                              </div>
                            ) : (
                              <div className="hidden print:block text-xs text-slate-400 italic">
                                (لم يتم إدخال تحليل)
                              </div>
                            )}
                          </div>

                          {/* Recommendations */}
                          <div>
                            <label className="text-slate-600 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              التوصيات
                            </label>
                            <textarea
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-emerald-300 transition-all resize-none min-h-[70px] print:hidden shadow-sm"
                              placeholder="اكتب توصيات مقترحة..."
                              value={indicatorRecommendations[ind.id] || ""}
                              onChange={(e) => setIndicatorRecommendations(prev => ({ ...prev, [ind.id]: e.target.value }))}
                            />
                            {indicatorRecommendations[ind.id] ? (
                              <div className="hidden print:block whitespace-pre-wrap text-xs text-slate-700 bg-white border border-slate-100 rounded-lg p-2.5 min-h-[70px]">
                                {indicatorRecommendations[ind.id]}
                              </div>
                            ) : (
                              <div className="hidden print:block text-xs text-slate-400 italic">
                                (لا توجد توصيات)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
