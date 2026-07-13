"use client";

import { usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { getUnreadNotificationsCount } from "@/app/actions/requests";

import DeveloperRoleSwitcher from "@/components/DeveloperRoleSwitcher";

export default function DashboardLayoutClient({ children, session, unreadRequests: initial = 0 }: { children: React.ReactNode, session: any, unreadRequests?: number }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadRequests, setUnreadRequests] = useState(initial);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  // polling للإشعارات كل 20 ثانية
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const count = await getUnreadNotificationsCount();
        if (active) setUnreadRequests(count);
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 20000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden print:h-auto print:overflow-visible print:block" dir="rtl">
      <EmployeeSidebar session={session} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} unreadRequests={unreadRequests} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative print:overflow-visible print:h-auto print:block">
        {/* Mobile Header (Sticky & Blur) */}
        <div className="lg:hidden sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800/80 h-16 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">لوحة التحكم</span>
          </div>
          {/* User profile pic can be added here optionally */}
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 pb-8 print:overflow-visible print:p-0 print:block">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {session?.isDeveloper && <DeveloperRoleSwitcher currentEmployeeId={session.originalId ? session.id : undefined} hideCharityClients={true} />}
    </div>
  );
}
