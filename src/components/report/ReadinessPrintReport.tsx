"use client";

import React from 'react';

type QuestionPrintData = {
  id: string;
  text: string;
  averagePercentage: number;
  globalIndex: number;
  sectionTitle: string;
};

type SectionPrintData = {
  index: number;
  title: string;
  averagePercentage: number;
};

type ReadinessPrintReportProps = {
  charityName: string;
  allQuestions: QuestionPrintData[];
  categorizedQuestions: {
    green: QuestionPrintData[];
    yellow: QuestionPrintData[];
    red: QuestionPrintData[];
  };
  sectionData: SectionPrintData[];
  overallAveragePercentage: number;
};

const getPercentageColorStyle = (percentage: number) => {
  if (percentage >= 85) return { bg: "#1ca386", text: "white", badgeBg: "#1ca386", badgeText: "white" };
  if (percentage >= 70) return { bg: "#c29300", text: "white", badgeBg: "#cca95c", badgeText: "white" }; // Using a softer gold for badge
  return { bg: "#d9534f", text: "white", badgeBg: "#d9534f", badgeText: "white" };
};

const CriteriaList = ({ items, startIndex = 0 }: { items: QuestionPrintData[], startIndex?: number }) => {
  const midPoint = Math.ceil(items.length / 2);
  const rightCol = items.slice(0, midPoint);
  const leftCol = items.slice(midPoint);

  const renderItem = (q: QuestionPrintData) => {
    const colors = getPercentageColorStyle(q.averagePercentage);
    return (
      <div key={q.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-200/50 last:border-0">
        <div className="flex items-start gap-2.5 flex-1">
          <div className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 shadow-sm">
            {q.globalIndex}
          </div>
          <p className="text-[10px] text-slate-800 font-bold leading-tight flex-1 text-right">{q.text}</p>
        </div>
        <div 
          className="px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm shrink-0 w-11 text-center"
          style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
        >
          {q.averagePercentage}%
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-1 mt-4">
      <div className="flex flex-col gap-0.5">
        {rightCol.map(renderItem)}
      </div>
      <div className="flex flex-col gap-0.5">
        {leftCol.map(renderItem)}
      </div>
    </div>
  );
};

// Chunk array helper
const chunkArray = <T,>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
};

export default function ReadinessPrintReport({
  charityName,
  allQuestions,
  categorizedQuestions,
  sectionData,
  overallAveragePercentage,
}: ReadinessPrintReportProps) {
  // Page 1: 1-32
  const allCriteriaPage1 = allQuestions.slice(0, 32);
  // Page 2: 33-64 (or whatever is left)
  const allCriteriaPage2 = allQuestions.slice(32);

  // Categorized pagination (24 per page to prevent overflow)
  const greenPages = chunkArray(categorizedQuestions.green, 24);
  const yellowPages = chunkArray(categorizedQuestions.yellow, 24);
  const redPages = chunkArray(categorizedQuestions.red, 24);

  const PageWrapper = ({ children, bg = "bg-slate-50/50" }: { children: React.ReactNode, bg?: string }) => (
    <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page', pageBreakAfter: 'always', breakAfter: 'page' }}>
      <div className={`print:flex flex-col w-full h-[209mm] max-h-[210mm] ${bg} relative overflow-hidden font-sans box-border py-8 px-12`} dir="rtl">
        {children}
        <div className="absolute bottom-4 left-10 flex items-center gap-2 opacity-80">
          <div className="flex flex-col items-center">
             <img src="/assets/logos/%D9%84%D9%88%D8%AC%D9%88%20%D8%B2%D8%A7%D8%AF-01.svg" className="h-10 object-contain" alt="زاد" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="print-report-container">
      {/* 1. All Criteria (Page 1: 1-32) */}
      {allCriteriaPage1.length > 0 && (
        <PageWrapper>
          <div className="text-right mb-6">
            <h3 className="text-[#c29300] font-black text-sm mb-1">نتائج القياس التفصيلية</h3>
            <h2 className="text-slate-800 font-black text-3xl">نتائج المعايير (1 - 32)</h2>
          </div>
          <CriteriaList items={allCriteriaPage1} />
        </PageWrapper>
      )}

      {/* 1. All Criteria (Page 2: 33-64) */}
      {allCriteriaPage2.length > 0 && (
        <PageWrapper>
          <div className="text-right mb-6">
            <h3 className="text-[#c29300] font-black text-sm mb-1">نتائج القياس التفصيلية</h3>
            <h2 className="text-slate-800 font-black text-3xl">نتائج المعايير (33 - {allQuestions.length})</h2>
          </div>
          <CriteriaList items={allCriteriaPage2} />
        </PageWrapper>
      )}

      {/* 2. Green Criteria Pages */}
      {greenPages.map((pageItems, idx) => (
        <PageWrapper key={`green-${idx}`} bg="bg-[#f0f9f6]">
          <div className="text-right mb-4">
            <h3 className="text-[#c29300] font-black text-sm mb-1">قراءة في النتائج</h3>
            <h2 className="text-[#1ca386] font-black text-3xl mb-4">المعايير المكتملة (85% فأعلى)</h2>
            <p className="text-slate-600 text-sm font-bold border-b border-slate-200 pb-4 inline-block">
              بلغ عدد المعايير المكتملة (85% فأعلى) {categorizedQuestions.green.length} معياراً.
            </p>
          </div>
          <CriteriaList items={pageItems} />
        </PageWrapper>
      ))}

      {/* 3. Yellow Criteria Pages */}
      {yellowPages.map((pageItems, idx) => (
        <PageWrapper key={`yellow-${idx}`} bg="bg-[#fffdf5]">
          <div className="text-right mb-4">
            <h3 className="text-[#c29300] font-black text-sm mb-1">قراءة في النتائج</h3>
            <h2 className="text-[#c29300] font-black text-3xl mb-4">المعايير التي تحتاج إلى تحسين (70% - 84%)</h2>
            <p className="text-slate-600 text-sm font-bold border-b border-slate-200 pb-4 inline-block">
              بلغ عدد المعايير التي تحتاج إلى تحسين {categorizedQuestions.yellow.length} معياراً.
            </p>
          </div>
          <CriteriaList items={pageItems} />
        </PageWrapper>
      ))}

      {/* 4. Red Criteria Pages */}
      {redPages.map((pageItems, idx) => (
        <PageWrapper key={`red-${idx}`} bg="bg-[#fdf5f5]">
          <div className="text-right mb-4">
            <h3 className="text-[#c29300] font-black text-sm mb-1">قراءة في النتائج</h3>
            <h2 className="text-[#d9534f] font-black text-3xl mb-4">المعايير الضعيفة (أقل من 70%)</h2>
            <p className="text-slate-600 text-sm font-bold border-b border-slate-200 pb-4 inline-block">
              بلغ عدد المعايير الضعيفة (أقل من 70%) {categorizedQuestions.red.length} معياراً.
            </p>
          </div>
          <CriteriaList items={pageItems} />
        </PageWrapper>
      ))}

      {/* 5. Main Axes Results Page (At the very end) */}
      <PageWrapper bg="bg-slate-50/50">
        <div className="text-right mb-12">
          <h3 className="text-[#c29300] font-black text-sm mb-1">قياس الجاهزية الاستراتيجية</h3>
          <h2 className="text-[#114b79] font-black text-4xl">نتائج المحاور الرئيسية</h2>
        </div>

        <div className="flex flex-col gap-6 mt-10 px-8">
          {sectionData.map((sec) => {
            const colors = getPercentageColorStyle(sec.averagePercentage);
            return (
              <div key={sec.index} className="flex items-center gap-8 w-full">
                <div className="flex-1 flex items-center gap-4">
                   <div 
                      className="px-3 py-1.5 rounded-md text-[13px] font-black shadow-sm shrink-0 w-14 text-center"
                      style={{ color: colors.badgeBg, backgroundColor: colors.badgeBg + '15', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                   >
                     {sec.averagePercentage}%
                   </div>
                   <div 
                      className="flex-1 h-6 rounded-full overflow-hidden flex justify-end" 
                      dir="ltr" 
                      style={{ 
                        backgroundColor: '#e2e8f0',
                        backgroundImage: 'linear-gradient(#e2e8f0, #e2e8f0)',
                        boxShadow: 'inset 0 0 0 1000px #e2e8f0',
                        WebkitPrintColorAdjust: 'exact', 
                        printColorAdjust: 'exact' 
                      }}
                   >
                     <div 
                       className="h-full rounded-full transition-all"
                       style={{ 
                         width: `${sec.averagePercentage}%`, 
                         backgroundColor: colors.badgeBg, 
                         backgroundImage: `linear-gradient(${colors.badgeBg}, ${colors.badgeBg})`,
                         boxShadow: `inset 0 0 0 1000px ${colors.badgeBg}`,
                         WebkitPrintColorAdjust: 'exact', 
                         printColorAdjust: 'exact' 
                       }}
                     />
                   </div>
                </div>

                {/* Axis title (Right side) */}
                <div className="w-[30%] text-right font-bold text-[#114b79] text-[15px]">
                  {sec.title.replace(/^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً):\s*/, '')}
                </div>
              </div>
            );
          })}
        </div>
      </PageWrapper>

      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: A4 landscape;
          margin: 0mm !important;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          aside,
          nav,
          .lg\\:hidden,
          .print\\:hidden,
          button {
            display: none !important;
          }

          html, body, main, [class*="h-\\[100dvh\\]"], [class*="overflow-"] {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }

          body {
            background-color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            padding: 0 !important;
            margin: 0 !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}} />
    </div>
  );
}
