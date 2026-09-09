export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import SettingsShell from "../SettingsShell";
import SitesClient from "./SitesClient";

export const metadata: Metadata = { title: "مواقع العمل | زاد التنموية" };

export default async function WorkSitesPage() {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const sites = await prisma.zadWorkSite.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <SettingsShell
      title="مواقع العمل"
      description="النطاق الجغرافي الذي يُقبل التحضير من داخله. من لا يملك إذن العمل عن بُعد لا يستطيع التسجيل من خارج أي موقع هنا."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <SitesClient
        sites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          radiusMeters: s.radiusMeters,
        }))}
      />
    </SettingsShell>
  );
}
