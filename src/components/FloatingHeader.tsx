"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, Moon, Sun, Edit, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { markNotificationAsRead } from "@/app/actions/notifications";
import { ROLE_LABELS } from "@/lib/permissions";

const ProfileEditModal = dynamic(() => import("./ProfileEditModal"), { ssr: false });

export default function FloatingHeader({
  session,
  appNotifications = { notifications: [], count: 0 },
  className,
}: {
  session: any;
  appNotifications?: { notifications: any[], count: number };
  className?: string;
}) {
  const [userState, setUserState] = useState(session);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setUserState(session);
  }, [session]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className={className || "fixed top-4 left-4 lg:left-8 z-40 flex items-center gap-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/50 shadow-sm p-1.5 rounded-full print:hidden"}>
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors focus:outline-none relative cursor-pointer"
            title="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {appNotifications.count > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-black/10 z-[60] overflow-hidden flex flex-col max-h-[350px]" dir="rtl">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">الإشعارات</span>
                {appNotifications.count > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{appNotifications.count}</span>
                )}
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                {appNotifications.notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">لا توجد إشعارات حالياً</div>
                ) : (
                  appNotifications.notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={async () => {
                        if (!notif.isRead) await markNotificationAsRead(notif.id);
                        if (notif.link) {
                          window.location.href = notif.link;
                        }
                        setIsNotificationsOpen(false);
                      }}
                      className={`px-3 py-2.5 text-xs rounded-xl mb-1 cursor-pointer transition-all ${!notif.isRead ? 'bg-primary/5 hover:bg-primary/10 border border-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'}`}
                    >
                      <div className={`font-bold ${!notif.isRead ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>{notif.title}</div>
                      {notif.message && <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{notif.message}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors cursor-pointer"
            title="تبديل الوضع الداكن/الفاتح"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* User Profile */}
        <button
          type="button"
          onClick={() => setIsEditModalOpen(true)}
          className="group flex items-center gap-2 pl-1 pr-1.5 focus:outline-none cursor-pointer"
          title="تعديل الملف الشخصي"
        >
          <div className="hidden md:flex flex-col items-end rtl:items-start mr-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{userState?.name}</span>
            <span className="text-[9px] text-slate-500 dark:text-slate-400">{ROLE_LABELS[userState?.role] || "موظف"}</span>
          </div>
          <div className="relative overflow-hidden bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center transition-all duration-300 w-9 h-9 group-hover:ring-2 group-hover:ring-primary/40">
            {userState?.avatarUrl ? (
              <Image src={userState.avatarUrl} alt="Avatar" fill className="object-cover" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center text-white">
              <Edit className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>

      </div>

      <ProfileEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userState={userState} 
        setUserState={setUserState} 
      />
    </>
  );
}
