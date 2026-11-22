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
import { readPosition } from "@/lib/readPosition";
import { HrCard, SectionHead } from "../ui";
import { Badge, Note, btn } from "@/components/console/ui";

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

const statusTone: Record<string, "brand" | "warn" | "danger" | "neutral"> = {
  PRESENT: "brand",
  LATE: "warn",
  EARLY_LEAVE: "warn",
  ABSENT: "danger",
};

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
        <Note tone="warn" icon={<Lock className="size-3.5" />}>
          التحضير غير مفعّل في هذه الجمعية بعد. سيبدأ تسجيل الحضور فور تفعيله من مسؤول
          الموارد البشرية.
        </Note>
      ) : todayHolidayName ? (
        <Note tone="good" icon={<CalendarOff className="size-3.5" />}>
          اليوم إجازة: {todayHolidayName}. لا حاجة لتسجيل الحضور، ولا يُحتسب غياباً.
        </Note>
      ) : todayLeaveType ? (
        <Note tone="good" icon={<CalendarOff className="size-3.5" />}>
          أنت في إجازة {LEAVE_TYPE_LABELS[todayLeaveType] ?? ""} اليوم. لا يُحتسب غياباً.
        </Note>
      ) : (
        !hasWorkSite && (
          <Note tone="warn" icon={<AlertTriangle className="size-3.5" />}>
            لم يتم تحديد موقع العمل بعد. يرجى مراجعة مدير النظام في الجمعية.
          </Note>
        )
      )}
      {error && (
        <Note tone="danger" icon={<AlertTriangle className="size-3.5" />}>
          {error}
        </Note>
      )}
      {notice && !error && (
        <Note tone="good" icon={<Check className="size-3.5" />}>
          {notice}
        </Note>
      )}

      {/* ── Bento: the action owns 7 of 12; today's readout takes the rest ── */}
      <section className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <HrCard className="p-6 h-full flex flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-primary/60 dark:text-teal-400/60 text-caption">
                  {isDone ? "اكتمل اليوم" : hasCheckedIn ? "الخطوة التالية" : "ابدأ يومك"}
                </p>
                <h2
                  className="text-section font-bold text-slate-900 dark:text-slate-50 mt-2"
                >
                  {isDone
                    ? "تم تسجيل حضورك وانصرافك"
                    : hasCheckedIn
                      ? "تسجيل الانصراف"
                      : "تسجيل الحضور"}
                </h2>
              </div>
              {!isWorkDay && <Badge tone="neutral">اليوم ليس يوم عمل</Badge>}
            </div>

            {!hasCheckedIn ? (
              <button
                onClick={() => submit("in")}
                disabled={!isAttendanceOpen || !hasWorkSite || busy !== null || isPending}
                className={btn.primaryBlock}
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
                className={btn.secondaryBlock}
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
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-4 text-title font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                <Check className="text-title w-6 h-6" />
                اكتمل تسجيل اليوم
              </div>
            )}

            {/* Explaining the permission request before the browser fires it
                makes the prompt far less likely to be dismissed out of suspicion. */}
            <p
              className="text-meta flex items-start gap-2 text-slate-400 dark:text-slate-500 leading-relaxed"
            >
              <span>
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
                  <dt className="text-slate-400 dark:text-slate-500 text-meta">
                    {row.label}
                  </dt>
                  <dd
                    className="text-title font-bold text-slate-800 dark:text-slate-100 tabular-nums"
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-slate-400 dark:text-slate-500 text-meta">
                  الحالة
                </dt>
                <dd>
                  {initialRecord ? (
                    <Badge tone={statusTone[initialRecord.status] ?? "neutral"}>
                      {ATTENDANCE_STATUS_LABELS[initialRecord.status] ?? initialRecord.status}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">لم يُسجَّل بعد</Badge>
                  )}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 pt-2">
              <p
                className="text-meta flex items-center gap-2 text-slate-400 dark:text-slate-500"
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="tabular-nums" dir="ltr">
                  {schedule.startTime} — {schedule.endTime}
                </span>
              </p>
              <p className="text-slate-400 dark:text-slate-500 pr-6 text-meta">
                {workDayNames}
              </p>
            </div>

            {requiresCharityNetwork && (
              <Note tone="warn" icon={<Wifi className="size-3.5" />}>
                جمعيتك تشترط التسجيل من داخل شبكة الجمعية. تأكد من الاتصال بشبكة المقر (وليس بيانات
                الجوال).
              </Note>
            )}
          </HrCard>
        </div>
      </section>

      {/* Days the nightly job had to close. Shown to the employee as well as
          the manager: the person who forgot is the one who can say what time
          they actually left. */}
      {monthRecords.some((r) => r.autoClosedAt) && (
        <Note tone="warn" icon={<MoonStar className="size-3.5" />}>
          {monthRecords.filter((r) => r.autoClosedAt).length} يوم لم تسجّل انصرافك فيه،
          وأُغلق آلياً على وقت نهاية الدوام. راجع مسؤول الموارد البشرية لتصحيحه.
        </Note>
      )}

      {/* ── Month log ────────────────────────────────────────────────────── */}
      <HrCard>
        <div className="p-6 pb-4">
          <SectionHead
            icon={History}
            title="سجل هذا الشهر"
            hint={monthRecords.length > 0 ? `${monthRecords.length} يوم` : undefined}
          />
        </div>

        {monthRecords.length === 0 ? (
          <p className="px-6 pb-8 text-center text-slate-400 text-body">
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
                  className="text-body min-w-[96px] font-medium text-slate-700 dark:text-slate-200"
                >
                  {riyadhDate(r.workDate)}
                </span>
                <span
                  className="text-meta text-slate-400 dark:text-slate-500 tabular-nums"
                  dir="ltr"
                >
                  {riyadhTime(r.checkInAt)} — {riyadhTime(r.checkOutAt)}
                </span>
                {r.autoClosedAt && (
                  <Badge tone="warn">
                    <MoonStar className="w-3 h-3" />
                    أُغلق تلقائياً
                  </Badge>
                )}
                <span className="mr-auto">
                  <Badge tone={statusTone[r.status] ?? "neutral"}>
                    {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </HrCard>
    </div>
  );
}
