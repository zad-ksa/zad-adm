"use server";

import { prisma } from "@/lib/db";
import { AttendanceStatus, IpEnforcementMode, Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getClientIp, logAudit } from "@/lib/auditLog";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  findNearestSite,
  isImpossibleTravel,
  isIpAllowed,
  isValidCoordinate,
  normalizeIp,
} from "@/lib/geo";
import {
  classifyCheckIn,
  instantOn,
  isEarlyLeave,
  parseCivilDay,
  toCivilDate,
} from "@/lib/attendanceTime";
import {
  SETTINGS_ID,
  loadAttendanceGate,
  loadEmployeeSchedule,
  loadSettings,
} from "@/lib/zadAttendance";

/**
 * Attendance for Zad's own employees.
 *
 * THE INVARIANT, inherited deliberately from the charity implementation: the
 * client sends raw sensor output and nothing else — latitude, longitude,
 * accuracy. Which site, how far, inside or outside, which civil day, present or
 * late, suspicious or not: every one of those is computed here, from the
 * server's clock, the server's view of the request IP, and stored settings.
 *
 * The moment a derived value starts arriving from the browser, spoofing the
 * whole system collapses to editing one number in a request body.
 *
 * The arithmetic itself is imported, not rewritten. `geo.ts` and
 * `attendanceTime.ts` were already free of any charity concept, so this file is
 * roughly a third the size of its charity counterpart.
 */

function fail(error: string) {
  return { success: false as const, error };
}

async function requireEmployee() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") {
    throw new Error("غير مصرح");
  }
  return session;
}

/** Configuring the system — not recording your own day, which needs nothing. */
async function requireAttendanceAdmin() {
  const session = await requireEmployee();
  if (!hasPermission(session.role, session.permissions || [], "manage_zad_attendance")) {
    throw new Error("غير مصرح لك بإدارة التحضير");
  }
  return session;
}

function refuse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("غير مصرح")) return fail(message);
  console.error(fallback, error);
  return fail(fallback);
}

function evaluateIpLayer(
  ip: string | null,
  ranges: string[],
  mode: IpEnforcementMode
): { blocked: boolean; reason?: string } {
  if (mode === "OFF" || ranges.length === 0) return { blocked: false };
  if (isIpAllowed(ip, ranges)) return { blocked: false };
  if (mode === "BLOCK") return { blocked: true, reason: "التحضير من خارج شبكة الشركة" };
  return { blocked: false, reason: "التحضير من خارج شبكة الشركة" };
}

type GeoInput = { latitude: unknown; longitude: unknown; accuracy?: unknown };
type ParsedFix =
  | { error: string; lat?: undefined; lng?: undefined; accuracy?: undefined }
  | { error?: undefined; lat: number; lng: number; accuracy: number | null };

function readFix(input: GeoInput): ParsedFix {
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    return { error: "تعذّر قراءة الموقع، يرجى المحاولة مرة أخرى" as const };
  }
  const accuracy =
    typeof input.accuracy === "number" && Number.isFinite(input.accuracy) && input.accuracy >= 0
      ? input.accuracy
      : null;
  return { lat: input.latitude as number, lng: input.longitude as number, accuracy };
}

/**
 * Signals that a fix was not taken where it claims.
 *
 * None of these refuses a check-in. They mark the row so a manager can look,
 * because a false positive that blocks someone from work is far worse than one
 * that raises a flag nobody acts on.
 */
async function detectSuspicious(input: {
  employeeId: string;
  lat: number;
  lng: number;
  at: Date;
  workDate: Date;
}): Promise<string[]> {
  const reasons: string[] = [];

  const previous = await prisma.zadAttendanceRecord.findMany({
    where: { employeeId: input.employeeId, workDate: { lte: input.workDate } },
    orderBy: [{ workDate: "desc" }, { checkInAt: "desc" }],
    take: 5,
    select: {
      workDate: true,
      checkInLat: true,
      checkInLng: true,
      checkInAt: true,
      checkOutLat: true,
      checkOutLng: true,
      checkOutAt: true,
    },
  });

  const last = previous[0];
  const lastFix =
    last?.checkOutAt && last.checkOutLat !== null && last.checkOutLng !== null
      ? { lat: last.checkOutLat, lng: last.checkOutLng, at: last.checkOutAt }
      : last?.checkInAt && last.checkInLat !== null && last.checkInLng !== null
        ? { lat: last.checkInLat, lng: last.checkInLng, at: last.checkInAt }
        : null;

  if (
    lastFix &&
    isImpossibleTravel(lastFix.lat, lastFix.lng, lastFix.at, input.lat, input.lng, input.at)
  ) {
    reasons.push("تنقّل غير منطقي عن آخر تحضير");
  }

  // Byte-identical coordinates across days. A real fix always jitters by a few
  // metres; an exact repeat is the signature of a typed-in location.
  const identicalDays = previous.filter(
    (p) => p.workDate < input.workDate && p.checkInLat === input.lat && p.checkInLng === input.lng
  ).length;
  if (identicalDays >= 2) reasons.push("إحداثيات متطابقة تماماً عبر عدة أيام");

  return reasons;
}

