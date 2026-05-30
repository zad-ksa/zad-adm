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
    <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col h-full">
      {/* Return to Dashboard Button */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-400 hover:text-primary flex items-center gap-1.5 transition-colors"
        >
          <span>←</span> العودة للوحة التحكم
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer select-none active:scale-95 lg:flex"
          title="إغلاق القائمة"
        >
          ✕
        </button>
      </div>

      {/* Charity Name Heading */}
      <h2 className="text-lg font-bold text-slate-800 mb-6 truncate shrink-0" title={charityName}>
        {charityName}
      </h2>

      {/* Navigation Items */}
      <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, idx) => {
          if (item.comingSoon) {
            return (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 bg-slate-50 border border-slate-100 cursor-not-allowed opacity-70 text-sm"
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                <span className="font-bold">{item.title}</span>
                <span className="mr-auto text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${
                isActive
                  ? "bg-primary text-white border border-primary"
                  : "text-slate-600 border border-transparent hover:bg-primary/5 hover:text-primary"
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
          className="fixed top-24 right-4 z-40 bg-white border border-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95 flex items-center gap-2 cursor-pointer select-none border-b-2"
          title="عرض قائمة الجمعية"
        >
          <span>☰</span>
          <span className="text-xs hidden sm:inline">خيارات الجمعية</span>
        </button>
      )}

      {/* Desktop Collapsible Aside */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden md:block sticky top-8 h-[calc(100vh-6rem)] ${
          isOpen ? "w-64 lg:ml-6 opacity-100" : "w-0 lg:ml-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-64 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile/Tablet Sliding Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isOpen ? "visible" : "invisible pointer-events-none"}`}>
        {/* Backdrop overlay */}
        <div
          className={`absolute inset-0 bg-slate-950/20 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer Content */}
        <div
          className={`absolute top-0 right-0 h-full w-64 max-w-[80vw] transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
