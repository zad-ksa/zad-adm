"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SurveyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="9" y1="17" x2="9" y2="10" />
    <line x1="15" y1="17" x2="15" y2="6" />
  </svg>
);

const MetricIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 3v18h18" />
    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
  </svg>
);

export default function StrategyTabs({ charityName }: { charityName: string }) {
  const pathname = usePathname();

  const tabs = [
    {
      title: "نتائج الاستبيانات",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy`,
      exact: true,
      icon: <SurveyIcon />,
    },
    {
      title: "مقياس الأداء",
      href: `/dashboard/charity/${encodeURIComponent(charityName)}/strategy/performance`,
      exact: false,
      icon: <MetricIcon />,
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
            className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all relative flex items-center gap-2 cursor-pointer select-none ${
              isActive
                ? "bg-white text-primary border-t border-x border-slate-200 -mb-[1px] shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
            }`}
          >
            {tab.icon}
            <span>{tab.title}</span>
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-xl" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