// ---------------------------------------------------------------------------
// الموظف: الحضور والانصراف
// ---------------------------------------------------------------------------

export async function zadCheckIn(fix: GeoInput) {
  try {
    const session = await requireEmployee();

    const parsed = readFix(fix);
    if (parsed.error !== undefined) return fail(parsed.error);
    const { lat, lng, accuracy } = parsed;

    // The gate first: nothing is computed, and no coordinates are even looked
    // at, before the company has switched attendance on.
    if (!(await loadAttendanceGate())) {
      return fail("نظام التحضير غير مفعّل بعد. يرجى مراجعة إدارة الموارد البشرية");
    }

    const now = new Date();
    const workDate = toCivilDate(now);

    const [existing, sites, settings, schedule, employee] = await Promise.all([
      prisma.zadAttendanceRecord.findUnique({
        where: { employeeId_workDate: { employeeId: session.id, workDate } },
        select: { id: true, checkInAt: true },
      }),
      prisma.zadWorkSite.findMany({ where: { isActive: true } }),
      loadSettings(),
      loadEmployeeSchedule(session.id),
      prisma.employee.findUnique({
        where: { id: session.id },
        select: { remoteWorkAllowed: true },
      }),
    ]);

    if (existing?.checkInAt) return fail("تم تسجيل حضورك اليوم مسبقاً");

    const remoteAllowed = employee?.remoteWorkAllowed === true;
    const nearest = findNearestSite(sites, lat, lng, accuracy);

    // The geofence is mandatory, and remoteWorkAllowed is the deliberate
    // per-person exemption rather than a hole in the rule. A remote worker
    // still records a real fix — it is simply not measured against a site.
    let isRemote = false;
    if (!nearest) {
      if (!remoteAllowed) return fail("لم يتم تحديد موقع عمل بعد");
      isRemote = true;
    } else if (!nearest.check.withinRange) {
      // A coarse reading is not a failed attendance, it is an unusable one.
      // Ask for a retry rather than record a rejection against someone who is
      // very likely standing right there, indoors.
      if (nearest.check.accuracyTooLow && !remoteAllowed) {
        return fail(
          `تعذّر تحديد موقعك بدقة كافية (± ${Math.round(accuracy ?? 0)} متر). تأكد من تفعيل GPS وحاول مرة أخرى`
        );
      }
      if (!remoteAllowed) {
        return fail(
          `أنت خارج نطاق موقع العمل بحوالي ${Math.round(
            nearest.check.distance - nearest.site.radiusMeters
          )} متر`
        );
      }
      isRemote = true;
    }

    const ip = normalizeIp(await getClientIp());
    const ipLayer = evaluateIpLayer(ip, settings.allowedIpRanges, settings.ipEnforcement);
    if (ipLayer.blocked && !isRemote) {
      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session.id,
        actorName: session.name,
        action: "ZAD_ATTENDANCE_BLOCKED_IP",
      });
      return fail("يجب أن يتم التحضير من داخل شبكة الشركة");
    }

    const userAgent = (await headers()).get("user-agent");
    const reasons = [
      ipLayer.reason,
      ...(await detectSuspicious({ employeeId: session.id, lat, lng, at: now, workDate })),
    ].filter(Boolean) as string[];

    const status = classifyCheckIn(now, schedule);

    try {
      await prisma.zadAttendanceRecord.create({
        data: {
          employeeId: session.id,
          workSiteId: isRemote ? null : nearest?.site.id ?? null,
          workDate,
          checkInAt: now,
          checkInLat: lat,
          checkInLng: lng,
          checkInAccuracy: accuracy,
          checkInDistance: isRemote ? null : nearest?.check.distance ?? null,
          status: status as AttendanceStatus,
          isRemote,
          ipAddress: ip,
          userAgent,
          isSuspicious: reasons.length > 0,
          suspiciousReason: reasons.length > 0 ? reasons.join(" / ") : null,
        },
      });
    } catch (e) {
      // @@unique([employeeId, workDate]) is the real defence against a double
      // check-in; the read above only produces a nicer message in the common
      // case and cannot survive two concurrent requests.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("تم تسجيل حضورك اليوم مسبقاً");
      }
      throw e;
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_ATTENDANCE_CHECK_IN",
      metadata: { status, remote: isRemote, suspicious: reasons.length > 0 },
    });

    revalidatePath("/main/attendance");
    return {
      success: true as const,
      data: {
        status,
        isRemote,
        siteName: isRemote ? null : nearest?.site.name ?? null,
        distance: isRemote ? null : Math.round(nearest?.check.distance ?? 0),
      },
    };
  } catch (error) {
    return refuse(error, "تعذّر تسجيل الحضور");
  }
}

