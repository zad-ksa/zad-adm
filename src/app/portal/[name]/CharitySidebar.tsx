"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  X,
  ArrowLeft,
  Moon,
  Sun,
  LogOut,
  Briefcase,
  Scale,
  Target,
  Coins,
  Users,
  ShieldCheck,
  Palette
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import PrivacyPolicyModal from "@/components/PrivacyPolicyModal";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { logout } from "@/app/actions/auth";

// --- Nav Item Component ---
function NavItem({ item, isActive, isOpen, onClick }: { item: any, isActive: boolean, isOpen: boolean, onClick?: () => void }) {
  const content = (
    <>
      <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-300 ml-0 ${isOpen ? "ml-2.5" : ""} ${isActive ? "text-primary dark:text-teal-400" : "text-slate-400 group-hover:text-primary dark:group-hover:text-teal-400"}`} />
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
      data-active={isActive}
      className={`charity-nav-item flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 mb-0.5 rounded-lg text-[15px] font-medium tracking-tight group relative overflow-hidden ${isActive
        ? "bg-primary/[0.07] dark:bg-primary/[0.12] text-primary dark:text-teal-400 shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.16)] dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.20)]"
        : "text-slate-600 dark:text-slate-400 hover:bg-primary/[0.04] dark:hover:bg-teal-400/[0.05] hover:text-primary dark:hover:text-teal-400"
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
  permissions = [],
  title,
  isAdmin = false,
}: {
  charityName: string;
  logoUrl: string | null;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  role?: string;
  userType?: string;
  availableCharities?: { id: string, name: string }[];
  permissions?: string[];
  title?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePath, setActivePath] = useState(decodeURIComponent(pathname));
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Keeps the mobile drawer shut on first paint — see the drawer below.
  const drawerOpen = isOpen && mounted;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'logout' | 'switch' | null, charityName?: string }>({ type: null });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-dropdown]')) {
        setIsDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      // Find the currently open dropdown (desktop or mobile)
      const openDropdowns = Array.from(document.querySelectorAll('[data-profile-dropdown] [role="menu"]'));
      const visibleDropdown = openDropdowns.find(menu => menu.getBoundingClientRect().width > 0);
      
      if (!visibleDropdown) return;
      
      const focusableElements = visibleDropdown.querySelectorAll('button[role="menuitem"]');
      if (!focusableElements || focusableElements.length === 0) return;
      
      const elementsArray = Array.from(focusableElements) as HTMLElement[];
      const currentIndex = elementsArray.indexOf(document.activeElement as HTMLElement);
      
      let nextIndex = 0;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < elementsArray.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : elementsArray.length - 1;
      }
      
      elementsArray[nextIndex]?.focus();
    }
  };

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

  // Cosmetic only. Hiding a nav item does not protect the route — every page
  // under /portal re-checks the same permission on the server (see lib/portalAccess.ts).
  // A missing permission here just avoids showing a link that would 404.
  const can = (permission: string) => isAdmin || permissions.includes(permission);

  const mainItems = [
    { id: "services", label: "الخدمات", href: `/portal/${encodeURIComponent(charityName)}/services`, exact: true, icon: Briefcase, show: true },
    { id: "governance", label: "الحوكمة", href: `/portal/${encodeURIComponent(charityName)}/governance`, exact: true, icon: Scale, show: true },
    { id: "design-requests", label: "طلبات التصاميم", href: `/portal/${encodeURIComponent(charityName)}/design-requests`, exact: true, icon: Palette, show: true },
    { id: "strategy", label: "الاستراتيجية", href: "#", comingSoon: true, icon: Target, show: true },
    { id: "finance", label: "تنمية الموارد المالية", href: "#", comingSoon: true, icon: Coins, show: true },
    // Every active member can record their own attendance, so HR is always
    // reachable; the landing page inside it differs by permission.
    {
      id: "hr",
      label: "الموارد البشرية",
      href: can("manage_charity_users")
        ? `/portal/${encodeURIComponent(charityName)}/hr`
        : `/portal/${encodeURIComponent(charityName)}/hr/attendance`,
      icon: Users,
      show: true,
    },
  ].filter((item) => item.show);

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
      <div className="relative shrink-0" data-profile-dropdown>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="menu"
          className={`w-full flex ${isOpen ? "flex-row items-center px-4 gap-3.5" : "flex-col items-center px-2"} py-4 border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-white/5 transition-all overflow-hidden cursor-pointer outline-none group focus-visible:ring-2 focus-visible:ring-primary`}
        >
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
            <>
              <div className="overflow-hidden fade-in flex-1 min-w-0 flex flex-col justify-center gap-1 mt-0.5 text-right">
                <div className="flex items-start justify-between w-full gap-2">
                  <h2
                    className="font-semibold text-primary dark:text-primary tracking-tight truncate leading-snug flex-1 text-[13px] md:text-[14px]"
                    title={charityName}
                  >
                    {charityName}
                  </h2>
                  {mounted && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setTheme(theme === "dark" ? "light" : "dark");
                      }}
                      className="p-1 rounded-md bg-slate-50 border border-slate-200/60 dark:border-slate-700/50 dark:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer shrink-0 shadow-sm"
                      title="تبديل الوضع الداكن/الفاتح"
                    >
                      {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 opacity-80">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-tight leading-none pt-0.5">
                    ملف الجمعية
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div 
            role="menu"
            onKeyDown={handleKeyDown}
            className={`absolute top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${isOpen ? 'right-4 left-4' : 'right-2 w-48'}`}
          >
            {isCharityUser && availableCharities.filter(c => c.name !== charityName).length > 0 && (
              <>
                {availableCharities.filter(c => c.name !== charityName).map((charity) => (
                  <button
                    key={charity.id}
                    role="menuitem"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setConfirmModal({ type: 'switch', charityName: charity.name });
                    }}
                    className="flex items-center justify-start w-full px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[14px] font-medium transition-colors text-right outline-none focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/50"
                  >
                    <Building2 className="w-4 h-4 shrink-0 ml-2.5 text-slate-400" />
                    <span className="truncate">{charity.name}</span>
                  </button>
                ))}
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-3" />
              </>
            )}
            
            <button
              role="menuitem"
              onClick={() => {
                setIsDropdownOpen(false);
                setConfirmModal({ type: 'logout' });
              }}
              className="flex items-center justify-start w-full px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-[14px] font-medium transition-colors text-right outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-950/30"
            >
              <LogOut className="w-4 h-4 shrink-0 ml-2.5" />
              <span>تسجيل الخروج</span>
            </button>
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
        {/* Privacy Policy Button */}
        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          title={!isOpen ? "سياسة الخصوصية" : undefined}
          className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-2 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary rounded-lg text-[15px] font-medium transition-all group`}
        >
          <ShieldCheck className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-primary`} />
          {isOpen && <span className="whitespace-nowrap text-[13px]">سياسة الخصوصية</span>}
        </button>

        {!isCharityUser && (
          <Link
            href="/main"
            title={!isOpen ? "العودة للوحة التحكم" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg text-[15px] font-medium transition-all group`}
          >
            <ArrowLeft className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300`} />
            {isOpen && <span className="whitespace-nowrap">العودة للوحة التحكم</span>}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-64" : "w-16"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer.
          `drawerOpen` rather than `isOpen`: the parent starts open so the
          desktop rail renders at full width, which on a phone painted this
          drawer and its backdrop before the parent's effect could close them. */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${drawerOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.type && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                {confirmModal.type === 'logout' ? (
                  <LogOut className="w-6 h-6 text-red-500" />
                ) : (
                  <Building2 className="w-6 h-6 text-primary" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {confirmModal.type === 'logout' ? 'هل تريد تسجيل الخروج؟' : `هل تريد التبديل إلى ${confirmModal.charityName}؟`}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {confirmModal.type === 'logout' 
                  ? 'سيتم تسجيل خروجك من الحساب الحالي.' 
                  : 'سيتم تحويلك إلى لوحة اختيار الجمعيات.'}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal({ type: null })}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    if (confirmModal.type === 'logout') {
                      logout();
                    } else if (confirmModal.type === 'switch') {
                      window.location.href = '/select-charity';
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-white font-medium transition-colors ${
                    confirmModal.type === 'logout' 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
