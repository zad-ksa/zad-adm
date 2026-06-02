"use client";

import Link from "next/link";
import { User, ShieldAlert, Users, X, LogOut, LayoutDashboard, Building2, ClipboardList, ChevronRight } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { usePathname } from "next/navigation";
import Image from "next/image";
import ZadLogo from "@/components/ZadLogo";

export default function EmployeeSidebar({ 
  session, 
  isOpen, 
  setIsOpen 
}: { 
  session: any; 
  isOpen: boolean; 
  setIsOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "الرئيسية", href: "/dashboard", icon: LayoutDashboard },
    { label: "الجمعيات", href: "/dashboard/charities", icon: Building2 },
    { label: "الاستبيانات", href: "/dashboard/surveys", icon: ClipboardList },
  ];

  if (session.role === "ADMIN") {
    navItems.push({ label: "إدارة الموظفين", href: "/dashboard/employees", icon: Users });
  }

  const sidebarContent = (
    <div className="bg-white flex flex-col h-full border-l border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative transition-all duration-300">
      
      {/* Desktop Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="hidden lg:flex absolute top-8 -left-3 bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 rounded-full w-6 h-6 items-center justify-center z-50 transition-all shadow-sm"
      >
        <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${!isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Header / Logo */}
      <div className={`flex items-center ${isOpen ? "justify-start px-6" : "justify-center px-0"} h-24 border-b border-slate-100 shrink-0 transition-all`}>
        {isOpen ? (
          <div className="w-full h-full flex items-center py-4 relative pr-2">
            <ZadLogo isOpen={true} className="h-12 w-auto" />
          </div>
        ) : (
          <div className="w-12 h-12 flex items-center justify-center">
            <ZadLogo isOpen={false} className="h-10 w-auto" />
          </div>
        )}
      </div>

      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-6 left-6 z-50">
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-6 flex flex-col">
        {/* User Profile */}
        <div className={`flex flex-col ${isOpen ? "items-start px-6" : "items-center px-2"} mb-8 pb-6 border-b border-slate-100 transition-all overflow-hidden`}>
          <div className={`bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shrink-0 transition-all ${isOpen ? "w-14 h-14" : "w-10 h-10"}`}>
            <User className={isOpen ? "w-7 h-7" : "w-5 h-5"} />
          </div>
          
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap fade-in w-full">
              <h2 className="text-base font-bold text-slate-800 truncate">{session.name}</h2>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-[11px] text-slate-600 font-bold">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                {session.role === "ADMIN" ? "مدير النظام" : "موظف"}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1.5">
          {isOpen && <div className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">القائمة الرئيسية</div>}
          
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && (item.href !== "/dashboard" || pathname === "/dashboard");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isOpen ? item.label : undefined}
                className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} py-3 rounded-xl font-bold transition-all group relative overflow-hidden ${
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-slate-500 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                {isActive && isOpen && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 rounded-l-full"></div>}
                <item.icon className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
                {isOpen && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        <div className="mt-auto px-3 pt-6 border-t border-slate-100">
          <form action={logout}>
            <button 
              type="submit" 
              title={!isOpen ? "تسجيل الخروج" : undefined}
              className={`flex items-center ${isOpen ? "justify-start px-3" : "justify-center"} w-full py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold transition-colors group`}
            >
              <LogOut className={`w-5 h-5 shrink-0 transition-all ${isOpen ? "ml-3" : "ml-0"} text-red-400 group-hover:text-red-600`} />
              {isOpen && <span className="whitespace-nowrap">تسجيل الخروج</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-screen z-20 ${isOpen ? "w-72" : "w-20"}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setIsOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
