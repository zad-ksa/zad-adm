"use client";

import React, { useState } from 'react';
import { Axis, Goal, Indicator } from './types';
import { calcIndicatorPerf, getQuarterAchieved, hasData, calcGoalPerf, isGoalPostponed } from './logic';

type ReportDataTableProps = {
  axis: Axis;
  quarter: string;
};

// Helper function to match the exact colors from the user's mockup image
const getStatusBgColor = (perf: number, postponed: boolean, hasDataValue: boolean) => {
  if (postponed) return "bg-[#02a0e3]"; // Blue for postponed
  if (!hasDataValue) return "bg-slate-400"; // Gray for no data
  if (perf >= 90) return "bg-[#00a65a]"; // Green for excellent
  if (perf >= 70) return "bg-[#f39c12]"; // Orange for acceptable
  return "bg-[#dd4b39]"; // Red for risk
};

export default function ReportDataTable({ axis, quarter }: ReportDataTableProps) {
  // Local state for analysis and recommendations
  const [goalAnalyses, setGoalAnalyses] = useState<Record<string, string>>({});
  const [indicatorAnalyses, setIndicatorAnalyses] = useState<Record<string, string>>({});
  const [indicatorRecommendations, setIndicatorRecommendations] = useState<Record<string, string>>({});

  if (!axis.goals || axis.goals.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Hide the axis header in print mode since each goal is on a new page anyway, but keep it on screen */}
      <div className="flex items-center gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
        <div className="w-10 h-10 rounded-lg bg-[#24a991] text-white flex items-center justify-center text-lg font-bold shadow-sm">
          {axis.prefix || "غ"}
        </div>
        <h3 className="text-[#114b79] font-bold text-xl">
          {axis.name}
        </h3>
      </div>

      <div className="space-y-16">
        {axis.goals.map((goal) => {
          if (!goal.indicators || goal.indicators.length === 0) return null;

          const goalPerf = calcGoalPerf(goal, quarter);
          const goalPostponed = isGoalPostponed(goal);
          const goalBg = getStatusBgColor(goalPerf, goalPostponed, true);

          return (
            <div key={goal.id} className="relative w-full print:break-before-page bg-white print:pt-8 print:px-12">
              
              {/* Image-like Header */}
              <div className="flex items-stretch justify-between gap-3 mb-2">
                {/* Right: Goal Code */}
                <div className="bg-[#24a991] text-white flex flex-col items-center justify-center w-24 rounded-lg font-bold shrink-0">
                  <span className="text-2xl">{goal.code}</span>
                  <span className="text-[10px] opacity-90 mt-0.5">رمز الهدف</span>
                </div>

                {/* Center: Goal Name */}
                <div className="flex-1 border-2 border-[#24a991] text-[#114b79] flex items-center justify-center text-center px-4 py-3 font-bold text-lg md:text-xl rounded-sm">
                  {goal.name}
                </div>

                {/* Left: Goal Percentage */}
                <div className={`${goalBg} text-white flex items-center justify-center w-24 rounded-lg font-bold text-2xl shrink-0`}>
                  {goalPostponed ? "مؤجل" : `%${goalPerf}`}
                </div>
              </div>

              {/* Bottom line of header */}
              <div className="w-full h-1 bg-[#24a991] mb-4"></div>

              {/* Table */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-center border-collapse text-sm print:text-xs">
                  <thead>
                    <tr className="bg-[#24a991] text-white font-bold">
                      <th className="p-3 border border-white w-[10%] min-w-[80px]">رمز المؤشر</th>
                      <th className="p-3 border border-white w-[25%] min-w-[150px]">اسم المؤشر</th>
                      <th className="p-3 border border-white w-[10%] min-w-[80px]">النتيجة</th>
                      <th className="p-3 border border-white w-[27.5%] min-w-[200px]">التحليل</th>
                      <th className="p-3 border border-white w-[27.5%] min-w-[200px]">التوصيات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goal.indicators.map((ind, indIndex) => {
                      const achieved = getQuarterAchieved(ind, quarter);
                      const perf = calcIndicatorPerf(ind, quarter);
                      const indCode = ind.code || `${goal.code}-${indIndex + 1}`;
                      const resultBg = getStatusBgColor(perf, ind.postponed || false, hasData(achieved));

                      return (
                        <tr key={ind.id} className="even:bg-[#f9fafb] odd:bg-white text-slate-800">
                          <td className="p-3 border border-slate-200 font-bold" dir="ltr">{indCode}</td>
                          <td className="p-3 border border-slate-200 font-medium leading-relaxed">{ind.name}</td>
                          <td className={`p-3 border border-white font-bold text-white ${resultBg}`}>
                            {ind.postponed ? "مؤجل" : `%${perf}`}
                          </td>
                          
                          {/* Analysis */}
                          <td className="p-0 border border-slate-200 align-top relative">
                            <textarea
                              className="w-full h-full min-h-[60px] p-3 bg-transparent resize-none outline-none focus:bg-indigo-50/50 print:hidden text-xs leading-relaxed text-right"
                              placeholder="اكتب التحليل..."
                              value={indicatorAnalyses[ind.id] || ""}
                              onChange={(e) => setIndicatorAnalyses(prev => ({ ...prev, [ind.id]: e.target.value }))}
                            />
                            {/* The print block uses whitespace-pre-wrap to keep line breaks */}
                            <div className="hidden print:block whitespace-pre-wrap p-3 text-xs leading-relaxed text-right min-h-[40px]">
                              {indicatorAnalyses[ind.id] || ""}
                            </div>
                          </td>

                          {/* Recommendations */}
                          <td className="p-0 border border-slate-200 align-top relative">
                            <textarea
                              className="w-full h-full min-h-[60px] p-3 bg-transparent resize-none outline-none focus:bg-emerald-50/50 print:hidden text-xs leading-relaxed text-right"
                              placeholder="اكتب التوصيات..."
                              value={indicatorRecommendations[ind.id] || ""}
                              onChange={(e) => setIndicatorRecommendations(prev => ({ ...prev, [ind.id]: e.target.value }))}
                            />
                            <div className="hidden print:block whitespace-pre-wrap p-3 text-xs leading-relaxed text-right min-h-[40px]">
                              {indicatorRecommendations[ind.id] || ""}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Goal Analysis (Red Text) */}
              <div className="mt-6 print:mt-8">
                <label className="text-red-600 font-bold mb-2 flex items-center gap-2 print:hidden px-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  التحليل الإجمالي للهدف (سيظهر باللون الأحمر عند الطباعة):
                </label>
                <textarea
                  className="w-full p-4 border border-red-200 rounded-lg text-red-600 font-bold outline-none focus:border-red-400 resize-none min-h-[100px] print:hidden text-center text-lg leading-relaxed bg-red-50/30"
                  placeholder="اكتب خلاصة تحليل الهدف هنا..."
                  value={goalAnalyses[goal.id] || ""}
                  onChange={(e) => setGoalAnalyses(prev => ({ ...prev, [goal.id]: e.target.value }))}
                />
                
                {/* Print view for goal analysis - Matches image exact red styling */}
                <div className="hidden print:block whitespace-pre-wrap text-[#d32f2f] font-bold text-center text-lg leading-relaxed px-4 max-w-4xl mx-auto">
                  {goalAnalyses[goal.id]}
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
