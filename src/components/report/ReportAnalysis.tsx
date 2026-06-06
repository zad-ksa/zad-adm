"use client";

import React, { useState } from 'react';

export default function ReportAnalysis() {
  const [analysis, setAnalysis] = useState("");
  const [recommendations, setRecommendations] = useState("");

  const parsePoints = (text: string) => {
    if (!text) return [];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[-*•.]\s*/, ''));
  };

  const analysisPoints = parsePoints(analysis);
  const recPoints = parsePoints(recommendations);

  return (
    <>
      {/* SCREEN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 print:hidden">
        {/* General Analysis */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </span>
            التحليل العام للربع
          </h3>
          <textarea
            className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed"
            placeholder="اكتب التحليل العام لأداء الجمعية خلال هذا الربع (يمكنك كتابة نقاط جديدة بالضغط على Enter)..."
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
          />
        </div>

        {/* General Recommendations */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </span>
            التوصيات العامة للربع القادم
          </h3>
          <textarea
            className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-emerald-300 focus:bg-white transition-all resize-none leading-relaxed"
            placeholder="اكتب التوصيات المقترحة لتحسين الأداء أو معالجة أوجه القصور..."
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </div>
      </div>

      {/* PRINT VIEW (Final Slide Layout) */}
      <div className="hidden print:flex flex-col w-full h-[190mm] max-h-[190mm] break-after-page page-break-after-always bg-white relative overflow-hidden font-sans box-border py-4 px-12 justify-between">
        
        {/* Header Bar */}
        <div className="w-full bg-[#1ca386] h-16 rounded-xl flex items-center justify-between px-6 shadow-sm mb-6 shrink-0 relative overflow-hidden border-b-4 border-[#14876e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold text-lg">
              خ
            </div>
            <div className="flex flex-col">
              <span className="text-white/70 text-[10px] font-bold">التقرير الاستراتيجي</span>
              <span className="text-white text-lg font-black leading-none">الخلاصة والتحليل العام</span>
            </div>
          </div>
          <div className="bg-white/10 px-6 py-2 rounded-lg border border-white/20">
            <span className="text-white text-xl font-black">الخلاصة والتوصيات العامة للربع</span>
          </div>
          <div className="bg-white text-slate-800 shadow-md font-black text-lg px-6 py-2 rounded-lg flex items-center justify-center">
            النتائج والتوصيات
          </div>
        </div>

        {/* Content Box with Two Columns */}
        <div className="flex-1 grid grid-cols-2 gap-8 mb-4">
          
          {/* Analysis Column */}
          <div className="border border-slate-200 bg-slate-50/50 p-6 rounded-xl shadow-sm flex flex-col justify-start">
            <h4 className="text-[#114b79] font-black text-xl mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#1ca386] rounded-sm"></span>
              التحليل العام للأداء
            </h4>
            <div className="flex-1 overflow-y-auto">
              {analysisPoints.length > 0 ? (
                <ul className="space-y-4 text-slate-700 text-base md:text-lg font-bold leading-relaxed text-right list-none pr-0">
                  {analysisPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1ca386] mt-2.5 shrink-0"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic text-sm">(لم يتم إدخال تحليل عام للربع)</p>
              )}
            </div>
          </div>

          {/* Recommendations Column */}
          <div className="border border-slate-200 bg-slate-50/50 p-6 rounded-xl shadow-sm flex flex-col justify-start">
            <h4 className="text-[#114b79] font-black text-xl mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#f39c12] rounded-sm"></span>
              التوصيات العامة المقترحة
            </h4>
            <div className="flex-1 overflow-y-auto">
              {recPoints.length > 0 ? (
                <ul className="space-y-4 text-slate-700 text-base md:text-lg font-bold leading-relaxed text-right list-none pr-0">
                  {recPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f39c12] mt-2.5 shrink-0"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic text-sm">(لم يتم إدخال توصيات عامة للربع)</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
