"use client";

import React, { useState } from 'react';

export default function ReportAnalysis() {
  const [analysis, setAnalysis] = useState("");
  const [recommendations, setRecommendations] = useState("");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 print:break-inside-avoid">
      {/* General Analysis */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col print:shadow-none print:border-slate-200">
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
          className="w-full flex-1 min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all resize-none leading-relaxed print:hidden"
          placeholder="اكتب التحليل العام لأداء الجمعية خلال هذا الربع (يمكنك استخدام النقاط...)"
          value={analysis}
          onChange={(e) => setAnalysis(e.target.value)}
        />
        {analysis ? (
          <div className="hidden print:block whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[150px]">
            {analysis}
          </div>
        ) : (
          <div className="hidden print:block text-sm text-slate-400 italic p-4">
            (لم يتم إدخال تحليل عام للربع)
          </div>
        )}
      </div>

      {/* General Recommendations */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col print:shadow-none print:border-slate-200">
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
          className="w-full flex-1 min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-emerald-300 focus:bg-white transition-all resize-none leading-relaxed print:hidden"
          placeholder="اكتب التوصيات المقترحة لتحسين الأداء أو معالجة أوجه القصور..."
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
        />
        {recommendations ? (
          <div className="hidden print:block whitespace-pre-wrap text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[150px]">
            {recommendations}
          </div>
        ) : (
          <div className="hidden print:block text-sm text-slate-400 italic p-4">
            (لم يتم إدخال توصيات عامة للربع)
          </div>
        )}
      </div>
    </div>
  );
}
