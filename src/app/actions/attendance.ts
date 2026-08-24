"use server";

import { prisma } from "@/lib/db";
import { AttendanceStatus, IpEnforcementMode, Prisma } from "@prisma/client";
import { AuthError, requireCharityMembership, requireCharityPermission } from "@/lib/guards";
import { getClientIp, logAudit } from "@/lib/auditLog";
import { headers } from "next/headers";
import {
  SUSPICIOUSLY_PERFECT_ACCURACY_M,
  findNearestSite,
  isImpossibleTravel,
  isIpAllowed,
  isValidCoordinate,
  isValidIpRangeEntry,
  normalizeIp,
} from "@/lib/geo";
import {
  DEFAULT_SCHEDULE,
  ScheduleShape,
  classifyCheckIn,
  isEarlyLeave,
  isValidTimeString,
  toCivilDate,
} from "@/lib/attendanceTime";

/**
 * Attendance check-in / check-out and its configuration.
 *
 * THE INVARIANT OF THIS FILE: the client sends raw sensor output and nothing
 * else — latitude, longitude, accuracy. Every decision (which site, how far,
 * inside or outside, which civil day, present or late, suspicious or not) is
 * computed here from the server's own clock, the server's view of the request
 * IP, and the charity's stored configuration.
 *
 * If a derived value ever starts arriving from the browser, spoofing the whole
 * system collapses to editing one number in the request body.
 */

function fail(error: string) {
  return { success: false as const, error };
}

function refuse(error: unknown, fallback: string) {
  if (error instanceof AuthError) return fail("غير مصرح لك بإجراء هذه العملية");
  console.error(fallback, error);
  return fail(fallback);
}

async function loadSchedule(charityId: string): Promise<ScheduleShape> {
  const row = await prisma.charityWorkSchedule.findUnique({ where: { charityId } });
  if (!row) return DEFAULT_SCHEDULE;
  return {
    startTime: row.startTime,
    endTime: row.endTime,
    lateAfterMinutes: row.lateAfterMinutes,
    earlyLeaveBeforeMinutes: row.earlyLeaveBeforeMinutes,
    workDays: row.workDays,
  };
}

/**
 * Resolves the network-origin layer for this request.
 *
 * WHAT THIS ANSWERS, practically: the check runs against the PUBLIC IP the
 * request arrives from, so it passes only when the employee's device is on the
 * charity's own internet connection (its Wi-Fi, typically). On mobile data the
 * IP belongs to the carrier and will not match — which is exactly why the
 * charity picks the consequence:
 *
 *   OFF   — no IP requirement at all; location alone decides.
 *   WARN  — attendance is accepted off-network but flagged for review, so an
 *           honest employee outside coverage is never blocked.
 *   BLOCK — attendance off-network is refused outright.
 */
function evaluateIpLayer(
  ip: string | null,
  ranges: string[],
  mode: IpEnforcementMode
): { blocked: boolean; suspicious: boolean; reason?: string } {
  if (mode === "OFF" || ranges.length === 0) return { blocked: false, suspicious: false };
  if (isIpAllowed(ip, ranges)) return { blocked: false, suspicious: false };

  if (mode === "BLOCK") {
    return { blocked: true, suspicious: true, reason: "التحضير من خارج شبكة الجمعية" };
  }
  return { blocked: false, suspicious: true, reason: "التحضير من خارج شبكة الجمعية" };
}

type GeoInput = { latitude: unknown; longitude: unknown; accuracy?: unknown };

type ParsedFix =
  | { error: string }
  | { error?: undefined; lat: number; lng: number; accuracy: number | null };

/** Narrows untrusted client input to a usable fix, or an Arabic error. */
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

// ---------------------------------------------------------------------------
// Employee-facing: check in, check out
// ---------------------------------------------------------------------------

