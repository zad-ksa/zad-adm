"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X, ChevronDown, CheckCircle2 } from "lucide-react";

type Step = {
  id: string;
  name: string;
  order: number;
};

type Stage = {
  id: string;
  name: string;
  description?: string | null;
  order: number;
  steps?: Step[];
  isContinuous?: boolean;
  isActive?: boolean;
};

type TimelineSection = {
  title: string;
  stages: Stage[];
};

export default function ServicesGuideButton({
  sections,
}: {
  sections: TimelineSection[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-expand first section if there is one
  const handleOpen = () => {
    if (sections.length > 0 && !expandedSection) {
      setExpandedSection(sections[0].title);
    }
    setIsOpen(true);
  };

  const handleSectionToggle = (title: string, idx: number) => {
    const isExpanding = expandedSection !== title;
    setExpandedSection(isExpanding ? title : null);

    if (isExpanding) {
      setTimeout(() => {
        const el = document.getElementById(`service-guide-section-${idx}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0A0A0A] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-[#0A0A0A]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-primary dark:text-primary tracking-tight" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>
                دليل الخدمات الشامل
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                استعراض مفصل لكافة المراحل والخطوات التابعة للجمعية
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="service-guide-scroll-container" className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-[#050505] scroll-smooth custom-scrollbar">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium">
              لا توجد خدمات مسجلة
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, idx) => {
                const isExpanded = expandedSection === section.title;
                if (section.stages.length === 0) return null;
                const sequentialStages = [...section.stages].filter(s => !s.isContinuous).sort((a, b) => a.order - b.order);
                const continuousStages = [...section.stages].filter(s => s.isContinuous).sort((a, b) => a.order - b.order);

                return (
                  <div
                    key={idx}
                    id={`service-guide-section-${idx}`}
                    className="bg-white dark:bg-[#0A0A0A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => handleSectionToggle(section.title, idx)}
                      className={`w-full flex items-center justify-between p-6 transition-colors ${
                        isExpanded ? 'bg-slate-50/80 dark:bg-[#0F0F0F] border-b border-slate-100 dark:border-slate-800/80' : 'bg-transparent hover:bg-slate-50/50 dark:hover:bg-[#111]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                          isExpanded 
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-black dark:border-white' 
                            : 'bg-white dark:bg-[#111] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <h3 className="font-semibold tracking-tight text-primary dark:text-primary" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.125rem)' }}>
                          {section.title}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="p-6 md:p-8">
                        {sequentialStages.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sequentialStages.map((stage, stageIdx) => (
                              <div key={stage.id} className="group relative flex flex-col rounded-2xl border bg-white dark:bg-[#111] border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] overflow-hidden">
                                
                                <div className="p-6 flex flex-col h-full z-10">
                                  <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full border bg-slate-50 dark:bg-[#1A1A1A] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold">{stageIdx + 1}</span>
                                    </div>
                                  </div>
                                  
                                  <h4 className="font-semibold tracking-tight text-primary dark:text-primary mb-2">
                                    {stage.name}
                                  </h4>
                                  
                                  {stage.description && (
                                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-1">
                                      {stage.description}
                                    </p>
                                  )}

                                  {/* Steps inside Bento Card */}
                                  {stage.steps && stage.steps.length > 0 && (
                                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
                                      <h5 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                                        خطوات المرحلة
                                      </h5>
                                      <ul className="space-y-2.5">
                                        {[...stage.steps]
                                          .sort((a, b) => a.order - b.order)
                                          .map((step) => (
                                            <li key={step.id} className="flex items-start gap-2.5">
                                              <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-500" />
                                              </div>
                                              <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                                                {step.name}
                                              </span>
                                            </li>
                                          ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {continuousStages.length > 0 && (
                          <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
                            <h3 className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              الخدمات الدائمة (Permanent Services)
                            </h3>
                            <div className="flex flex-wrap gap-2 px-1">
                              {continuousStages.map((stage) => (
                                <div 
                                  key={stage.id} 
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                                    stage.isActive 
                                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                                      : 'bg-slate-50 dark:bg-[#111] border-slate-200 dark:border-slate-800 opacity-70'
                                  }`}
                                >
                                  {stage.isActive && (
                                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                  )}
                                  <span className={`text-[11px] font-bold ${stage.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {stage.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white dark:bg-[#111] hover:bg-slate-50 dark:hover:bg-[#1A1A1A] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg transition-all shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      >
        <BookOpen className="w-4 h-4" />
        دليل الخدمات
      </button>

      {mounted && typeof document !== "undefined"
        ? createPortal(modalContent, document.body)
        : null}
    </>
  );
}
