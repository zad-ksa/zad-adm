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
    <>
      {/* SCREEN VIEW (Grid Layout) */}
      <div className="mb-6 mt-6 print:hidden">
        <h3 className="text-slate-800 font-bold text-xl mb-6 text-center">أداء وتحليل الأبعاد الاستراتيجية</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {axes.map(axis => {
            const perf = calcAxisPerf(axis, quarter);
            const postponed = isAxisPostponed(axis);
            const classification = getReportClassification(perf, true, postponed);

            const chartData = [
              { name: 'Achieved', value: postponed ? 100 : perf, color: classification.hex },
              { name: 'Remaining', value: postponed ? 0 : (100 - perf), color: '#f1f5f9' }
            ];

            return (
              <div 
                key={axis.id} 
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-slate-200/80"
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
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[80px]"
                      placeholder={`اكتب تحليلاً لأداء ${axis.name}...`}
                      value={analyses[axis.id] || ""}
                      onChange={(e) => setAnalyses(prev => ({ ...prev, [axis.id]: e.target.value }))}
                    />
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
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-emerald-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[80px]"
                      placeholder={`اكتب التوصيات المقترحة لـ ${axis.name}...`}
                      value={recommendations[axis.id] || ""}
                      onChange={(e) => setRecommendations(prev => ({ ...prev, [axis.id]: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRINT VIEW (Full Page Slides) */}
      <div className="hidden print:block w-full">
        {axes.map(axis => {
          if (!axis.goals || axis.goals.length === 0) return null;

          const perf = calcAxisPerf(axis, quarter);
          const postponed = isAxisPostponed(axis);
          const classification = getReportClassification(perf, true, postponed);

          // Data for Pie Chart
          const chartData = [
            { name: 'Achieved', value: postponed ? 100 : perf, color: classification.hex },
            { name: 'Remaining', value: postponed ? 0 : (100 - perf), color: '#b0b0b0' } // grey
          ];

          return (
            <div key={`print-${axis.id}`} className="flex w-full h-[200mm] max-h-[200mm] break-after-page page-break-after-always bg-white mb-4 relative overflow-hidden font-sans box-border">
              
              {/* Main Content (70% width, on the left in RTL but it comes first in DOM? No, in RTL, flex row makes the first element on the right. 
                  Wait, if we want Main Content on the left, it should be the SECOND element. 
                  Or we can just use absolute positioning or explicit flex order.
                  Let's use explicit order just to be safe. */}
              <div className="w-[70%] h-full p-6 flex flex-col justify-between order-2 box-border">
                
                {/* Header Row */}
                <div className="relative mb-4 h-12">
                  {/* Decorative horizontal line behind the boxes */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-300 -translate-y-1/2 z-0"></div>
                  
                  <div className="relative z-10 flex items-stretch justify-between h-full gap-4">
                    {/* Right: Icon (First in visual RTL, so flex item 1) */}
                    <div className="w-12 flex items-end justify-center gap-1 bg-white px-1 py-1 shrink-0">
                      <div className="w-2 h-4 bg-slate-400"></div>
                      <div className="w-2 h-8 bg-slate-500"></div>
                      <div className="w-2 h-3 bg-slate-400"></div>
                      <div className="w-2 h-2 bg-slate-400"></div>
                    </div>

                    {/* Center: Title */}
                    <div className="flex-1 bg-white border border-slate-300 flex items-center justify-center shadow-sm">
                      <span className="text-xl font-bold text-slate-800">{axis.name}</span>
                    </div>

                    {/* Left: Percentage */}
                    <div 
                      className="text-white flex items-center justify-center w-24 shadow-md border-b-[4px] shrink-0"
                      style={{ backgroundColor: classification.hex, borderBottomColor: 'rgba(0,0,0,0.15)' }}
                    >
                      <span className="text-2xl font-black">{postponed ? "مؤجل" : `%${perf}`}</span>
                    </div>
                  </div>
                </div>

                {/* Pie Chart and Legend Box */}
                <div className="flex-1 flex items-center justify-center border border-slate-200 mb-4 p-4 relative bg-white shadow-sm">
                  
                  {/* Legend (Left side visually, meaning absolute left-8) */}
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 shadow-sm border border-slate-200" style={{ backgroundColor: classification.hex }}></div>
                      <span className="text-base font-bold text-slate-800">الأداء المتحقق</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Gradient/Pattern for 'deficit' to match image grey box with cross pattern */}
                      <div className="w-5 h-5 shadow-inner border border-slate-300 bg-[#b0b0b0] relative overflow-hidden flex items-center justify-center">
                        <div className="w-[140%] h-[1px] bg-slate-400 rotate-45 absolute"></div>
                        <div className="w-[140%] h-[1px] bg-slate-400 -rotate-45 absolute"></div>
                      </div>
                      <span className="text-base font-bold text-slate-800">عجز الأداء</span>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="w-[240px] h-[240px] relative drop-shadow-lg flex items-center justify-center">
                    {mounted && (
                      <PieChart width={240} height={240}>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          stroke="#fff"
                          strokeWidth={3}
                          isAnimationActive={false}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                    
                    {/* Percentage Labels on Chart (Optional, similar to mockup) */}
                    <div className="absolute top-2 right-4 text-2xl font-black drop-shadow-md" style={{ color: classification.hex }}>
                       {postponed ? "100%" : `${perf}%`}
                    </div>
                    {(!postponed && perf < 100) && (
                      <div className="absolute bottom-6 left-6 text-2xl font-black text-slate-400 drop-shadow-md">
                         {100 - perf}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis Table */}
                <table className="w-full border-collapse border border-slate-300 text-center shadow-sm">
                  <thead>
                    <tr className="bg-[#1ca386] text-white">
                      {/* In RTL, the first th is rendered on the right. Image has Analysis on right, Recommendations on left */}
                      <th className="p-2 border border-slate-300 w-1/2 text-lg font-bold">التحليل</th>
                      <th className="p-2 border border-slate-300 w-1/2 text-lg font-bold">التوصيات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-100">
                      <td className="p-3 border border-slate-300 align-top h-[110px]">
                         <div className="whitespace-pre-wrap text-sm md:text-base font-bold text-slate-800 leading-[1.6] text-right">
                           {analyses[axis.id] || "لا يوجد تحليل مسجل لهذا البعد."}
                         </div>
                      </td>
                      <td className="p-3 border border-slate-300 align-top h-[110px]">
                         <div className="whitespace-pre-wrap text-sm md:text-base font-bold text-slate-800 leading-[1.6] text-right">
                           {recommendations[axis.id] || "لا توجد توصيات مسجلة لهذا البعد."}
                         </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right Sidebar (30% width, on the right in RTL, so order-1) */}
              <div className="w-[30%] bg-[#1ca386] flex items-center justify-center p-6 shrink-0 relative overflow-hidden order-1 box-border">
                <h2 className="text-white text-[2.2rem] font-black text-center leading-[1.3] drop-shadow-lg relative z-10 tracking-tight">
                  الأداء على<br/>مستوى<br/>الأبعاد
                </h2>
                {/* Decorative background shapes mimicking presentation slide template */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-black/10 rounded-full blur-2xl"></div>
              </div>

            </div>
          );
        })}
      </div>
    </>
  );
}
