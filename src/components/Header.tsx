"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface HeaderProps {
  disableLink?: boolean;
  title?: string;
  showSidebarToggle?: boolean;
  navItems?: NavItem[];
}

export default function Header({ 
  disableLink = false, 
  title = "استبيان الجاهزية",
  showSidebarToggle = false,
  navItems
}: HeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!showSidebarToggle) return;

    // Listen for sidebar state updates (e.g., if closed from backdrop or close button)
    const handleStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isOpen: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.isOpen === "boolean") {
        setIsSidebarOpen(customEvent.detail.isOpen);
      }
    };

    window.addEventListener("sidebar-state-change", handleStateChange);
    return () => {
      window.removeEventListener("sidebar-state-change", handleStateChange);
    };
  }, [showSidebarToggle]);

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);
    
    // Dispatch event to toggle the sidebar component
    const event = new CustomEvent("toggle-sidebar", {
      detail: { isOpen: nextState }
    });
    window.dispatchEvent(event);
  };

  const logoContent = (
    <div className={`flex items-center gap-3 ${disableLink ? "" : "group"}`}>
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 transition-transform duration-300 ${disableLink ? "" : "group-hover:scale-105"}`}>
        <Image
          src="/assets/logos/لوجو زاد-09.png"
          alt="زاد التنموية"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="hidden sm:block">
        <h1 className="font-bold text-xl text-primary leading-tight">زاد التنموية</h1>
        <p className="text-sm text-slate-500 font-medium">لأثر مستدام</p>
      </div>
    </div>
  );

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showSidebarToggle && (
            <button
              onClick={toggleSidebar}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 border cursor-pointer select-none active:scale-95 ${
                isSidebarOpen 
                  ? "bg-primary/10 border-primary/20 text-primary" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
              title={isSidebarOpen ? "إغلاق القائمة" : "عرض القائمة"}
              aria-expanded={isSidebarOpen}
            >
              {/* Animated Hamburger Icon */}
              <div className="relative w-4.5 h-3 flex flex-col justify-between items-center pointer-events-none">
                <span 
                  className={`w-4.5 h-[1.5px] bg-current rounded-full transition-all duration-300 ease-in-out origin-center ${
                    isSidebarOpen ? "rotate-45 translate-y-[5.25px]" : ""
                  }`} 
                />
                <span 
                  className={`w-4.5 h-[1.5px] bg-current rounded-full transition-all duration-300 ease-in-out ${
                    isSidebarOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                  }`} 
                />
                <span 
                  className={`w-4.5 h-[1.5px] bg-current rounded-full transition-all duration-300 ease-in-out origin-center ${
                    isSidebarOpen ? "-rotate-45 -translate-y-[5.25px]" : ""
                  }`} 
                />
              </div>
            </button>
          )}

          {disableLink ? (
            logoContent
          ) : (
            <Link href="/" className="block">
              {logoContent}
            </Link>
          )}
        </div>

        {/* Navigation Items */}
        {navItems && navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-2 mx-4">
            {navItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  item.active 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        
        <div className="flex items-center">
          <span className="bg-primary/5 text-primary px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-primary/10">
            {title}
          </span>
        </div>
      </div>

      {/* Mobile Navigation Items (only visible on mobile) */}
      {navItems && navItems.length > 0 && (
        <div className="md:hidden border-t border-slate-100 bg-white">
          <nav className="flex items-center gap-2 p-3 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item, idx) => (
              <Link 
                key={idx} 
                href={item.href}
                className={`flex-1 text-center py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap active:scale-[0.98] ${
                  item.active 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 bg-slate-50/50"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

