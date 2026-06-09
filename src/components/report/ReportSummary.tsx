"use client";

import React, { useEffect, useState } from 'react';
import { Axis } from './types';
import { calcCharityPerf, calcAxisPerf, getReportClassification, isCharityPostponed, isAxisPostponed } from './logic';

type ReportSummaryProps = {
  axes: Axis[];
  quarter: string;
  year?: number;
};

// Map quarter string to Arabic
const getQuarterNameAr = (q: string) => {
  const map: Record<string, string> = { "Q1": "الأول", "Q2": "الثاني", "Q3": "الثالث", "Q4": "الرابع" };
  return map[q] || q;
};

// Gauge SVG Component to keep code DRY
const GaugeChart = ({ totalPerf, isPostponed }: { totalPerf: number, isPostponed: boolean }) => {
  const r = 80;
  const C = 2 * Math.PI * r; 
  const halfC = C / 2; 

  const redLen = 0.7 * halfC; 
  const yellowLen = 0.2 * halfC; 
  const greenLen = 0.1 * halfC; 

  return (
    <svg viewBox="0 0 300 140" className="w-full max-w-[400px] mx-auto drop-shadow-md">
      {/* Colored bands */}
      <g transform="translate(150, 110) rotate(-180)">
        {/* Red 0-69 */}
        <circle cx="0" cy="0" r="80" fill="none" stroke="#ff0000" strokeWidth="24" strokeDasharray={`${redLen} ${C}`} strokeDashoffset="0" />
        {/* Yellow 70-89 */}
        <circle cx="0" cy="0" r="80" fill="none" stroke="#ffff00" strokeWidth="24" strokeDasharray={`${yellowLen} ${C}`} strokeDashoffset={-redLen} />
        {/* Green 90-100 */}
        <circle cx="0" cy="0" r="80" fill="none" stroke="#00a65a" strokeWidth="24" strokeDasharray={`${greenLen} ${C}`} strokeDashoffset={-(redLen + yellowLen)} />
      </g>

      {/* Ticks */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => {
        const angle = (val / 100) * 180;
        return (
          <g key={val} transform={`translate(150, 110) rotate(${angle - 180})`}>
            <line x1="95" y1="0" x2="108" y2="0" stroke="#999" strokeWidth="1" />
          </g>
        );
      })}

      {/* Needle */}
      {!isPostponed && (
        <g transform={`translate(150, 110) rotate(${((totalPerf / 100) * 180) - 180})`}>
          <polygon points="-8,-3 -8,3 85,0" fill="#222" />
          <circle cx="0" cy="0" r="6" fill="#222" />
        </g>
      )}

      {/* Percentage Text inside gauge */}
      <text x="150" y="95" textAnchor="middle" fontSize="32" fontWeight="900" fill="#000" className="drop-shadow-sm">
        {isPostponed ? "مؤجل" : `%${totalPerf}`}
      </text>
    </svg>
  );
};

export default function ReportSummary({ axes, quarter, year = new Date().getFullYear() }: ReportSummaryProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalPerf = calcCharityPerf(axes, quarter);
  const isPostponed = isCharityPostponed(axes);

  // Determine colors for the large box
  let boxBorder = "#00a65a";
  let boxBg = "#00d06b";
  if (isPostponed) {
    boxBorder = "#02a0e3";
    boxBg = "#3bc1fb";
  } else if (totalPerf >= 90) {
    boxBorder = "#00a65a";
    boxBg = "#00c968"; // Matches image green
  } else if (totalPerf >= 70) {
    boxBorder = "#f39c12";
    boxBg = "#f5b041";
  } else {
    boxBorder = "#dd4b39";
    boxBg = "#f1948a";
  }

  return (
    <>
      {/* SCREEN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 mt-6 print:hidden">
        {/* Overall Performance Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col items-center justify-between min-h-[280px] transition-colors">
          <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg mb-4 transition-colors">الأداء العام للربع</h3>
          
          <div className="w-full flex-1 flex items-center justify-center">
            {mounted ? (
              <GaugeChart totalPerf={totalPerf} isPostponed={isPostponed} />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
            )}
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-bold text-center mt-4 shrink-0 transition-colors">
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
              <div key={axis.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block mb-1 transition-colors">بُعد الاستراتيجية</span>
                  <h4 className="text-slate-800 dark:text-slate-100 font-bold text-md transition-colors">{axis.name}</h4>
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
                <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-2 mt-4 overflow-hidden transition-colors">
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


      {/* PRINT ONLY VIEW - FULL PAGE */}
      <div className="hidden print:flex flex-col items-center justify-center w-full h-[209mm] max-h-[210mm] break-after-page page-break-after-always bg-white relative overflow-hidden">
        
        {/* Decorative Background Elements based on image */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
           <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-[#1ca386]"></div>
           <div className="absolute bottom-1/4 -left-20 w-96 h-96 rounded-full bg-[#1ca386]"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-8">
          {/* Header Title */}
          <div className="w-max mx-auto mb-20 bg-slate-100 px-16 py-4 border-l-8 border-[#1ca386]">
             <h2 className="text-[#1ca386] text-4xl font-black text-center">
               الأداء العام للربع {getQuarterNameAr(quarter)} {year}م
             </h2>
          </div>

          {/* Main Layout: Gauge and Box */}
          <div className="flex items-center justify-center gap-24 mb-24">
            
            {/* Left: Gauge */}
            <div className="w-[500px]">
              {mounted && <GaugeChart totalPerf={totalPerf} isPostponed={isPostponed} />}
            </div>

            {/* Right: Big Percentage Box */}
            <div 
              className="relative flex items-center justify-center shadow-xl px-12 py-10 min-w-[280px]"
              style={{ backgroundColor: boxBg, border: `8px solid ${boxBorder}` }}
            >
              {/* Pointer Triangle */}
              <div 
                className="absolute top-1/2 -right-[32px] -translate-y-1/2 w-0 h-0"
                style={{
                  borderTop: '24px solid transparent',
                  borderBottom: '24px solid transparent',
                  borderLeft: `24px solid ${boxBorder}`
                }}
              ></div>
              
              <span className="text-[5rem] leading-none font-black text-black">
                {isPostponed ? "مؤجل" : `${totalPerf}%`}
              </span>
            </div>

          </div>

          {/* Bottom Legend */}
          <div className="flex items-center justify-center gap-10 mt-16">
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[#02a0e3] font-bold text-lg">مؤجل</span>
                <span className="text-[#02a0e3] text-xs font-bold font-sans">postponed</span>
              </div>
              <div className="w-5 h-10 bg-[#02a0e3]"></div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-slate-400 font-bold text-lg">لا توجد بيانات</span>
                <span className="text-slate-400 text-xs font-bold font-sans">Not Data</span>
              </div>
              <div className="w-5 h-10 bg-slate-400"></div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[#dd4b39] font-bold text-lg">في خطر</span>
                <span className="text-[#dd4b39] text-xs font-bold font-sans">At Risk</span>
              </div>
              <div className="w-5 h-10 bg-[#dd4b39]"></div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[#f39c12] font-bold text-lg">أداء مقبول</span>
                <span className="text-[#f39c12] text-xs font-bold font-sans">Acceptable Performing</span>
              </div>
              <div className="w-5 h-10 bg-[#f39c12]"></div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-[#00a65a] font-bold text-lg">تحقق الهدف</span>
                <span className="text-[#00a65a] text-xs font-bold font-sans">Target Met</span>
              </div>
              <div className="w-5 h-10 bg-[#00a65a]"></div>
            </div>

          </div>
        </div>
      </div>

    </>
  );
}
