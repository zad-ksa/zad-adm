"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  ChevronRight, 
  X, 
  ArrowLeft, 
  Home, 
  Target, 
  Scale, 
  FolderKanban, 
  Users, 
  Coins,
  Moon,
  Sun,
  CheckSquare,
  LogOut
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { logout } from "@/app/actions/auth";

export default function CharitySidebar({ 
  charityName,
  logoUrl,
  isOpen,
  setIsOpen,
  role,
  permissions 
}: { 
  charityName: string;
  logoUrl: string | null;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  role?: string;
  permissions?: string[];
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER"].includes(role || "");
  const isStrategy = role === "STRATEGY";
  const isFinance = role === "FINANCE";
  const isCharityClient = role === "CHARITY_CLIENT";
  const canManageGovernance = isAdmin || permissions?.includes("manage_governance");
  const canManageHR = isAdmin || permissions?.includes("manage_hr");

  const allNavItems = [
    {
      title: "الرئيسية",
      href: `/charity/${encodeURIComponent(charityName)}`,
      exact: true,
      icon: Home,
      show: true,
    },
    {
      title: "الاستراتيجية",
      href: `/charity/${encodeURIComponent(charityName)}/strategy`,
      icon: Target,
      show: isAdmin || isStrategy || isCharityClient,
    },
    {
      title: "الحوكمة",
      href: `/charity/${encodeURIComponent(charityName)}/governance`,
      icon: Scale,
      show: canManageGovernance || isCharityClient,
    },
    {
      title: "البرامج والمشاريع",
      href: `/charity/${encodeURIComponent(charityName)}/programs`,
      icon: FolderKanban,
      show: isAdmin || isStrategy,
    },
    {
      title: "الموارد البشرية",
      href: "#",
      icon: Users,
      comingSoon: true,
      show: canManageHR,
    },
    {
      title: "المالية",
      href: `/charity/${encodeURIComponent(charityName)}/finance`,
      icon: Coins,
      show: isAdmin || isFinance,
    },
    {
      title: "مهامي",
      href: `/charity/${encodeURIComponent(charityName)}/tasks`,
      icon: CheckSquare,
      comingSoon: true, // Will be implemented soon
      show: false,
    },
  ];

  const navItems = allNavItems.filter(item => item.show);

  const sidebarContent = (
    <div className="bg-white dark:bg-slate-800 flex flex-col h-full border-l border-slate-200 dark:border-slate-700/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-6" : "justify-center px-0"} h-24 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shrink-0 transition-all`}>
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
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Charity Profile - Fixed at top */}
      <div className={`flex flex-col ${isOpen ? "items-start px-6" : "items-center px-2"} pt-6 pb-6 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 transition-all overflow-hidden shrink-0`}>
        {logoUrl ? (
          <div className={`rounded-2xl overflow-hidden border border-slate-150 bg-white dark:bg-slate-800 flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
            <img src={logoUrl} alt={charityName} className="w-full h-full object-contain p-1" />
          </div>
        ) : (
          <div className={`bg-primary/5 text-primary rounded-2xl flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
            <Building2 className={isOpen ? "w-7 h-7" : "w-5 h-5"} />
          </div>
        )}
        
        {isOpen && (
          <div className="overflow-hidden whitespace-nowrap fade-in w-full flex flex-col gap-2">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate flex-1" title={charityName}>
                {charityName}
              </h2>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer shrink-0 mr-2"
                  title="تبديل الوضع الداكن/الفاتح"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
            </div>
            <div className="inline-flex w-max items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              ملف الجمعية
            </div>
          </div>
        )}
      </div>

      {/* Navigation - Scrollable if items exceed height */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-1.5">
        {isOpen && <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</div>}
        
        {navItems.map((item, idx) => {
          if (item.comingSoon) {
            return (
              <div
                key={idx}
                title={!isOpen ? `${item.title} (قريباً)` : undefined}
                className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-3 rounded-xl text-slate-400 bg-slate-50 dark:bg-slate-900/50/50 cursor-not-allowed opacity-70 text-sm font-bold`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} opacity-60`} />
                {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
                {isOpen && (
                  <span className="mr-auto text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-extrabold">
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
                  : "text-slate-500 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white dark:bg-slate-800/20 rounded-l-full"></div>}
              <item.icon className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
              {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions - Fixed at bottom */}
      <div className="shrink-0 px-3 py-6 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
        {!isCharityClient ? (
          <Link
            href="/dashboard"
            title={!isOpen ? "العودة للوحة التحكم" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-slate-500 dark:text-slate-400 hover:bg-primary/5 hover:text-primary rounded-xl font-bold transition-all group`}
          >
            <ArrowLeft className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-primary`} />
            {isOpen && <span className="whitespace-nowrap">العودة للوحة التحكم</span>}
          </Link>
        ) : (
          <button
            onClick={() => logout()}
            title={!isOpen ? "تسجيل الخروج" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold transition-all group`}
          >
            <LogOut className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"}`} />
            {isOpen && <span className="whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        )}
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
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
