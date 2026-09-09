"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarOff,
  Check,
  Clock,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  MoonStar,
  PenLine,
  Wifi,
} from "lucide-react";
import { zadCheckIn, zadCheckOut } from "@/app/actions/zadAttendance";
import { readPosition } from "@/lib/readPosition";
import {
  ATTENDANCE_STATUS_LABELS,
  LEAVE_TYPE_LABELS,
  WEEKDAY_LABELS,
  type ScheduleShape,
} from "@/lib/attendanceTime";

type MonthRecord = {
  workDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  siteName: string | null;
  isRemote: boolean;
  /** Non-null means the nightly sweep ended this day because no check-out came. */
  autoClosedAt: string | null;
  manualAt: string | null;
  manualReason: string | null;
};

/** Riyadh wall-clock, independent of whatever the device's clock is set to. */
function riyadhTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

function riyadhDate(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

const TONE: Record<string, string> = {
  PRESENT: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  LATE: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  EARLY_LEAVE: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  ABSENT: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
};

export default function MyAttendanceClient({
  isOpen,
  schedule,
  today,
  month,
  leaveBalance,
  remoteAllowed,
  hasSites,
}: {
  /** Whether the company has switched attendance on at all. */
  isOpen: boolean;
  schedule: ScheduleShape & { groupName: string };
  today: MonthRecord | null;
  month: MonthRecord[];
  leaveBalance: { total: number; used: number; remaining: number; entries: { type: string; startDate: string; endDate: string }[] };
  remoteAllowed: boolean;
  hasSites: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = async (kind: "in" | "out") => {
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      // The browser supplies raw sensor output and nothing else. Every judgement
      // — which site, how far, late or not — is made on the server.
      const fix = await readPosition();
      const res = kind === "in" ? await zadCheckIn(fix) : await zadCheckOut(fix);

      if (!res.success) {
        setError(res.error);
        return;
      }
      setNotice(kind === "in" ? "تم تسجيل حضورك" : "تم تسجيل انصرافك");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحديد الموقع");
    } finally {
      setBusy(null);
    }
  };

  const canCheckIn = isOpen && !today?.checkInAt;
  const canCheckOut = isOpen && !!today?.checkInAt && !today?.checkOutAt;

  return (
    <div className="space-y-5" dir="rtl">
      {!isOpen && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 px-4 py-3 text-[13px] leading-relaxed">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            نظام التحضير غير مفعّل بعد. لا يُسجَّل حضور ولا غياب حتى تفعّله إدارة الموارد البشرية.
          </span>
        </div>
      )}

      {isOpen && !hasSites && !remoteAllowed && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3 text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>لم يُحدَّد موقع عمل بعد. راجع إدارة الموارد البشرية.</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-4 py-3 text-[13px] font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {notice && !error && (
        <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-[13px] font-bold">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* اليوم */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">اليوم</p>
            <p className="mt-1 text-[15px] font-black text-slate-900 dark:text-slate-100">
              {today?.checkInAt ? riyadhTime(today.checkInAt) : "لم تسجّل حضورك بعد"}
              {today?.checkOutAt && (
                <span className="text-slate-400 dark:text-slate-500 font-bold">
                  {" ← "}
                  {riyadhTime(today.checkOutAt)}
                </span>
              )}
            </p>
            <p className="mt-1.5 flex items-center gap-2 flex-wrap text-[12px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {schedule.groupName} · {schedule.startTime}–{schedule.endTime}
              </span>
              {today?.siteName && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {today.siteName}
                </span>
              )}
              {today?.isRemote && (
                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                  <Wifi className="w-3.5 h-3.5" />
                  عن بُعد
                </span>
              )}
              {today?.status && (
                <span className={`px-2 py-0.5 rounded-md font-bold ${TONE[today.status] ?? ""}`}>
                  {ATTENDANCE_STATUS_LABELS[today.status] ?? today.status}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => run("in")}
              disabled={!canCheckIn || busy !== null}
              className="h-11 px-5 rounded-xl font-bold text-[13px] text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-2"
            >
              {busy === "in" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              حضور
            </button>
            <button
              type="button"
              onClick={() => run("out")}
              disabled={!canCheckOut || busy !== null}
              className="h-11 px-5 rounded-xl font-bold text-[13px] text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-2"
            >
              {busy === "out" ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              انصراف
            </button>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          أيام العمل: {schedule.workDays.map((d) => WEEKDAY_LABELS[d]).join("، ")}
          {remoteAllowed && " · مسموح لك بالتحضير عن بُعد"}
        </p>
      </div>

      {/* رصيد الإجازات */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-3">رصيد الإجازات السنوية</p>
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label: "الرصيد", value: leaveBalance.total },
            { label: "المستهلك", value: leaveBalance.used },
            { label: "المتبقي", value: leaveBalance.remaining },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.label}</p>
              <p className="text-[18px] font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {s.value}
                <span className="text-[11px] font-bold text-slate-400 mr-1">يوم</span>
              </p>
            </div>
          ))}
        </div>
        {/* الأنواع الأخرى تُسجَّل ولا تُخصم — يُقال صراحةً كي لا يُظنّ الرصيد خاطئاً. */}
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          تُخصم الإجازات السنوية فقط؛ المرضية وغيرها تُسجَّل ولا تُخصم، والعطل الرسمية لا تُحتسب على أحد.
        </p>
      </div>

      {/* سجل الشهر */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <p className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
          سجل هذا الشهر
        </p>

        {month.length === 0 ? (
          <p className="px-5 py-10 text-center text-[12px] text-slate-400 dark:text-slate-500">
            <CalendarOff className="w-5 h-5 mx-auto mb-2 opacity-60" />
            لا توجد أيام مسجّلة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-slate-400 dark:text-slate-500 text-right">
                  <th className="py-2 px-4 font-bold">اليوم</th>
                  <th className="py-2 px-4 font-bold">الحضور</th>
                  <th className="py-2 px-4 font-bold">الانصراف</th>
                  <th className="py-2 px-4 font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {month.map((r) => (
                  <tr key={r.workDate} className="border-t border-slate-100 dark:border-slate-800/60">
                    <td className="py-2 px-4 text-slate-700 dark:text-slate-300">{riyadhDate(r.workDate)}</td>
                    <td className="py-2 px-4 tabular-nums text-slate-700 dark:text-slate-300">
                      {riyadhTime(r.checkInAt)}
                    </td>
                    <td className="py-2 px-4 tabular-nums text-slate-700 dark:text-slate-300">
                      {riyadhTime(r.checkOutAt)}
                      {/* The nightly sweep supplied this time; it is an assumption,
                          and saying so is the difference between a record and a
                          claim about when somebody left. */}
                      {r.autoClosedAt && (
                        <span className="mr-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          <MoonStar className="w-3 h-3 inline" /> أُغلق تلقائياً
                        </span>
                      )}
                      {/* Entered by an administrator, not confirmed by a device.
                          The reason travels with it so the day is not a silent
                          rewrite of what happened. */}
                      {r.manualAt && (
                        <span
                          className="mr-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold"
                          title={r.manualReason ?? undefined}
                        >
                          <PenLine className="w-3 h-3 inline" /> أُدخل يدوياً
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${TONE[r.status] ?? ""}`}>
                        {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.isRemote && (
                        <span className="mr-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                          عن بُعد
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {leaveBalance.entries.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-3">إجازاتي هذا العام</p>
          <ul className="space-y-1.5">
            {leaveBalance.entries.map((e, i) => (
              <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <span className="font-bold">{LEAVE_TYPE_LABELS[e.type] ?? e.type}</span>
                <span className="text-slate-400 tabular-nums">
                  {riyadhDate(e.startDate)} ← {riyadhDate(e.endDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
