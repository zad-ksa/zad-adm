"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  MoonStar,
  Pencil,
  PenLine,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { correctZadAttendance } from "@/app/actions/zadAttendance";
import { ATTENDANCE_STATUS_LABELS, LEAVE_TYPE_LABELS } from "@/lib/attendanceTime";
import { BTN, Feedback, GHOST, INPUT, useSettingsAction } from "../shared";

type DayRecord = {
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  isRemote: boolean;
  autoClosedAt: string | null;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  manualAt: string | null;
  manualReason: string | null;
  manualByName: string | null;
};
type Day = {
  date: string;
  isWorkDay: boolean;
  isFuture: boolean;
  holidayName: string | null;
  leaveType: string | null;
  record: DayRecord | null;
};

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { ...opts, timeZone: "Asia/Riyadh" });

const dayLabel = (iso: string) =>
  fmt({ day: "numeric", month: "short", weekday: "short" }).format(new Date(`${iso}T00:00:00Z`));

/** An instant → "HH:MM" on the Riyadh clock, which is what the form edits. */
const clock = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 3 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

const STATUS_TONE: Record<string, string> = {
  PRESENT: "text-emerald-600 dark:text-emerald-400",
  LATE: "text-amber-600 dark:text-amber-400",
  EARLY_LEAVE: "text-amber-600 dark:text-amber-400",
  ABSENT: "text-rose-600 dark:text-rose-400",
};

