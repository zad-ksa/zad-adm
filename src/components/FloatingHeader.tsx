"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, Moon, Sun, Edit, ShieldAlert, LogOut, Settings, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, deleteAllNotifications } from "@/app/actions/notifications";
import { ROLE_LABELS } from "@/lib/permissions";
import Link from "next/link";
import { logout } from "@/app/actions/auth";

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [localCount, setLocalCount] = useState(appNotifications?.count || 0);
  const [localNotifs, setLocalNotifs] = useState(appNotifications?.notifications || []);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setUserState(session);
  }, [session]);

  useEffect(() => {
    if (appNotifications) {
      setLocalCount(appNotifications.count || 0);
      setLocalNotifs(appNotifications.notifications || []);
    }
  }, [appNotifications]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
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
            onClick={async () => {
              const nextState = !isNotificationsOpen;
              setIsNotificationsOpen(nextState);
              if (localCount > 0) {
                setLocalCount(0);
                await markAllNotificationsAsRead();
              }
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary transition-colors focus:outline-none relative cursor-pointer"
            title="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {localCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </button>
          
          {isNotificationsOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-black/10 z-[60] overflow-hidden flex flex-col max-h-[350px]" dir="rtl">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">الإشعارات</span>
                {localCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-bold">{localCount}</span>
                )}
              </div>
              <div className="overflow-y-auto custom-scrollbar flex-1 p-2">
                {localNotifs.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 font-medium">لا توجد إشعارات حالياً</div>
                ) : (
                  localNotifs.map((notif: any) => (
                    <div 
                      key={notif.id}
                      onClick={async () => {
                        setLocalNotifs(prev => prev.filter((n: any) => n.id !== notif.id));
                        await deleteNotification(notif.id);
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
              
              {localNotifs.length > 0 && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                  <button
                    onClick={async () => {
                      setLocalNotifs([]);
                      await deleteAllNotifications();
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف الكل
                  </button>
                </div>
              )}
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
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="group flex items-center gap-2 pl-1 pr-1.5 focus:outline-none cursor-pointer"
            title="الحساب التعريفي"
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
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-xl shadow-black/10 z-[60] overflow-hidden flex flex-col p-1" dir="rtl">
              <Link
                href="/main/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-primary transition-colors rounded-xl font-bold"
              >
                <User className="w-4 h-4 text-slate-400" />
                الملف الشخصي
              </Link>
              <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2" />
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors rounded-xl font-bold"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  تسجيل الخروج
                </button>
              </form>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