export async function checkIn(charityId: string, fix: GeoInput) {
  try {
    const { session } = await requireCharityMembership(charityId);

    const parsed = readFix(fix);
    if (parsed.error !== undefined) return fail(parsed.error);
    const { lat, lng, accuracy } = parsed;

    const now = new Date();
    const workDate = toCivilDate(now);

    const [existing, sites, charity, schedule] = await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: {
          charityUserId_charityId_workDate: { charityUserId: session.id, charityId, workDate },
        },
        select: { id: true, checkInAt: true },
      }),
      prisma.charityWorkSite.findMany({ where: { charityId, isActive: true } }),
      prisma.charity.findUnique({
        where: { id: charityId },
        select: { ipEnforcement: true, allowedIpRanges: true },
      }),
      loadSchedule(charityId),
    ]);

    if (existing?.checkInAt) return fail("تم تسجيل حضورك اليوم مسبقاً");
    if (sites.length === 0) return fail("لم يتم تحديد موقع عمل للجمعية بعد");

    const nearest = findNearestSite(sites, lat, lng, accuracy);
    if (!nearest) return fail("لم يتم تحديد موقع عمل للجمعية بعد");

    // A coarse reading is not a failed attendance — it is an unusable one. Ask
    // for a retry instead of recording a rejection against an employee who is
    // very likely standing right there, indoors.
    if (nearest.check.accuracyTooLow && !nearest.check.withinRange) {
      return fail(
        `تعذّر تحديد موقعك بدقة كافية (± ${Math.round(accuracy ?? 0)} متر). تأكد من تفعيل GPS وحاول مرة أخرى`
      );
    }

    if (!nearest.check.withinRange) {
      return fail(
        `أنت خارج نطاق موقع العمل بحوالي ${Math.round(nearest.check.distance - nearest.site.radiusMeters)} متر`
      );
    }

    const ip = normalizeIp(await getClientIp());
    const ipLayer = evaluateIpLayer(
      ip,
      charity?.allowedIpRanges ?? [],
      charity?.ipEnforcement ?? "OFF"
    );
    if (ipLayer.blocked) {
      await logAudit({
        actorType: "CHARITY_USER",
        actorId: session.id,
        actorName: session.name,
        action: "ATTENDANCE_BLOCKED_IP",
        metadata: { charityId },
      });
      return fail("يجب أن يتم التحضير من داخل شبكة الجمعية");
    }

    const userAgent = (await headers()).get("user-agent");
    const flags = await detectSuspicious({
      charityUserId: session.id,
      lat,
      lng,
      accuracy,
      at: now,
      workDate,
    });

    const reasons = [ipLayer.reason, ...flags.reasons].filter(Boolean) as string[];
    const status = classifyCheckIn(now, schedule);

    try {
      await prisma.attendanceRecord.create({
        data: {
          charityUserId: session.id,
          charityId,
          workSiteId: nearest.site.id,
          workDate,
          checkInAt: now,
          checkInLat: lat,
          checkInLng: lng,
          checkInAccuracy: accuracy,
          checkInDistance: nearest.check.distance,
          status: status as AttendanceStatus,
          ipAddress: ip,
          userAgent,
          isSuspicious: reasons.length > 0,
          suspiciousReason: reasons.length > 0 ? reasons.join(" / ") : null,
        },
      });
    } catch (e) {
      // The @@unique([charityUserId, charityId, workDate]) constraint is the real defence
      // against a double check-in; the read above only produces a nicer message
      // in the common case and cannot survive two concurrent requests.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return fail("تم تسجيل حضورك اليوم مسبقاً");
      }
      throw e;
    }

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "ATTENDANCE_CHECK_IN",
      targetType: "AttendanceRecord",
      metadata: { charityId, status, suspicious: reasons.length > 0 },
    });

    return {
      success: true as const,
      data: { status, siteName: nearest.site.name, distance: Math.round(nearest.check.distance) },
    };
  } catch (error) {
    return refuse(error, "تعذّر تسجيل الحضور");
  }
}

