"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StrategyTabs({ charityName }: { charityName: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      title: "📊 نتائج الاستبيانات",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy`,
      exact: true,
    },
    {
      title: "📈 مقياس الأداء",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy/performance`,
      exact: false,
    },
  ];

  return (
    <div className="flex gap-2 mb-6 border-b border-slate-200">
      {tabs.map((tab, idx) => {
        const decodedPathname = decodeURIComponent(pathname);
        const decodedHref = decodeURIComponent(tab.href);
        
        const isActive = tab.exact
          ? decodedPathname === decodedHref
          : decodedPathname.startsWith(decodedHref);

        return (
          <Link
            key={idx}
            href={tab.href}
            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-colors relative ${
              isActive
                ? "bg-white text-primary border-t border-x border-slate-200 -mb-[1px]"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            {tab.title}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
