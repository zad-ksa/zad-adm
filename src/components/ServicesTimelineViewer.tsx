"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Infinity as InfinityIcon, 
  Briefcase, 
  CheckSquare, 
  Square,
  Sparkles,
  LayoutGrid,
  FileText,
  AlertCircle,
  Network
} from "lucide-react";
import CharityClientTimeline from "./CharityClientTimeline";
import ReactFlowTimeline from "./ReactFlowTimeline";
import { formatDurationArabic } from "@/lib/dateUtils";

interface Step {
  id: string;
  name: string;
  isDone: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
}

interface Stage {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  duration?: string | null;
  order: number;
  isCurrent: boolean;
  isContinuous: boolean;
  isActive: boolean;
  isDone: boolean;
  steps: Step[];
}

interface Service {
  id: string;
  name: string;
  department: string | null;
  stages: Stage[];
}

export default function ServicesTimelineViewer({
  services,
  charityName
}: {
  services: Service[];
  charityName: string;
}) {
  const [activeTab, setActiveTab] = useState<"traditional" | "vertical" | "gantt" | "flow">("vertical");
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [collapsedServices, setCollapsedServices] = useState<Record<string, boolean>>({});
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  // Toggle stage accordion in Vertical Stepper
  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  // Toggle service collapse
  const toggleService = (serviceId: string) => {
    setCollapsedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-100 dark:border-slate-700 shadow-sm transition-colors animate-in fade-in duration-300">
        <AlertCircle className="w-12 h-12 text-slate-350 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">لا توجد خدمات متاحة</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">لم يتم إسناد أي خدمات أو مراحل زمنية لهذه الجمعية بعد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Tab Selector for Previewing UI Variations */}
      <div className="bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex flex-wrap gap-1 transition-colors print:hidden">
        <button
          onClick={() => setActiveTab("traditional")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "traditional"
              ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          المخطط التقليدي (الحالي)
        </button>

        <button
          onClick={() => setActiveTab("vertical")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "vertical"
              ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          المخطط الرأسي التفاعلي (Accordion Stepper)
        </button>

        <button
          onClick={() => setActiveTab("gantt")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "gantt"
              ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <LayoutGrid className="w-4 h-4 text-amber-500" />
          المخطط الأفقي المطور (Interactive Gantt)
        </button>

        <button
          onClick={() => setActiveTab("flow")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "flow"
              ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Network className="w-4 h-4 text-indigo-500" />
          المخطط الشبكي التفاعلي (React Flow)
        </button>
      </div>

      {/* Render Selected View */}
      <div className={activeTab === "traditional" ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"}>
        {services.map((service) => {
          const sequentialStages = service.stages?.filter(s => !s.isContinuous && s.isActive !== false) || [];
          const continuousStages = service.stages?.filter(s => s.isContinuous) || [];
          const isCollapsed = collapsedServices[service.id] ?? false;

          return (
            <div 
              key={service.id} 
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors overflow-hidden self-start w-full"
            >
              {/* Service Header Bar */}
              <div 
                onClick={() => toggleService(service.id)}
                className="bg-slate-50/80 dark:bg-slate-900/40 p-3 px-4 flex items-center justify-between cursor-pointer border-b border-slate-150 dark:border-slate-800 select-none hover:bg-slate-100/50 dark:hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-extrabold text-[1rem] text-slate-700 dark:text-slate-200">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mini summary badge of completion */}
                  {(() => {
                    const doneStagesCount = sequentialStages.filter((s, idx) => 
                      s.isDone || 
                      (s.steps?.length > 0 && s.steps.every(st => st.isDone)) || 
                      (sequentialStages.findIndex(st => st.isCurrent) > idx)
                    ).length;
                    
                    const totalStagesCount = sequentialStages.length;
                    
                    return totalStagesCount > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded shrink-0">
                        {doneStagesCount} / {totalStagesCount} مراحل
                      </span>
                    );
                  })()}
                  <div className="text-slate-400 shrink-0">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Service Content Body */}
              <div className={`transition-all duration-300 ${isCollapsed ? "hidden" : "p-3.5 md:p-4 space-y-4"}`}>
                
                {/* --- VIEW 1: TRADITIONAL --- */}
                {activeTab === "traditional" && (
                  <CharityClientTimeline title={service.name} stages={service.stages} embedded={true} />
                )}

                {/* --- VIEW 2: VERTICAL ACCORDION STEPPER --- */}
                {activeTab === "vertical" && (
                  <div className="space-y-4">
                    {sequentialStages.length > 0 ? (
                      <div className="relative pl-1 pr-5 md:pr-6 py-1">
                        {/* Vertical timeline line */}
                        <div className="absolute right-[19px] md:right-[23px] top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-700/50"></div>

                        <div className="space-y-3">
                          {sequentialStages.map((stage, idx) => {
                            const isPast = stage.isDone || 
                                           (sequentialStages.findIndex(s => s.isCurrent) > idx) || 
                                           (stage.steps?.length > 0 && stage.steps.every(st => st.isDone));
                            const isCurrent = stage.isCurrent;
                            const isOpen = expandedStages[stage.id] ?? isCurrent; // Expand current stage by default
                            
                            const totalSteps = stage.steps?.length || 0;
                            const completedSteps = stage.steps?.filter(s => s.isDone).length || 0;
                            const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;

                            return (
                              <div key={stage.id} className="relative group">
                                {/* Step circle node */}
                                <div 
                                  onClick={() => toggleStage(stage.id)}
                                  className={`absolute -right-6 md:-right-7 top-0 w-6 h-6 md:w-7 h-7 rounded-full border-4 flex items-center justify-center font-bold text-[10px] md:text-xs cursor-pointer transition-all duration-300 z-10 bg-white dark:bg-slate-800
                                    ${isPast 
                                      ? 'border-emerald-500 text-emerald-500 dark:border-emerald-500/70' 
                                      : isCurrent 
                                        ? 'border-primary text-primary scale-110 shadow-md shadow-primary/20 dark:border-primary/80' 
                                        : 'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                                    }`}
                                >
                                  {isPast ? <CheckCircle2 className="w-3 h-3 md:w-3.5 h-3.5 text-emerald-500" /> : (idx + 1)}
                                </div>

                                {/* Content block */}
                                <div className={`bg-slate-50/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-900/30 border ${
                                  isCurrent 
                                    ? 'border-primary/20 dark:border-primary/30 shadow-sm' 
                                    : 'border-slate-100 dark:border-slate-800'
                                  } rounded-lg p-2.5 md:p-3 transition-all duration-300`}
                                >
                                  <div 
                                    onClick={() => toggleStage(stage.id)}
                                    className="flex items-start justify-between gap-3 cursor-pointer"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h4 className={`font-bold text-[1rem] ${isCurrent ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
                                          {stage.name}
                                        </h4>
                                        {isCurrent && (
                                          <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded">
                                            الحالية
                                          </span>
                                        )}
                                        {stage.isDone && (
                                          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                            مكتملة
                                          </span>
                                        )}
                                      </div>
                                      {stage.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                          {stage.description}
                                        </p>
                                      )}
                                      
                                      {/* Duration / Dates metadata */}
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-slate-400 dark:text-slate-500 text-[10px]">
                                        {duration && (
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {duration}
                                          </span>
                                        )}
                                        {stage.startDate && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(stage.startDate).toLocaleDateString("ar-SA")}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {totalSteps > 0 && (
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold px-2 py-0.5 rounded-md">
                                          {completedSteps}/{totalSteps}
                                        </span>
                                      )}
                                      <div className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-400">
                                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Accordion Steps checklist */}
                                  {isOpen && totalSteps > 0 && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">خطوات إنجاز المرحلة:</h5>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {stage.steps.map((step) => (
                                          <div 
                                            key={step.id} 
                                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                                              step.isDone 
                                                ? 'bg-emerald-500/[0.02] border-emerald-500/10 text-slate-500 dark:text-slate-400' 
                                                : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {step.isDone ? (
                                              <CheckSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                              <Square className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                                            )}
                                            <div className="space-y-0.5">
                                              <span className="text-[1rem] font-bold block">
                                                {step.name}
                                              </span>
                                              {step.startDate && (
                                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                                  <Calendar className="w-3 h-3" />
                                                  من {new Date(step.startDate).toLocaleDateString("ar-SA")}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400 italic">لا توجد مراحل متسلسلة حالياً</div>
                    )}

                    {/* Continuous Stages section */}
                    {continuousStages.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">الأنشطة والخدمات المستمرة:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {continuousStages.map(stage => {
                            const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;
                            return (
                              <div key={stage.id} className="flex gap-3 p-3 bg-amber-50/10 dark:bg-amber-500/[0.02] border border-amber-500/10 rounded-xl relative overflow-hidden transition-all">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                  <InfinityIcon className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm">{stage.name}</h4>
                                  {stage.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{stage.description}</p>}
                                  {duration && <span className="inline-block text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium mt-1">المدة: {duration}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- VIEW 3: HORIZONTAL INTERACTIVE GANTT --- */}
                {activeTab === "gantt" && (
                  <div className="space-y-4">
                    {/* Horizontal visual pipeline cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                      {sequentialStages.map((stage, idx) => {
                        const isPast = stage.isDone || 
                                       (sequentialStages.findIndex(s => s.isCurrent) > idx) || 
                                       (stage.steps?.length > 0 && stage.steps.every(st => st.isDone));
                        const isCurrent = stage.isCurrent;
                        
                        const totalSteps = stage.steps?.length || 0;
                        const completedSteps = stage.steps?.filter(s => s.isDone).length || 0;
                        const percentage = isPast ? 100 : (totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : (isCurrent ? 50 : 0));
                        const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;

                        const isSelected = selectedStageId === stage.id || (!selectedStageId && isCurrent);

                        return (
                          <div 
                            key={stage.id}
                            onClick={() => setSelectedStageId(stage.id)}
                            className={`cursor-pointer rounded-xl p-3 border-2 transition-all flex flex-col justify-between h-28 relative overflow-hidden group
                              ${isSelected 
                                ? 'bg-primary/[0.02] border-primary shadow-md shadow-primary/5 dark:border-primary/80' 
                                : isCurrent
                                  ? 'bg-white dark:bg-slate-800 border-primary/40 hover:border-primary/80'
                                  : 'bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                          >
                            {/* Corner index number badge */}
                            <span className={`absolute -left-1 -top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black opacity-10 group-hover:opacity-20 transition-opacity
                              ${isSelected || isCurrent ? 'text-primary' : 'text-slate-400'}`}
                            >
                              {idx + 1}
                            </span>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full
                                  ${isPast 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : isCurrent 
                                      ? 'bg-primary text-white' 
                                      : 'bg-slate-100 dark:bg-slate-900/50 text-slate-500'}`}
                                >
                                  {isPast ? 'مكتملة' : isCurrent ? 'الحالية' : 'قيد الانتظار'}
                                </span>
                                {duration && (
                                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-medium">
                                    <Clock className="w-3 h-3" />
                                    {duration}
                                  </span>
                                )}
                              </div>

                              <h4 className={`font-bold text-[1rem] line-clamp-1 ${isSelected ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
                                {stage.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                                {stage.description || "لا يوجد وصف لهذه المرحلة."}
                              </p>
                            </div>

                            {/* Progress bar based on completed steps */}
                            <div className="space-y-1 pt-2">
                              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                <span>شريط الإنجاز</span>
                                <span>{percentage}% ({completedSteps}/{totalSteps})</span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-900/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${isPast ? 'bg-emerald-500' : 'bg-primary'}`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detail Panel displaying the steps of the SELECTED/ACTIVE stage */}
                    {(() => {
                      const activeStage = sequentialStages.find(s => s.id === (selectedStageId || sequentialStages.find(st => st.isCurrent)?.id || sequentialStages[0]?.id));
                      if (!activeStage) return null;

                      const totalSteps = activeStage.steps?.length || 0;
                      const completedSteps = activeStage.steps?.filter(s => s.isDone).length || 0;
                      const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                      return (
                        <div className="mt-4 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3 mb-3">
                            <div>
                              <span className="text-[9px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">تفاصيل الخطوات</span>
                              <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 mt-1">{activeStage.name}</h4>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                              <div className="space-y-1 w-20 sm:w-24">
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                  <span>التقدم</span>
                                  <span>{percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-150 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
                                  <div className="bg-primary h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-lg">
                                {completedSteps}/{totalSteps} مكتملة
                              </span>
                            </div>
                          </div>

                          {totalSteps > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {activeStage.steps.map((step) => (
                                <div 
                                  key={step.id} 
                                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all bg-white dark:bg-slate-800/50 ${
                                    step.isDone 
                                      ? 'border-emerald-500/20 shadow-sm shadow-emerald-500/[0.01]' 
                                      : 'border-slate-200 dark:border-slate-700/50'
                                  }`}
                                >
                                  {step.isDone ? (
                                    <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 mt-0.5">
                                      <CheckSquare className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-350 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400 mt-0.5">
                                      <Square className="w-4 h-4" />
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <span className={`text-[1rem] font-bold block ${step.isDone ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-150'}`}>
                                      {step.name}
                                    </span>
                                    {step.startDate && (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                                        <Calendar className="w-3 h-3" />
                                        تاريخ البدء: {new Date(step.startDate).toLocaleDateString("ar-SA")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10 text-slate-400 italic">لا توجد خطوات مدخلة لهذه المرحلة.</div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Continuous Stages section inside Gantt */}
                    {continuousStages.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">الأنشطة والخدمات المستمرة:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {continuousStages.map(stage => {
                            const duration = formatDurationArabic(stage.startDate, stage.endDate) || stage.duration;
                            return (
                              <div key={stage.id} className="flex gap-3 p-3 bg-amber-50/10 dark:bg-amber-500/[0.02] border border-amber-500/10 rounded-xl relative overflow-hidden transition-all">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                                  <InfinityIcon className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs md:text-sm">{stage.name}</h4>
                                  {stage.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{stage.description}</p>}
                                  {duration && <span className="inline-block text-[9px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium mt-1">المدة: {duration}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- VIEW 4: REACT FLOW INTERACTIVE NETWORK --- */}
                {activeTab === "flow" && (
                  <div className="space-y-4">
                    <div className="mb-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                      💡 يمكنك سحب المخطط لتصفحه، واستخدام عجلة الفأرة للتكبير والتصغير (Zoom). انقر على أيقونات التكبير في الزاوية للتحكم بالرؤية.
                    </div>
                    <ReactFlowTimeline stages={service.stages} />
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
