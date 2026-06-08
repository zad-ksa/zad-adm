"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

export interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export default function MobileBottomNav({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-slate-200 z-[40] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item, idx) => {
          const decodedPathname = decodeURIComponent(pathname);
          const decodedHref = decodeURIComponent(item.href);
          
          const isActive = item.exact 
            ? decodedPathname === decodedHref 
            : decodedPathname.startsWith(decodedHref) && (item.href !== '/dashboard' || decodedPathname === '/dashboard');
            
          return (
            <Link 
              key={idx} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative group select-none active:scale-95 transition-all duration-200 ${isActive ? "text-primary" : "text-slate-400 hover:text-slate-600"}`}
            >
              {isActive && (
                <div className="absolute top-0 inset-x-4 h-0.5 bg-primary rounded-b-full"></div>
              )}
              <div className={`p-1.5 rounded-xl transition-colors duration-300 ${isActive ? "bg-primary/10 text-primary" : "group-hover:bg-slate-50"}`}>
                <item.icon className={`w-5 h-5`} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? "text-primary" : "text-slate-500"}`}>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  );
}