export async function zadCheckOut(fix: GeoInput) {
  try {
    const session = await requireEmployee();

    const parsed = readFix(fix);
    if (parsed.error !== undefined) return fail(parsed.error);
    const { lat, lng, accuracy } = parsed;

    const now = new Date();
    const workDate = toCivilDate(now);

    const [record, sites, settings, schedule, employee] = await Promise.all([
      prisma.zadAttendanceRecord.findUnique({
        where: { employeeId_workDate: { employeeId: session.id, workDate } },
      }),
      prisma.zadWorkSite.findMany({ where: { isActive: true } }),
      loadSettings(),
      loadEmployeeSchedule(session.id),
      prisma.employee.findUnique({
        where: { id: session.id },
        select: { remoteWorkAllowed: true },
      }),
    ]);

    if (!record?.checkInAt) return fail("لم تسجّل حضورك اليوم");
    if (record.checkOutAt) return fail("تم تسجيل انصرافك اليوم مسبقاً");

    const remoteAllowed = employee?.remoteWorkAllowed === true;
    const nearest = findNearestSite(sites, lat, lng, accuracy);

    if (!remoteAllowed) {
      if (!nearest) return fail("لم يتم تحديد موقع عمل بعد");
      if (!nearest.check.withinRange) {
        return fail(
          `أنت خارج نطاق موقع العمل بحوالي ${Math.round(
            nearest.check.distance - nearest.site.radiusMeters
          )} متر`
        );
      }
      const ip = normalizeIp(await getClientIp());
      if (evaluateIpLayer(ip, settings.allowedIpRanges, settings.ipEnforcement).blocked) {
        return fail("يجب أن يتم التحضير من داخل شبكة الشركة");
      }
    }

    // Leaving before the scheduled end downgrades the day — but never upgrades
    // it. Someone already marked LATE stays LATE; the morning happened.
    const early = isEarlyLeave(now, schedule);
    const status: AttendanceStatus =
      early && record.status === "PRESENT" ? "EARLY_LEAVE" : record.status;

    await prisma.zadAttendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: now,
        checkOutLat: lat,
        checkOutLng: lng,
        checkOutAccuracy: accuracy,
        checkOutDistance: nearest?.check.distance ?? null,
        status,
      },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_ATTENDANCE_CHECK_OUT",
      metadata: { status },
    });

    revalidatePath("/main/attendance");
    return { success: true as const, data: { status, early } };
  } catch (error) {
    return refuse(error, "تعذّر تسجيل الانصراف");
  }
}

// ---------------------------------------------------------------------------
// الإدارة: المواقع ومجموعات الدوام والإعدادات
// ---------------------------------------------------------------------------

