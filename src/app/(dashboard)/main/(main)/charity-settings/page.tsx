// Refresh TS Server
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "إعدادات تبويبات الجمعيات | زاد التنموية",
};

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function CharitySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    redirect("/main");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/main/admin" className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary rounded-xl transition-colors mt-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إعدادات تبويبات الجمعيات</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            قم بتخصيص ترتيب وحالة التبويبات التي تظهر في صفحات الجمعيات بناءً على نوع الحساب.
          </p>
        </div>
      </div>
      <SettingsClient />
    </div>
  );
}
