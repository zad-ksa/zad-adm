"use client";

import React from 'react';
import { Axis, Goal, Indicator } from './types';
import { calcIndicatorPerf, getQuarterAchieved, hasData, getReportClassification } from './logic';

type ReportDataTableProps = {
  axis: Axis;
  quarter: string;
};

export default function ReportDataTable({ axis, quarter }: ReportDataTableProps) {
  if (!axis.goals || axis.goals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-slate-100 p-4">
        <h3 className="text-slate-800 font-bold text-lg flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
            {axis.prefix || "غ"}
          </span>
          محور: {axis.name}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
              <th className="p-4 border-l border-slate-100 w-[100px] whitespace-nowrap">الرمز</th>
              <th className="p-4 border-l border-slate-100 min-w-[250px]">اسم المؤشر</th>
              <th className="p-4 border-l border-slate-100 w-[120px] text-center whitespace-nowrap">النتيجة</th>
              <th className="p-4 border-l border-slate-100 min-w-[250px]">التحليل</th>
              <th className="p-4 min-w-[250px]">التوصيات</th>
            </tr>
          </thead>
          <tbody>
            {axis.goals.map((goal, goalIndex) => {
              if (!goal.indicators || goal.indicators.length === 0) return null;

              return (
                <React.Fragment key={goal.id}>
                  {/* Optional Goal Header row if we want to separate by goals visually */}
                  <tr className="bg-slate-50/30 border-b border-slate-100">
                    <td colSpan={5} className="p-3 font-bold text-slate-700 text-xs">
                      الهدف: {goal.name} ({goal.code})
                    </td>
                  </tr>
                  
                  {goal.indicators.map((ind, indIndex) => {
                    const achieved = getQuarterAchieved(ind, quarter);
                    const perf = calcIndicatorPerf(ind, quarter);
                    const classification = getReportClassification(perf, hasData(achieved), ind.postponed);

                    return (
                      <tr key={ind.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 border-l border-slate-100 font-bold text-slate-500 whitespace-nowrap text-xs text-center" dir="ltr">
                          {ind.code || `${goal.code}-${indIndex + 1}`}
                        </td>
                        <td className="p-4 border-l border-slate-100 font-medium text-slate-800">
                          {ind.name}
                        </td>
                        <td className="p-4 border-l border-slate-100 text-center">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border ${classification.color} whitespace-nowrap`}>
                            {ind.postponed ? "مؤجل" : `${perf}%`} ({classification.text})
                          </span>
                        </td>
                        <td className="p-4 border-l border-slate-100 text-slate-600 text-xs leading-relaxed">
                          {ind.analysis || <span className="text-slate-300 italic">لا يوجد تحليل مسجل...</span>}
                        </td>
                        <td className="p-4 text-slate-600 text-xs leading-relaxed">
                          {ind.recommendations || <span className="text-slate-300 italic">لا توجد توصيات مسجلة...</span>}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
