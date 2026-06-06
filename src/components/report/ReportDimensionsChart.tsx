"use client";

import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Axis } from './types';
import { calcAxisPerf, isAxisPostponed } from './logic';

type ReportDimensionsChartProps = {
  axes: Axis[];
  quarter: string;
};

export default function ReportDimensionsChart({ axes, quarter }: ReportDimensionsChartProps) {
  const [analysis, setAnalysis] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const data = axes.map(axis => {
    const perf = calcAxisPerf(axis, quarter);
    const postponed = isAxisPostponed(axis);
    return {
      subject: axis.name,
      A: postponed ? 100 : perf,
      fullMark: 100,
      postponed
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6 mt-6">
      <h3 className="text-slate-800 font-bold text-lg mb-6 text-center">أداء الأبعاد الاستراتيجية</h3>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Chart Section */}
        <div className="w-full lg:w-1/2 h-[350px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
              <Radar name="نسبة التحقق" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
              <Tooltip 
                formatter={(value: any, name: any, props: any) => {
                  if (props.payload.postponed) return ["مؤجل", name];
                  return [`${value}%`, name];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Text Areas Section */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="flex flex-col flex-1">
            <label className="text-slate-700 font-bold mb-2 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </span>
              تحليل أداء الأبعاد
            </label>
            <textarea
              className="w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[120px]"
              placeholder="اكتب تحليلاً لأداء الأبعاد الاستراتيجية مقارنة ببعضها..."
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col flex-1">
            <label className="text-slate-700 font-bold mb-2 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </span>
              التوصيات التحسينية للأبعاد
            </label>
            <textarea
              className="w-full flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-emerald-300 focus:bg-white transition-all resize-none leading-relaxed min-h-[120px]"
              placeholder="اكتب التوصيات المقترحة لتعزيز أداء الأبعاد المنخفضة..."
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
