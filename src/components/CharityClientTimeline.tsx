"use client";

import { formatDurationArabic } from "@/lib/dateUtils";
import { Infinity, CheckCircle2 } from "lucide-react";

export default function CharityClientTimeline({ 
  title, 
  stages,
  embedded = false
}: { 
  title: string; 
  stages: any[];
  embedded?: boolean;
}) {
  const sequentialStages = stages?.filter(s => !s.isContinuous && s.isActive !== false) || [];
  const continuousStages = stages?.filter(s => s.isContinuous) || [];

  return (
    <div className={embedded ? "w-full" : "w-full bg-white dark:bg-[#0A0A0A] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"}>
      {!embedded && <h3 className="font-semibold text-slate-900 dark:text-slate-50 tracking-tight mb-6" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }}>{title}</h3>}
      
      {sequentialStages.length > 0 ? (
        <div className="mb-8">
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sequentialStages.map((stage: any, idx: number) => {
              const isPast = sequentialStages.findIndex((s: any) => s.isCurrent) > idx;
              const isCurrent = stage.isCurrent;
              // تظهر المرحلة بلون برتقالي ومكتوب عليها "قريباً" فقط إذا كانت هي المرحلة الحالية
              const isComingSoon = (stage.isComingSoon || stage.name?.includes('قريب')) && isCurrent;
              const displayDuration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;
              
              return (
                <div key={stage.id} className={`relative flex-1 bg-white dark:bg-[#0A0A0A] rounded-2xl p-5 md:p-6 shadow-sm border transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 ${
                  isComingSoon
                    ? 'border-amber-400 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/20 shadow-sm'
                    : isCurrent 
                      ? 'border-primary/30 shadow-lg dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' 
                      : isPast 
                        ? 'border-slate-200 dark:border-slate-800/80 opacity-90 hover:opacity-100' 
                        : 'border-slate-100 dark:border-slate-800/50 opacity-70 hover:opacity-100'
                }`}>
                  {isCurrent && !isComingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                  )}
                  {isComingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                  )}
                  
                  <div className="p-6 flex flex-col h-full z-10">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                        isPast ? 'bg-slate-100 dark:bg-[#111] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400' : 
                        isComingSoon ? 'bg-amber-500 border-amber-500 text-white scale-105' :
                        isCurrent ? 'bg-primary border-primary text-white scale-105' : 
                        'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                      </div>
                      
                      {isComingSoon ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500 text-white shadow-sm shrink-0">
                          قريباً
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-primary text-white shadow-sm shrink-0">
                          الحالية
                        </span>
                      ) : null}
                    </div>
                    
                    <h4 className={`font-semibold tracking-tight mb-2 ${
                      isComingSoon ? 'text-amber-500' : isCurrent ? 'text-primary' : isPast ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'
                    }`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)' }}>
                      {stage.name}
                    </h4>
                    
                    {stage.description && (
                      <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                        {stage.description}
                      </p>
                    )}
                    
                    {displayDuration && (
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
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
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium text-sm">
          لا توجد مراحل متسلسلة حالياً
        </div>
      )}

      {continuousStages.length > 0 && (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80">
          <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 px-1">
            الأنشطة الدائمة (Continuous)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continuousStages.map((stage: any) => {
              const isActive = stage.isActive !== false;
              const displayDuration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;
              
              return (
                <div key={stage.id} className={`group flex flex-col p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                  isActive 
                    ? 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-slate-300 dark:hover:border-slate-600' 
                    : 'bg-slate-50/50 dark:bg-[#0A0A0A] border-slate-100 dark:border-slate-800/80 opacity-70 grayscale-[30%]'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-100 dark:bg-[#111] border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}>
                      <Infinity className="w-4 h-4" />
                    </div>
                    <h5 className={`font-semibold tracking-tight ${isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`} style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {stage.name}
                    </h5>
                  </div>
                  
                  {stage.description && (
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                      {stage.description}
                    </p>
                  )}
                  
                  {displayDuration && (
                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="inline-block text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        المدة: {displayDuration}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
