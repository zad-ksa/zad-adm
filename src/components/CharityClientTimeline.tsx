"use client";

import { formatDurationArabic } from "@/lib/dateUtils";

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
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">{title}</h3>
      
      {stages && stages.length > 0 ? (
        <div className="relative overflow-x-auto custom-scrollbar pb-4">
          <div className="absolute top-1/2 right-0 w-full h-1 bg-slate-100 dark:bg-slate-700 -translate-y-1/2 hidden md:block rounded-full min-w-max"></div>
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-0 justify-between relative z-10 min-w-max">
            {stages.map((stage: any, idx: number) => {
              const isPast = stages.findIndex((s: any) => s.isCurrent) > idx;
              const isCurrent = stage.isCurrent;
              
              const calculatedDuration = formatDurationArabic(stage.startDate, stage.endDate);
              const displayDuration = calculatedDuration || stage.duration;
              
              return (
                <div key={stage.id} className="flex flex-row md:flex-col items-start md:items-center gap-4 group relative min-w-[200px] px-2 flex-1">
                  <div className="md:hidden w-1 h-full bg-slate-100 dark:bg-slate-700 absolute right-6 top-0 -z-10"></div>
                  
                  <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-lg bg-white dark:bg-slate-800 shrink-0 transition-all duration-300 relative z-10 mt-2 md:mt-0
                    ${isPast ? 'border-emerald-500 text-emerald-500' : 
                      isCurrent ? 'border-primary text-primary scale-110 shadow-lg shadow-primary/20' : 
                      'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}
                  >
                    {isPast ? <CheckCircleIcon /> : (idx + 1)}
                  </div>
                  
                  <div className={`flex-1 text-right md:text-center p-4 rounded-xl transition-all duration-300 ${isCurrent ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/20' : 'bg-transparent'} border border-transparent w-full`}>
                    <h4 className={`font-bold ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{stage.name}</h4>
                    {stage.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed whitespace-pre-wrap">{stage.description}</p>
                    )}
                    {displayDuration && (
                      <span className="inline-block bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-md mt-3 font-medium border border-slate-200 dark:border-slate-700/50">المدة: {displayDuration}</span>
                    )}
                    {isCurrent && <span className="block mt-3 text-xs font-bold bg-primary text-white px-3 py-1 rounded-full w-max md:mx-auto">المرحلة الحالية</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          لا توجد مراحل مسجلة حالياً
        </div>
      )}
    </div>
  );
}
