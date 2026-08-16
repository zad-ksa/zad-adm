"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, ShieldAlert, Users, X, LogOut, LayoutDashboard, Building2, ClipboardList, ChevronRight, Edit, Eye, EyeOff, Camera, Loader2, AlertCircle, CheckCircle2, Newspaper, CheckSquare, Moon, Sun, LayoutGrid, FileText, Settings2, FileSignature, MessageSquare, Send, GitBranch, Bell, ShieldCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/app/actions/auth";
import { updateProfile } from "@/app/actions/profile";
import { usePathname, useSearchParams } from "next/navigation";
import ZadLogo from "@/components/ZadLogo";
import { hasPermission } from "@/lib/permissions";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { getSidebarCharities } from "@/app/actions/charity";
import { ChevronDown, Target, Scale, DollarSign, Mail, Palette } from "lucide-react";
import dynamic from "next/dynamic";
import PrivacyPolicyModal from "@/components/PrivacyPolicyModal";

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
  unreadMails = 0,
}: {
  session: any;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  unreadRequests?: number;
  unreadMails?: number;
}) {
  const roleLabels = useRoleLabels();
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
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
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
    else if (path.startsWith("/main/charities") || path.startsWith("/main/contracts") || path.startsWith("/main/custom-surveys") || path.startsWith("/main/communication") || path.startsWith("/main/charity-meetings") || path.startsWith("/main/design-requests")) newGroup = "الجمعيات";
    else if (path.startsWith("/main/approvals") || path.startsWith("/main/news") || path.startsWith("/main/meetings") || path.startsWith("/main/tasks") || path.startsWith("/main/mail")) newGroup = "زاد";
    else if (path.startsWith("/main/admin") || path.startsWith("/main/workflow-settings")) newGroup = "لوحة التحكم";
    else if (path.startsWith("/main/services-overview") || path.startsWith("/main/strategy") || path.startsWith("/main/governance") || path.startsWith("/main/finance") || path.startsWith("/main/resource-development") || path.startsWith("/main/programs")) {
      newGroup = "الخدمات";
      const parts = path.split('/');
      if (parts.length >= 4) {
        // /main/serviceId/charityName
        const serviceId = parts[2];
        const charityNameStr = decodeURIComponent(parts[3]);
        if (["strategy", "governance", "resource-development", "finance", "programs"].includes(serviceId)) {
          newService = serviceId;
          newCharity = `${serviceId}-${charityNameStr}`;
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
  ];

  if (can("view_charities")) {
    navItems.push({ label: "الجمعيات", href: "/main/charities", icon: Building2 });
  }

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
    navItems.push({ label: "الاجتماعات", href: "/main/charity-meetings", icon: Users });
  }
  if (can("manage_design_requests")) {
    navItems.push({ label: "طلبات التصاميم", href: "/main/design-requests", icon: Palette });
  }
  if (can("manage_news")) {
    navItems.push({ label: "الأخبار والإنجازات", href: "/main/news", icon: Newspaper });
  }
  if (can("manage_meetings")) {
    navItems.push({ label: "محاضر الاجتماعات", href: "/main/meetings", icon: FileText });
  }
  if (can("manage_tasks")) {
    const isManager = can("view_all_tasks") || perms.includes("developer_mode");
    navItems.push({ label: isManager ? "المهام والمنجزات" : "مهامي", href: "/main/tasks", icon: CheckSquare });
  }
  navItems.push({ label: "البريد الداخلي", href: "/main/mail", icon: Mail, badge: unreadMails });
  navItems.push({ label: "الاعتمادات", href: "/main/approvals", icon: Send, badge: unreadRequests });
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
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
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
            const allServices = [
              { id: "strategy", label: "الاستراتيجية", icon: Target, required: "manage_strategy" },
              { id: "governance", label: "الحوكمة", icon: Scale, required: "manage_governance" },
              { id: "resource-development", label: "تنمية الموارد المالية", icon: Users, required: "manage_finance" },
              { id: "finance", label: "المالية", icon: DollarSign, required: "manage_finance" },
            ];

            const services = allServices.filter(svc => can(svc.required));
            const hasOverviewAccess = can("view_services_overview");
            const hasServicesAccess = hasOverviewAccess || can("manage_charities") || services.length > 0;
            
            if (!hasServicesAccess) return null;

            const isServicesCollapsed = expandedGroup !== "الخدمات";
            const toggleServices = () => toggleGroup("الخدمات");

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
                  {isOpen && hasOverviewAccess && (
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
                          {svc.id === "governance" ? (
                            <>
                              <SubTabLink href={`/main/governance?tab=manual`} label="دليل الحوكمة" isActive={activePath === `/main/governance` && (!currentTab || currentTab === 'manual')} onClick={() => handleLinkClick(`/main/governance?tab=manual`)} />
                              <SubTabLink href={`/main/governance?tab=services`} label="خدمات المركز" isActive={activePath === `/main/governance` && currentTab === 'services'} onClick={() => handleLinkClick(`/main/governance?tab=services`)} />
                            </>
                          ) : (
                            charities.map(charity => {
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
                                        <SubTabLink href={`/main/strategy/${encodeURIComponent(charity.name)}`} label="استبيان الجاهزية" isActive={activePath === `/main/strategy/${charity.name}`} onClick={() => handleLinkClick(`/main/strategy/${charity.name}`)} />
                                        <SubTabLink href={`/main/strategy/${encodeURIComponent(charity.name)}/vision-mission`} label="استبيان الرؤية" isActive={activePath === `/main/strategy/${charity.name}/vision-mission`} onClick={() => handleLinkClick(`/main/strategy/${charity.name}/vision-mission`)} />
                                        <SubTabLink href={`/main/strategy/${encodeURIComponent(charity.name)}/hexagonal`} label="التحليل السداسي" isActive={activePath === `/main/strategy/${charity.name}/hexagonal`} onClick={() => handleLinkClick(`/main/strategy/${charity.name}/hexagonal`)} />
                                        <SubTabLink href={`/main/strategy/${encodeURIComponent(charity.name)}/performance`} label="مقياس الأداء" isActive={activePath === `/main/strategy/${charity.name}/performance`} onClick={() => handleLinkClick(`/main/strategy/${charity.name}/performance`)} />
                                      </>
                                    )}
                                    {svc.id === "resource-development" && (
                                      <>
                                        <SubTabLink href={`/main/resource-development/${encodeURIComponent(charity.name)}/donors`} label="الجهات المانحة" isActive={activePath === `/main/resource-development/${charity.name}/donors`} onClick={() => handleLinkClick(`/main/resource-development/${charity.name}/donors`)} />
                                        <SubTabLink href={`/main/resource-development/${encodeURIComponent(charity.name)}/grants`} label="المنح" isActive={activePath === `/main/resource-development/${charity.name}/grants`} onClick={() => handleLinkClick(`/main/resource-development/${charity.name}/grants`)} />
                                      </>
                                    )}
                                    {svc.id === "finance" && (
                                      <>
                                        <SubTabLink href={`/main/finance/${encodeURIComponent(charity.name)}`} label="الوضع المالي" isActive={activePath === `/main/finance/${charity.name}`} onClick={() => handleLinkClick(`/main/finance/${charity.name}`)} />
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }))}
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
              {renderGroup("الجمعيات", ["الجمعيات", "العقود", "الاستبيانات", "التواصل", "الاجتماعات", "طلبات التصاميم"])}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderGroup("زاد", ["البريد الداخلي", "الاعتمادات", "الأخبار والإنجازات", "محاضر الاجتماعات", "المهام والمنجزات", "مهامي"])}
              {isOpen && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2" />}
              {renderGroup("لوحة التحكم", ["لوحة التحكم", "سلاسل الاعتماد"])}
            </>
          );
        })()}
      </div>

      {/* Privacy Policy Button */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setIsPrivacyModalOpen(true)}
          title={!isOpen ? "سياسة الخصوصية" : undefined}
          className={`w-full flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-1.5 rounded-lg text-[11px] font-medium text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isOpen ? "ml-2" : ""}`} />
          {isOpen && <span>سياسة الخصوصية</span>}
        </button>
      </div>

    </div>
  );

  return (
    <>
      <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 print:hidden ${isOpen ? "w-56" : "w-16"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 print:hidden ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-56 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white dark:bg-slate-800 shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>

    </>
  );
}