export async function checkOut(charityId: string, fix: GeoInput) {
  try {
    const { session } = await requireCharityMembership(charityId);

    const parsed = readFix(fix);
    if (parsed.error !== undefined) return fail(parsed.error);
    const { lat, lng, accuracy } = parsed;

    const now = new Date();
    const workDate = toCivilDate(now);

    const [record, sites, charity, schedule] = await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: {
          charityUserId_charityId_workDate: { charityUserId: session.id, charityId, workDate },
        },
      }),
      prisma.charityWorkSite.findMany({ where: { charityId, isActive: true } }),
      prisma.charity.findUnique({
        where: { id: charityId },
        select: { ipEnforcement: true, allowedIpRanges: true },
      }),
      loadSchedule(charityId),
    ]);

    if (!record?.checkInAt) return fail("لم تسجّل حضورك اليوم");
    if (record.checkOutAt) return fail("تم تسجيل انصرافك اليوم مسبقاً");

    const nearest = findNearestSite(sites, lat, lng, accuracy);
    if (!nearest) return fail("لم يتم تحديد موقع عمل للجمعية بعد");

    if (!nearest.check.withinRange) {
      return fail(
        `أنت خارج نطاق موقع العمل بحوالي ${Math.round(nearest.check.distance - nearest.site.radiusMeters)} متر`
      );
    }

    const ip = normalizeIp(await getClientIp());
    const ipLayer = evaluateIpLayer(
      ip,
      charity?.allowedIpRanges ?? [],
      charity?.ipEnforcement ?? "OFF"
    );
    if (ipLayer.blocked) {
      return fail("يجب أن يتم تسجيل الانصراف من داخل شبكة الجمعية");
    }

    // A late arrival stays LATE even when the departure is on time — that fact
    // is what the monthly report exists to show. EARLY_LEAVE only overwrites
    // the neutral PRESENT.
    const early = isEarlyLeave(now, schedule);
    const nextStatus =
      early && record.status === "PRESENT" ? "EARLY_LEAVE" : (record.status as string);

    const travelSuspicious =
      record.checkInLat !== null &&
      record.checkInLng !== null &&
      record.checkInAt !== null &&
      isImpossibleTravel(record.checkInLat, record.checkInLng, record.checkInAt, lat, lng, now);

    const reasons = [
      record.suspiciousReason,
      ipLayer.reason,
      travelSuspicious ? "تنقّل غير منطقي بين الحضور والانصراف" : null,
    ].filter(Boolean) as string[];

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: now,
        checkOutLat: lat,
        checkOutLng: lng,
        checkOutAccuracy: accuracy,
        checkOutDistance: nearest.check.distance,
        status: nextStatus as AttendanceStatus,
        isSuspicious: record.isSuspicious || reasons.length > 0,
        suspiciousReason: reasons.length > 0 ? Array.from(new Set(reasons)).join(" / ") : null,
      },
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "ATTENDANCE_CHECK_OUT",
      targetType: "AttendanceRecord",
      targetId: record.id,
      metadata: { charityId, status: nextStatus },
    });

    return { success: true as const, data: { status: nextStatus } };
  } catch (error) {
    return refuse(error, "تعذّر تسجيل الانصراف");
  }
}

/**
 * Pattern detection (§5.4). These are review flags for a human, never automatic
 * rejections — every one of them has an innocent explanation often enough that
 * refusing on them would punish honest staff.
 */
