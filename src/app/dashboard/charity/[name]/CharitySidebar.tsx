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

  // Listen to toggle-sidebar custom event from Header
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
    return () => {
      window.removeEventListener("toggle-sidebar", handleToggle);
    };
  }, []);

  // Sync sidebar state back to Header
  useEffect(() => {
    const event = new CustomEvent("sidebar-state-change", {
      detail: { isOpen }
    });
    window.dispatchEvent(event);
  }, [isOpen]);

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
    <div className="bg-white p-6 flex flex-col h-full border-l border-slate-200/80">
      {/* Return to Dashboard Button */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <Link
          href="/dashboard"
          className="text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-2 transition-all bg-slate-50 hover:bg-primary/5 border border-slate-100 hover:border-primary/10 px-3.5 py-2.5 rounded-xl active:scale-95"
        >
          <span>←</span> <span className="hidden sm:inline">العودة للوحة التحكم</span>
        </Link>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 md:hidden"
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 bg-slate-50/50 cursor-not-allowed opacity-70 text-sm font-medium"
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm group border-r-4 ${
                isActive
                  ? "bg-primary/10 text-primary border-primary shadow-sm shadow-primary/5"
                  : "text-slate-600 border-transparent hover:bg-primary/5 hover:text-primary hover:-translate-x-1 hover:pr-4"
              }`}
            >
              <span className="text-lg shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Aside */}
      <aside
        className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden hidden md:block sticky top-20 h-[calc(100vh-5rem)] bg-white ${
          isOpen ? "w-72 opacity-100 border-l border-slate-200/80" : "w-0 opacity-0 pointer-events-none"
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
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsOpen(false)}
        />
        
        {/* Drawer Content */}
        <div
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
