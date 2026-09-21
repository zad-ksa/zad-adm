import { PageHeader } from "@/components/console/layout";
import AttendanceTabs from "../AttendanceTabs";

/**
 * The frame every settings sub-screen sits in: the same heading, the same tab
 * strip, and a way back to the hub.
 *
 * The way back matters more than it looks — a sub-route reached by clicking a
 * card is a dead end without it, and the tab strip alone returns you to the hub
 * only by way of «الإعدادات», which reads like leaving rather than going up.
 * It used to be a separate «كل الإعدادات» link; it is now the breadcrumb, the
 * same way back every other sub-page in the dashboard uses.
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
      <div className="mb-4">
        <PageHeader
          crumbs={[
            { label: "التحضير", href: "/main/attendance" },
            { label: "الإعدادات", href: "/main/attendance/settings" },
            { label: title },
          ]}
          title={title}
          description={description}
        />
      </div>

      <AttendanceTabs canManage canViewReports={canViewReports} />

      {children}
    </main>
  );
}
