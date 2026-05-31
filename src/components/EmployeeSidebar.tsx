"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { User, ShieldAlert, Users, X, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { usePathname } from "next/navigation";

export default function EmployeeSidebar({ session }: { session: any }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  // Auto close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen?: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isOpen === "boolean") {
        setIsOpen(customEvent.detail.isOpen);
      } else {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  useEffect(() => {
    const event = new CustomEvent("sidebar-state-change", { detail: { isOpen } });
    window.dispatchEvent(event);
  }, [isOpen]);

  const sidebarContent = (
    <div className="bg-white p-6 flex flex-col h-full border-l border-slate-200/80">
      <div className="flex justify-between items-center mb-8 lg:hidden">
        <h2 className="font-bold text-slate-800">القائمة</h2>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Employee Profile */}
      <div className="flex flex-col items-center text-center mb-8 pb-8 border-b border-slate-100">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mb-4 text-emerald-600 shadow-inner">
          <User className="w-12 h-12" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{session.name}</h2>
        <div className="flex items-center justify-center gap-1.5 mt-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-sm text-slate-600 font-bold">
          <ShieldAlert className="w-4 h-4 text-emerald-500" />
          {session.role === "ADMIN" ? "مدير النظام" : "موظف"}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col gap-2">
        {session.role === "ADMIN" && (
          <Link
            href="/dashboard/employees"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
              pathname === "/dashboard/employees" 
                ? "bg-primary text-white shadow-md shadow-primary/20" 
                : "text-slate-600 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Users className="w-5 h-5" />
            إدارة الموظفين
          </Link>
        )}
      </div>

      {/* Logout */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <form action={logout}>
          <button type="submit" className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors">
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden lg:block sticky top-0 h-screen bg-white ${isOpen ? "w-72 border-l border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)]" : "w-0 opacity-0"}`}>
        <div className="w-72 h-full">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
