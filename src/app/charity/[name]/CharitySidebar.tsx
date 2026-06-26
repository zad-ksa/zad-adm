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
  LogOut,
  Briefcase
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

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(role || "");
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
      title: "الخدمات",
      href: `/charity/${encodeURIComponent(charityName)}/services`,
      icon: Briefcase,
      show: isAdmin || isCharityClient || isStrategy || isFinance, // generally visible to anyone who has access to charity
    },
    {
      title: "الاستراتيجية",
      href: `/charity/${encodeURIComponent(charityName)}/strategy`,
      icon: Target,
      comingSoon: isCharityClient,
      show: isAdmin || isStrategy || isCharityClient,
    },
    {
      title: "الحوكمة",
      href: `/charity/${encodeURIComponent(charityName)}/governance`,
      icon: Scale,
      comingSoon: isCharityClient,
      show: canManageGovernance || isCharityClient,
    },
    {
      title: "البرامج والمشاريع",
      href: `/charity/${encodeURIComponent(charityName)}/programs`,
      icon: FolderKanban,
      comingSoon: isCharityClient,
      show: isAdmin || isStrategy || isCharityClient,
    },
    {
      title: "المالية",
      href: `/charity/${encodeURIComponent(charityName)}/finance`,
      icon: Coins,
      comingSoon: isCharityClient,
      show: isAdmin || isFinance || isCharityClient,
    },
    {
      title: "الموارد البشرية",
      href: "#",
      icon: Users,
      comingSoon: true,
      show: canManageHR || isCharityClient,
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
      <div className={`flex items-center ${isOpen ? "justify-start px-4" : "justify-center px-0"} h-14 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shrink-0 transition-all`}>
        {isOpen ? (
          <div className="w-full h-full flex items-center py-2 relative pr-1">
            <ZadLogo isOpen={true} className="h-7 w-auto" />
          </div>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center">
            <ZadLogo isOpen={false} className="h-7 w-auto" />
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
      <div className={`flex ${isOpen ? "flex-row items-center px-4 gap-3" : "flex-col items-center px-2"} py-3 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 transition-all overflow-hidden shrink-0`}>
        {logoUrl ? (
          <div className={`rounded-xl overflow-hidden border border-slate-150 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 transition-all ${isOpen ? "w-9 h-9" : "w-8 h-8"}`}>
            <img src={logoUrl} alt={charityName} className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className={`bg-primary/5 text-primary rounded-xl flex items-center justify-center shrink-0 transition-all ${isOpen ? "w-9 h-9" : "w-8 h-8"}`}>
            <Building2 className={isOpen ? "w-5 h-5" : "w-4 h-4"} />
          </div>
        )}

        {isOpen && (
          <div className="overflow-hidden fade-in flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center justify-between w-full gap-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex-1" title={charityName}>
                {charityName}
              </h2>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer shrink-0"
                  title="تبديل الوضع الداكن/الفاتح"
                >
                  {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <div className="inline-flex w-max items-center px-2 py-0.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              ملف الجمعية
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3 space-y-0.5">
        {isOpen && <div className="px-2.5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</div>}

        {navItems.map((item, idx) => {
          if (item.comingSoon) {
            return (
              <div
                key={idx}
                title={!isOpen ? `${item.title} (قريباً)` : undefined}
                className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-2 rounded-xl text-slate-400 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed opacity-70 text-xs font-bold`}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} opacity-60`} />
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
              className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-2 rounded-xl text-xs font-bold transition-all group relative overflow-hidden ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-slate-500 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white dark:bg-slate-800/20 rounded-l-full"></div>}
              <item.icon className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
              {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="shrink-0 px-2.5 py-2.5 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
        {!isCharityClient ? (
          <Link
            href="/dashboard"
            title={!isOpen ? "العودة للوحة التحكم" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} w-full py-2 text-slate-500 dark:text-slate-400 hover:bg-primary/5 hover:text-primary rounded-xl text-xs font-bold transition-all group`}
          >
            <ArrowLeft className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} text-slate-400 group-hover:text-primary`} />
            {isOpen && <span className="whitespace-nowrap">العودة للوحة التحكم</span>}
          </Link>
        ) : (
          <button
            onClick={() => logout()}
            title={!isOpen ? "تسجيل الخروج" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} w-full py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-bold transition-all group`}
          >
            <LogOut className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"}`} />
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
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-56" : "w-16"}`}
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
