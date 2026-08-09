"use client";

import { usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/EmployeeSidebar";
import { useState, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { getUnreadNotificationsCount } from "@/app/actions/requests";
import { getUnreadNotifications } from "@/app/actions/notifications";
import FloatingHeader from "@/components/FloatingHeader";

import DeveloperRoleSwitcher from "@/components/DeveloperRoleSwitcher";

export default function DashboardLayoutClient({ children, session, unreadRequests: initial = 0 }: { children: React.ReactNode, session: any, unreadRequests?: number }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadRequests, setUnreadRequests] = useState(initial);
  const [appNotificationsData, setAppNotificationsData] = useState<{notifications: any[], count: number}>({ notifications: [], count: 0 });
  const seenNotificationIds = useRef<Set<string>>(new Set());

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  // polling للإشعارات كل 60 ثانية (يتوقف إذا كان التبويب في الخلفية)
  useEffect(() => {
    let active = true;
    async function poll() {
      if (document.hidden) return;
      try {
        const count = await getUnreadNotificationsCount();
        if (active) setUnreadRequests(count);

        const appNotifsRes = await getUnreadNotifications();
        if (active && appNotifsRes && !appNotifsRes.error) {
          setAppNotificationsData({ notifications: appNotifsRes.notifications || [], count: appNotifsRes.count || 0 });
          if ("Notification" in window && Notification.permission === "granted") {
            const notifs = appNotifsRes.notifications || [];
            
            // Get seen notifications from localStorage to persist across reloads
            const storedSeen = JSON.parse(localStorage.getItem('seen_notifications') || '[]');
            const seenSet = new Set(storedSeen);
            
            notifs.forEach((n: any) => {
              if (n.isRead) return; // Don't notify for already read notifications
              
              if (!seenSet.has(n.id) && !seenNotificationIds.current.has(n.id)) {
                seenNotificationIds.current.add(n.id);
                seenSet.add(n.id);
                // Send push notification
                const notification = new Notification(n.title, {
                  body: n.message || "",
                  icon: "/favicon.ico",
                });
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              }
            });
            
            // Save the last 100 seen IDs to localStorage
            localStorage.setItem('seen_notifications', JSON.stringify(Array.from(seenSet).slice(-100)));
            
          } else {
             const notifs = appNotifsRes.notifications || [];
             notifs.forEach((n: any) => seenNotificationIds.current.add(n.id));
          }
        }
      } catch {}
    }
    
    if (!document.hidden) poll();
    
    const interval = setInterval(poll, 60000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => { 
      active = false; 
      clearInterval(interval); 
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-950 overflow-hidden print:h-auto print:overflow-visible print:block" dir="rtl">


      <EmployeeSidebar session={session} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} unreadRequests={unreadRequests} />
      
      <FloatingHeader 
        session={session} 
        appNotifications={appNotificationsData} 
        className="hidden lg:flex fixed top-4 left-8 z-40 items-center gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm p-1.5 rounded-full print:hidden"
      />

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
          <FloatingHeader 
            session={session} 
            appNotifications={appNotificationsData} 
            className="flex items-center gap-1"
          />
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
