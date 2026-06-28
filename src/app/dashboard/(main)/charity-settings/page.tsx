// Refresh TS Server
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "إعدادات تبويبات الجمعيات | زاد التنموية",
};

export default async function CharitySettingsPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const isAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);
  const hasPerm = session.permissions?.includes("manage_charity_settings") || session.permissions?.includes("developer_mode");

  if (!isAdmin && !hasPerm) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">إعدادات تبويبات الجمعيات</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          قم بتخصيص ترتيب وحالة التبويبات التي تظهر في صفحات الجمعيات بناءً على نوع الحساب.
        </p>
      </div>
      <SettingsClient />
    </div>
  );
}