export async function saveZadWorkSite(input: {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive?: boolean;
}) {
  try {
    const session = await requireAttendanceAdmin();

    const name = input.name?.trim();
    if (!name) return fail("اسم الموقع مطلوب");
    if (!isValidCoordinate(input.latitude, input.longitude)) return fail("إحداثيات غير صحيحة");
    if (!Number.isFinite(input.radiusMeters) || input.radiusMeters < 20 || input.radiusMeters > 5000) {
      return fail("نطاق الموقع يجب أن يكون بين 20 و5000 متر");
    }

    const data = {
      name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: Math.round(input.radiusMeters),
      isActive: input.isActive ?? true,
    };

    if (input.id) {
      await prisma.zadWorkSite.update({ where: { id: input.id }, data });
    } else {
      await prisma.zadWorkSite.create({ data });
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: input.id ? "ZAD_WORKSITE_UPDATED" : "ZAD_WORKSITE_CREATED",
      metadata: { name },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ الموقع");
  }
}

export async function deleteZadWorkSite(siteId: string) {
  try {
    const session = await requireAttendanceAdmin();

    // Deactivated, never deleted: attendance rows point at it, and the history
    // of where someone checked in must stay readable.
    await prisma.zadWorkSite.update({ where: { id: siteId }, data: { isActive: false } });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_WORKSITE_DEACTIVATED",
      targetId: siteId,
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تعطيل الموقع");
  }
}

export async function saveShiftGroup(input: {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  lateAfterMinutes: number;
  earlyLeaveBeforeMinutes: number;
  workDays: number[];
}) {
  try {
    const session = await requireAttendanceAdmin();

    const name = input.name?.trim();
    if (!name) return fail("اسم المجموعة مطلوب");

    const { isValidTimeString, parseTimeToMinutes } = await import("@/lib/attendanceTime");
    if (!isValidTimeString(input.startTime) || !isValidTimeString(input.endTime)) {
      return fail("صيغة الوقت غير صحيحة (HH:MM)");
    }
    if ((parseTimeToMinutes(input.endTime) ?? 0) <= (parseTimeToMinutes(input.startTime) ?? 0)) {
      return fail("وقت الانصراف يجب أن يكون بعد وقت الحضور");
    }

    const workDays = [...new Set(input.workDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (workDays.length === 0) return fail("اختر يوم عمل واحداً على الأقل");

    const data = {
      name,
      startTime: input.startTime,
      endTime: input.endTime,
      lateAfterMinutes: Math.max(0, Math.round(input.lateAfterMinutes)),
      earlyLeaveBeforeMinutes: Math.max(0, Math.round(input.earlyLeaveBeforeMinutes)),
      workDays,
    };

    try {
      if (input.id) {
        await prisma.zadShiftGroup.update({ where: { id: input.id }, data });
      } else {
        await prisma.zadShiftGroup.create({ data });
      }
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("يوجد مجموعة بهذا الاسم");
      }
      throw e;
    }

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: input.id ? "ZAD_SHIFT_GROUP_UPDATED" : "ZAD_SHIFT_GROUP_CREATED",
      metadata: { name },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ المجموعة");
  }
}

export async function deleteShiftGroup(groupId: string) {
  try {
    const session = await requireAttendanceAdmin();

    const group = await prisma.zadShiftGroup.findUnique({
      where: { id: groupId },
      select: { isDefault: true, name: true, _count: { select: { members: true } } },
    });
    if (!group) return fail("المجموعة غير موجودة");

    // The default is where everyone unassigned lands. Deleting it would leave
    // that question unanswerable.
    if (group.isDefault) return fail("لا يمكن حذف المجموعة الافتراضية");

    // Members are not deleted with it — onDelete: SetNull returns them to the
    // default group.
    await prisma.zadShiftGroup.delete({ where: { id: groupId } });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_SHIFT_GROUP_DELETED",
      metadata: { name: group.name, movedToDefault: group._count.members },
    });

    revalidatePath("/main/attendance");
    return { success: true as const, movedToDefault: group._count.members };
  } catch (error) {
    return refuse(error, "تعذّر حذف المجموعة");
  }
}

/**
 * Move the default flag to another group.
 *
 * Two statements in one transaction, and the order is forced: a partial unique
 * index (ZadShiftGroup_one_default … WHERE "isDefault") permits exactly one
 * true row, so the old default must be cleared before the new one is set.
 * Setting first would violate the index mid-transaction.
 *
 * This is a bigger change than it looks. Everyone with no explicit group
 * follows whichever group holds this flag, so moving it moves their working
 * hours — which is why the screen names the number of people affected before
 * asking.
 */
