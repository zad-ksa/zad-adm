"use client";

import { useState } from "react";
import { Info, X, CheckCircle2, Circle } from "lucide-react";
import { createPortal } from "react-dom";

type Step = {
  id: string;
  name: string;
  isDone: boolean;
  order: number;
};

type Stage = {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  isCurrent: boolean;
  isDone: boolean;
  isContinuous: boolean;
  isActive: boolean;
  steps: Step[];
};

type Service = {
  id: string;
  name: string;
  stages: Stage[];
};

export default function CurrentServicesCards({ services }: { services: Service[] }) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Helper to find current stage and step
  const getCurrentInfo = (service: Service) => {
    // Separate sequential and continuous
    const sequentialStages = [...service.stages].filter(s => !s.isContinuous).sort((a, b) => a.order - b.order);
    const continuousStages = [...service.stages].filter(s => s.isContinuous).sort((a, b) => a.order - b.order);

    let currentStage = sequentialStages.find((s) => s.isCurrent);
    
    // Fallback logic if no stage is explicitly marked isCurrent
    if (!currentStage) {
      currentStage = sequentialStages.find((s) => !s.isDone);
    }
    if (!currentStage && sequentialStages.length > 0) {
      currentStage = sequentialStages[sequentialStages.length - 1]; // All done, pick last
    }

    let currentStep = null;
    let allStepsDone = false;
    if (currentStage && currentStage.steps && currentStage.steps.length > 0) {
      const sortedSteps = [...currentStage.steps].sort((a, b) => a.order - b.order);
      currentStep = sortedSteps.find((s) => !s.isDone);
      if (!currentStep) allStepsDone = true;
    } else if (currentStage && currentStage.isDone) {
      allStepsDone = true;
    }

    return { currentStage, currentStep, allStepsDone, continuousStages };
  };

  const modalContent = (() => {
    if (!selectedService) return null;

    const sequentialStages = [...selectedService.stages].filter(s => !s.isContinuous).sort((a, b) => a.order - b.order);
    const continuousStages = [...selectedService.stages].filter(s => s.isContinuous).sort((a, b) => a.order - b.order);

    let currentStageIndex = sequentialStages.findIndex((s) => s.isCurrent);
    if (currentStageIndex === -1) {
      currentStageIndex = sequentialStages.findIndex((s) => !s.isDone);
    }
    if (currentStageIndex === -1 && sequentialStages.length > 0) {
      currentStageIndex = sequentialStages.length - 1; // if all done
    }

    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#0A0A0A] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),_0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-400">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-[#0A0A0A]/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-50 tracking-tight" style={{ fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)' }}>
                  {selectedService.name}
                </h2>
                <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                  الدليل الشامل للمراحل
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedService(null)}
              className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-transparent scroll-smooth">
            
            {sequentialStages.length > 0 && (
              <div className="mb-8">
                <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 px-1">
                  المسار الزمني (Bento Timeline)
                </h3>
                {/* Bento Grid for Stages */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                  {sequentialStages.map((stage, idx) => {
                    const isPast = stage.isDone || (currentStageIndex > -1 && idx < currentStageIndex);
                    const isCurrent = idx === currentStageIndex && !stage.isDone;

                    return (
                      <div 
                        key={stage.id} 
                        className={`group relative flex flex-col rounded-2xl border transition-all duration-500 overflow-hidden ${
                          isCurrent 
                            ? 'bg-white dark:bg-[#0F0F0F] border-primary/30 shadow-lg dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' 
                            : isPast 
                              ? 'bg-slate-50/80 dark:bg-[#0A0A0A] border-slate-200 dark:border-slate-800/80 opacity-90 hover:opacity-100' 
                              : 'bg-white dark:bg-[#0A0A0A] border-slate-100 dark:border-slate-800/50 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                        )}
                        
                        <div className="p-5 flex flex-col h-full z-10">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                                isPast ? 'bg-slate-100 dark:bg-[#111] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400' : 
                                isCurrent ? 'bg-primary border-primary text-white scale-105' : 
                                'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 text-slate-400'
                              }`}>
                                {isPast ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                              </div>
                              <div>
                                <h4 className={`font-semibold tracking-tight ${
                                  isCurrent ? 'text-primary' : isPast ? 'text-slate-800 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'
                                }`} style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)' }}>
                                  {stage.name}
                                </h4>
                              </div>
                            </div>
                            
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-primary text-white shadow-sm shrink-0">
                                الحالية
                              </span>
                            )}
                          </div>
                          
                          {stage.description && (
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                              {stage.description}
                            </p>
                          )}
                          
                          {stage.steps && stage.steps.length > 0 && (
                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
                              <h5 className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-widest">
                                الخطوات المطلوبة
                              </h5>
                              <div className="flex flex-col gap-2">
                                {[...stage.steps]
                                  .sort((a, b) => a.order - b.order)
                                  .map((step) => {
                                    const stepIsDone = step.isDone || isPast;
                                    return (
                                      <div
                                        key={step.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                          stepIsDone 
                                            ? 'bg-slate-50/50 dark:bg-[#0A0A0A] border-slate-100 dark:border-slate-800/50 text-slate-500 dark:text-slate-500' 
                                            : 'bg-white dark:bg-[#111111] border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]'
                                        }`}
                                      >
                                        {stepIsDone ? (
                                          <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                                        ) : (
                                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0 ml-1" />
                                        )}
                                        <span className="text-[13px] font-medium leading-snug">{step.name}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {continuousStages.length > 0 && (
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  الخدمات الدائمة (Permanent Services)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {continuousStages.map((stage) => (
                    <div 
                      key={stage.id} 
                      className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 ${
                        stage.isActive 
                          ? 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]' 
                          : 'bg-slate-50/50 dark:bg-[#0A0A0A] border-slate-100 dark:border-slate-800/80 opacity-70'
                      }`}
                    >
                      <h5 className={`font-semibold tracking-tight mb-2 flex items-center gap-2 ${stage.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`} style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                        {stage.isActive && (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                          </span>
                        )}
                        {stage.name}
                      </h5>
                      {stage.description && (
                        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-500 leading-relaxed line-clamp-3">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => {
        const { currentStage, currentStep, allStepsDone, continuousStages } = getCurrentInfo(service);
        const activeContinuousStage = continuousStages?.find(s => s.isActive);
        
        return (
          <div 
            key={service.id}
            className="group relative flex flex-col bg-white dark:bg-[#0A0A0A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all duration-500 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 overflow-hidden"
          >
            {/* Subtle Inner Glow on Hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="p-6 flex flex-col h-full z-10 relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-primary dark:text-primary tracking-tight" style={{ fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}>
                    {service.name}
                  </h3>
                  {activeContinuousStage && (
                    <div className="mt-2.5 flex items-center gap-1.5 w-fit px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{activeContinuousStage.name} (دائمة)</span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedService(service)}
                  title="عرض الدليل الكامل للخدمة"
                  className="shrink-0 p-2 text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all duration-300 -mt-1 -mr-2"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {currentStage ? (
                <div className="flex flex-col gap-2 flex-1">
                  {/* Bento Box 1: Current Stage */}
                  <div className="bg-slate-50/80 dark:bg-[#111111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-center transition-colors group-hover:border-slate-200 dark:group-hover:border-slate-700">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                      المرحلة الحالية
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200" style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {currentStage.name}
                    </div>
                  </div>

                  {/* Bento Box 2: Current Step */}
                  {currentStep && (
                    <div className="bg-slate-50/80 dark:bg-[#111111] border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-center transition-colors group-hover:border-slate-200 dark:group-hover:border-slate-700">
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest">
                        الخطوة الحالية
                      </div>
                      <div className="flex items-center gap-2.5 font-medium text-slate-700 dark:text-slate-300" style={{ fontSize: 'clamp(0.8125rem, 1.2vw, 0.875rem)' }}>
                        <div className="relative flex h-2 w-2 items-center justify-center shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </div>
                        <span className="line-clamp-1">{currentStep.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center py-6 text-center text-slate-400 text-sm font-medium">
                  لا توجد مراحل مسجلة لهذه الخدمة
                </div>
              )}
            </div>
          </div>
        );
      })}

      {typeof document !== "undefined" && modalContent 
        ? createPortal(modalContent, document.body) 
        : null}
    </div>
  );
}
