"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CharitySidebar({ charityName }: { charityName: string }) {
  const pathname = usePathname();

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

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-8">
        <Link
          href="/dashboard"
          className="text-sm font-bold text-slate-400 hover:text-primary mb-6 flex items-center gap-2 transition-colors"
        >
          <span>←</span> العودة للوحة التحكم
        </Link>

        <h2 className="text-xl font-bold text-slate-800 mb-6 truncate" title={charityName}>
          {charityName}
        </h2>

        <nav className="space-y-2">
          {navItems.map((item, idx) => {
            if (item.comingSoon) {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 bg-slate-50 border border-slate-100 cursor-not-allowed opacity-70"
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-semibold">{item.title}</span>
                  <span className="mr-auto text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-bold">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-slate-600 hover:bg-primary/5 hover:text-primary"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
