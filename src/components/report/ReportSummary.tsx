"use client";

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Axis } from './types';
import { calcCharityPerf, calcAxisPerf, getReportClassification, isCharityPostponed, isAxisPostponed } from './logic';

type ReportSummaryProps = {
  axes: Axis[];
  quarter: string;
};

export default function ReportSummary({ axes, quarter }: ReportSummaryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalPerf = calcCharityPerf(axes, quarter);
  const isPostponed = isCharityPostponed(axes);
  const overallClassification = getReportClassification(totalPerf, true, isPostponed);

  // Data for the circular progress chart
  const data = [
    { name: 'Achieved', value: isPostponed ? 100 : totalPerf, color: overallClassification.hex },
    { name: 'Remaining', value: isPostponed ? 0 : (100 - totalPerf), color: '#f1f5f9' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-6">
      {/* Overall Performance Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col items-center justify-between min-h-[280px] print:shadow-none print:border-slate-200 print:break-inside-avoid">
        <h3 className="text-slate-800 font-bold text-lg">الأداء العام للربع</h3>
        
        <div className="relative w-40 h-40 my-3 flex items-center justify-center">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={73}
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
          )}
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-slate-800 transition-colors duration-300" style={{ color: overallClassification.hex }}>
              {isPostponed ? "مؤجل" : `${totalPerf}%`}
            </span>
            <span className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${overallClassification.color}`}>
              {overallClassification.text}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-bold text-center mt-2 shrink-0">
          معدل الإنجاز الكلي للجمعية
        </div>
      </div>

      {/* Axis Cards Grid */}
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {axes.map(axis => {
          const perf = calcAxisPerf(axis, quarter);
          const postponed = isAxisPostponed(axis);
          const classification = getReportClassification(perf, true, postponed);

          return (
            <div key={axis.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">بُعد الاستراتيجية</span>
                <h4 className="text-slate-800 font-bold text-md">{axis.name}</h4>
              </div>
              
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${classification.color}`}>
                    {classification.text}
                  </span>
                </div>
                <div className="text-2xl font-black" style={{ color: classification.hex }}>
                  {postponed ? "مؤجل" : `${perf}%`}
                </div>
              </div>

              {/* Mini Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000" 
                  style={{ 
                    width: postponed ? '100%' : `${perf}%`, 
                    backgroundColor: classification.hex 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
