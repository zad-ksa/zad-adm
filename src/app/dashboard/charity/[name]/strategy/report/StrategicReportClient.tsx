"use client";

import React, { useState } from 'react';
import ReportHeader from '@/components/report/ReportHeader';
import ReportSummary from '@/components/report/ReportSummary';
import ReportDimensionsChart from '@/components/report/ReportDimensionsChart';
import ReportDataTable from '@/components/report/ReportDataTable';
import ReportAnalysis from '@/components/report/ReportAnalysis';
import { Axis } from '@/components/report/types';

const formatDimensionName = (name: string) => {
  if (!name) return name;
  if (name.includes("بعد") || name.includes("بُعد") || name.includes("البعد") || name.includes("البُعد")) return name;
  if (name === "المالي") return "البُعد المالي";
  return `بُعد ${name}`;
};

// Default Axes in case of empty data, matching the main performance logic
const getAxisDefaultPrefix = (axisId: string) => {
  switch (axisId) {
    case "1": return "س";
    case "2": return "ص";
    case "3": return "م";
    case "4": return "ل";
    case "5": return "ت";
    default: return "غ";
  }
};

const DEFAULT_AXES: Axis[] = [
  { id: "1", name: "بُعد المستفيدين", goals: [], prefix: "س" },
  { id: "2", name: "بُعد أصحاب المصلحة", goals: [], prefix: "ص" },
  { id: "3", name: "البُعد المالي", goals: [], prefix: "م" },
  { id: "4", name: "بُعد العمليات الداخلية", goals: [], prefix: "ل" },
  { id: "5", name: "بُعد التعلم والنمو", goals: [], prefix: "ت" },
];

type StrategicReportClientProps = {
  charityName: string;
  year: number;
  quarter: string;
  initialData: any;
};

export default function StrategicReportClient({ charityName, year, quarter, initialData }: StrategicReportClientProps) {
  const [axes] = useState<Axis[]>(() => {
    if (!initialData) return DEFAULT_AXES;

    let loadedAxes: Axis[] = [];
    if (Array.isArray(initialData)) {
      loadedAxes = initialData;
    } else if (initialData && typeof initialData === "object" && "axes" in initialData) {
      loadedAxes = (initialData as any).axes || DEFAULT_AXES;
    } else {
      return DEFAULT_AXES;
    }

    return loadedAxes.map(axis => ({
      ...axis,
      name: formatDimensionName(axis.name),
      prefix: axis.prefix || getAxisDefaultPrefix(axis.id),
      goals: (axis.goals || []).map(goal => ({
        ...goal,
        indicators: (goal.indicators || []).map(ind => ({
          ...ind,
          postponed: ind.postponed || false,
          annualTarget: ind.annualTarget !== undefined && ind.annualTarget !== null ? ind.annualTarget : "",
          q1Achieved: ind.q1Achieved === undefined ? null : ind.q1Achieved,
          q2Achieved: ind.q2Achieved === undefined ? null : ind.q2Achieved,
          q3Achieved: ind.q3Achieved === undefined ? null : ind.q3Achieved,
          q4Achieved: ind.q4Achieved === undefined ? null : ind.q4Achieved,
        }))
      }))
    }));
  });

  return (
    <div className="bg-slate-50 min-h-screen p-6 font-sans print:m-0 print:p-0" dir="rtl">
      <div className="max-w-[1400px] mx-auto space-y-6 print:space-y-4 print:p-0 print:m-0 print:max-w-full print:w-full">
        <ReportHeader charityName={charityName} year={year} quarter={quarter} />
        <ReportSummary axes={axes} quarter={quarter} year={year} />
        <ReportDimensionsChart axes={axes} quarter={quarter} />
        
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 print:text-xl">تفاصيل الأداء الاستراتيجي</h2>
          {axes.map(axis => (
            <ReportDataTable key={axis.id} axis={axis} quarter={quarter} />
          ))}
        </div>

        <ReportAnalysis />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: landscape;
          margin: 8mm;
        }
        @media print {
          /* Hide sidebar, header controls, print buttons, and other interactive elements */
          aside,
          .lg\\:hidden,
          .print\\:hidden,
          button {
            display: none !important;
          }

          /* Reset heights and overflow properties to enable multi-page document printing */
          html, body, main, [class*="h-screen"], [class*="overflow-"] {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
            direction: rtl !important;
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
          }

          /* Prevent elements like cards from breaking awkwardly between pages */
          .print\\:break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </div>
  );
}
