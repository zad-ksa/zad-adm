"use client";

import Header from "@/components/Header";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: "الرئيسية", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "الجمعيات", href: "/dashboard/charities", active: pathname === "/dashboard/charities" },
    { label: "الاستبيانات", href: "/dashboard/surveys", active: pathname === "/dashboard/surveys" }
  ];

  let title = "بيانات الشركة";
  if (pathname === "/dashboard/charities") {
    title = "الجمعيات";
  } else if (pathname === "/dashboard/surveys") {
    title = "لوحة التحكم";
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <Header title={title} navItems={navItems} />
      
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 relative">
        {children}
      </div>
    </div>
  );
}