export default function RecordsClient({
  employees,
  selectedId,
  month,
  days,
  schedule,
}: {
  employees: { id: string; name: string }[];
  selectedId: string;
  month: string;
  days: Day[];
  schedule: { startTime: string; endTime: string; groupName: string };
  hasMonthHolidays?: boolean;
}) {
  const router = useRouter();
  const { busy, error, notice, run } = useSettingsAction();

  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ checkIn: "", checkOut: "", reason: "" });

  const go = (employee: string, m: string) =>
    router.push(`/main/attendance/settings/records?employee=${employee}&month=${m}`);

  const open = (d: Day) => {
    setEditing(d.date);
    setForm({
      checkIn: clock(d.record?.checkInAt ?? null) || schedule.startTime,
      checkOut: clock(d.record?.checkOutAt ?? null),
      reason: "",
    });
  };

  const save = async (date: string, clear = false) => {
    const okDone = await run(
      () =>
        correctZadAttendance({
          employeeId: selectedId,
          workDate: date,
          checkInAt: clear ? null : form.checkIn || null,
          checkOutAt: clear ? null : form.checkOut || null,
          reason: form.reason,
        }),
      clear ? "حُذف السجل" : "حُفظ التعديل"
    );
    if (okDone) setEditing(null);
  };

  const recorded = days.filter((d) => d.record).length;
  const corrected = days.filter((d) => d.record?.manualAt).length;

  return (
    <div className="space-y-4" dir="rtl">
      <Feedback error={error} notice={notice} />

      {/* Who and when */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className={`${INPUT} w-auto`}
          value={selectedId}
          onChange={(e) => go(e.target.value, month)}
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={month}
          dir="ltr"
          onChange={(e) => e.target.value && go(selectedId, e.target.value)}
          className="h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[12px] text-slate-600 dark:text-slate-300"
        />
        <span className="text-[11px] text-slate-400 tabular-nums">
          دوام «{schedule.groupName}» {schedule.startTime}–{schedule.endTime} · {recorded} يوم
          مسجّل
          {corrected > 0 && ` · ${corrected} معدّل يدوياً`}
        </span>
      </div>

      {/* The month */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {days.map((d) => {
          const r = d.record;
          const isEditing = editing === d.date;

          return (
            <div key={d.date} className="bg-white dark:bg-slate-900">
              <div
                className={`px-4 py-2.5 flex items-center gap-3 flex-wrap ${
                  d.isWorkDay ? "" : "bg-slate-50/60 dark:bg-slate-800/30"
                }`}
              >
                <span
                  className={`w-24 shrink-0 text-[12px] tabular-nums ${
                    d.isWorkDay
                      ? "font-bold text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {dayLabel(d.date)}
                </span>

                <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap text-[12px]">
                  {r ? (
                    <>
                      <span className="tabular-nums text-slate-600 dark:text-slate-300" dir="ltr">
                        {clock(r.checkInAt) || "—"} ← {clock(r.checkOutAt) || "—"}
                      </span>
                      <span className={STATUS_TONE[r.status] ?? "text-slate-500"}>
                        {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                      {r.isRemote && (
                        <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                          <Wifi className="w-3 h-3" /> عن بُعد
                        </span>
                      )}
                      {r.autoClosedAt && (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <MoonStar className="w-3 h-3" /> أُغلق تلقائياً
                        </span>
                      )}
                      {r.isSuspicious && r.suspiciousReason && (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {r.suspiciousReason}
                        </span>
                      )}
                      {r.manualAt && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          title={r.manualReason ?? undefined}
                        >
                          <PenLine className="w-2.5 h-2.5" />
                          أُدخل يدوياً{r.manualByName ? ` — ${r.manualByName}` : ""}
                        </span>
                      )}
                    </>
                  ) : d.leaveType ? (
                    <span className="text-slate-400">
                      إجازة {LEAVE_TYPE_LABELS[d.leaveType] ?? d.leaveType}
                    </span>
                  ) : d.holidayName ? (
                    <span className="text-slate-400">{d.holidayName}</span>
                  ) : d.isFuture ? (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  ) : d.isWorkDay ? (
                    <span className="text-rose-500/70 dark:text-rose-400/70">لا سجل</span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">راحة</span>
                  )}
                </span>

                {!d.isFuture && (
                  <button
                    className="shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1"
                    disabled={busy}
                    onClick={() => (isEditing ? setEditing(null) : open(d))}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-3.5 h-3.5" /> إغلاق
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3.5 h-3.5" /> {r ? "تعديل" : "تسجيل"}
                      </>
                    )}
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="px-4 pb-4 pt-1 bg-primary/[0.03] dark:bg-teal-500/5 border-t border-primary/20 dark:border-teal-500/20">
                  <div className="grid sm:grid-cols-[auto_auto_1fr] gap-2 items-center">
                    <label className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                      حضور
                      <input
                        className={`${INPUT} w-auto`}
                        type="time"
                        dir="ltr"
                        value={form.checkIn}
                        onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                      انصراف
                      <input
                        className={`${INPUT} w-auto`}
                        type="time"
                        dir="ltr"
                        value={form.checkOut}
                        onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                      />
                    </label>
                    <input
                      className={INPUT}
                      placeholder="سبب التعديل — يُحفظ مع السجل"
                      maxLength={300}
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      className={BTN}
                      disabled={busy || form.reason.trim().length < 3 || !form.checkIn}
                      onClick={() => save(d.date)}
                    >
                      <Check className="w-3.5 h-3.5" /> حفظ
                    </button>
                    {r && (
                      <button
                        className="h-9 px-3 rounded-xl text-[12px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                        disabled={busy || form.reason.trim().length < 3}
                        onClick={() => {
                          if (
                            window.confirm(
                              `حذف سجل ${dayLabel(d.date)} نهائياً؟ سيُحتسب اليوم غياباً إن كان يوم عمل.`
                            )
                          ) {
                            save(d.date, true);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> حذف السجل
                      </button>
                    )}
                    <button className={GHOST} disabled={busy} onClick={() => setEditing(null)}>
                      إلغاء
                    </button>
                    {form.reason.trim().length < 3 && (
                      <span className="text-[11px] text-slate-400">السبب مطلوب (٣ أحرف فأكثر)</span>
                    )}
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    الحالة تُحسب من الأوقات بدوام «{schedule.groupName}» تماماً كتسجيل حقيقي، ولا
                    تُكتب إحداثيات — السجل يُوسم بأنه أُدخل يدوياً باسمك.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
