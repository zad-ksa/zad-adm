"use client";

import React from 'react';

type ReportHeaderProps = {
  charityName: string;
  year: number;
  quarter: string;
  onSave?: () => void;
  isSaving?: boolean;
};

export default function ReportHeader({ charityName, year, quarter, onSave, isSaving }: ReportHeaderProps) {
  const handlePrint = () => {
    window.print();
  };

  const quarterName = quarter === 'Q1' ? 'الربع الأول' : quarter === 'Q2' ? 'الربع الثاني' : quarter === 'Q3' ? 'الربع الثالث' : 'الربع الرابع';

  return (
    <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm print:hidden">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">تقرير الأداء الاستراتيجي - {quarterName} {year}</h1>
        <p className="text-slate-500 mt-2 font-medium">{charityName}</p>
      </div>
      <div className="mt-4 md:mt-0 flex gap-3">
        {onSave && (
          <button 
            onClick={onSave}
            disabled={isSaving}
            className="bg-[#1ca386] hover:bg-[#14876e] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            )}
            {isSaving ? "جاري الحفظ..." : "حفظ التقرير"}
          </button>
        )}
        <button 
          className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          تصدير البيانات
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          طباعة التقرير
        </button>
      </div>
    </div>
  );
}