async function detectSuspicious(input: {
  charityUserId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  at: Date;
  workDate: Date;
}): Promise<{ reasons: string[] }> {
  const reasons: string[] = [];

  // Deliberately NOT scoped to one charity, and `lte` rather than `lt`: the
  // strongest signal available is a check-in at another charity earlier the
  // same day from an impossible distance away. Scoping this per charity would
  // blind it to exactly the case multi-charity membership creates.
  const previous = await prisma.attendanceRecord.findMany({
    where: { charityUserId: input.charityUserId, workDate: { lte: input.workDate } },
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
      checkInAccuracy: true,
    },
  });

  // 1. Impossible travel from the most recent recorded fix.
  const last = previous[0];
  const lastFix =
    last?.checkOutAt && last.checkOutLat !== null && last.checkOutLng !== null
      ? { lat: last.checkOutLat, lng: last.checkOutLng, at: last.checkOutAt }
      : last?.checkInAt && last.checkInLat !== null && last.checkInLng !== null
        ? { lat: last.checkInLat, lng: last.checkInLng, at: last.checkInAt }
        : null;

  if (lastFix && isImpossibleTravel(lastFix.lat, lastFix.lng, lastFix.at, input.lat, input.lng, input.at)) {
    reasons.push("تنقّل غير منطقي عن آخر تحضير");
  }

  const earlierDays = previous.filter((p) => p.workDate < input.workDate);

  // 2. Byte-identical coordinates across days. A real fix always jitters by a
  //    few metres; an exact repeat is the signature of a typed-in location.
  const identicalDays = earlierDays.filter(
    (p) => p.checkInLat === input.lat && p.checkInLng === input.lng
  ).length;
  if (identicalDays >= 2) {
    reasons.push("إحداثيات متطابقة تماماً عبر عدة أيام");
  }

  // 3. Implausibly perfect accuracy, repeated. DevTools reports a fixed, tiny
  //    accuracy for a manually-set location.
  if (
    input.accuracy !== null &&
    input.accuracy <= SUSPICIOUSLY_PERFECT_ACCURACY_M &&
    earlierDays.filter(
      (p) => p.checkInAccuracy !== null && p.checkInAccuracy === input.accuracy
    ).length >= 2
  ) {
    reasons.push("دقة قراءة ثابتة بشكل غير طبيعي");
  }

  return { reasons };
}

// ---------------------------------------------------------------------------
// Admin: correcting a record by hand
// ---------------------------------------------------------------------------

/** "YYYY-MM-DD" (a Riyadh civil day) → its UTC-midnight anchor. */
function parseCivilDay(value: string): Date | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value.trim());
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rejects the 31st of a 30-day month, which the regex alone accepts.
  return date.getUTCDate() === Number(m[3]) ? date : null;
}

/** "HH:MM" Riyadh local on a given civil day → the instant it denotes. */
function instantOn(workDate: Date, time: string): Date | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  // workDate is UTC midnight of the Riyadh day, so Riyadh 00:00 is three hours
  // earlier in UTC.
  return new Date(workDate.getTime() + minutes * 60_000 - 3 * 60 * 60 * 1000);
}

/**
 * Records or amends one person's attendance for one day by hand.
 *
 * This exists because the GPS layer refuses honestly and often: a cold fix
 * indoors, a denied permission, a dead battery at 8am. Without a way in, every
 * one of those turns into an absence the employee cannot dispute and the
 * manager cannot fix — which is how an attendance system stops being trusted.
 *
 * What it deliberately does NOT do is fake evidence. No coordinates, distance
 * or accuracy are written; `manualAt` marks the row so every screen can say it
 * was entered by a person rather than confirmed by a device. A reason is
 * required and travels with the record, not just into the audit log.
 *
 * Clearing both times deletes the row rather than storing an empty one:
 * absence is derived from the absence of a record (see reports/page.tsx), so a
 * blank row would read as "present, times unknown".
 */
