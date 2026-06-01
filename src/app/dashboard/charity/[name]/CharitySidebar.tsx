"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, X, ArrowLeft } from "lucide-react";
import ZadLogo from "@/components/ZadLogo";

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" className="fill-primary/5 stroke-primary/10" />
    <polyline points="9 22 9 12 15 12 15 22" />
    <path d="M3 9l9-7 9 7" />
  </svg>
);

const StrategyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" className="stroke-slate-300" />
    <circle cx="12" cy="12" r="6" className="fill-primary/5 stroke-primary/30" />
    <circle cx="12" cy="12" r="2" className="fill-primary stroke-primary" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

const GovernanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="5" y1="7" x2="19" y2="7" />
    <path d="M5 7l3 7h-6z" className="fill-slate-500/5 stroke-current" />
    <path d="M19 7l3 7h-6z" className="fill-slate-500/5 stroke-current" />
    <path d="M12 22h6m-12 0h6" />
  </svg>
);

const ProgramsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" className="fill-primary/5 stroke-current" />
    <line x1="2" y1="10" x2="22" y2="10" className="opacity-50" />
  </svg>
);

const HRIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" className="fill-primary/5" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const FinanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="4" width="20" height="16" rx="2" className="fill-primary/5" />
    <path d="M12 8v8M9 11h6m-6 2h6" className="stroke-primary" />
    <circle cx="20" cy="12" r="2" className="fill-secondary stroke-secondary" />
  </svg>
);

export default function CharitySidebar({ 
  charityName,
  isOpen,
  setIsOpen 
}: { 
  charityName: string;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "الرئيسية",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}`,
      exact: true,
      icon: <HomeIcon />,
    },
    {
      title: "الاستراتيجية",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy`,
      icon: <StrategyIcon />,
    },
    {
      title: "الحوكمة",
      href: "#",
      icon: <GovernanceIcon />,
      comingSoon: true,
    },
    {
      title: "البرامج والمشاريع",
      href: "#",
      icon: <ProgramsIcon />,
      comingSoon: true,
    },
    {
      title: "الموارد البشرية",
      href: "#",
      icon: <HRIcon />,
      comingSoon: true,
    },
    {
      title: "المالية",
      href: "#",
      icon: <FinanceIcon />,
      comingSoon: true,
    },
  ];

  const sidebarContent = (
    <div className="bg-white flex flex-col h-full border-l border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm"
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
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col">
        {/* Charity Profile */}
        <div className={`flex flex-col ${isOpen ? "items-start px-6" : "items-center px-2"} mb-8 pb-6 border-b border-slate-100 transition-all overflow-hidden`}>
          <div className={`bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
            <Building2 className={isOpen ? "w-7 h-7" : "w-5 h-5"} />
          </div>
          
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap fade-in w-full">
              <div className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">ملف الجمعية</div>
              <h2 className="text-base font-bold text-slate-800 truncate" title={charityName}>
                {charityName}
              </h2>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1.5">
          {isOpen && <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</div>}
          
          {navItems.map((item, idx) => {
            if (item.comingSoon) {
              return (
                <div
                  key={idx}
                  title={!isOpen ? `${item.title} (قريباً)` : undefined}
                  className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-3 rounded-xl text-slate-400 bg-slate-50/50 cursor-not-allowed opacity-70 text-sm font-bold`}
                >
                  <span className={`w-5 h-5 shrink-0 flex items-center justify-center ${isOpen ? "ml-3" : "ml-0"}`}>
                    {item.icon}
                  </span>
                  {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
                  {isOpen && (
                    <span className="mr-auto text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-extrabold">
                      قريباً
                    </span>
                  )}
                </div>
              );
            }

            const decodedPathname = decodeURIComponent(pathname);
            const decodedHref = decodeURIComponent(item.href);
            
            const isActive = item.exact
              ? decodedPathname === decodedHref
              : decodedPathname.startsWith(decodedHref);

            return (
              <Link
                key={idx}
                href={item.href}
                title={!isOpen ? item.title : undefined}
                className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-3 rounded-xl font-bold transition-all group relative overflow-hidden ${
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-slate-500 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 rounded-l-full"></div>}
                <span className={`w-5 h-5 shrink-0 flex items-center justify-center transition-all ${isOpen ? "ml-3" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`}>
                  {item.icon}
                </span>
                {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
              </Link>
            );
          })}
        </div>

        {/* Return to Dashboard */}
        <div className="mt-auto px-3 pt-6 border-t border-slate-100 shrink-0">
          <Link
            href="/dashboard"
            title={!isOpen ? "العودة للوحة التحكم" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-slate-500 hover:bg-primary/5 hover:text-primary rounded-xl font-bold transition-all group`}
          >
            <ArrowLeft className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-primary`} />
            {isOpen && <span className="whitespace-nowrap">العودة للوحة التحكم</span>}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
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
    </>
  );
}
