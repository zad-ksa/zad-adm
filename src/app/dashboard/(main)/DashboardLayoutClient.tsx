"use client";

import { usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import { useState, useEffect } from "react";
import { Menu, LayoutDashboard, Building2, ClipboardList, Newspaper } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function DashboardLayoutClient({ children, session }: { children: React.ReactNode, session: any }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const mobileNavItems = [
    { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard, exact: true },
    { label: "الجمعيات", href: "/dashboard/charities", icon: Building2 },
    { label: "الاستبيانات", href: "/dashboard/surveys", icon: ClipboardList },
    { label: "الأخبار", href: "/dashboard/news", icon: Newspaper },
  ];

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden" dir="rtl">
      <EmployeeSidebar session={session} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header (Sticky & Blur) */}
        <div className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-lg border-b border-slate-200/80 h-16 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 -mr-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-slate-800 text-lg">لوحة التحكم</span>
          </div>
          {/* User profile pic can be added here optionally */}
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