export async function correctAttendance(
  charityId: string,
  input: {
    targetUserId: string;
    workDate: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    reason: string;
  }
) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_attendance");

    const reason = (input.reason || "").trim();
    if (reason.length < 3) return fail("سبب التصحيح مطلوب");
    if (reason.length > 300) return fail("سبب التصحيح طويل جداً");

    const workDate = parseCivilDay(input.workDate || "");
    if (!workDate) return fail("التاريخ غير صالح");
    if (workDate > toCivilDate(new Date())) {
      return fail("لا يمكن تسجيل حضور في يوم لم يأتِ بعد");
    }

    // Membership in THIS charity, checked from the link: a manager must not be
    // able to write a record for someone who belongs to a different charity by
    // passing their id.
    const link = await prisma.charityUserCharity.findUnique({
      where: {
        charityUserId_charityId: { charityUserId: input.targetUserId, charityId },
      },
      select: { isActive: true, user: { select: { name: true } } },
    });
    if (!link) return fail("الموظف غير موجود في هذه الجمعية");

    const checkInAt = input.checkInAt ? instantOn(workDate, input.checkInAt) : null;
    const checkOutAt = input.checkOutAt ? instantOn(workDate, input.checkOutAt) : null;
    if (input.checkInAt && !checkInAt) return fail("وقت الحضور غير صالح");
    if (input.checkOutAt && !checkOutAt) return fail("وقت الانصراف غير صالح");
    if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
      return fail("وقت الانصراف يجب أن يكون بعد وقت الحضور");
    }
    if (checkOutAt && !checkInAt) {
      return fail("لا يمكن تسجيل انصراف بلا حضور");
    }

    const now = new Date();

    if (!checkInAt) {
      const removed = await prisma.attendanceRecord.deleteMany({
        where: { charityUserId: input.targetUserId, charityId, workDate },
      });
      if (removed.count === 0) return fail("لا يوجد سجل لحذفه في هذا اليوم");

      await logAudit({
        actorType: "CHARITY_USER",
        actorId: session.id,
        actorName: session.name,
        action: "ATTENDANCE_CLEARED",
        targetType: "CharityUser",
        targetId: input.targetUserId,
        metadata: { charityId, workDate: input.workDate, reason },
      });
      return { success: true as const, cleared: true };
    }

    const schedule = await loadSchedule(charityId);
    const status: AttendanceStatus =
      checkOutAt && isEarlyLeave(checkOutAt, schedule)
        ? "EARLY_LEAVE"
        : (classifyCheckIn(checkInAt, schedule) as AttendanceStatus);

    await prisma.attendanceRecord.upsert({
      where: {
        charityUserId_charityId_workDate: {
          charityUserId: input.targetUserId,
          charityId,
          workDate,
        },
      },
      create: {
        charityUserId: input.targetUserId,
        charityId,
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
        // location columns and the suspicion flags raised against them are
        // cleared rather than left to describe a check-in that was overwritten.
        checkInLat: null,
        checkInLng: null,
        checkInAccuracy: null,
        checkInDistance: null,
        checkOutLat: null,
        checkOutLng: null,
        checkOutAccuracy: null,
        checkOutDistance: null,
        workSiteId: null,
        isSuspicious: false,
        suspiciousReason: null,
      },
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "ATTENDANCE_CORRECTED",
      targetType: "CharityUser",
      targetId: input.targetUserId,
      metadata: {
        charityId,
        workDate: input.workDate,
        checkInAt: input.checkInAt,
        checkOutAt: input.checkOutAt,
        status,
        reason,
      },
    });

    return { success: true as const, cleared: false };
  } catch (error) {
    return refuse(error, "تعذّر حفظ التصحيح");
  }
}

// ---------------------------------------------------------------------------
// Admin: work sites, schedule, IP allow list
// ---------------------------------------------------------------------------

export async function saveWorkSite(
  charityId: string,
  data: {
    id?: string;
    name: string;
    latitude: unknown;
    longitude: unknown;
    radiusMeters: unknown;
    isActive?: boolean;
  }
) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_attendance");

    const name = (data.name || "").trim();
    if (!name) return fail("اسم الموقع مطلوب");
    if (!isValidCoordinate(data.latitude, data.longitude)) return fail("الإحداثيات غير صحيحة");

    const radius = Number(data.radiusMeters);
    if (!Number.isFinite(radius) || radius < 20 || radius > 5000) {
      return fail("نطاق السماح يجب أن يكون بين 20 و 5000 متر");
    }

    const payload = {
      name,
      latitude: data.latitude as number,
      longitude: data.longitude as number,
      radiusMeters: Math.round(radius),
      isActive: data.isActive ?? true,
    };

    if (data.id) {
      // Scoped by charityId as well as id, so a crafted request cannot edit
      // another charity's site by guessing its uuid.
      const updated = await prisma.charityWorkSite.updateMany({
        where: { id: data.id, charityId },
        data: payload,
      });
      if (updated.count === 0) return fail("الموقع غير موجود");
    } else {
      await prisma.charityWorkSite.create({ data: { charityId, ...payload } });
    }

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: data.id ? "WORK_SITE_UPDATED" : "WORK_SITE_CREATED",
      targetType: "CharityWorkSite",
      targetId: data.id,
      metadata: { charityId, name, radiusMeters: payload.radiusMeters },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ الموقع");
  }
}

