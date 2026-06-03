"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  ChevronRight, 
  X, 
  ArrowLeft, 
  User, 
  Menu
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";

interface HexagonalResponseItem {
  id: string;
  authorizedTitle: string;
  createdAt: Date;
}

const HexagonalSkeleton = () => (
  <div className="w-full space-y-8 animate-pulse font-sans" dir="rtl">
    {/* Header Info Card Skeleton */}
    <div className="bg-white rounded-2xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl shrink-0"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-100 rounded-md w-28"></div>
            <div className="h-6 bg-slate-200 rounded-md w-48 sm:w-64"></div>
            <div className="h-3 bg-slate-100 rounded-md w-20"></div>
          </div>
        </div>
        <div className="w-full md:w-48 bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-2">
          <div className="h-3 bg-slate-100 rounded-md w-16"></div>
          <div className="h-4 bg-slate-200 rounded-md w-24"></div>
        </div>
      </div>
    </div>

    {/* Title section skeleton */}
    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
      <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
      <div className="h-6 bg-slate-200 rounded-md w-56"></div>
    </div>

    {/* Grid of 6 dimensions skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 space-y-5">
          <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0"></div>
            <div className="h-5 bg-slate-200 rounded-md w-36"></div>
          </div>
          <div className="space-y-3">
            <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
            <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
            <div className="h-10 bg-slate-50 rounded-xl w-full"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function HexagonalLayoutClient({
  children,
  charityName,
  logoUrl,
  currentResponseId,
  responses,
}: {
  children: React.ReactNode;
  charityName: string;
  logoUrl: string | null;
  currentResponseId: string;
  responses: HexagonalResponseItem[];
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTabId, setActiveTabId] = useState(currentResponseId);

  // Sync activeTabId with currentResponseId when props change (navigation complete)
  useEffect(() => {
    setActiveTabId(currentResponseId);
  }, [currentResponseId]);

  // Reset navigating state when pathname changes (navigation completed)
  useEffect(() => {
    setIsNavigating(false);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [pathname]);

  const sidebarContent = (
    <div className="bg-white flex flex-col h-full border-l border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm cursor-pointer"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-6" : "justify-center px-0"} h-24 border-b border-slate-100 shrink-0 transition-all`}>
        {isOpen ? (
          <div className="w-full h-full flex items-center py-4 relative pr-2">
            <ZadLogo isOpen={true} className="h-12 w-auto" />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center">
            <ZadLogo isOpen={false} className="h-10 w-auto" />
          </div>
        )}
      </div>

      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-6 left-6 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col">
        {/* Charity Profile */}
        <div className={`flex flex-col ${isOpen ? "items-start px-6" : "items-center px-2"} mb-8 pb-6 border-b border-slate-100 transition-all overflow-hidden`}>
          {logoUrl ? (
            <div className={`rounded-2xl overflow-hidden border border-slate-150 bg-white flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
              <img src={logoUrl} alt={charityName} className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className={`bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
              <Building2 className={isOpen ? "w-7 h-7" : "w-5 h-5"} />
            </div>
          )}
          
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap fade-in w-full">
              <h2 className="text-base font-bold text-slate-800 truncate mb-1" title={charityName}>
                {charityName}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 border border-secondary/20 rounded-full text-[10px] text-secondary font-bold">
                التحليل السداسي
              </div>
            </div>
          )}
        </div>

        {/* Navigation - Hexagonal Survey Responses */}
        <div className="flex-1 px-3 space-y-1.5">
          {isOpen && (
            <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              تقارير التحليل السداسي
            </div>
          )}
          
          {responses.map((item) => {
            const isActive = item.id === activeTabId;
            const formattedDate = new Date(item.createdAt).toLocaleDateString("ar-SA", {
              month: "short",
              day: "numeric",
              year: "2-digit"
            });

            return (
              <Link
                key={item.id}
                href={`/dashboard/hexagonal/${item.id}`}
                onClick={() => {
                  if (item.id !== currentResponseId) {
                    setActiveTabId(item.id);
                    setIsNavigating(true);
                  }
                }}
                title={!isOpen ? `${item.authorizedTitle} (${formattedDate})` : undefined}
                className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-2.5 rounded-xl font-bold transition-all group relative overflow-hidden ${
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-slate-500 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 rounded-l-full"></div>}
                <User className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
                
                {isOpen && (
                  <div className="flex flex-col text-right overflow-hidden min-w-0">
                    <span className="text-sm truncate font-bold leading-tight">{item.authorizedTitle}</span>
                    <span className={`text-[10px] ${isActive ? "text-white/80" : "text-slate-400 group-hover:text-primary/70"} font-medium mt-0.5`}>
                      {formattedDate}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Return to Charity Profile */}
        <div className="mt-auto px-3 pt-6 border-t border-slate-100 shrink-0">
          <Link
            href={`/dashboard/charity/${encodeURIComponent(charityName)}`}
            onClick={() => setIsNavigating(true)}
            title={!isOpen ? "العودة لملف الجمعية" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-slate-500 hover:bg-primary/5 hover:text-primary rounded-xl font-bold transition-all group`}
          >
            <ArrowLeft className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-primary`} />
            {isOpen && <span className="whitespace-nowrap text-sm">العودة لملف الجمعية</span>}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" dir="rtl">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-72" : "w-20"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-slate-800 text-lg truncate max-w-[200px]" title={charityName}>
              {charityName}
            </span>
          </div>
        </div>
        
        {/* Scrollable Children Container */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {isNavigating ? <HexagonalSkeleton /> : children}
          </div>
        </main>
      </div>
    </div>
  );
}
