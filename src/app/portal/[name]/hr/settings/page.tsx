import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Settings } from "lucide-react";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/auditLog";
import { normalizeIp } from "@/lib/geo";
import { DEFAULT_SCHEDULE } from "@/lib/attendanceTime";
import { resolveCharityPortal } from "@/lib/portalAccess";
import HrNav from "../HrNav";
import AttendanceSettingsClient from "./AttendanceSettingsClient";
import { HrPageHeader } from "../ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `إعدادات الحضور | ${decodeURIComponent(name)}` };
}

export default async function AttendanceSettingsPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const { charity, can } = await resolveCharityPortal(name);

  // Server-side gate. The sidebar and HrNav also hide this tab, but that is
  // decoration — this line is the protection.
  if (!can("manage_attendance")) notFound();

  const [sites, scheduleRow, policy] = await Promise.all([
    prisma.charityWorkSite.findMany({
      where: { charityId: charity.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.charityWorkSchedule.findUnique({ where: { charityId: charity.id } }),
    prisma.charity.findUnique({
      where: { id: charity.id },
      select: { allowedIpRanges: true, ipEnforcement: true },
    }),
  ]);

  return (
    <>
      <HrPageHeader
        icon={Settings}
        eyebrow="الموارد البشرية"
        title="إعدادات الحضور"
        context={charity.name}
      />

      <HrNav
        charityName={charity.name}
        canManageUsers={can("manage_charity_users")}
        canManageAttendance
        canViewReports={can("view_attendance_reports")}
      />

      <AttendanceSettingsClient
        charityId={charity.id}
        initialSites={sites.map((s) => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          radiusMeters: s.radiusMeters,
          isActive: s.isActive,
        }))}
        initialSchedule={
          scheduleRow
            ? {
                startTime: scheduleRow.startTime,
                endTime: scheduleRow.endTime,
                lateAfterMinutes: scheduleRow.lateAfterMinutes,
                earlyLeaveBeforeMinutes: scheduleRow.earlyLeaveBeforeMinutes,
                workDays: scheduleRow.workDays,
              }
            : DEFAULT_SCHEDULE
        }
        initialIpRanges={policy?.allowedIpRanges ?? []}
        initialIpMode={(policy?.ipEnforcement ?? "OFF") as string}
        // Shown so the admin can add the office network without having to look
        // its public address up elsewhere — provided they are sitting on it.
        currentIp={normalizeIp(await getClientIp())}
      />
    </>
  );
}
