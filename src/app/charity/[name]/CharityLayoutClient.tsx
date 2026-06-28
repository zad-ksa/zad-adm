"use client";

import { usePathname } from "next/navigation";
import CharitySidebar from "./CharitySidebar";
import { useState, useEffect } from "react";
import { Menu, Home, Target, FolderKanban, Coins, Scale } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { hasPermission } from "@/lib/permissions";

export default function CharityLayoutClient({
  children,
  charityName,
  logoUrl,
  role,
  permissions,
}: {
  children: React.ReactNode;
  charityName: string;
  logoUrl: string | null;
  role?: string;
  permissions?: string[];
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [pathname]);

  const isCharityClient = role === "CHARITY_CLIENT";
  const perms = permissions || [];
  const can = (p: string) => hasPermission(role || "", perms, p);

  let mobileNavItems = [
    { label: "الرئيسية", href: `/charity/${encodeURIComponent(charityName)}`, icon: Home, exact: true },
  ];

  if (can("manage_strategy") && !isCharityClient) {
    mobileNavItems.push({ label: "الاستراتيجية", href: `/charity/${encodeURIComponent(charityName)}/strategy`, icon: Target, exact: false });
    mobileNavItems.push({ label: "البرامج", href: `/charity/${encodeURIComponent(charityName)}/programs`, icon: FolderKanban, exact: false });
  }

  if (can("manage_governance") && !isCharityClient) {
    mobileNavItems.push({ label: "الحوكمة", href: `/charity/${encodeURIComponent(charityName)}/governance`, icon: Scale, exact: false });
  }

  if (can("manage_finance") && !isCharityClient) {
    mobileNavItems.push({ label: "المالية", href: `/charity/${encodeURIComponent(charityName)}/finance`, icon: Coins, exact: false });
  }

  return (
    <div className="flex h-[100dvh] bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-950 overflow-hidden" dir="rtl">
      <CharitySidebar 
        charityName={charityName} 
        logoUrl={logoUrl} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        role={role}
        permissions={permissions}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Mobile Header (Sticky & Blur) */}
        <div className="lg:hidden sticky top-0 bg-white dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700/80 h-16 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 -mr-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:bg-slate-800 rounded-lg transition-colors active:scale-95"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg truncate max-w-[200px]" title={charityName}>
              {charityName}
            </span>
          </div>
        </div>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full p-3 sm:p-4 lg:p-5 pb-20 lg:pb-5">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <MobileBottomNav items={mobileNavItems} />
    </div>
  );
}
