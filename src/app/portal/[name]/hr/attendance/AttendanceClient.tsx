"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Clock,
  History,
  LogIn,
  LogOut,
  Loader2,
  CalendarOff,
  Lock,
  MapPin,
  MoonStar,
  Wifi,
} from "lucide-react";
import { checkIn, checkOut } from "@/app/actions/attendance";
import {
  ATTENDANCE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  ScheduleShape,
  WEEKDAY_LABELS,
} from "@/lib/attendanceTime";
import { Banner, Chip, HrCard, SectionHead, fs } from "../ui";

type DayRecord = {
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  siteName: string | null;
};

type MonthRecord = DayRecord & {
  workDate: string;
  /** Non-null means the nightly job ended this day because no check-out came. */
  autoClosedAt: string | null;
};

/** Riyadh wall-clock rendering of a stored instant, independent of the device. */
function riyadhTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

function riyadhDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "numeric",
    month: "long",
    timeZone: "UTC", // workDate is already a UTC-midnight civil anchor
  }).format(new Date(iso));
}

const statusTone: Record<string, "primary" | "warn" | "danger" | "neutral"> = {
  PRESENT: "primary",
  LATE: "warn",
  EARLY_LEAVE: "warn",
  ABSENT: "danger",
};

/**
 * Wraps getCurrentPosition in a promise and turns every failure mode into a
 * message that says what to actually do about it. `enableHighAccuracy` asks for
 * the GPS rather than a coarse network fix; the long timeout is deliberate,
 * since a cold GPS start indoors genuinely takes that long.
 */
function readPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("متصفحك لا يدعم تحديد الموقع"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("تم رفض إذن الموقع. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة"));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error("استغرق تحديد الموقع وقتاً طويلاً. تأكد من تفعيل GPS وحاول مرة أخرى"));
        } else {
          reject(new Error("تعذّر تحديد موقعك. تأكد من تفعيل خدمة الموقع وحاول مرة أخرى"));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

export default function AttendanceClient({
  charityId,
  isAttendanceOpen,
  todayHolidayName,
  todayLeaveType,
  hasWorkSite,
  isWorkDay,
  schedule,
  requiresCharityNetwork,
  initialRecord,
  monthRecords,
}: {
  charityId: string;
  /** Closed until a manager switches it on — see setAttendanceOpen. */
  isAttendanceOpen: boolean;
  /** Set when today is a charity-wide day off. */
  todayHolidayName: string | null;
  /** Set when this person is on leave today. */
  todayLeaveType: string | null;
  hasWorkSite: boolean;
  isWorkDay: boolean;
  schedule: ScheduleShape;
  requiresCharityNetwork: boolean;
  initialRecord: DayRecord | null;
  monthRecords: MonthRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hasCheckedIn = !!initialRecord?.checkInAt;
  const hasCheckedOut = !!initialRecord?.checkOutAt;
  const isDone = hasCheckedIn && hasCheckedOut;

  async function submit(kind: "in" | "out") {
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      // Only the raw reading crosses the wire. Distance, the civil day and the
      // present/late verdict are all computed server-side — a client-sent
      // verdict would make the whole system a formality.
      const position = await readPosition();
      const action = kind === "in" ? checkIn : checkOut;
      const res = await action(charityId, position);

      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotice(kind === "in" ? "تم تسجيل حضورك بنجاح" : "تم تسجيل انصرافك بنجاح");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحديد موقعك");
    } finally {
      setBusy(null);
    }
  }

  const workDayNames = schedule.workDays.map((d) => WEEKDAY_LABELS[d]).join("، ");

  return (
    <div className="space-y-6">
      {/* The gate outranks every other notice: when attendance is closed there
          is nothing to fix about work sites or anything else. */}
      {!isAttendanceOpen ? (
        <Banner tone="warn" icon={Lock}>
          التحضير غير مفعّل في هذه الجمعية بعد. سيبدأ تسجيل الحضور فور تفعيله من مسؤول
          الموارد البشرية.
        </Banner>
      ) : todayHolidayName ? (
        <Banner tone="ok" icon={CalendarOff}>
          اليوم إجازة: {todayHolidayName}. لا حاجة لتسجيل الحضور، ولا يُحتسب غياباً.
        </Banner>
      ) : todayLeaveType ? (
        <Banner tone="ok" icon={CalendarOff}>
          أنت في إجازة {LEAVE_TYPE_LABELS[todayLeaveType] ?? ""} اليوم. لا يُحتسب غياباً.
        </Banner>
      ) : (
        !hasWorkSite && (
          <Banner tone="warn" icon={AlertTriangle}>
            لم يتم تحديد موقع العمل بعد. يرجى مراجعة مدير النظام في الجمعية.
          </Banner>
        )
      )}
      {error && (
        <Banner tone="danger" icon={AlertTriangle}>
          {error}
        </Banner>
      )}
      {notice && !error && (
        <Banner tone="ok" icon={Check}>
          {notice}
        </Banner>
      )}

      {/* ── Bento: the action owns 7 of 12; today's readout takes the rest ── */}
      <section className="grid grid-cols-12 gap-4 hr-reveal">
        <div className="col-span-12 lg:col-span-7">
          <HrCard className="p-6 h-full flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="hr-eyebrow text-primary/60 dark:text-teal-400/60" style={fs.eyebrow}>
                  {isDone ? "اكتمل اليوم" : hasCheckedIn ? "الخطوة التالية" : "ابدأ يومك"}
                </p>
                <h2
                  className="font-bold text-slate-900 dark:text-slate-50 mt-2"
                  style={fs.h2}
                >
                  {isDone
                    ? "تم تسجيل حضورك وانصرافك"
                    : hasCheckedIn
                      ? "تسجيل الانصراف"
                      : "تسجيل الحضور"}
                </h2>
              </div>
              {!isWorkDay && <Chip>اليوم ليس يوم عمل</Chip>}
            </div>

            {!hasCheckedIn ? (
              <button
                onClick={() => submit("in")}
                disabled={!isAttendanceOpen || !hasWorkSite || busy !== null || isPending}
                style={fs.h3}
                className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl font-bold text-white
                           bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d]
                           shadow-[var(--hr-shadow-cta)] hover:shadow-[var(--hr-shadow-cta-hover)]
                           active:translate-y-px disabled:opacity-50 disabled:pointer-events-none
                           transition-[box-shadow,transform] duration-300"
              >
                {busy === "in" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <LogIn className="w-6 h-6" />
                )}
                {busy === "in" ? "جارٍ تحديد موقعك..." : "تسجيل حضور"}
              </button>
            ) : !hasCheckedOut ? (
              <button
                onClick={() => submit("out")}
                disabled={busy !== null || isPending}
                style={fs.h3}
                className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl font-bold
                           text-slate-700 dark:text-slate-100
                           bg-gradient-to-b from-white to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02]
                           shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.20)]
                           dark:shadow-[inset_0_0_0_1px_rgb(45_212_191_/_.22)]
                           hover:shadow-[inset_0_0_0_1px_rgb(15_118_110_/_.36),0_12px_28px_-16px_rgb(15_118_110_/_.40)]
                           active:translate-y-px disabled:opacity-50 disabled:pointer-events-none
                           transition-[box-shadow,transform] duration-300"
              >
                {busy === "out" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <LogOut className="w-6 h-6" />
                )}
                {busy === "out" ? "جارٍ تحديد موقعك..." : "تسجيل انصراف"}
              </button>
            ) : (
              <div
                className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl font-bold
                           text-emerald-700 dark:text-emerald-300 bg-emerald-500/[0.06]
                           shadow-[var(--hr-shadow-ok)]"
                style={fs.h3}
              >
                <Check className="w-6 h-6" />
                اكتمل تسجيل اليوم
              </div>
            )}

            {/* Explaining the permission request before the browser fires it
                makes the prompt far less likely to be dismissed out of suspicion. */}
            <p
              className="flex items-start gap-2 text-slate-400 dark:text-slate-500 leading-relaxed"
              style={fs.meta}
            >
              <span className="hr-icon-lead">
                <MapPin className="w-4 h-4" />
              </span>
              <span>
                سيطلب المتصفح إذن الوصول إلى موقعك للتحقق من تواجدك في مقر العمل. لا يتم تتبّع
                موقعك خارج لحظة التسجيل.
              </span>
            </p>
          </HrCard>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <HrCard className="p-6 h-full space-y-6">
            <SectionHead icon={Clock} title="اليوم" hint={initialRecord?.siteName ?? undefined} />

            <dl className="space-y-4">
              {[
                { label: "وقت الحضور", value: riyadhTime(initialRecord?.checkInAt ?? null) },
                { label: "وقت الانصراف", value: riyadhTime(initialRecord?.checkOutAt ?? null) },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 pb-4
                             shadow-[inset_0_-1px_0_0_rgb(100_116_139_/_.10)]"
                >
                  <dt className="text-slate-400 dark:text-slate-500" style={fs.meta}>
                    {row.label}
                  </dt>
                  <dd
                    className="font-bold text-slate-800 dark:text-slate-100 tabular-nums"
                    style={fs.h3}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-400 dark:text-slate-500" style={fs.meta}>
                  الحالة
                </dt>
                <dd>
                  {initialRecord ? (
                    <Chip tone={statusTone[initialRecord.status] ?? "neutral"}>
                      {ATTENDANCE_STATUS_LABELS[initialRecord.status] ?? initialRecord.status}
                    </Chip>
                  ) : (
                    <Chip>لم يُسجَّل بعد</Chip>
                  )}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 pt-2">
              <p
                className="flex items-center gap-2 text-slate-400 dark:text-slate-500"
                style={fs.meta}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="tabular-nums" dir="ltr">
                  {schedule.startTime} — {schedule.endTime}
                </span>
              </p>
              <p className="text-slate-400 dark:text-slate-500 pr-6" style={fs.meta}>
                {workDayNames}
              </p>
            </div>

            {requiresCharityNetwork && (
              <Banner tone="warn" icon={Wifi}>
                جمعيتك تشترط التسجيل من داخل شبكة الجمعية. تأكد من الاتصال بشبكة المقر (وليس بيانات
                الجوال).
              </Banner>
            )}
          </HrCard>
        </div>
      </section>

      {/* Days the nightly job had to close. Shown to the employee as well as
          the manager: the person who forgot is the one who can say what time
          they actually left. */}
      {monthRecords.some((r) => r.autoClosedAt) && (
        <Banner tone="warn" icon={MoonStar}>
          {monthRecords.filter((r) => r.autoClosedAt).length} يوم لم تسجّل انصرافك فيه،
          وأُغلق آلياً على وقت نهاية الدوام. راجع مسؤول الموارد البشرية لتصحيحه.
        </Banner>
      )}

      {/* ── Month log ────────────────────────────────────────────────────── */}
      <HrCard className="hr-reveal">
        <div className="p-6 pb-4">
          <SectionHead
            icon={History}
            title="سجل هذا الشهر"
            hint={monthRecords.length > 0 ? `${monthRecords.length} يوم` : undefined}
          />
        </div>

        {monthRecords.length === 0 ? (
          <p className="px-6 pb-8 text-center text-slate-400" style={fs.body}>
            لا يوجد سجل حضور هذا الشهر
          </p>
        ) : (
          <ul>
            {monthRecords.map((r) => (
              <li
                key={r.workDate}
                className="flex flex-wrap items-center gap-4 px-6 py-4
                           shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]
                           transition-colors duration-300
                           hover:bg-primary/[0.02] dark:hover:bg-teal-400/[0.02]"
              >
                <span
                  className="min-w-[96px] font-medium text-slate-700 dark:text-slate-200"
                  style={fs.body}
                >
                  {riyadhDate(r.workDate)}
                </span>
                <span
                  className="text-slate-400 dark:text-slate-500 tabular-nums"
                  style={fs.meta}
                  dir="ltr"
                >
                  {riyadhTime(r.checkInAt)} — {riyadhTime(r.checkOutAt)}
                </span>
                {r.autoClosedAt && (
                  <Chip tone="warn">
                    <MoonStar className="w-3 h-3" />
                    أُغلق تلقائياً
                  </Chip>
                )}
                <span className="mr-auto">
                  <Chip tone={statusTone[r.status] ?? "neutral"}>
                    {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
                  </Chip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </HrCard>
    </div>
  );
}
