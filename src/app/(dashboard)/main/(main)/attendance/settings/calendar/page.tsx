export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { civilDaysOfMonth, currentRiyadhMonth, toCivilDate } from "@/lib/attendanceTime";
import SettingsShell from "../SettingsShell";
import CalendarClient from "./CalendarClient";

export const metadata: Metadata = { title: "التقويم | زاد التنموية" };

const DAY_MS = 86_400_000;

/**
 * One month's grid: the Sunday on or before the 1st, and whole weeks from
 * there. getUTCDay() on a UTC-midnight anchor is already the Riyadh weekday.
 */
function monthGrid(month: string) {
  const range = civilDaysOfMonth(month)!;
  const leading = range.start.getUTCDay();
  const daysInMonth = Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const gridStart = new Date(range.start.getTime() - leading * DAY_MS);
  return {
    month,
    cells,
    gridStartIso: gridStart.toISOString(),
    monthStartIso: range.start.toISOString(),
    monthEndIso: range.end.toISOString(),
    gridEnd: new Date(gridStart.getTime() + cells * DAY_MS),
    gridStart,
  };
}

/**
 * The holiday calendar, drawn as a calendar.
 *
 * The grids are laid out here rather than in the browser because every anchor
 * in this system is UTC midnight of a Riyadh day, and the server is the only
 * clock allowed to say which day is today. The client receives the cells and
 * today, and does nothing but arithmetic on them.
 */
export default async function HolidayCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/");
  if (session.userType === "CHARITY_USER") redirect("/charity-login");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    redirect("/main/attendance");
  }

  const { month: monthParam, view: viewParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentRiyadhMonth();
  if (!civilDaysOfMonth(month)) redirect("/main/attendance/settings/calendar");

  const view = viewParam === "year" ? "year" : "month";
  const year = month.slice(0, 4);

  const months =
    view === "year"
      ? Array.from({ length: 12 }, (_, i) => monthGrid(`${year}-${String(i + 1).padStart(2, "0")}`))
      : [monthGrid(month)];

  // Everything touching any cell on screen, including the days that spill in
  // from neighbouring months — a span across a boundary should not appear to
  // stop at it.
  const from = months[0].gridStart;
  const to = months[months.length - 1].gridEnd;

  const [holidays, defaultGroup] = await Promise.all([
    prisma.holiday.findMany({
      where: { startDate: { lt: to }, endDate: { gte: from } },
      orderBy: [{ startDate: "asc" }, { name: "asc" }],
    }),
    prisma.zadShiftGroup.findFirst({
      where: { isDefault: true },
      select: { name: true, workDays: true },
    }),
  ]);

  return (
    <SettingsShell
      title="التقويم"
      description="العطل بنوعيها لا تُحسب غياباً ولا تُخصم من رصيد أحد. الفرق أن الرسمية ستظهر للجمعيات أيضاً عند إطلاق تحضيرهم، والخاصة بزاد لا تظهر لهم."
      canViewReports={hasPermission(
        session.role,
        session.permissions || [],
        "view_zad_attendance_reports"
      )}
    >
      <CalendarClient
        view={view}
        month={month}
        year={year}
        months={months.map(({ month, cells, gridStartIso, monthStartIso, monthEndIso }) => ({
          month,
          cells,
          gridStartIso,
          monthStartIso,
          monthEndIso,
        }))}
        todayIso={toCivilDate(new Date()).toISOString()}
        workDays={defaultGroup?.workDays ?? [0, 1, 2, 3, 4]}
        defaultGroupName={defaultGroup?.name ?? null}
        holidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          startDate: h.startDate.toISOString(),
          endDate: h.endDate.toISOString(),
          scope: h.scope,
        }))}
      />
    </SettingsShell>
  );
}
