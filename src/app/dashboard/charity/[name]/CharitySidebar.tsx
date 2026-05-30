"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function CharitySidebar({ charityName }: { charityName: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  // Auto-collapse on mobile screens
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsOpen(false);
    }
  }, []);

  const navItems = [
    {
      title: "الرئيسية",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}`,
      exact: true,
      icon: "🏠",
    },
    {
      title: "الاستراتيجية",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy`,
      icon: "🎯",
    },
    {
      title: "الحوكمة",
      href: "#",
      icon: "⚖️",
      comingSoon: true,
    },
    {
      title: "البرامج والمشاريع",
      href: "#",
      icon: "📂",
      comingSoon: true,
    },
    {
      title: "الموارد البشرية",
      href: "#",
      icon: "👥",
      comingSoon: true,
    },
    {
      title: "المالية",
      href: "#",
      icon: "💰",
      comingSoon: true,
    },
  ];

  const sidebarContent = (
    <div className="bg-white p-6 flex flex-col h-full border-l border-slate-200">
      {/* Return to Dashboard Button */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-2 transition-colors bg-slate-50 px-3 py-2 rounded-lg hover:bg-primary/5"
        >
          <span>←</span> <span className="hidden sm:inline">العودة للوحة التحكم</span>
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95"
          title="إغلاق القائمة"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* Charity Name Heading */}
      <div className="mb-8 shrink-0">
        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">ملف الجمعية</div>
        <h2 className="text-xl font-bold text-slate-800 leading-tight truncate" title={charityName}>
          {charityName}
        </h2>
      </div>

      {/* Navigation Items */}
      <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, idx) => {
          if (item.comingSoon) {
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 bg-slate-50/50 cursor-not-allowed opacity-70 text-sm font-medium"
              >
                <span className="text-lg shrink-0 opacity-50">{item.icon}</span>
                <span>{item.title}</span>
                <span className="mr-auto text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">
                  قريباً
                </span>
              </div>
            );
          }

          const decodedPathname = decodeURIComponent(pathname);
          const decodedHref = decodeURIComponent(item.href);
          
          const isActive = item.exact
            ? decodedPathname === decodedHref
            : decodedPathname.startsWith(decodedHref);

          return (
            <Link
              key={idx}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-sm ${
                isActive
                  ? "bg-primary/10 text-primary border-r-4 border-primary"
                  : "text-slate-600 border-r-4 border-transparent hover:bg-slate-50 hover:text-primary"
              }`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Floating Open Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-24 right-0 z-40 bg-white border border-r-0 border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-l-xl transition-all hover:bg-slate-50 active:scale-95 flex items-center gap-2 cursor-pointer select-none shadow-sm"
          title="عرض قائمة الجمعية"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      )}

      {/* Desktop Collapsible Aside */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden md:block sticky top-20 h-[calc(100vh-5rem)] bg-white ${
          isOpen ? "w-72 opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-72 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile/Tablet Sliding Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        {/* Backdrop overlay */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer Content */}
        <div
          className={`absolute top-0 right-0 h-full w-72 max-w-[80vw] transform transition-transform duration-300 ease-in-out bg-white ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