/**
 * Records or amends one employee's attendance for one day by hand.
 *
 * This exists because the GPS layer refuses honestly and often: a cold fix
 * indoors, a denied permission, a dead battery at 8am, a phone left at home.
 * Without a way in, every one of those becomes an absence the employee cannot
 * dispute and the administrator cannot fix — which is how an attendance system
 * stops being believed.
 *
 * What it deliberately does NOT do is fake evidence. No coordinates, distance
 * or accuracy are ever written by this path, and `manualAt` marks the row so
 * every screen can say a person entered it rather than a device confirmed it.
 * A reason is required and is stored on the record itself, not only in the
 * audit log — the person reading the row a year from now is the one who needs
 * it.
 *
 * The status is derived from the times using that employee's own schedule,
 * exactly as a real check-in would be. An administrator fixing a forgotten
 * morning does not get to decide that 10:40 was on time.
 *
 * Clearing the check-in deletes the row rather than storing an empty one:
 * absence is derived from the absence of a record, so a blank row would read
 * as "present, times unknown".
 */
export async function correctZadAttendance(input: {
  employeeId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  reason: string;
}) {
  try {
    const session = await requireAttendanceAdmin();

    const reason = (input.reason || "").trim();
    if (reason.length < 3) return fail("سبب التعديل مطلوب");
    if (reason.length > 300) return fail("سبب التعديل طويل جداً");

    const workDate = parseCivilDay(input.workDate || "");
    if (!workDate) return fail("التاريخ غير صالح");
    if (workDate > toCivilDate(new Date())) {
      return fail("لا يمكن تسجيل حضور في يوم لم يأتِ بعد");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, name: true, isActive: true },
    });
    if (!employee) return fail("الموظف غير موجود");

    const checkInAt = input.checkInAt ? instantOn(workDate, input.checkInAt) : null;
    const checkOutAt = input.checkOutAt ? instantOn(workDate, input.checkOutAt) : null;
    if (input.checkInAt && !checkInAt) return fail("وقت الحضور غير صالح");
    if (input.checkOutAt && !checkOutAt) return fail("وقت الانصراف غير صالح");
    if (checkOutAt && !checkInAt) return fail("لا يمكن تسجيل انصراف بلا حضور");
    if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
      return fail("وقت الانصراف يجب أن يكون بعد وقت الحضور");
    }

    const now = new Date();

    if (!checkInAt) {
      const removed = await prisma.zadAttendanceRecord.deleteMany({
        where: { employeeId: employee.id, workDate },
      });
      if (removed.count === 0) return fail("لا يوجد سجل لحذفه في هذا اليوم");

      await logAudit({
        actorType: "EMPLOYEE",
        actorId: session.id,
        actorName: session.name,
        action: "ZAD_ATTENDANCE_CLEARED",
        targetType: "Employee",
        targetId: employee.id,
        metadata: { workDate: input.workDate, reason, employeeName: employee.name },
      });

      revalidatePath("/main/attendance");
      return { success: true as const, cleared: true };
    }

    const schedule = await loadEmployeeSchedule(employee.id);
    const status: AttendanceStatus =
      checkOutAt && isEarlyLeave(checkOutAt, schedule)
        ? "EARLY_LEAVE"
        : (classifyCheckIn(checkInAt, schedule) as AttendanceStatus);

    await prisma.zadAttendanceRecord.upsert({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
      create: {
        employeeId: employee.id,
        workDate,
        checkInAt,
        checkOutAt,
        status,
        manualAt: now,
        manualById: session.id,
        manualReason: reason,
      },
      update: {
        checkInAt,
        checkOutAt,
        status,
        manualAt: now,
        manualById: session.id,
        manualReason: reason,
        // A hand-amended row carries no device evidence any more, so the
        // location columns, the site link, the auto-close mark and the
        // suspicion raised against them are cleared rather than left to
        // describe a check-in that has been overwritten.
        checkInLat: null,
        checkInLng: null,
        checkInAccuracy: null,
        checkInDistance: null,
        checkOutLat: null,
        checkOutLng: null,
        checkOutAccuracy: null,
        checkOutDistance: null,
        workSiteId: null,
        isRemote: false,
        autoClosedAt: null,
        isSuspicious: false,
        suspiciousReason: null,
      },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_ATTENDANCE_CORRECTED",
      targetType: "Employee",
      targetId: employee.id,
      metadata: {
        workDate: input.workDate,
        checkInAt: input.checkInAt,
        checkOutAt: input.checkOutAt,
        status,
        reason,
        employeeName: employee.name,
      },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ التعديل");
  }
}

