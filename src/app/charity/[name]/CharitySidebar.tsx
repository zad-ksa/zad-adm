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
  Briefcase,
  GripVertical,
  Settings2,
  Check,
  Loader2
} from "lucide-react";
import ZadLogo from "@/components/ZadLogo";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { logout } from "@/app/actions/auth";
import { hasPermission } from "@/lib/permissions";
import { updateNavOrder } from "@/app/actions/profile";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Item Component ---
function SortableNavItem({ item, isActive, isOpen, isEditMode }: { item: any, isActive: boolean, isOpen: boolean, isEditMode: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.href });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  const content = (
    <>
      {isActive && isOpen && !isEditMode && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white dark:bg-slate-800/20 rounded-l-full"></div>}
      {isEditMode && isOpen && (
        <div {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-1 shrink-0 touch-none">
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <item.icon className={`w-4 h-4 shrink-0 transition-all ${isOpen ? (isEditMode ? "ml-1.5" : "ml-2.5") : "ml-0"} ${isActive && !isEditMode ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
      {isOpen && <span className="whitespace-nowrap">{item.title}</span>}
      
      {item.comingSoon && isOpen && (
        <span className="mr-auto text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-extrabold">
          قريباً
        </span>
      )}
    </>
  );

  if (item.comingSoon && !isEditMode) {
    return (
      <div
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

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none">
      {isEditMode ? (
        <div className={`flex items-center ${isOpen ? "justify-start px-2" : "justify-center"} py-2 rounded-xl text-xs font-bold transition-all bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm`}>
          {content}
        </div>
      ) : (
        <Link
          href={item.href}
          title={!isOpen ? item.title : undefined}
          className={`flex items-center ${isOpen ? "justify-start px-2.5" : "justify-center"} py-2 rounded-xl text-xs font-bold transition-all group relative overflow-hidden ${
            isActive
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-slate-500 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
          }`}
        >
          {content}
        </Link>
      )}
    </div>
  );
}

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
  navOrder?: string[];
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isNavEditMode, setIsNavEditMode] = useState(false);
  const [orderedNavItems, setOrderedNavItems] = useState<any[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [currentNavOrder, setCurrentNavOrder] = useState<string[]>(navOrder || []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const isCharityClient = role === "CHARITY_CLIENT";
  const perms = permissions || [];
  const can = (p: string) => hasPermission(role || "", perms, p);

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
      show: !isCharityClient || isCharityClient,
    },
    {
      title: "الاستراتيجية",
      href: `/charity/${encodeURIComponent(charityName)}/strategy`,
      icon: Target,
      comingSoon: isCharityClient,
      show: can("manage_strategy") || isCharityClient,
    },
    {
      title: "الحوكمة",
      href: `/charity/${encodeURIComponent(charityName)}/governance`,
      icon: Scale,
      comingSoon: isCharityClient,
      show: can("manage_governance") || isCharityClient,
    },
    {
      title: "البرامج والمشاريع",
      href: `/charity/${encodeURIComponent(charityName)}/programs`,
      icon: FolderKanban,
      comingSoon: isCharityClient,
      show: can("manage_programs") || isCharityClient,
    },
    {
      title: "المالية",
      href: `/charity/${encodeURIComponent(charityName)}/finance`,
      icon: Coins,
      comingSoon: isCharityClient,
      show: can("manage_finance") || isCharityClient,
    },
    {
      title: "الموارد البشرية",
      href: "#",
      icon: Users,
      comingSoon: true,
      show: can("manage_hr") || isCharityClient,
    },
    {
      title: "مهامي",
      href: `/charity/${encodeURIComponent(charityName)}/tasks`,
      icon: CheckSquare,
      comingSoon: true,
      show: false,
    },
  ];

  const navItems = allNavItems.filter(item => item.show);

  useEffect(() => {
    const savedOrder = currentNavOrder || [];
    const ordered = [...navItems].sort((a, b) => {
      const indexA = savedOrder.indexOf(a.href);
      const indexB = savedOrder.indexOf(b.href);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
    setOrderedNavItems(ordered);
  }, [navItems.map(n => n.href).join(","), currentNavOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedNavItems((items) => {
        const oldIndex = items.findIndex((i) => i.href === active.id);
        const newIndex = items.findIndex((i) => i.href === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveNavOrder = async () => {
    setIsSavingOrder(true);
    const newOrder = orderedNavItems.map(item => item.href);
    const res = await updateNavOrder(newOrder);
    if (res.success) {
      setCurrentNavOrder(res.navOrder || []);
      setIsNavEditMode(false);
    }
    setIsSavingOrder(false);
  };

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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 py-3 space-y-0.5 flex flex-col relative">
        {isOpen && (
          <div className="flex items-center justify-between px-2.5 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</span>
            {!isNavEditMode ? (
              <button
                onClick={() => setIsNavEditMode(true)}
                className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-primary/5"
                title="تعديل ترتيب القائمة"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSaveNavOrder}
                disabled={isSavingOrder}
                className="text-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                title="حفظ الترتيب"
              >
                {isSavingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}

        <div className="flex-1 space-y-0.5 relative">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedNavItems.map(i => i.href)} strategy={verticalListSortingStrategy}>
              {orderedNavItems.map((item, idx) => {
                const decodedPathname = decodeURIComponent(pathname);
                const decodedHref = decodeURIComponent(item.href);
                const isActive = item.exact
                  ? decodedPathname === decodedHref
                  : decodedPathname.startsWith(decodedHref);

                return (
                  <SortableNavItem 
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    isOpen={isOpen}
                    isEditMode={isNavEditMode}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </div>
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
