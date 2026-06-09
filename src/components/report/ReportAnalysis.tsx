"use client";

import React from 'react';
import { ReportData } from './types';

type ReportAnalysisProps = {
  reportData: ReportData;
  setReportData: React.Dispatch<React.SetStateAction<ReportData>>;
};

export default function ReportAnalysis({ reportData, setReportData }: ReportAnalysisProps) {
  const analysis = reportData.generalAnalysis || "";
  const recommendations = reportData.generalRecommendations || "";

  const setAnalysis = (val: string) => {
    setReportData(prev => ({ ...prev, generalAnalysis: val }));
  };

  const setRecommendations = (val: string) => {
    setReportData(prev => ({ ...prev, generalRecommendations: val }));
  };

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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col transition-colors">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-4 flex items-center gap-2 transition-colors">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </span>
            التحليل العام للربع
          </h3>
          <textarea
            className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-300 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none leading-relaxed"
            placeholder="اكتب التحليل العام لأداء الجمعية خلال هذا الربع (يمكنك كتابة نقاط جديدة بالضغط على Enter)..."
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
          />
        </div>

        {/* General Recommendations */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col transition-colors">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-4 flex items-center gap-2 transition-colors">
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </span>
            التوصيات العامة:
          </h3>
          <textarea
            className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-300 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all resize-none leading-relaxed"
            placeholder="اكتب التوصيات المقترحة لتحسين الأداء أو معالجة أوجه القصور..."
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
          />
        </div>
      </div>

      {/* PRINT VIEW (4 Slides Landscape Layout with Explicit Page Breaks) */}

      {/* 1. General Analysis Divider/Cover Page */}
      <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page', pageBreakAfter: 'always', breakAfter: 'page' }}>
        <div className="print:flex w-full h-[209mm] max-h-[210mm] bg-white relative overflow-hidden font-sans box-border" dir="rtl">
          {/* Right Column (Title block - 35% width) */}
          <div className="w-[35%] h-full bg-[#fcfcfc] border-l border-slate-100 flex flex-col justify-center items-center relative overflow-hidden shrink-0">
            {/* Top gray block */}
            <div className="absolute top-0 right-0 w-full h-[3.5rem] bg-[#a6a6a6]"></div>

            {/* Watermark logo */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none flex items-center justify-center">
              <img src="/assets/logos/%D9%84%D9%88%D8%AC%D9%88%20%D8%B2%D8%A7%D8%AF-01.svg" className="w-[90%] h-[90%] object-contain max-w-none transform translate-x-4" alt="" />
            </div>

            {/* Plumb-bob hanging line */}
            <div className="absolute left-8 top-0 bottom-[18%] w-[1.5px] bg-slate-300 flex flex-col justify-end items-center">
              <div className="w-2.5 h-2.5 bg-slate-400 transform rotate-45 mb-1.5"></div>
            </div>

            {/* Large Title */}
            <h2 className="text-[#1ca386] text-5xl font-black tracking-wide text-center z-10 leading-relaxed pr-6 select-none">
              التحليل
              <br />
              العام
            </h2>

            {/* Bottom teal block */}
            <div className="absolute bottom-0 right-0 w-full h-[3.5rem] bg-[#1ca386]"></div>
          </div>

          {/* Left Column (5 Questions - 65% width) */}
          <div className="w-[65%] h-full py-12 px-10 flex flex-col justify-between relative" dir="rtl">
            {/* Top-left decoration */}
            <div className="absolute top-0 left-0 w-24 h-16 bg-[#e0f7f3] rounded-bl-3xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>

            {/* Cards Stack */}
            <div className="flex-1 flex flex-col justify-between mt-12 mb-2">
              {/* Q1 */}
              <div className="bg-white border border-[#1ca386]/30 rounded-2xl flex items-center h-[4.8rem] overflow-hidden shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
                <div className="w-[6rem] h-full flex items-center justify-center border-l border-slate-200 bg-[#fafafa] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2" className="w-9 h-9">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div className="flex-1 px-8 text-right text-[#114b79] font-black text-xl">
                  هل حققنا المستهدف؟
                </div>
              </div>

              {/* Q2 */}
              <div className="bg-white border border-[#1ca386]/30 rounded-2xl flex items-center h-[4.8rem] overflow-hidden shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
                <div className="w-[6rem] h-full flex items-center justify-center border-l border-slate-200 bg-[#fafafa] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2" className="w-9 h-9">
                    <rect x="2" y="3" width="20" height="13" rx="2" />
                    <line x1="12" y1="16" x2="12" y2="21" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <path d="M7 10l3-3 3 3 4-4" />
                  </svg>
                </div>
                <div className="flex-1 px-8 text-right text-[#114b79] font-black text-xl">
                  هل نحن نتقدم باتجاه المستهدف ؟
                </div>
              </div>

              {/* Q3 */}
              <div className="bg-white border border-[#1ca386]/30 rounded-2xl flex items-center h-[4.8rem] overflow-hidden shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
                <div className="w-[6rem] h-full flex items-center justify-center border-l border-slate-200 bg-[#fafafa] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2" className="w-9 h-9">
                    <path d="M3 3v18h18" />
                    <rect x="7" y="10" width="4" height="7" rx="1" />
                    <rect x="14" y="6" width="4" height="11" rx="1" />
                    <circle cx="18" cy="18" r="2" />
                  </svg>
                </div>
                <div className="flex-1 px-8 text-right text-[#114b79] font-black text-xl">
                  هل هناك أي قصور في تسلسل إجراءاتنا؟
                </div>
              </div>

              {/* Q4 */}
              <div className="bg-white border border-[#1ca386]/30 rounded-2xl flex items-center h-[4.8rem] overflow-hidden shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
                <div className="w-[6rem] h-full flex items-center justify-center border-l border-slate-200 bg-[#fafafa] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2.2" className="w-9 h-9">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M12 18h.01" />
                    <path d="M12 14c.01-.25.15-.5.35-.64l1.3-1.01a2.4 2.4 0 0 0 .85-1.85 2.5 2.5 0 0 0-5-1" />
                  </svg>
                </div>
                <div className="flex-1 px-8 text-right text-[#114b79] font-black text-xl">
                  لماذا نحصل على هذه النتائج التي نحصل عليها؟
                </div>
              </div>

              {/* Q5 */}
              <div className="bg-white border border-[#1ca386]/30 rounded-2xl flex items-center h-[4.8rem] overflow-hidden shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]">
                <div className="w-[6rem] h-full flex items-center justify-center border-l border-slate-200 bg-[#fafafa] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#1ca386" strokeWidth="2" className="w-9 h-9">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <div className="flex-1 px-8 text-right text-[#114b79] font-black text-xl">
                  ما الذي يمكن أن يحدث في المستقبل؟
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. General Analysis Content Page */}
      <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page', pageBreakAfter: 'always', breakAfter: 'page' }}>
        <div className="print:flex flex-col w-full h-[209mm] max-h-[210mm] bg-white relative overflow-hidden font-sans box-border py-4 px-12 justify-between" dir="rtl">
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
              <span className="text-white text-xl font-black">الخلاصة والتحليل العام للأداء</span>
            </div>
            <div className="bg-white text-slate-800 shadow-md font-black text-lg px-6 py-2 rounded-lg flex items-center justify-center">
              النتائج والتحليل
            </div>
          </div>

          {/* Content Box */}
          <div className="flex-1 border border-slate-200 bg-slate-50/50 p-8 rounded-xl shadow-sm flex flex-col justify-start overflow-hidden mb-4">
            <h4 className="text-[#114b79] font-black text-2xl mb-6 pb-3 border-b border-slate-200 flex items-center gap-2">
              <span className="w-3.5 h-7 bg-[#1ca386] rounded-sm"></span>
              التحليل العام للأداء خلال الربع
            </h4>
            <div className="flex-1 overflow-y-auto pr-2">
              {analysisPoints.length > 0 ? (
                <ul className="space-y-5 text-slate-700 text-xl font-bold leading-relaxed text-right list-none pr-0">
                  {analysisPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#1ca386] mt-2.5 shrink-0 shadow-sm"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic text-lg text-center mt-12">(لم يتم إدخال تحليل عام للربع)</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. General Recommendations Divider/Cover Page */}
      <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page', pageBreakAfter: 'always', breakAfter: 'page' }}>
        <div className="print:flex w-full h-[209mm] max-h-[210mm] bg-white relative overflow-hidden font-sans box-border" dir="rtl">
          {/* Right Column (Title block - 35% width) */}
          <div className="w-[35%] h-full bg-[#fcfcfc] border-l border-slate-100 flex flex-col justify-center items-center relative overflow-hidden shrink-0">
            {/* Top gray block */}
            <div className="absolute top-0 right-0 w-full h-[3.5rem] bg-[#a6a6a6]"></div>

            {/* Watermark logo */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none flex items-center justify-center">
              <img src="/assets/logos/%D9%84%D9%88%D8%AC%D9%88%20%D8%B2%D8%A7%D8%AF-01.svg" className="w-[90%] h-[90%] object-contain max-w-none transform translate-x-4" alt="" />
            </div>

            {/* Plumb-bob hanging line */}
            <div className="absolute left-8 top-0 bottom-[18%] w-[1.5px] bg-slate-300 flex flex-col justify-end items-center">
              <div className="w-2.5 h-2.5 bg-slate-400 transform rotate-45 mb-1.5"></div>
            </div>

            {/* Large Title */}
            <h2 className="text-[#1ca386] text-5xl font-black tracking-wide text-center z-10 leading-relaxed pr-6 select-none">
              التوصيات
              <br />
              العامة
            </h2>

            {/* Bottom teal block */}
            <div className="absolute bottom-0 right-0 w-full h-[3.5rem] bg-[#1ca386]"></div>
          </div>

          {/* Left Column (3 Step Cards - 65% width) */}
          <div className="w-[65%] h-full py-12 px-10 flex flex-col justify-between relative" dir="rtl">
            {/* Top-left decoration */}
            <div className="absolute top-0 left-0 w-24 h-16 bg-[#e0f7f3] rounded-bl-3xl"></div>

            {/* Steps Grid */}
            <div className="grid grid-cols-3 gap-6 flex-1 items-stretch px-4 mt-12 mb-2">
              {/* Card 1 */}
              <div className="bg-[#f0f5f3] rounded-2xl p-6 flex flex-col items-center gap-6 h-full border border-slate-100 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.05)]">
                <div className="text-5xl font-extrabold text-slate-800 mt-2">1</div>
                <div className="bg-[#1ca386] rounded-2xl p-6 flex-1 w-full flex items-center justify-center text-center text-white font-black text-2xl leading-relaxed shadow-sm">
                  ما الذي سنحسنه؟
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#f0f5f3] rounded-2xl p-6 flex flex-col items-center gap-6 h-full border border-slate-100 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.05)]">
                <div className="text-5xl font-extrabold text-slate-800 mt-2">2</div>
                <div className="bg-[#1ca386] rounded-2xl p-6 flex-1 w-full flex items-center justify-center text-center text-white font-black text-2xl leading-relaxed shadow-sm">
                  كم سنحسنه؟
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#f0f5f3] rounded-2xl p-6 flex flex-col items-center gap-6 h-full border border-slate-100 shadow-[0_4px_12px_-5px_rgba(0,0,0,0.05)]">
                <div className="text-5xl font-extrabold text-slate-800 mt-2">3</div>
                <div className="bg-[#1ca386] rounded-2xl p-6 flex-1 w-full flex items-center justify-center text-center text-white font-black text-2xl leading-relaxed shadow-sm">
                  كيف سنقوم بهذا التحسين؟
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. General Recommendations Content Page */}
      <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page', pageBreakAfter: 'always', breakAfter: 'page' }}>
        <div className="print:flex flex-col w-full h-[209mm] max-h-[210mm] bg-white relative overflow-hidden font-sans box-border py-4 px-12 justify-between" dir="rtl">
          {/* Header Bar */}
          <div className="w-full bg-[#1ca386] h-16 rounded-xl flex items-center justify-between px-6 shadow-sm mb-6 shrink-0 relative overflow-hidden border-b-4 border-[#14876e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white font-bold text-lg">
                خ
              </div>
              <div className="flex flex-col">
                <span className="text-white/70 text-[10px] font-bold">التقرير الاستراتيجي</span>
                <span className="text-white text-lg font-black leading-none">الخلاصة والتوصيات العامة</span>
              </div>
            </div>
            <div className="bg-white/10 px-6 py-2 rounded-lg border border-white/20">
              <span className="text-white text-xl font-black">التوصيات العامة للربع القادم</span>
            </div>
            <div className="bg-white text-slate-800 shadow-md font-black text-lg px-6 py-2 rounded-lg flex items-center justify-center">
              التوصيات العامة
            </div>
          </div>

          {/* Content Box */}
          <div className="flex-1 border border-slate-200 bg-slate-50/50 p-8 rounded-xl shadow-sm flex flex-col justify-start overflow-hidden mb-4">
            <h4 className="text-[#114b79] font-black text-2xl mb-6 pb-3 border-b border-slate-200 flex items-center gap-2">
              <span className="w-3.5 h-7 bg-[#f39c12] rounded-sm"></span>
              التوصيات العامة المقترحة للربع القادم
            </h4>
            <div className="flex-1 overflow-y-auto pr-2">
              {recPoints.length > 0 ? (
                <ul className="space-y-5 text-slate-700 text-xl font-bold leading-relaxed text-right list-none pr-0">
                  {recPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#f39c12] mt-2.5 shrink-0 shadow-sm"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic text-lg text-center mt-12">(لم يتم إدخال توصيات عامة للربع)</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
