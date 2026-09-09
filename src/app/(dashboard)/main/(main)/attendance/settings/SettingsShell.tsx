import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AttendanceTabs from "../AttendanceTabs";

/**
 * The frame every settings sub-screen sits in: the same heading, the same tab
 * strip, and a way back to the hub.
 *
 * The way back matters more than it looks — a sub-route reached by clicking a
 * card is a dead end without it, and the tab strip alone returns you to the hub
 * only by way of «الإعدادات», which reads like leaving rather than going up.
 */
export default function SettingsShell({
  title,
  description,
  canViewReports,
  children,
}: {
  title: string;
  description?: string;
  canViewReports: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 min-w-0 py-4" dir="rtl">
      <header className="mb-4">
        <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">التحضير</h1>
      </header>

      <AttendanceTabs canManage canViewReports={canViewReports} />

      <Link
        href="/main/attendance/settings"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors mb-3"
      >
        <ArrowRight className="w-3.5 h-3.5" />
        كل الإعدادات
      </Link>

      <div className="mb-4">
        <h2 className="text-[17px] font-black text-slate-900 dark:text-slate-100">{title}</h2>
        {description && (
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {children}
    </main>
  );
}