export async function deleteWorkSite(charityId: string, siteId: string) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_attendance");

    // Deactivated rather than deleted: attendance rows point at this site, and
    // the history should keep saying where people actually were.
    const updated = await prisma.charityWorkSite.updateMany({
      where: { id: siteId, charityId },
      data: { isActive: false },
    });
    if (updated.count === 0) return fail("الموقع غير موجود");

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "WORK_SITE_DEACTIVATED",
      targetType: "CharityWorkSite",
      targetId: siteId,
      metadata: { charityId },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر تعطيل الموقع");
  }
}

export async function saveWorkSchedule(
  charityId: string,
  data: {
    startTime: string;
    endTime: string;
    lateAfterMinutes: unknown;
    earlyLeaveBeforeMinutes: unknown;
    workDays: unknown;
  }
) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_attendance");

    if (!isValidTimeString(data.startTime) || !isValidTimeString(data.endTime)) {
      return fail("صيغة الوقت غير صحيحة");
    }

    const late = Number(data.lateAfterMinutes);
    const early = Number(data.earlyLeaveBeforeMinutes);
    if (!Number.isFinite(late) || late < 0 || late > 240) return fail("مهلة التأخير غير صالحة");
    if (!Number.isFinite(early) || early < 0 || early > 240) {
      return fail("مهلة الانصراف المبكر غير صالحة");
    }

    const days = Array.isArray(data.workDays) ? data.workDays : [];
    const workDays = Array.from(
      new Set(days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))
    ).sort();
    if (workDays.length === 0) return fail("يجب اختيار يوم عمل واحد على الأقل");

    const payload = {
      startTime: data.startTime.trim(),
      endTime: data.endTime.trim(),
      lateAfterMinutes: Math.round(late),
      earlyLeaveBeforeMinutes: Math.round(early),
      workDays,
    };

    await prisma.charityWorkSchedule.upsert({
      where: { charityId },
      create: { charityId, ...payload },
      update: payload,
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "WORK_SCHEDULE_UPDATED",
      metadata: { charityId, ...payload },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ أوقات الدوام");
  }
}

export async function saveIpPolicy(
  charityId: string,
  data: { ranges: unknown; mode: string }
) {
  try {
    const { session } = await requireCharityPermission(charityId, "manage_attendance");

    if (!Object.values(IpEnforcementMode).includes(data.mode as IpEnforcementMode)) {
      return fail("وضع التحقق غير صالح");
    }

    const raw = Array.isArray(data.ranges) ? data.ranges : [];
    const ranges = Array.from(
      new Set(raw.filter((r): r is string => typeof r === "string").map((r) => r.trim()).filter(Boolean))
    );

    const invalid = ranges.filter((r) => !isValidIpRangeEntry(r));
    if (invalid.length > 0) return fail(`عنوان غير صالح: ${invalid[0]}`);

    // Refusing to arm BLOCK with an empty list: it would silently behave like
    // OFF, and an admin who thinks attendance is locked to their network would
    // be wrong about it.
    if (data.mode === "BLOCK" && ranges.length === 0) {
      return fail("لا يمكن تفعيل المنع بدون تحديد عناوين الشبكة");
    }

    await prisma.charity.update({
      where: { id: charityId },
      data: { allowedIpRanges: ranges, ipEnforcement: data.mode as IpEnforcementMode },
    });

    await logAudit({
      actorType: "CHARITY_USER",
      actorId: session.id,
      actorName: session.name,
      action: "ATTENDANCE_IP_POLICY_UPDATED",
      metadata: { charityId, mode: data.mode, count: ranges.length },
    });

    return { success: true as const };
  } catch (error) {
    return refuse(error, "تعذّر حفظ إعدادات الشبكة");
  }
}
