"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  X,
  ArrowLeft,
  Moon,
  Sun,
  LogOut,
  Briefcase,
  Scale,
  Target,
  Coins,
  Users
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { logout } from "@/app/actions/auth";

// --- Nav Item Component ---
function NavItem({ item, isActive, isOpen, onClick }: { item: any, isActive: boolean, isOpen: boolean, onClick?: () => void }) {
  const content = (
    <>
      <item.icon className={`w-4 h-4 shrink-0 transition-all ml-0 ${isOpen ? "ml-2.5" : ""} ${isActive ? "text-primary dark:text-primary" : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300"}`} />
      {isOpen && <span className="whitespace-nowrap tracking-tight leading-none pt-0.5">{item.label || item.title}</span>}

      {item.comingSoon && isOpen && (
        <span className="mr-auto text-[10px] font-bold font-sans bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300/50 dark:border-slate-600/50">
          قريباً
        </span>
      )}
    </>
  );

  if (item.comingSoon) {
    return (
      <div
        title={!isOpen ? `${item.label || item.title} (قريباً)` : undefined}
        className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 rounded-lg text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 cursor-not-allowed opacity-70 text-[15px] font-medium mb-0.5`}
      >
        <item.icon className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} opacity-60`} />
        {isOpen && <span className="whitespace-nowrap tracking-tight leading-none pt-0.5">{item.label || item.title}</span>}
        {isOpen && (
          <span className="mr-auto text-[10px] font-bold font-sans bg-slate-200/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-300/50 dark:border-slate-600/50">
            قريباً
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={!isOpen ? (item.label || item.title) : undefined}
      className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 mb-0.5 rounded-lg text-[15px] font-medium tracking-tight transition-all group relative overflow-hidden ${isActive
        ? "bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary-rgb),0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
    >
      {content}
    </Link>
  );
}

export default function CharitySidebar({
  charityName,
  logoUrl,
  isOpen,
  setIsOpen,
  role,
  userType,
  availableCharities = [],
}: {
  charityName: string;
  logoUrl: string | null;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  role?: string;
  userType?: string;
  availableCharities?: { id: string, name: string }[];
}) {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState(decodeURIComponent(pathname));
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setActivePath(decodeURIComponent(pathname));
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLinkClick = (href: string) => {
    setActivePath(decodeURIComponent(href));
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const isCharityUser = userType === "CHARITY_USER";

  const mainItems = [
    { id: "services", label: "الخدمات", href: `/portal/${encodeURIComponent(charityName)}/services`, exact: true, icon: Briefcase },
    { id: "governance", label: "الحوكمة", href: `/portal/${encodeURIComponent(charityName)}/governance`, exact: true, icon: Scale },
    { id: "strategy", label: "الاستراتيجية", href: "#", comingSoon: true, icon: Target },
    { id: "finance", label: "تنمية الموارد المالية", href: "#", comingSoon: true, icon: Coins },
    { id: "hr", label: "الموارد البشرية", href: "#", comingSoon: true, icon: Users },
  ];

  const subItems: any[] = [];

  const sidebarContent = (
    <div className="bg-white dark:bg-[#0A0A0A] flex flex-col h-full border-l border-slate-200 dark:border-slate-800/80 shadow-sm relative transition-all duration-300">

      {/* Desktop Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex absolute top-8 -left-3 bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 rounded-md w-6 h-6 items-center justify-center z-50 transition-all shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-5" : "justify-center px-0"} h-16 border-b border-slate-100 dark:border-slate-800 shrink-0 transition-all`}>
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
      <div className="lg:hidden absolute top-5 left-5 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-md transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Charity Profile - Fixed at top */}
      <div className={`flex ${isOpen ? "flex-row items-center px-4 gap-3.5" : "flex-col items-center px-2"} py-4 border-b border-slate-100 dark:border-slate-800/80 transition-all overflow-hidden shrink-0`}>
        {logoUrl ? (
          <div className={`rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-black flex items-center justify-center shrink-0 transition-all shadow-sm ${isOpen ? "w-12 h-12" : "w-10 h-10"}`}>
            <img src={logoUrl} alt={charityName} className="w-full h-full object-contain p-1" />
          </div>
        ) : (
          <div className={`bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5 text-primary rounded-full ring-1 ring-primary/20 dark:ring-primary/30 flex items-center justify-center shrink-0 transition-all shadow-sm ${isOpen ? "w-12 h-12" : "w-10 h-10"}`}>
            <Building2 className={isOpen ? "w-6 h-6" : "w-5 h-5"} />
          </div>
        )}

        {isOpen && (
          <div className="overflow-hidden fade-in flex-1 min-w-0 flex flex-col justify-center gap-1 mt-0.5">
            <div className="flex items-start justify-between w-full gap-2">
              <h2
                className="font-semibold text-primary dark:text-primary tracking-tight truncate leading-snug flex-1 text-[13px] md:text-[14px]"
                title={charityName}
              >
                {charityName}
              </h2>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-1 rounded-md bg-slate-50 border border-slate-200/60 dark:border-slate-700/50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer shrink-0 shadow-sm"
                  title="تبديل الوضع الداكن/الفاتح"
                >
                  {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-tight leading-none pt-0.5">
                ملف الجمعية
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-0.5 flex flex-col relative">
        {isOpen && mainItems.length > 0 && (
          <div className="flex items-center justify-between px-2 mb-1.5 mt-1">
            <span className="text-[11px] font-semibold text-slate-400/80 dark:text-slate-500 uppercase tracking-widest">الرئيسية</span>
          </div>
        )}

        {mainItems.map((item: any) => {
          const decodedHref = decodeURIComponent(item.href);
          const isActive = item.exact
            ? activePath === decodedHref
            : activePath.startsWith(decodedHref);

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isOpen={isOpen}
              onClick={() => handleLinkClick(item.href)}
            />
          )
        })}

        {isOpen && subItems.length > 0 && (
          <div className="flex items-center justify-between px-2 mt-5 mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400/80 dark:text-slate-500 uppercase tracking-wider">التبويبات الفرعية</span>
          </div>
        )}

        {subItems.map((item: any) => {
          const decodedHref = decodeURIComponent(item.href);
          const isActive = item.exact
            ? activePath === decodedHref
            : activePath.startsWith(decodedHref);

          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={isActive}
              isOpen={isOpen}
              onClick={() => handleLinkClick(item.href)}
            />
          )
        })}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col shrink-0 px-3 py-3 border-t border-slate-100 dark:border-slate-800 gap-1">
        {isCharityUser && availableCharities.length > 1 && (
          <Link
            href="/select-charity"
            title={!isOpen ? "تبديل الجمعية" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg text-[15px] font-medium transition-all group`}
          >
            <Building2 className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300`} />
            {isOpen && <span className="whitespace-nowrap">تبديل الجمعية</span>}
          </Link>
        )}

        {!isCharityUser ? (
          <Link
            href="/main"
            title={!isOpen ? "العودة للوحة التحكم" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg text-[15px] font-medium transition-all group`}
          >
            <ArrowLeft className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300`} />
            {isOpen && <span className="whitespace-nowrap">العودة للوحة التحكم</span>}
          </Link>
        ) : (
          <button
            onClick={() => logout()}
            title={!isOpen ? "تسجيل الخروج" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[15px] font-medium transition-all group`}
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
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-64" : "w-16"}`}
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
