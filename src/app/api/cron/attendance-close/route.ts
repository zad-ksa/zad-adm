import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_SCHEDULE, toCivilDate } from "@/lib/attendanceTime";

/**
 * Closes attendance days that ended with a check-in and no check-out.
 *
 * Someone who forgets to check out otherwise leaves a row that is neither a
 * complete day nor an absence — invisible in every count, and quietly wrong in
 * any report built on it. This sweep gives that day an end and, just as
 * importantly, marks it so a manager can see it happened.
 *
 * WHAT IT WRITES, AND WHY THAT IS NOT FABRICATION: `checkOutAt` gets the
 * charity's scheduled end time for that day, because leaving it null would keep
 * the day open forever, which is the problem. `autoClosedAt` is set alongside
 * it, and every screen renders that as "أُغلق تلقائياً" — so the time is
 * presented as the assumption it is, never as an observed departure. The status
 * is left alone: not checking out is not an early leave, and downgrading the
 * day would punish an employee for a clerical slip.
 *
 * Only days STRICTLY BEFORE the current Riyadh civil day are touched. Someone
 * still at their desk at 11pm has not forgotten anything yet.
 *
 * TWO SWEEPS, ONE JOB. Zad employees have their own attendance tables, and
 * their forgotten days need closing for exactly the same reason. They are
 * swept here rather than from a second cron because Vercel's free plan allows
 * two scheduled jobs and both are already spent — and because the rule is
 * identical, so splitting it would be two copies to keep in step.
 *
 * Schedule: nightly, after Riyadh midnight — `30 21 * * *` UTC (00:30 Riyadh).
 */
/**
 * The instant a forgotten day is closed at: its own scheduled end time.
 *
 * Returns null for a malformed stored schedule, which leaves the day open for
 * a human rather than inventing a departure from a value we cannot read.
 */
function closingInstant(workDate: Date, endTime: string): Date | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(endTime);
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  // workDate is UTC midnight of the Riyadh day, so Riyadh 00:00 sits three
  // hours earlier in UTC.
  return new Date(workDate.getTime() + minutes * 60_000 - 3 * 60 * 60 * 1000);
}

/**
 * Zad's half of the sweep. Same rule, different tables: the end time comes
 * from the employee's shift group, falling back to the default group.
 */
async function closeZadDays(today: Date, now: Date) {
  const open = await prisma.zadAttendanceRecord.findMany({
    where: {
      workDate: { lt: today },
      checkInAt: { not: null },
      checkOutAt: null,
      autoClosedAt: null,
    },
    select: {
      id: true,
      workDate: true,
      employee: { select: { shiftGroup: { select: { endTime: true } } } },
    },
  });

  if (open.length === 0) return { scanned: 0, closed: 0 };

  const fallback = await prisma.zadShiftGroup.findFirst({
    where: { isDefault: true },
    select: { endTime: true },
  });
  const defaultEnd = fallback?.endTime ?? DEFAULT_SCHEDULE.endTime;

  let closed = 0;
  for (const record of open) {
    const endTime = record.employee.shiftGroup?.endTime ?? defaultEnd;
    const checkOutAt = closingInstant(record.workDate, endTime);
    if (!checkOutAt) continue;

    await prisma.zadAttendanceRecord.update({
      where: { id: record.id },
      data: { checkOutAt, autoClosedAt: now },
    });
    closed += 1;
  }

  return { scanned: open.length, closed };
}

export async function GET(request: Request) {
  try {
    // Fail closed, like the cleanup cron: a missing secret must block the route
    // rather than leave it open to anyone who finds the path.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("Attendance close cron blocked: CRON_SECRET is not configured.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = toCivilDate(new Date());
    const now = new Date();

    const open = await prisma.attendanceRecord.findMany({
      where: {
        workDate: { lt: today },
        checkInAt: { not: null },
        checkOutAt: null,
        autoClosedAt: null,
      },
      select: { id: true, charityId: true, workDate: true },
    });

    // Zad is swept whether or not any charity day is open — the two are
    // independent, and an early return used to skip everything after it.
    const zad = await closeZadDays(today, now);

    if (open.length === 0) {
      return NextResponse.json({ ok: true, closed: 0, zad });
    }

    // One schedule lookup per charity rather than per record — a month-long
    // backlog for one charity is otherwise hundreds of identical queries.
    const charityIds = Array.from(new Set(open.map((r) => r.charityId)));
    const schedules = await prisma.charityWorkSchedule.findMany({
      where: { charityId: { in: charityIds } },
      select: { charityId: true, endTime: true },
    });
    const endTimeByCharity = new Map(schedules.map((s) => [s.charityId, s.endTime]));

    let closed = 0;
    for (const record of open) {
      const endTime = endTimeByCharity.get(record.charityId) ?? DEFAULT_SCHEDULE.endTime;
      const checkOutAt = closingInstant(record.workDate, endTime);
      if (!checkOutAt) continue; // malformed stored schedule — leave it for a human

      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { checkOutAt, autoClosedAt: now },
      });
      closed += 1;
    }

    return NextResponse.json({ ok: true, scanned: open.length, closed, zad });
  } catch (error) {
    console.error("Attendance close cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
