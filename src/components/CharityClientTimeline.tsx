"use client";

import { formatDurationArabic } from "@/lib/dateUtils";
import { Activity } from "lucide-react";

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function CharityClientTimeline({ 
  title, 
  stages 
}: { 
  title: string, 
  stages: any[] 
}) {
  const activeStages = stages?.filter(s => s.isActive !== false) || [];
  const sequentialStages = activeStages.filter(s => !s.isContinuous);
  const continuousStages = activeStages.filter(s => s.isContinuous);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">{title}</h3>
      
      {sequentialStages.length > 0 ? (
        <div className="relative pb-4">
          <div className="flex flex-col md:flex-row gap-6 md:gap-2 justify-between relative z-10 flex-wrap">
            {sequentialStages.map((stage: any, idx: number) => {
              const isPast = sequentialStages.findIndex((s: any) => s.isCurrent) > idx;
              const isCurrent = stage.isCurrent;
              const isNextCurrent = sequentialStages.findIndex((s: any) => s.isCurrent) === idx + 1;
              const lineShouldBeColored = isPast || (isCurrent && false); // Line from past to current should be colored
              
              const calculatedDuration = formatDurationArabic(stage.startDate, stage.endDate);
              const displayDuration = calculatedDuration || stage.duration;
              
              return (
                <div key={stage.id} className="flex flex-row md:flex-col items-start md:items-center gap-3 group relative flex-1 min-w-[150px]">
                  
                  {/* Vertical line for mobile (hidden on last item) */}
                  {idx !== sequentialStages.length - 1 && (
                    <div className={`md:hidden w-1 h-full absolute right-6 top-6 -z-10 ${isPast ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                  )}

                  {/* Horizontal line for desktop (hidden on last item) */}
                  {idx !== sequentialStages.length - 1 && (
                    <div className={`hidden md:block absolute top-6 right-1/2 w-[calc(100%+0.5rem)] h-1 -z-10 ${isPast ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-700'}`}></div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg bg-white dark:bg-slate-800 shrink-0 transition-all duration-300 relative z-10
                    ${isPast ? 'border-emerald-500 text-emerald-500' : 
                      isCurrent ? 'border-primary text-primary scale-110 shadow-lg shadow-primary/20' : 
                      'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}
                  >
                    {isPast ? <CheckCircleIcon /> : (idx + 1)}
                  </div>
                  
                  <div className={`flex-1 text-right md:text-center p-3 rounded-xl transition-all duration-300 ${isCurrent ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/20 shadow-sm' : 'bg-transparent'} border border-transparent w-full`}>
                    <h4 className={`font-bold text-sm lg:text-base ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{stage.name}</h4>
                    {stage.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed break-words">{stage.description}</p>
                    )}
                    {displayDuration && (
                      <span className="inline-block bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-md mt-2 font-medium border border-slate-200 dark:border-slate-700/50">المدة: {displayDuration}</span>
                    )}
                    {isCurrent && <span className="block mt-2 text-xs font-bold bg-primary text-white px-3 py-1 rounded-full w-max md:mx-auto">المرحلة الحالية</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          لا توجد مراحل متسلسلة حالياً
        </div>
      )}

      {continuousStages.length > 0 && (
        <div className="mt-8 border-t border-slate-100 dark:border-slate-700 pt-6">
          <h4 className="font-bold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" />
            الأنشطة والمراحل المستمرة
          </h4>
          <div className="flex flex-col gap-3">
            {continuousStages.map((stage: any) => {
              const displayDuration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;
              return (
                <div key={stage.id} className="relative group overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 p-4">
                  {/* Decorative timeline bar */}
                  <div className="absolute top-0 bottom-0 right-0 w-1 bg-amber-400/50 group-hover:bg-amber-400 transition-colors"></div>
                  
                  <div className="mr-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h5 className="font-bold text-slate-700 dark:text-slate-200">{stage.name}</h5>
                      {stage.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stage.description}</p>
                      )}
                    </div>
                    {displayDuration && (
                      <div className="shrink-0">
                        <span className="inline-block bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-3 py-1 rounded-lg font-medium border border-slate-200 dark:border-slate-700">
                          المدة: {displayDuration}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
