import type { Metadata } from "next";
import { CHARITY_ATTENDANCE_ENABLED } from "@/lib/featureFlags";
import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { DEFAULT_SCHEDULE, currentRiyadhMonth, isWorkDay, toCivilDate } from "@/lib/attendanceTime";
import { resolveCharityPortal } from "@/lib/portalAccess";
import HrNav from "../HrNav";
import AttendanceClient from "./AttendanceClient";
import { HrPageHeader } from "../ui";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  return { title: `تسجيل الحضور | ${decodeURIComponent(name)}` };
}

export default async function AttendancePage({ params }: { params: Promise<{ name: string }> }) {
  // Attendance is on hold for charities — see CHARITY_ATTENDANCE_ENABLED.
  // Hiding the tab is not enough: this URL is bookmarkable and typeable.
  if (!CHARITY_ATTENDANCE_ENABLED) {
    const { name } = await params;
    redirect(`/portal/${encodeURIComponent(decodeURIComponent(name))}/hr`);
  }
  const { name } = await params;
  const { charity, session, can } = await resolveCharityPortal(name);

  // No permission gate here on purpose: recording your OWN attendance is not a
  // privilege, it is what every active member of the charity is here to do.
  // Seeing anyone else's attendance is what needs view_attendance_reports.

  const now = new Date();
  const workDate = toCivilDate(now);

  const [record, sites, scheduleRow, charityPolicy] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      // Scoped by charity: without it, this page showed the record from
      // whichever charity the person happened to check in at first today.
      where: {
        charityUserId_charityId_workDate: {
          charityUserId: session.id,
          charityId: charity.id,
          workDate,
        },
      },
      include: { workSite: { select: { name: true } } },
    }),
    prisma.charityWorkSite.count({ where: { charityId: charity.id, isActive: true } }),
    prisma.charityWorkSchedule.findUnique({ where: { charityId: charity.id } }),
    prisma.charity.findUnique({
      where: { id: charity.id },
      select: { ipEnforcement: true, allowedIpRanges: true },
    }),
  ]);

  const schedule = scheduleRow
    ? {
        startTime: scheduleRow.startTime,
        endTime: scheduleRow.endTime,
        lateAfterMinutes: scheduleRow.lateAfterMinutes,
        earlyLeaveBeforeMinutes: scheduleRow.earlyLeaveBeforeMinutes,
        workDays: scheduleRow.workDays,
      }
    : DEFAULT_SCHEDULE;

  // Is today a charity holiday, or is this person on leave? Either way the
  // screen should say so instead of inviting a check-in nobody needs.
  const [todayHoliday, todayLeave] = await Promise.all([
    prisma.charityHoliday.findFirst({
      where: { charityId: charity.id, startDate: { lte: workDate }, endDate: { gte: workDate } },
      select: { name: true },
    }),
    prisma.employeeLeave.findFirst({
      where: {
        charityId: charity.id,
        charityUserId: session.id,
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
      select: { type: true },
    }),
  ]);

  const month = currentRiyadhMonth(now);
  const monthRecords = await prisma.attendanceRecord.findMany({
    where: {
      charityUserId: session.id,
      charityId: charity.id,
      workDate: {
        gte: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)),
        lt: new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)),
      },
    },
    include: { workSite: { select: { name: true } } },
    orderBy: { workDate: "desc" },
  });

  return (
    <>
      <HrPageHeader
        icon={CalendarCheck}
        eyebrow="الموارد البشرية"
        title="تسجيل الحضور"
        context={charity.name}
      />

      <HrNav
        charityName={charity.name}
        canManageUsers={can("manage_charity_users")}
        canManageAttendance={can("manage_attendance")}
        canViewReports={can("view_attendance_reports")}
      />

      <AttendanceClient
        charityId={charity.id}
        isAttendanceOpen={scheduleRow?.attendanceOpenedAt != null}
        todayHolidayName={todayHoliday?.name ?? null}
        todayLeaveType={todayLeave?.type ?? null}
        hasWorkSite={sites > 0}
        isWorkDay={isWorkDay(now, schedule)}
        schedule={schedule}
        requiresCharityNetwork={
          charityPolicy?.ipEnforcement === "BLOCK" && charityPolicy.allowedIpRanges.length > 0
        }
        initialRecord={
          record
            ? {
                status: record.status as string,
                checkInAt: record.checkInAt?.toISOString() ?? null,
                checkOutAt: record.checkOutAt?.toISOString() ?? null,
                siteName: record.workSite?.name ?? null,
              }
            : null
        }
        monthRecords={monthRecords.map((r) => ({
          workDate: r.workDate.toISOString(),
          status: r.status as string,
          checkInAt: r.checkInAt?.toISOString() ?? null,
          checkOutAt: r.checkOutAt?.toISOString() ?? null,
          siteName: r.workSite?.name ?? null,
          autoClosedAt: r.autoClosedAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
