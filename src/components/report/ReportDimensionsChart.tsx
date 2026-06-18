"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Axis, ReportData } from './types';
import { calcAxisPerf, isAxisPostponed, getReportClassification } from './logic';

type ReportDimensionsChartProps = {
  axes: Axis[];
  quarter: string;
  reportData: ReportData;
  setReportData: React.Dispatch<React.SetStateAction<ReportData>>;
};

export default function ReportDimensionsChart({ axes, quarter, reportData, setReportData }: ReportDimensionsChartProps) {
  const [mounted, setMounted] = useState(false);
  
  const analyses = reportData.dimensionAnalyses || {};
  const recommendations = reportData.dimensionRecommendations || {};

  const setAnalyses = (updater: React.SetStateAction<Record<string, string>>) => {
    setReportData(prev => {
      const newAnalyses = typeof updater === 'function' ? updater(prev.dimensionAnalyses || {}) : updater;
      return { ...prev, dimensionAnalyses: newAnalyses };
    });
  };

  const setRecommendations = (updater: React.SetStateAction<Record<string, string>>) => {
    setReportData(prev => {
      const newRecs = typeof updater === 'function' ? updater(prev.dimensionRecommendations || {}) : updater;
      return { ...prev, dimensionRecommendations: newRecs };
    });
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* SCREEN VIEW (Grid Layout) */}
      <div className="mb-6 mt-6 print:hidden">
        <h3 className="text-slate-800 dark:text-slate-100 font-bold text-xl mb-6 text-center transition-colors">أداء وتحليل الأبعاد الاستراتيجية</h3>
        
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
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-slate-200/80 dark:hover:border-slate-600"
              >
                {/* Card Header */}
                <div className="text-center mb-4 border-b border-slate-50 dark:border-slate-700/50 pb-3 transition-colors">
                  <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 block mb-1 transition-colors">بُعد الاستراتيجية</span>
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold text-base md:text-lg line-clamp-1 transition-colors">{axis.name}</h4>
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
                    <label className="text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5 text-xs transition-colors">
                      <span className="w-5 h-5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                      </span>
                      التحليل والتشخيص
                    </label>
                    <textarea
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none leading-relaxed min-h-[80px]"
                      placeholder={`اكتب تحليلاً لأداء ${axis.name}...`}
                      value={analyses[axis.id] || ""}
                      onChange={(e) => setAnalyses(prev => ({ ...prev, [axis.id]: e.target.value }))}
                    />
                  </div>
                  
                  {/* Recommendations Field */}
                  <div className="flex flex-col">
                    <label className="text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5 text-xs transition-colors">
                      <span className="w-5 h-5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                          <path d="M9 12l2 2 4-4"></path>
                        </svg>
                      </span>
                      توصيات التحسين والتطوير
                    </label>
                    <textarea
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-300 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none leading-relaxed min-h-[80px]"
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

          // Data for Pie/Doughnut Chart
          const chartData = [
            { name: 'Achieved', value: postponed ? 100 : perf, color: classification.hex },
            { name: 'Remaining', value: postponed ? 0 : (100 - perf), color: '#e2e8f0' } // soft grey
          ];

          return (
            <div key={`print-${axis.id}`} className="flex flex-col w-full h-[209mm] max-h-[210mm] break-after-page page-break-after-always bg-white mb-4 relative overflow-hidden font-sans box-border py-4 px-12 justify-between">
              
              {/* Header Bar at the top (full width, replaces sidebar and previous header row) */}
              <div className="w-full bg-[#1ca386] h-16 rounded-xl flex items-center justify-between px-6 shadow-sm mb-6 shrink-0 relative overflow-hidden border-b-4 border-[#14876e]">
                {/* Right side: Icon + Category title */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold text-lg">
                    {axis.prefix || "غ"}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white/70 text-[10px] font-bold">التقرير الاستراتيجي</span>
                    <span className="text-white text-lg font-black leading-none">الأداء على مستوى الأبعاد</span>
                  </div>
                </div>

                {/* Center: Dimension Name */}
                <div className="bg-white/10 px-6 py-2 rounded-lg border border-white/20">
                  <span className="text-white text-xl font-black">{axis.name}</span>
                </div>

                {/* Left side: Percentage value */}
                <div 
                  className="bg-white text-slate-800 shadow-md font-black text-2xl px-6 py-2 rounded-lg flex items-center justify-center min-w-[100px]"
                >
                  <span style={{ color: classification.hex }}>
                    {postponed ? "مؤجل" : `%${perf}`}
                  </span>
                </div>
              </div>

              {/* Pie Chart and Legend Box (Side-by-side using Flexbox to avoid overlap and utilize space) */}
              <div className="flex-1 flex flex-row items-center justify-center gap-24 border border-slate-200 mb-6 p-6 bg-white shadow-sm rounded-xl">
                
                {/* Pie/Doughnut Chart (First in DOM, rendered on the right in RTL) */}
                <div className="w-[260px] h-[260px] relative drop-shadow-lg flex items-center justify-center">
                  {mounted && (
                    <PieChart width={260} height={260}>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={105}
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
                  
                  {/* Centered Percentage Label inside the Doughnut Chart */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-4xl font-black drop-shadow-sm animate-fade-in" style={{ color: classification.hex }}>
                       {postponed ? "مؤجل" : `%${perf}`}
                    </span>
                  </div>
                </div>

                {/* Legend (Second in DOM, rendered on the left in RTL) */}
                <div className="space-y-3 min-w-[200px] bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 shadow-sm border border-slate-200 rounded-sm" style={{ backgroundColor: classification.hex }}></div>
                    <span className="text-lg font-bold text-slate-800">نسبة تحقق البعد</span>
                  </div>
                </div>
              </div>

              {/* Analysis Table */}
              <table className="w-full border-collapse border border-slate-300 text-center shadow-sm">
                <thead>
                  <tr className="bg-[#1ca386] text-white">
                    {/* In RTL, the first th is rendered on the right. Image has Analysis on right, Recommendations on left */}
                    <th className="p-2.5 border border-slate-300 w-1/2 text-xl font-black">التحليل</th>
                    <th className="p-2.5 border border-slate-300 w-1/2 text-xl font-black">التوصيات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-slate-100">
                    <td className="p-4 border border-slate-300 align-top h-[165px]">
                       <div className="whitespace-pre-wrap text-base md:text-lg font-bold text-slate-800 leading-[1.7] text-right">
                         {analyses[axis.id] || "لا يوجد تحليل مسجل لهذا البعد."}
                       </div>
                    </td>
                    <td className="p-4 border border-slate-300 align-top h-[165px]">
                       <div className="whitespace-pre-wrap text-base md:text-lg font-bold text-slate-800 leading-[1.7] text-right">
                         {recommendations[axis.id] || "لا توجد توصيات مسجلة لهذا البعد."}
                       </div>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          );
        })}
      </div>
    </>
  );
}

