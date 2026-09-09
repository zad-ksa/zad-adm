export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { loadSettings } from "@/lib/zadAttendance";
import SettingsShell from "../SettingsShell";
import NetworkClient from "./NetworkClient";

export const metadata: Metadata = { title: "شبكة المكتب | زاد التنموية" };

export default async function NetworkPolicyPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const settings = await loadSettings();

  return (
    <SettingsShell
      title="شبكة المكتب"
      description="طبقة ثانية اختيارية فوق الموقع الجغرافي. اتركها معطّلة ما لم يكن للمكتب عنوان IP ثابت — تفعيلها بعنوان متغيّر يمنع موظفين حاضرين فعلاً."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <NetworkClient ipRanges={settings.allowedIpRanges} ipMode={settings.ipEnforcement} />
    </SettingsShell>
  );
}
