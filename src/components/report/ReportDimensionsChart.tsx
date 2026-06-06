"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Axis } from './types';
import { calcAxisPerf, isAxisPostponed, getReportClassification } from './logic';

type ReportDimensionsChartProps = {
  axes: Axis[];
  quarter: string;
};

export default function ReportDimensionsChart({ axes, quarter }: ReportDimensionsChartProps) {
  const [mounted, setMounted] = useState(false);
  
  // States for analysis and recommendations per dimension (keyed by axis.id)
  const [analyses, setAnalyses] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="mb-6 mt-6">
      <h3 className="text-slate-800 font-bold text-xl mb-6 text-center print:text-lg">أداء وتحليل الأبعاد الاستراتيجية</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {axes.map(axis => {
          const perf = calcAxisPerf(axis, quarter);
          const postponed = isAxisPostponed(axis);
          const classification = getReportClassification(perf, true, postponed);

          // Data for Doughnut Chart
          const chartData = [
            { name: 'Achieved', value: postponed ? 100 : perf, color: classification.hex },
            { name: 'Remaining', value: postponed ? 0 : (100 - perf), color: '#f1f5f9' }
          ];

          return (
            <div 
              key={axis.id} 
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-slate-200/80 print:break-inside-avoid print:shadow-none print:border-slate-200"
            >
              {/* Card Header */}
              <div className="text-center mb-4 border-b border-slate-50 pb-3">
                <span className="text-xs font-bold text-indigo-500 block mb-1">بُعد الاستراتيجية</span>
                <h4 className="text-slate-800 font-bold text-base md:text-lg line-clamp-1">{axis.name}</h4>
              </div>

              {/* Doughnut Chart */}
              <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                {mounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={62}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-500 animate-spin" />
                )}

                {/* Text in the Center of Doughnut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span 
                    className="text-xl font-black transition-colors duration-300"
                    style={{ color: classification.hex }}
                  >
                    {postponed ? "مؤجل" : `${perf}%`}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border mt-1 transition-all ${classification.color}`}>
                    {classification.text}
                  </span>
                </div>
              </div>

              {/* Input Fields / Textareas */}
              <div className="space-y-4">
                {/* Analysis Field */}
                <div className="flex flex-col">
                  <label className="text-slate-700 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </span>
                    التحليل والتشخيص
                  </label>
                  <textarea
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[80px] print:hidden"
                    placeholder={`اكتب تحليلاً لأداء ${axis.name}...`}
                    value={analyses[axis.id] || ""}
                    onChange={(e) => setAnalyses(prev => ({ ...prev, [axis.id]: e.target.value }))}
                  />
                  {analyses[axis.id] ? (
                    <div className="hidden print:block whitespace-pre-wrap text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-2.5 min-h-[80px]">
                      {analyses[axis.id]}
                    </div>
                  ) : (
                    <div className="hidden print:block text-xs text-slate-400 italic">
                      (لم يتم إدخال تحليل لهذا البعد)
                    </div>
                  )}
                </div>

                {/* Recommendations Field */}
                <div className="flex flex-col">
                  <label className="text-slate-700 font-bold mb-1.5 flex items-center gap-1.5 text-xs">
                    <span className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                        <path d="M9 12l2 2 4-4"></path>
                      </svg>
                    </span>
                    توصيات التحسين والتطوير
                  </label>
                  <textarea
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-emerald-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[80px] print:hidden"
                    placeholder={`اكتب التوصيات المقترحة لـ ${axis.name}...`}
                    value={recommendations[axis.id] || ""}
                    onChange={(e) => setRecommendations(prev => ({ ...prev, [axis.id]: e.target.value }))}
                  />
                  {recommendations[axis.id] ? (
                    <div className="hidden print:block whitespace-pre-wrap text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-2.5 min-h-[80px]">
                      {recommendations[axis.id]}
                    </div>
                  ) : (
                    <div className="hidden print:block text-xs text-slate-400 italic">
                      (لم يتم إدخال توصيات لهذا البعد)
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
