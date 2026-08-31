import type { Metadata } from "next";
import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";
import { notFound, redirect } from "next/navigation";
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
  // Attendance is on hold for charities — see CHARITY_ATTENDANCE_ENABLED.
  // Hiding the tab is not enough: this URL is bookmarkable and typeable.
  if (!CHARITY_ATTENDANCE_ENABLED) {
    const { name } = await params;
    redirect(`/portal/${encodeURIComponent(decodeURIComponent(name))}/hr`);
  }
  const { name } = await params;
  const { charity, can } = await resolveCharityPortal(name);

  // Server-side gate. The sidebar and HrNav also hide this tab, but that is
  // decoration — this line is the protection.
  if (!can("manage_attendance")) notFound();

  // Leave rows for the current calendar year: the balance is annual, and a
  // manager editing leave needs to see what is already booked.
  const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1));

  const [sites, scheduleRow, policy, holidays, leaves, staff] = await Promise.all([
    prisma.charityWorkSite.findMany({
      where: { charityId: charity.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.charityWorkSchedule.findUnique({ where: { charityId: charity.id } }),
    prisma.charity.findUnique({
      where: { id: charity.id },
      select: { allowedIpRanges: true, ipEnforcement: true },
    }),
    prisma.charityHoliday.findMany({
      where: { charityId: charity.id },
      orderBy: { startDate: "desc" },
    }),
    prisma.employeeLeave.findMany({
      where: { charityId: charity.id, startDate: { lt: yearEnd }, endDate: { gte: yearStart } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.charityUserCharity.findMany({
      where: { charityId: charity.id, isActive: true },
      select: { annualLeaveDays: true, user: { select: { id: true, name: true } } },
      orderBy: { assignedAt: "asc" },
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
        holidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          startDate: h.startDate.toISOString(),
          endDate: h.endDate.toISOString(),
        }))}
        leaves={leaves.map((l) => ({
          id: l.id,
          userId: l.user.id,
          userName: l.user.name,
          type: l.type as string,
          startDate: l.startDate.toISOString(),
          endDate: l.endDate.toISOString(),
          note: l.note,
        }))}
        leaveStaff={staff.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          allowance: m.annualLeaveDays,
        }))}
        defaultAllowance={scheduleRow?.annualLeaveDays ?? 21}
        initialAttendanceOpen={scheduleRow?.attendanceOpenedAt != null}
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