export async function setDefaultShiftGroup(groupId: string) {
  try {
    const session = await requireAttendanceAdmin();

    const group = await prisma.zadShiftGroup.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, isDefault: true },
    });
    if (!group) return fail("المجموعة غير موجودة");
    if (group.isDefault) return { success: true as const };

    await prisma.$transaction(async (tx) => {
      await tx.zadShiftGroup.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      await tx.zadShiftGroup.update({ where: { id: groupId }, data: { isDefault: true } });
    }, { timeout: 20_000, maxWait: 15_000 });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_SHIFT_GROUP_SET_DEFAULT",
      targetId: groupId,
      metadata: { name: group.name },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تعيين المجموعة الافتراضية");
  }
}

export async function assignEmployeesToGroup(groupId: string | null, employeeIds: string[]) {
  try {
    const session = await requireAttendanceAdmin();

    if (groupId) {
      const exists = await prisma.zadShiftGroup.findUnique({ where: { id: groupId }, select: { id: true } });
      if (!exists) return fail("المجموعة غير موجودة");
    }

    const { count } = await prisma.employee.updateMany({
      where: { id: { in: employeeIds } },
      data: { shiftGroupId: groupId },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_SHIFT_GROUP_ASSIGNED",
      metadata: { groupId, count },
    });

    revalidatePath("/main/attendance");
    return { success: true as const, count };
  } catch (error) {
    return refuse(error, "تعذّر إسناد الموظفين");
  }
}

export async function setZadAttendanceOpen(open: boolean) {
  try {
    const session = await requireAttendanceAdmin();

    if (open) {
      const sites = await prisma.zadWorkSite.count({ where: { isActive: true } });
      const settings = await loadSettings();
      // Opening with no site and no remote workers would refuse every check-in
      // while marking the days absent — worse than staying closed.
      if (sites === 0) {
        const remote = await prisma.employee.count({ where: { isActive: true, remoteWorkAllowed: true } });
        if (remote === 0) return fail("أضف موقع عمل واحداً على الأقل قبل تفعيل التحضير");
      }
      if (settings.attendanceOpenedAt) return { success: true as const };
    }

    await prisma.zadAttendanceSettings.update({
      where: { id: SETTINGS_ID },
      data: { attendanceOpenedAt: open ? new Date() : null },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: open ? "ZAD_ATTENDANCE_OPENED" : "ZAD_ATTENDANCE_CLOSED",
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تغيير حالة التحضير");
  }
}

/**
 * The public address this request arrived from, as the server sees it.
 *
 * Deliberately not an external "what is my IP" service. Enforcement compares
 * against whatever `getClientIp` reads out of the proxy headers on a check-in,
 * and an outside service can legitimately answer with a different address —
 * a second egress IP, a corporate proxy, IPv6 versus IPv4. Reading it here
 * means the number an administrator adds to the allow list is the exact number
 * that will later be matched, rather than one that merely ought to be.
 *
 * It is normalised the same way too, so an IPv4-mapped IPv6 form or a trailing
 * port does not get stored as an entry that can never match.
 */
export async function readNetworkOrigin() {
  try {
    await requireAttendanceAdmin();

    const raw = await getClientIp();
    const ip = normalizeIp(raw);
    if (!ip) {
      return fail("تعذّرت قراءة عنوان الشبكة من هذا الطلب");
    }

    const settings = await loadSettings();
    return {
      success: true as const,
      ip,
      // Whether it would pass today's list — an empty list allows everything,
      // which is the same answer isIpAllowed gives enforcement.
      allowed: isIpAllowed(ip, settings.allowedIpRanges),
      hasRanges: settings.allowedIpRanges.length > 0,
    };
  } catch (error) {
    return refuse(error, "تعذّرت قراءة عنوان الشبكة");
  }
}

export async function saveZadIpPolicy(input: { ranges: string[]; mode: IpEnforcementMode }) {
  try {
    const session = await requireAttendanceAdmin();

    const { isValidIpRangeEntry } = await import("@/lib/geo");
    const ranges = input.ranges.map((r) => r.trim()).filter(Boolean);
    const invalid = ranges.filter((r) => !isValidIpRangeEntry(r));
    if (invalid.length > 0) return fail(`عنوان غير صالح: ${invalid[0]}`);

    await prisma.zadAttendanceSettings.update({
      where: { id: SETTINGS_ID },
      data: { allowedIpRanges: ranges, ipEnforcement: input.mode },
    });

    await logAudit({
      actorType: "EMPLOYEE",
      actorId: session.id,
      actorName: session.name,
      action: "ZAD_IP_POLICY_UPDATED",
      metadata: { mode: input.mode, count: ranges.length },
    });

    revalidatePath("/main/attendance");
    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ سياسة الشبكة");
  }
}
