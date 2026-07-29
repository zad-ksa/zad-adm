"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Scale,
  Shield,
  Eye,
  Landmark,
  FileText,
  X,
  BookOpen,
  ListTree,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import type { GovernanceStandard, GovernancePractice, CharitySize } from "@/data/governanceManual";

/* ─────────────────────────────────────────────
   Constants & Helpers
   ───────────────────────────────────────────── */

const STANDARD_ICONS = [Shield, Eye, Landmark] as const;
const STANDARD_COLORS = [
  { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200/60 dark:border-teal-800/40", text: "text-teal-700 dark:text-teal-400", dot: "bg-teal-500" },
  { bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200/60 dark:border-sky-800/40", text: "text-sky-700 dark:text-sky-400", dot: "bg-sky-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200/60 dark:border-amber-800/40", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
] as const;

const SIZE_LABELS: Record<CharitySize, string> = {
  MICRO: "متناهية الصغر",
  SMALL: "الصغيرة",
  MEDIUM: "المتوسطة",
  LARGE: "الكبيرة",
  MEGA: "متناهية الكبر",
};

function slugify(text: string): string {
  return text.replace(/\s+/g, "-").replace(/[^\u0621-\u064Aa-zA-Z0-9\-]/g, "");
}

/* ─────────────────────────────────────────────
   Accordion Component
   ───────────────────────────────────────────── */

function Accordion({
  children,
  title,
  defaultOpen = false,
  badge,
  proofCount,
}: {
  children: React.ReactNode;
  title: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  proofCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`
      rounded-2xl border transition-all duration-300
      ${isOpen
        ? "border-primary/20 dark:border-primary/15 shadow-[0_0_0_1px_rgba(15,118,110,0.05),0_2px_8px_rgba(15,118,110,0.06)] dark:shadow-[0_0_0_1px_rgba(15,118,110,0.08),0_2px_8px_rgba(15,118,110,0.04)]"
        : "border-slate-200/80 dark:border-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
      }
      bg-white dark:bg-[#111]
    `}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-right group cursor-pointer"
      >
        <ChevronLeft className={`w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isOpen ? "-rotate-90" : ""}`} />
        <div className="flex-1 min-w-0">{title}</div>
        {badge}
        {proofCount !== undefined && (
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
            {proofCount} شاهد
          </span>
        )}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Search Highlight
   ───────────────────────────────────────────── */

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200/80 dark:bg-yellow-500/30 text-inherit rounded-sm px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Main DocHub Component
   ───────────────────────────────────────────── */

export default function GovernanceDocHub({
  standards,
  sizeParam,
  charityName,
}: {
  standards: GovernanceStandard[];
  sizeParam: CharitySize;
  charityName: string;
}) {
  const [activeStandardIdx, setActiveStandardIdx] = useState(0);
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"PRACTICES" | "PROOFS">("PRACTICES");

  const contentRef = useRef<HTMLDivElement>(null);
  const practiceRefs = useRef<Map<string, HTMLElement>>(new Map());

  const activeStandard = standards[activeStandardIdx];

  /* ── ScrollSpy via Scroll Event ── */
  useEffect(() => {
    const handleScroll = () => {
      if (!activeStandard) return;
      let activeId = null;
      const checkY = 200; // Offset from top of viewport to check for active section

      // Determine which items to track based on viewMode
      const itemsToCheck = viewMode === "PRACTICES"
        ? (activeStandard.practices || []).map(p => p.id)
        : (activeStandard.detailedProofs || []).map((_, idx) => `proof-${idx}`);

      // Check all visible section refs
      for (const id of itemsToCheck) {
        const el = practiceRefs.current.get(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= checkY && rect.bottom > checkY) {
            activeId = id;
            break;
          }
        }
      }

      if (activeId) {
        setActivePracticeId(activeId);
      }
    };

    // Find the scrolling container (the <main> element with overflow-y-auto)
    const scrollParent = contentRef.current?.closest('.overflow-y-auto') || window;
    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    setTimeout(handleScroll, 100);

    return () => {
      scrollParent.removeEventListener('scroll', handleScroll);
    };
  }, [activeStandardIdx, viewMode]);

  /* ── Register section refs ── */
  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      practiceRefs.current.set(id, el);
    } else {
      practiceRefs.current.delete(id);
    }
  }, []);

  /* ── Switch standard ── */
  const switchStandard = (idx: number) => {
    setActiveStandardIdx(idx);
    setActivePracticeId(null);
    // Scroll to top of the page (using the actual scroll container)
    const scrollParent = contentRef.current?.closest('.overflow-y-auto') || window;
    scrollParent.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Scroll to practice ── */
  const scrollToPractice = (practiceId: string) => {
    const el = practiceRefs.current.get(practiceId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  /* ── Search Filtering ── */
  const filteredPractices = useMemo(() => {
    if (!searchQuery.trim()) return activeStandard?.practices || [];
    const q = searchQuery.toLowerCase();
    return (activeStandard?.practices || []).filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.questions.some(
          (question) =>
            question.question.toLowerCase().includes(q) ||
            question.proof.toLowerCase().includes(q)
        )
    );
  }, [activeStandard, searchQuery]);

  /* ── Current ToC items ── */
  const tocItems = useMemo(() => {
    if (viewMode === "PRACTICES") {
      return (activeStandard?.practices || []).map((p) => ({
        id: p.id,
        title: p.title,
      }));
    } else {
      return (activeStandard?.detailedProofs || []).map((proof, idx) => ({
        id: `proof-${idx}`,
        title: proof.title,
      }));
    }
  }, [activeStandard, viewMode]);

  return (
    <div className="flex flex-col bg-[#FAFAFA] dark:bg-[#0A0A0A] rounded-2xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm" dir="rtl">

      {/* ═══ 2-Column Layout ═══ */}
      <div className="flex items-start relative">

        {/* ─── Column 1: Main Content ─── */}
        <div ref={contentRef} className="flex-1 w-full min-w-0">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12">

            {/* Page Title */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                دليل الممارسات والشواهد للجمعيات  {SIZE_LABELS[sizeParam]}
              </h1>
            </div>

            {/* Header Actions: Back Button & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              {/* Back Button */}
              <Link
                href={`/portal/${encodeURIComponent(charityName)}/governance?change_size=true`}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-[#111] border border-slate-200/80 dark:border-slate-800/60 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:border-primary/40 dark:hover:border-primary/40 transition-all shadow-sm shrink-0 group"
              >
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span>العودة للأحجام</span>
              </Link>

              {/* Search Bar */}
              <div className="relative flex-1 group">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في الممارسات والشواهد..."
                  className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white dark:bg-[#111] border border-slate-200/80 dark:border-slate-800/60 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 dark:focus:border-primary/30 transition-all shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {searchQuery && (
              <p className="mb-6 -mt-4 text-xs text-slate-400 dark:text-slate-500 px-1">
                عرض {filteredPractices.length} من {activeStandard?.practices.length} مؤشر
              </p>
            )}

            {/* Standards Tabs */}
            <div className="flex flex-wrap items-center justify-start gap-2 mb-8">
              {standards.map((std, idx) => {
                const isActive = idx === activeStandardIdx;
                const Icon = STANDARD_ICONS[idx % 3];
                return (
                  <button
                    key={std.id}
                    onClick={() => switchStandard(idx)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer
                      ${isActive
                        ? "bg-primary text-white ring-1 ring-primary/50 shadow-[0_4px_12px_rgba(15,118,110,0.2)]"
                        : "bg-white dark:bg-[#111] text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:bg-primary/5 border border-slate-200/80 dark:border-slate-800/60"
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white/90" : "text-slate-400 dark:text-slate-500"}`} />
                    <span>{std.title.replace(/^(أولاً|ثانياً|ثالثاً|رابعاً):\s*/, "")}</span>
                  </button>
                );
              })}
            </div>

            {/* Standard Header — Bento Card */}
            {activeStandard && (
              <div className={`relative rounded-2xl p-6 md:p-8 mb-10 border overflow-hidden ${STANDARD_COLORS[activeStandardIdx % 3].bg} ${STANDARD_COLORS[activeStandardIdx % 3].border}`}>
                {/* Decorative glow */}
                <div className="absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none bg-primary/20" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      {(() => {
                        const Icon = STANDARD_ICONS[activeStandardIdx % 3];
                        return (
                          <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-white/10 border border-white/40 dark:border-white/10 flex items-center justify-center shadow-sm">
                            <Icon className={`w-5 h-5 ${STANDARD_COLORS[activeStandardIdx % 3].text}`} />
                          </div>
                        );
                      })()}
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${STANDARD_COLORS[activeStandardIdx % 3].text}`}>
                        المعيار {activeStandardIdx + 1} من {standards.length}
                      </span>
                    </div>
                    <h2 className={`text-3xl font-extrabold mb-3 ${STANDARD_COLORS[activeStandardIdx % 3].text}`}>
                      {activeStandard.title}
                    </h2>
                    <p className={`text-sm md:text-base font-medium max-w-xl leading-relaxed opacity-90 ${STANDARD_COLORS[activeStandardIdx % 3].text}`}>
                      {activeStandard.description}
                    </p>
                  </div>
                  
                  {/* View Mode Toggle */}
                  {activeStandard.detailedProofs && (
                    <div className="flex bg-white/40 dark:bg-black/20 p-1 rounded-xl backdrop-blur-md shrink-0">
                      <button
                        onClick={() => setViewMode("PRACTICES")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${viewMode === "PRACTICES" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"}`}
                      >
                        الممارسات
                      </button>
                      <button
                        onClick={() => setViewMode("PROOFS")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${viewMode === "PROOFS" ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"}`}
                      >
                        الشواهد التفصيلية
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content List */}
            <div className="space-y-6 md:space-y-8 min-h-[400px]">
              {viewMode === "PRACTICES" ? (
                <>
                  {filteredPractices.map((practice, pIdx) => (
                    <section
                      key={practice.id}
                      id={practice.id}
                      ref={(el) => registerRef(practice.id, el)}
                      className="scroll-mt-24"
                    >
                      {/* Practice Title (H2) */}
                      <div className="flex items-start gap-3 mb-5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${STANDARD_COLORS[activeStandardIdx % 3].text} bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/15`}>
                          {pIdx + 1}
                        </div>
                        <h2
                          className="font-bold text-slate-900 dark:text-white tracking-tight pt-0.5"
                          style={{ fontSize: "clamp(1.125rem, 2vw, 1.375rem)", lineHeight: 1.35 }}
                        >
                          <HighlightText text={practice.title} query={searchQuery} />
                        </h2>
                      </div>

                      {practice.description && (
                        <div className="mr-11 mb-5 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          <HighlightText text={practice.description} query={searchQuery} />
                        </div>
                      )}

                      {/* Questions as Accordions */}
                      <div className="mr-11 space-y-3">
                        {practice.questions.map((q, qIdx) => (
                          <Accordion
                            key={qIdx}
                            defaultOpen={practice.questions.length <= 2}
                            proofCount={1}
                            title={
                              <p
                                className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed text-right"
                                style={{ fontSize: "clamp(0.8125rem, 1.2vw, 0.9375rem)" }}
                              >
                                <span className="text-primary/60 dark:text-primary/50 font-bold tabular-nums ml-1.5">{qIdx + 1}.</span>
                                <HighlightText text={q.question} query={searchQuery} />
                              </p>
                            }
                          >
                            {/* Proof/Evidence Card */}
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400/80 block mb-1">الشاهد المطلوب</span>
                                <p className="text-emerald-800 dark:text-emerald-300/90 font-medium leading-relaxed" style={{ fontSize: "clamp(0.75rem, 1vw, 0.8125rem)" }}>
                                  <HighlightText text={q.proof} query={searchQuery} />
                                </p>
                              </div>
                            </div>
                          </Accordion>
                        ))}
                      </div>

                      {/* Divider between practices */}
                      {pIdx < filteredPractices.length - 1 && (
                        <div className="mt-10 border-b border-slate-200/60 dark:border-slate-800/40" />
                      )}
                    </section>
                  ))}
                </>
              ) : (
                /* Detailed Proofs View */
                <div className="space-y-6">
                  {activeStandard.detailedProofs?.map((proof, idx) => (
                    <section
                      key={idx}
                      id={`proof-${idx}`}
                      ref={(el) => registerRef(`proof-${idx}`, el)}
                      className="bg-white dark:bg-[#111] border border-slate-200/80 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm scroll-mt-24"
                    >
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{proof.title}</h3>
                      <ul className="space-y-4">
                        {proof.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-2" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>

            {/* Empty search state */}
            {searchQuery && filteredPractices.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">لا توجد نتائج مطابقة لـ &ldquo;{searchQuery}&rdquo;</p>
                <button onClick={() => setSearchQuery("")} className="mt-3 text-xs text-primary hover:underline cursor-pointer">مسح البحث</button>
              </div>
            )}

            {/* Navigation between standards */}
            <div className="flex items-center justify-between mt-16 pt-8 border-t border-slate-200/60 dark:border-slate-800/40">
              {activeStandardIdx > 0 ? (
                <button
                  onClick={() => switchStandard(activeStandardIdx - 1)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors group cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span>{standards[activeStandardIdx - 1].title}</span>
                </button>
              ) : <div />}
              {activeStandardIdx < standards.length - 1 ? (
                <button
                  onClick={() => switchStandard(activeStandardIdx + 1)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors group cursor-pointer"
                >
                  <span>{standards[activeStandardIdx + 1].title}</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              ) : <div />}
            </div>
          </div>
        </div>

        {/* ─── Column 2: Sticky ToC (ScrollSpy) ─── */}
        <aside className="hidden xl:block w-[220px] shrink-0 border-r border-slate-200/80 dark:border-slate-800/60 sticky top-0 self-start max-h-[calc(100vh-2rem)] overflow-y-auto custom-scrollbar pt-8">
          <div className="p-5 pr-6">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">في هذه الصفحة</h4>
            <nav className="relative">
              {/* Vertical track line */}
              <div className="absolute right-0 top-0 bottom-0 w-px bg-slate-200/80 dark:bg-slate-800/60" />

              <div className="space-y-0.5">
                {tocItems.map((item) => {
                  const isActive = activePracticeId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToPractice(item.id)}
                      className={`
                        relative block w-full text-right pr-4 py-1.5 text-[12px] leading-snug transition-all duration-200 cursor-pointer rounded-sm
                        ${isActive
                          ? "text-primary dark:text-primary font-bold"
                          : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                        }
                      `}
                    >
                      {/* Active indicator bar */}
                      <div className={`
                        absolute right-0 top-1 bottom-1 w-0.5 rounded-full transition-all duration-300
                        ${isActive ? "bg-primary scale-y-100" : "bg-transparent scale-y-0"}
                      `} />
                      <span className="line-clamp-2">{item.title.replace(/^المؤشر\s*(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر):\s*/, "")}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
