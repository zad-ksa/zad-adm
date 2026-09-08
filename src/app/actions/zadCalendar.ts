"use server";

import { prisma } from "@/lib/db";
import { HolidayScope, LeaveType } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/auditLog";
import { revalidatePath } from "next/cache";
import { toCivilDate } from "@/lib/attendanceTime";

/**
 * The calendar and the leave ledger.
 *
 * Two things live here that are easy to confuse and must not be:
 *
 *   Holiday        — everybody is off. Never costs anyone a day of leave.
 *                    GLOBAL is the shared calendar the charities will read too;
 *                    COMPANY is a Zad-only closure kept out of it.
 *
 *   ZadEmployeeLeave — one person is off. Only type ANNUAL is deducted from
 *                    their balance; sick, unpaid and other are recorded and
 *                    cost nothing.
 *
 * Both make a day non-working. Only the second can empty a balance.
 */

function fail(error: string) {
  return { success: false as const, error };
}

function refuse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("غير مصرح")) return fail(message);
  console.error(fallback, error);
  return fail(fallback);
}

async function requireCalendarAdmin() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") throw new Error("غير مصرح");
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    throw new Error("غير مصرح لك بإدارة التحضير");
  }
  return session;
}

/** Both ends inclusive, anchored to Riyadh civil days. */
function readRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const s = toCivilDate(start);
  const e = toCivilDate(end);
  if (e < s) return null;
  return { startDate: s, endDate: e };
}

// ── التقويم ────────────────────────────────────────────────────────────────

export async function saveHoliday(input: {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  scope: HolidayScope;
}) {
  try {
    const session = await requireCalendarAdmin();

    const name = input.name?.trim();
    if (!name) return fail("اسم الإجازة مطلوب");

    const range = readRange(input.startDate, input.endDate);
    if (!range) return fail("التواريخ غير صحيحة");

    if (input.id) {
      const updated = await prisma.holiday.updateMany({
        where: { id: input.id },
        data: { name, scope: input.scope, ...range },
      });
      if (updated.count === 0) return fail("الإجازة غير موجودة");
    } else {
      await prisma.holiday.create({
        data: {
          name,
          scope: input.scope,
          ...range,
          createdById: session.id,
          createdByName: session.name,
        },
      });
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: input.id ? "HOLIDAY_UPDATED" : "HOLIDAY_CREATED",
      targetType: "Holiday",
      metadata: { name, scope: input.scope },
    });

    revalidatePath("/main/attendance");
    // The charity portal reads the same calendar.
    revalidatePath("/portal", "layout");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ الإجازة");
  }
}

export async function deleteHoliday(holidayId: string) {
  try {
    const session = await requireCalendarAdmin();

    const removed = await prisma.holiday.deleteMany({ where: { id: holidayId } });
    if (removed.count === 0) return fail("الإجازة غير موجودة");

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "HOLIDAY_DELETED",
      targetType: "Holiday",
      targetId: holidayId,
    });

    revalidatePath("/main/attendance");
    revalidatePath("/portal", "layout");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حذف الإجازة");
  }
}

// ── إجازات الموظفين ────────────────────────────────────────────────────────

export async function saveZadLeave(input: {
  id?: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  note?: string;
}) {
  try {
    const session = await requireCalendarAdmin();

    const range = readRange(input.startDate, input.endDate);
    if (!range) return fail("التواريخ غير صحيحة");

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, name: true },
    });
    if (!employee) return fail("الموظف غير موجود");

    // Two overlapping leaves for one person would be counted twice against the
    // balance and read as a contradiction on the calendar.
    const clash = await prisma.zadEmployeeLeave.findFirst({
      where: {
        employeeId: input.employeeId,
        id: input.id ? { not: input.id } : undefined,
        startDate: { lte: range.endDate },
        endDate: { gte: range.startDate },
      },
      select: { id: true },
    });
    if (clash) return fail("توجد إجازة مسجّلة تتقاطع مع هذه المدة");

    const data = {
      employeeId: input.employeeId,
      type: input.type,
      ...range,
      note: input.note?.trim() || null,
    };

    if (input.id) {
      await prisma.zadEmployeeLeave.update({ where: { id: input.id }, data });
    } else {
      await prisma.zadEmployeeLeave.create({
        data: { ...data, createdById: session.id, createdByName: session.name },
      });
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: input.id ? "ZAD_LEAVE_UPDATED" : "ZAD_LEAVE_CREATED",
      metadata: { employee: employee.name, type: input.type },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ الإجازة");
  }
}

export async function deleteZadLeave(leaveId: string) {
  try {
    const session = await requireCalendarAdmin();

    const removed = await prisma.zadEmployeeLeave.deleteMany({ where: { id: leaveId } });
    if (removed.count === 0) return fail("الإجازة غير موجودة");

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_LEAVE_DELETED",
      targetId: leaveId,
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حذف الإجازة");
  }
}

/**
 * The annual entitlement, editable from the leave panel as well as from the
 * employee form — both write this one field, so the two screens cannot disagree.
 */
export async function saveLeaveAllowance(employeeId: string, days: number) {
  try {
    const session = await requireCalendarAdmin();

    if (!Number.isInteger(days) || days < 0 || days > 365) {
      return fail("عدد الأيام يجب أن يكون بين 0 و365");
    }

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { annualLeaveDays: days },
      select: { name: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_LEAVE_ALLOWANCE_UPDATED",
      metadata: { employee: employee.name, days },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ الرصيد");
  }
}

/** Whether this person may record attendance away from every work site. */
export async function setRemoteWorkAllowed(employeeId: string, allowed: boolean) {
  try {
    const session = await requireCalendarAdmin();

    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { remoteWorkAllowed: allowed },
      select: { name: true },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: allowed ? "ZAD_REMOTE_WORK_GRANTED" : "ZAD_REMOTE_WORK_REVOKED",
      metadata: { employee: employee.name },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تغيير إعداد العمل عن بُعد");
  }
}
