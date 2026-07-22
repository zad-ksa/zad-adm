"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X, ChevronDown } from "lucide-react";

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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                دليل الخدمات
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                استعراض شامل لجميع الخدمات بمراحلها وخطواتها
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="service-guide-scroll-container" className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/20 scroll-smooth">
          {sections.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              لا توجد خدمات مسجلة
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section, idx) => {
                const isExpanded = expandedSection === section.title;
                if (section.stages.length === 0) return null;

                return (
                  <div
                    key={idx}
                    id={`service-guide-section-${idx}`}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-all"
                  >
                    <button
                      onClick={() => handleSectionToggle(section.title, idx)}
                      className="w-full flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
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
                      <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                        <div className="relative pl-4 pr-4">
                          {/* Vertical Line */}
                          <div className="absolute right-[27px] top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                          <div className="space-y-8">
                            {[...section.stages]
                              .sort((a, b) => a.order - b.order)
                              .map((stage, stageIdx) => (
                                <div key={stage.id} className="relative z-10">
                                  <div className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border-2 border-primary flex items-center justify-center shrink-0 mt-1 shadow-sm">
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                        {stage.name}
                                      </h4>
                                      {stage.description && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                          {stage.description}
                                        </p>
                                      )}

                                      {/* Steps */}
                                      {stage.steps && stage.steps.length > 0 && (
                                        <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                                          <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-wider">
                                            خطوات المرحلة
                                          </h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {[...stage.steps]
                                              .sort((a, b) => a.order - b.order)
                                              .map((step) => (
                                                <div
                                                  key={step.id}
                                                  className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300"
                                                >
                                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                                  <span>{step.name}</span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
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
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold bg-primary hover:bg-primary/90 text-white rounded-xl transition-all shadow-sm hover:shadow"
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
