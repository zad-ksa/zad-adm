"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, ShieldAlert, Users, X, LogOut, LayoutDashboard, Building2, ClipboardList, ChevronRight, Edit, Eye, EyeOff, Camera, Loader2, AlertCircle, CheckCircle2, Newspaper, CheckSquare, Moon, Sun, LayoutGrid, FileText, Settings2, FileSignature, MessageSquare, Send, GitBranch } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";
import { usePathname, useSearchParams } from "next/navigation";
import ZadLogo from "@/components/ZadLogo";
import { hasPermission, ROLE_LABELS } from "@/lib/permissions";
import { getSidebarCharities } from "@/app/actions/charity";
import { ChevronDown, Target, Scale, DollarSign } from "lucide-react";
import dynamic from "next/dynamic";

const ProfileEditModal = dynamic(() => import("./ProfileEditModal"), { ssr: false });

// --- Sub Tab Link Component ---
function SubTabLink({ href, label, isActive, onClick }: { href: string, label: string, isActive: boolean, onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className={`flex items-center px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"}`}>
      <div className="w-1.5 h-1.5 rounded-full ml-1.5 shrink-0 bg-current opacity-50" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// --- Nav Item Component ---
function NavItem({ item, isActive, isOpen, onClick }: { item: any, isActive: boolean, isOpen: boolean, onClick?: () => void }) {
  return (
    <div className="relative group">
      <Link
        href={item.href}
        onClick={onClick}
        title={!isOpen ? item.label : undefined}
        className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-2 rounded-lg text-[11px] font-bold transition-all group relative ${
          isActive
            ? "bg-primary text-white shadow-sm shadow-primary/20"
            : "text-slate-500 dark:text-slate-400 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary dark:hover:text-primary"
        }`}
      >
        <div className="relative shrink-0">
          <item.icon className={`w-4 h-4 transition-all ${isOpen ? "ml-2.5" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
          {item.badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-0.5 leading-none">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </div>
        {isOpen && (
          <span className="flex-1 flex items-center justify-between whitespace-nowrap">
            {item.label}
            {item.badge > 0 && (
              <span className="mr-1 min-w-[18px] h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </span>
        )}
      </Link>
    </div>
  );
}

export default function EmployeeSidebar({
  session,
  isOpen,
  setIsOpen,
  unreadRequests = 0,
}: {
  session: any;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  unreadRequests?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const decodedPathname = pathname ? decodeURIComponent(pathname) : "";
  
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [expandedCharity, setExpandedCharity] = useState<string | null>(null);

  const [userState, setUserState] = useState(session);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [charities, setCharities] = useState<any[]>([]);
  const [activePath, setActivePath] = useState(decodedPathname);

  useEffect(() => {
    setActivePath(decodedPathname);
  }, [decodedPathname]);

  useEffect(() => {
    if (!isOpen) return;
    
    let newGroup: string | null = expandedGroup;
    let newService: string | null = expandedService;
    let newCharity: string | null = expandedCharity;

    const path = activePath;

    if (path === "/main") newGroup = "";
    else if (path.startsWith("/main/charities") || path.startsWith("/main/contracts") || path.startsWith("/main/custom-surveys") || path.startsWith("/main/communication")) newGroup = "الجمعيات";
    else if (path.startsWith("/main/requests") || path.startsWith("/main/news") || path.startsWith("/main/meetings") || path.startsWith("/main/tasks")) newGroup = "زاد";
    else if (path.startsWith("/main/admin") || path.startsWith("/main/workflow-settings")) newGroup = "لوحة التحكم";
    else if (path.startsWith("/main/services-overview") || path.includes("/charity/")) {
      newGroup = "الخدمات";
      if (path.includes("/charity/")) {
        const parts = path.split('/');
        if (parts.length >= 4) {
          const charityNameStr = decodeURIComponent(parts[2]);
          const serviceId = parts[3]; 
          if (["strategy", "governance", "resource-development", "finance"].includes(serviceId)) {
            newService = serviceId;
            newCharity = `${serviceId}-${charityNameStr}`;
          }
        }
      }
    }

    if (newGroup !== null) setExpandedGroup(newGroup);
    if (newService !== null) setExpandedService(newService);
    if (newCharity !== null) setExpandedCharity(newCharity);
  }, [isOpen, activePath]);

  const handleLinkClick = (href: string) => {
    setActivePath(href);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    getSidebarCharities().then(res => setCharities(res || []));
  }, []);

  useEffect(() => {
    setUserState(session);
  }, [session]);

  let navItems: { label: string; href: string; icon: any; badge?: number }[] = [];

  const role = userState?.role || "";
  const perms: string[] = userState?.permissions || [];
  const can = (p: string) => hasPermission(role, perms, p);

  navItems = [
    { label: "الرئيسية", href: "/main", icon: LayoutDashboard },
    { label: "الجمعيات", href: "/main/charities", icon: Building2 },
  ];

  if (can("view_services_overview")) {
    navItems.push({ label: "عرض الخدمات", href: "/main/services-overview", icon: LayoutGrid });
  }
  if (can("manage_contracts")) {
    navItems.push({ label: "العقود", href: "/main/contracts", icon: FileSignature });
  }
  if (can("manage_surveys")) {
    navItems.push({ label: "الاستبيانات", href: "/main/custom-surveys", icon: ClipboardList });
  }
  if (can("manage_communication")) {
    navItems.push({ label: "التواصل", href: "/main/communication", icon: MessageSquare });
  }
  if (can("manage_news")) {
    navItems.push({ label: "الأخبار والإنجازات", href: "/main/news", icon: Newspaper });
  }
  if (can("manage_meetings")) {
    navItems.push({ label: "محاضر الاجتماعات", href: "/main/meetings", icon: FileText });
  }
  if (can("manage_tasks")) {
    const isManager = perms.includes("developer_mode") ||
      hasPermission(role, perms, "manage_requests");
    navItems.push({ label: isManager ? "المهام والمنجزات" : "مهامي", href: "/main/tasks", icon: CheckSquare });
  }
  navItems.push({ label: "الطلبات", href: "/main/requests", icon: Send, badge: unreadRequests });
  if (can("manage_employees") || can("manage_charities") || can("manage_charity_settings")) {
    navItems.push({ label: "لوحة التحكم", href: "/main/admin", icon: Settings2 });
  }
  if (can("manage_workflow")) {
    navItems.push({ label: "سلاسل الاعتماد", href: "/main/workflow-settings", icon: GitBranch });
  }

  const sidebarContent = (
    <div className="bg-white dark:bg-slate-900 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm cursor-pointer"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-5" : "justify-center px-0"} h-14 border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800 shrink-0 transition-all`}>
        {isOpen ? (
          <div className="w-full h-full flex items-center relative pr-1">
            <ZadLogo isOpen={true} className="h-8 w-auto" />
          </div>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center">
            <ZadLogo isOpen={false} className="h-7 w-auto" />
          </div>
        )}
      </div>

      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-6 left-6 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:bg-slate-800 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile */}
      <div className={`flex ${isOpen ? "flex-row items-center gap-2.5 px-4 py-3" : "flex-col items-center gap-2 px-2 py-3"} border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800 transition-all overflow-hidden shrink-0`}>
        <button
          type="button"
          onClick={() => {
            setIsEditModalOpen(true);
          }}
          className="group/avatar flex items-center justify-center focus:outline-none cursor-pointer shrink-0"
          title="تعديل الملف الشخصي"
        >
          <div className={`relative overflow-hidden bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20 rounded-xl flex items-center justify-center transition-all duration-300 ${isOpen ? "w-9 h-9" : "w-9 h-9"} group-hover/avatar:ring-2 group-hover/avatar:ring-primary/40`}>
            {userState?.avatarUrl ? (
              <Image src={userState.avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex items-center justify-center text-white">
              <Edit className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight" title={userState?.name}>{userState?.name}</h2>
            <div className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-bold">
              <ShieldAlert className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate">
                {ROLE_LABELS[userState?.role] || "موظف"}
              </span>
            </div>
          </div>
        )}

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
            title="تبديل الوضع الداكن/الفاتح"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-2 space-y-4 flex flex-col relative">
        {(() => {
          // Accordion: only one group open at a time; collapsing/switching a group
          // also resets its inner service/charity tree so it re-opens collapsed.
          const toggleGroup = (title: string) => {
            setExpandedService(null);
            setExpandedCharity(null);
            setExpandedGroup(prev => (prev === title ? null : title));
          };

          const renderGroup = (title: string, labels: string[]) => {
            const items = labels.map(label => navItems.find(i => i.label === label)).filter(Boolean) as typeof navItems;
            if (items.length === 0) return null;

            const isCollapsed = title ? expandedGroup !== title : false;

            return (
              <div className="mb-2">
                {isOpen && title && (
                  <button
                    onClick={() => toggleGroup(title)}
                    className="flex items-center justify-between w-full px-2 mb-2 group cursor-pointer outline-none"
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-primary transition-colors">{title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-200 ${isCollapsed ? 'rotate-180' : 'rotate-90'}`} />
                  </button>
                )}
                <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen && isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
                  {items.map((item) => {
                    const isActive = activePath.startsWith(item.href) && (item.href !== "/main" || activePath === "/main");
                    return <NavItem key={item.href} item={item} isActive={isActive} isOpen={isOpen} onClick={() => handleLinkClick(item.href)} />;
                  })}
                </div>
              </div>
            );
          };

          const renderServicesGroup = () => {
            const hasServicesAccess = can("view_services_overview") || can("manage_charities");
            if (!hasServicesAccess) return null;

            const isServicesCollapsed = expandedGroup !== "الخدمات";
            const toggleServices = () => toggleGroup("الخدمات");

            const allServices = [
              { id: "strategy", label: "الاستراتيجية", icon: Target, required: "manage_strategy" },
              { id: "governance", label: "الحوكمة", icon: Scale, required: "manage_governance" },
              { id: "resource-development", label: "تنمية الموارد المالية", icon: Users, required: "manage_finance" },
              { id: "finance", label: "المالية", icon: DollarSign, required: "manage_finance" },
            ];

            const services = allServices.filter(svc => can(svc.required));
            if (services.length === 0) return null;

            return (
              <div className="mb-2">
                {isOpen && (
                  <button 
                    onClick={toggleServices}
                    className="flex items-center justify-between w-full px-2 mb-2 group cursor-pointer outline-none"
                  >
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-primary transition-colors">الخدمات</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-transform duration-200 ${isServicesCollapsed ? 'rotate-180' : 'rotate-90'}`} />
                  </button>
                )}
                <div className={`space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${isOpen && isServicesCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1500px] opacity-100'}`}>
                  {isOpen && (
                    <Link
                      href="/main/services-overview"
                      onClick={() => handleLinkClick("/main/services-overview")}
                      className={`flex items-center w-full px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all group mt-1 ${activePath === "/main/services-overview" ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-primary/5 hover:text-primary"}`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 ml-2" />
                      <span>الكل</span>
                    </Link>
                  )}
                  
                  {isOpen && services.map(svc => (
                    <div key={svc.id} className="relative mt-1">
                      <button 
                        onClick={() => { setExpandedCharity(null); setExpandedService(prev => prev === svc.id ? null : svc.id); }}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all group ${expandedService === svc.id ? "bg-primary/5 text-primary" : "text-slate-500 hover:bg-primary/5 hover:text-primary"}`}
                      >
                        <div className="flex items-center">
                          <svc.icon className="w-3.5 h-3.5 ml-2" />
                          <span>{svc.label}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedService === svc.id ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedService === svc.id ? 'max-h-[1000px] opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                        <div className="mr-3 space-y-1 border-r-2 border-slate-100 dark:border-slate-800 pr-2">
                          {charities.map(charity => {
                            const charityKey = `${svc.id}-${charity.name}`;
                            const isCharityExpanded = expandedCharity === charityKey;
                            const toggleCharity = () => setExpandedCharity(prev => prev === charityKey ? null : charityKey);
                            
                            return (
                              <div key={charity.id}>
                                <button
                                  onClick={toggleCharity}
                                  className={`flex items-center justify-between w-full px-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isCharityExpanded ? "text-primary bg-primary/5" : "text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                                >
                                  <span className="truncate text-right">{charity.name}</span>
                                  <ChevronDown className={`w-2.5 h-2.5 transition-transform shrink-0 ${isCharityExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCharityExpanded ? 'max-h-[500px] opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'}`}>
                                  <div className="mr-2 space-y-0.5 border-r-2 border-slate-100 dark:border-slate-800 pr-1.5">
                                    {svc.id === "strategy" && (
                                      <>
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/strategy`} label="استبيان الجاهزية" isActive={activePath === `/charity/${charity.name}/strategy`} onClick={() => handleLinkClick(`/charity/${charity.name}/strategy`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/strategy/vision-mission`} label="استبيان الرؤية" isActive={activePath === `/charity/${charity.name}/strategy/vision-mission`} onClick={() => handleLinkClick(`/charity/${charity.name}/strategy/vision-mission`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/strategy/hexagonal`} label="التحليل السداسي" isActive={activePath === `/charity/${charity.name}/strategy/hexagonal`} onClick={() => handleLinkClick(`/charity/${charity.name}/strategy/hexagonal`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/strategy/performance`} label="مقياس الأداء" isActive={activePath === `/charity/${charity.name}/strategy/performance`} onClick={() => handleLinkClick(`/charity/${charity.name}/strategy/performance`)} />
                                      </>
                                    )}
                                    {svc.id === "governance" && (
                                      <>
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/governance?tab=manual`} label="دليل الحوكمة" isActive={activePath === `/charity/${charity.name}/governance` && (!currentTab || currentTab === 'manual')} onClick={() => handleLinkClick(`/charity/${charity.name}/governance?tab=manual`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/governance?tab=files`} label="الملفات والأنظمة" isActive={activePath === `/charity/${charity.name}/governance` && currentTab === 'files'} onClick={() => handleLinkClick(`/charity/${charity.name}/governance?tab=files`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/governance?tab=services`} label="خدمات المركز" isActive={activePath === `/charity/${charity.name}/governance` && currentTab === 'services'} onClick={() => handleLinkClick(`/charity/${charity.name}/governance?tab=services`)} />
                                      </>
                                    )}
                                    {svc.id === "resource-development" && (
                                      <>
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/resource-development/donors`} label="الجهات المانحة" isActive={activePath === `/charity/${charity.name}/resource-development/donors`} onClick={() => handleLinkClick(`/charity/${charity.name}/resource-development/donors`)} />
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/resource-development/grants`} label="المنح" isActive={activePath === `/charity/${charity.name}/resource-development/grants`} onClick={() => handleLinkClick(`/charity/${charity.name}/resource-development/grants`)} />
                                      </>
                                    )}
                                    {svc.id === "finance" && (
                                      <>
                                        <SubTabLink href={`/charity/${encodeURIComponent(charity.name)}/finance`} label="الوضع المالي" isActive={activePath === `/charity/${charity.name}/finance`} onClick={() => handleLinkClick(`/charity/${charity.name}/finance`)} />
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          };

          return (
            <>
              {renderGroup("", ["الرئيسية"])}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderServicesGroup()}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderGroup("الجمعيات", ["الجمعيات", "العقود", "الاستبيانات", "التواصل"])}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderGroup("زاد", ["الطلبات", "الأخبار والإنجازات", "محاضر الاجتماعات", "المهام والمنجزات", "مهامي"])}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderGroup("لوحة التحكم", ["لوحة التحكم", "سلاسل الاعتماد"])}
            </>
          );
        })()}
      </div>

      {/* Logout */}
      <div className="shrink-0 px-2.5 py-2.5 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800">
        <form action={logout}>
          <button
            type="submit"
            title={!isOpen ? "تسجيل الخروج" : undefined}
            className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} w-full py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg text-sm font-bold transition-colors group`}
          >
            <LogOut className={`w-4 h-4 shrink-0 transition-all ${isOpen ? "ml-2.5" : "ml-0"} text-red-400 group-hover:text-red-600`} />
            {isOpen && <span className="whitespace-nowrap">تسجيل الخروج</span>}
          </button>
        </form>
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
        <div className={`absolute top-0 right-0 h-full w-56 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <ProfileEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userState={userState} 
        setUserState={setUserState} 
      />
    </>
  );
}
