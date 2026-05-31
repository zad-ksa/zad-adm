"use client";

import Header from "@/components/Header";
import { usePathname } from "next/navigation";
import EmployeeSidebar from "@/components/EmployeeSidebar";

export default function DashboardLayoutClient({ children, session }: { children: React.ReactNode, session: any }) {
  const pathname = usePathname();

  const navItems = [
    { label: "الرئيسية", href: "/dashboard", active: pathname === "/dashboard" },
    { label: "الجمعيات", href: "/dashboard/charities", active: pathname === "/dashboard/charities" },
    { label: "الاستبيانات", href: "/dashboard/surveys", active: pathname === "/dashboard/surveys" }
  ];

  let title = "لوحة التحكم";
  if (pathname === "/dashboard/charities") title = "الجمعيات";
  else if (pathname === "/dashboard/surveys") title = "الاستبيانات";
  else if (pathname === "/dashboard/employees") title = "إدارة الموظفين";

  return (
    <div className="flex min-h-screen bg-slate-50" dir="rtl">
      <EmployeeSidebar session={session} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} navItems={navItems} showSidebarToggle={true} />
        
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
