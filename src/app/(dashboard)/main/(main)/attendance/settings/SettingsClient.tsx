"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Trash2,
  Unlock,
  Users,
  Wifi,
} from "lucide-react";
import {
  saveZadWorkSite,
  deleteZadWorkSite,
  saveShiftGroup,
  deleteShiftGroup,
  assignEmployeesToGroup,
  setZadAttendanceOpen,
  saveZadIpPolicy,
} from "@/app/actions/zadAttendance";
import {
  saveHoliday,
  deleteHoliday,
  saveZadLeave,
  deleteZadLeave,
  saveLeaveAllowance,
  setRemoteWorkAllowed,
} from "@/app/actions/zadCalendar";
import { LEAVE_TYPE_LABELS, WEEKDAY_LABELS } from "@/lib/attendanceTime";

type Site = { id: string; name: string; latitude: number; longitude: number; radiusMeters: number };
type Group = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateAfterMinutes: number;
  earlyLeaveBeforeMinutes: number;
  workDays: number[];
  isDefault: boolean;
  memberCount: number;
};
type Employee = {
  id: string;
  name: string;
  shiftGroupId: string | null;
  annualLeaveDays: number;
  remoteWorkAllowed: boolean;
  usedLeaveDays: number;
};
type HolidayRow = { id: string; name: string; startDate: string; endDate: string; scope: string };
type LeaveRow = { id: string; employeeId: string; employeeName: string; type: string; startDate: string; endDate: string };

const day = (iso: string) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" })
    .format(new Date(iso));

const CARD =
  "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5";
const INPUT =
  "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none";
const BTN =
  "h-9 px-4 rounded-xl text-[12px] font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5";
const GHOST =
  "h-9 px-3 rounded-xl text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5";

export default function SettingsClient({
  isOpen,
  sites,
  groups,
  employees,
  holidays,
  leaves,
  ipRanges,
  ipMode,
}: {
  isOpen: boolean;
  sites: Site[];
  groups: Group[];
  employees: Employee[];
  holidays: HolidayRow[];
  leaves: LeaveRow[];
  ipRanges: string[];
  ipMode: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /** Every mutation goes through here, so none of them can forget to refresh. */
  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fn();
      if (!res.success) {
        setError(res.error ?? "تعذّر الحفظ");
        return false;
      }
      setNotice(ok);
      startTransition(() => router.refresh());
      return true;
    } finally {
      setBusy(false);
    }
  };

  // ── forms ────────────────────────────────────────────────────────────────
  const [site, setSite] = useState({ name: "", latitude: "", longitude: "", radiusMeters: "150" });
  const [group, setGroup] = useState({
    name: "",
    startTime: "08:00",
    endTime: "16:00",
    lateAfterMinutes: "15",
    earlyLeaveBeforeMinutes: "15",
    workDays: [0, 1, 2, 3, 4] as number[],
  });
  const [holiday, setHoliday] = useState({ name: "", startDate: "", endDate: "", scope: "GLOBAL" });
  const [leave, setLeave] = useState({ employeeId: "", type: "ANNUAL", startDate: "", endDate: "", note: "" });
  const [ip, setIp] = useState({ text: ipRanges.join("\n"), mode: ipMode });

  return (
    <div className="space-y-5" dir="rtl">
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

      {/* ── البوابة ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isOpen ? <Unlock className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4 text-slate-400" />}
              {isOpen ? "التحضير مفعّل" : "التحضير غير مفعّل"}
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
              {isOpen
                ? "الموظفون يسجّلون حضورهم وانصرافهم الآن."
                : "لا يُسجَّل حضور ولا غياب حتى تفعّله. أضف موقع عمل واحداً على الأقل أولاً — تفعيله بلا موقع يرفض كل محاولة تحضير ويسجّل الأيام غياباً."}
            </p>
          </div>
          <button
            className={isOpen ? GHOST : BTN}
            disabled={busy}
            onClick={() => run(() => setZadAttendanceOpen(!isOpen), isOpen ? "أُوقف التحضير" : "فُعّل التحضير")}
          >
            {isOpen ? "إيقاف" : "تفعيل"}
          </button>
        </div>
      </div>

      {/* ── مواقع العمل ─────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" /> مواقع العمل
        </p>

        <ul className="space-y-2 mb-4">
          {sites.length === 0 && (
            <li className="text-[12px] text-slate-400 dark:text-slate-500">لا مواقع بعد.</li>
          )}
          {sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <span className="text-[12px] text-slate-700 dark:text-slate-300">
                <span className="font-bold">{s.name}</span>
                <span className="text-slate-400 tabular-nums"> · نطاق {s.radiusMeters}م</span>
              </span>
              <button
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="تعطيل الموقع"
                disabled={busy}
                onClick={() => run(() => deleteZadWorkSite(s.id), "عُطّل الموقع")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <div className="grid sm:grid-cols-4 gap-2">
          <input className={INPUT} placeholder="اسم الموقع" value={site.name}
            onChange={(e) => setSite({ ...site, name: e.target.value })} />
          <input className={INPUT} placeholder="خط العرض" dir="ltr" value={site.latitude}
            onChange={(e) => setSite({ ...site, latitude: e.target.value })} />
          <input className={INPUT} placeholder="خط الطول" dir="ltr" value={site.longitude}
            onChange={(e) => setSite({ ...site, longitude: e.target.value })} />
          <input className={INPUT} placeholder="النطاق (متر)" dir="ltr" value={site.radiusMeters}
            onChange={(e) => setSite({ ...site, radiusMeters: e.target.value })} />
        </div>
        <button
          className={`${BTN} mt-2`}
          disabled={busy}
          onClick={async () => {
            const okDone = await run(
              () =>
                saveZadWorkSite({
                  name: site.name,
                  latitude: Number(site.latitude),
                  longitude: Number(site.longitude),
                  radiusMeters: Number(site.radiusMeters),
                }),
              "أُضيف الموقع"
            );
            if (okDone) setSite({ name: "", latitude: "", longitude: "", radiusMeters: "150" });
          }}
        >
          <Plus className="w-3.5 h-3.5" /> إضافة موقع
        </button>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          الإحداثيات تُؤخذ من خرائط جوجل — انقر على الموقع بزر يمين واختر الرقمين.
        </p>
      </div>

      {/* ── مجموعات الدوام ──────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" /> مجموعات الدوام
        </p>

        <div className="space-y-3 mb-4">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[12px] text-slate-700 dark:text-slate-300">
                  <span className="font-bold">{g.name}</span>
                  {g.isDefault && (
                    <span className="mr-1.5 text-[10px] font-bold text-primary dark:text-teal-400">افتراضية</span>
                  )}
                  <span className="text-slate-400 tabular-nums">
                    {" · "}{g.startTime}–{g.endTime} · {g.memberCount} موظف
                  </span>
                </span>
                {!g.isDefault && (
                  <button
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                    title="حذف المجموعة — ينتقل أفرادها إلى الافتراضية"
                    disabled={busy}
                    onClick={() => run(() => deleteShiftGroup(g.id), "حُذفت المجموعة")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {g.workDays.map((d) => WEEKDAY_LABELS[d]).join("، ")} · تأخير بعد {g.lateAfterMinutes} دقيقة
              </p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <input className={INPUT} placeholder="اسم المجموعة" value={group.name}
            onChange={(e) => setGroup({ ...group, name: e.target.value })} />
          <input className={INPUT} type="time" dir="ltr" value={group.startTime}
            onChange={(e) => setGroup({ ...group, startTime: e.target.value })} />
          <input className={INPUT} type="time" dir="ltr" value={group.endTime}
            onChange={(e) => setGroup({ ...group, endTime: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {WEEKDAY_LABELS.map((label, i) => {
            const on = group.workDays.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setGroup({
                    ...group,
                    workDays: on ? group.workDays.filter((d) => d !== i) : [...group.workDays, i],
                  })
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  on
                    ? "bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-400"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          className={`${BTN} mt-2`}
          disabled={busy}
          onClick={async () => {
            const okDone = await run(
              () =>
                saveShiftGroup({
                  name: group.name,
                  startTime: group.startTime,
                  endTime: group.endTime,
                  lateAfterMinutes: Number(group.lateAfterMinutes),
                  earlyLeaveBeforeMinutes: Number(group.earlyLeaveBeforeMinutes),
                  workDays: group.workDays,
                }),
              "أُضيفت المجموعة"
            );
            if (okDone) setGroup({ ...group, name: "" });
          }}
        >
          <Plus className="w-3.5 h-3.5" /> إضافة مجموعة
        </button>

        {/* إسناد الموظفين */}
        <p className="mt-5 mb-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> إسناد الموظفين
        </p>
        <ul className="space-y-1.5">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3">
              <span className="text-[12px] text-slate-700 dark:text-slate-300">{e.name}</span>
              <select
                className="text-[12px] px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                value={e.shiftGroupId ?? ""}
                disabled={busy}
                onChange={(ev) =>
                  run(
                    () => assignEmployeesToGroup(ev.target.value || null, [e.id]),
                    "تم الإسناد"
                  )
                }
              >
                <option value="">الافتراضية</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>

      {/* ── التقويم ─────────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" /> التقويم
        </p>
        <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          العطل بنوعيها لا تُخصم من رصيد أحد. الفرق أن <span className="font-bold">الرسمية</span> تظهر
          للجمعيات أيضاً، و<span className="font-bold">الخاصة بزاد</span> لا تظهر لهم.
        </p>

        <ul className="space-y-2 mb-4">
          {holidays.length === 0 && (
            <li className="text-[12px] text-slate-400 dark:text-slate-500">التقويم فارغ.</li>
          )}
          {holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <span className="text-[12px] text-slate-700 dark:text-slate-300">
                <span className="font-bold">{h.name}</span>
                <span className="text-slate-400 tabular-nums"> · {day(h.startDate)} ← {day(h.endDate)}</span>
                <span className={`mr-1.5 text-[10px] font-bold ${h.scope === "GLOBAL" ? "text-primary dark:text-teal-400" : "text-indigo-500"}`}>
                  {h.scope === "GLOBAL" ? "رسمية" : "خاصة بزاد"}
                </span>
              </span>
              <button
                className="text-slate-400 hover:text-rose-500 transition-colors"
                disabled={busy}
                onClick={() => run(() => deleteHoliday(h.id), "حُذفت من التقويم")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <div className="grid sm:grid-cols-4 gap-2">
          <input className={INPUT} placeholder="المناسبة" value={holiday.name}
            onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} />
          <input className={INPUT} type="date" dir="ltr" value={holiday.startDate}
            onChange={(e) => setHoliday({ ...holiday, startDate: e.target.value })} />
          <input className={INPUT} type="date" dir="ltr" value={holiday.endDate}
            onChange={(e) => setHoliday({ ...holiday, endDate: e.target.value })} />
          <select className={INPUT} value={holiday.scope}
            onChange={(e) => setHoliday({ ...holiday, scope: e.target.value })}>
            <option value="GLOBAL">رسمية (للجميع)</option>
            <option value="COMPANY">خاصة بزاد</option>
          </select>
        </div>
        <button
          className={`${BTN} mt-2`}
          disabled={busy}
          onClick={async () => {
            const okDone = await run(
              () =>
                saveHoliday({
                  name: holiday.name,
                  startDate: holiday.startDate,
                  endDate: holiday.endDate,
                  scope: holiday.scope as "GLOBAL" | "COMPANY",
                }),
              "أُضيفت إلى التقويم"
            );
            if (okDone) setHoliday({ name: "", startDate: "", endDate: "", scope: "GLOBAL" });
          }}
        >
          <Plus className="w-3.5 h-3.5" /> إضافة
        </button>
      </div>

      {/* ── الإجازات والأرصدة ───────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3">الإجازات والأرصدة</p>

        <ul className="space-y-2 mb-4">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <span className="text-[12px] text-slate-700 dark:text-slate-300 font-bold">{e.name}</span>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  المستهلك {e.usedLeaveDays} · المتبقي {Math.max(0, e.annualLeaveDays - e.usedLeaveDays)}
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  الرصيد
                  <input
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={e.annualLeaveDays}
                    dir="ltr"
                    disabled={busy}
                    className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[12px] text-center"
                    onBlur={(ev) => {
                      const v = Number(ev.target.value);
                      if (v !== e.annualLeaveDays) run(() => saveLeaveAllowance(e.id, v), "حُفظ الرصيد");
                    }}
                  />
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={e.remoteWorkAllowed}
                    disabled={busy}
                    onChange={(ev) =>
                      run(() => setRemoteWorkAllowed(e.id, ev.target.checked), "حُفظ الإعداد")
                    }
                    className="accent-primary"
                  />
                  <Wifi className="w-3 h-3" /> عن بُعد
                </label>
              </div>
            </li>
          ))}
        </ul>

        {leaves.length > 0 && (
          <ul className="space-y-1.5 mb-4">
            {leaves.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-bold">{l.employeeName}</span>
                  <span className="text-slate-400">
                    {" · "}{LEAVE_TYPE_LABELS[l.type] ?? l.type}{" · "}
                    {day(l.startDate)} ← {day(l.endDate)}
                  </span>
                </span>
                <button
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  disabled={busy}
                  onClick={() => run(() => deleteZadLeave(l.id), "حُذفت الإجازة")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid sm:grid-cols-4 gap-2">
          <select className={INPUT} value={leave.employeeId}
            onChange={(e) => setLeave({ ...leave, employeeId: e.target.value })}>
            <option value="">اختر الموظف</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select className={INPUT} value={leave.type}
            onChange={(e) => setLeave({ ...leave, type: e.target.value })}>
            {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input className={INPUT} type="date" dir="ltr" value={leave.startDate}
            onChange={(e) => setLeave({ ...leave, startDate: e.target.value })} />
          <input className={INPUT} type="date" dir="ltr" value={leave.endDate}
            onChange={(e) => setLeave({ ...leave, endDate: e.target.value })} />
        </div>
        <button
          className={`${BTN} mt-2`}
          disabled={busy || !leave.employeeId}
          onClick={async () => {
            const okDone = await run(
              () =>
                saveZadLeave({
                  employeeId: leave.employeeId,
                  type: leave.type as "ANNUAL" | "SICK" | "UNPAID" | "OTHER",
                  startDate: leave.startDate,
                  endDate: leave.endDate,
                }),
              "أُضيفت الإجازة"
            );
            if (okDone) setLeave({ employeeId: "", type: "ANNUAL", startDate: "", endDate: "", note: "" });
          }}
        >
          <Plus className="w-3.5 h-3.5" /> إضافة إجازة
        </button>
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          تُخصم السنوية وحدها من الرصيد؛ المرضية وبدون راتب وغيرها تُسجَّل ولا تُخصم.
        </p>
      </div>

      {/* ── سياسة الشبكة ────────────────────────────────────────────────── */}
      <div className={CARD}>
        <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
          <Wifi className="w-4 h-4 text-slate-400" /> شبكة المكتب (اختياري)
        </p>
        <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          طبقة ثانية فوق الموقع الجغرافي. اتركها معطّلة ما لم يكن للمكتب عنوان IP ثابت.
        </p>
        <textarea
          className={`${INPUT} font-mono`}
          dir="ltr"
          rows={3}
          placeholder="1.2.3.4&#10;5.6.7.0/24"
          value={ip.text}
          onChange={(e) => setIp({ ...ip, text: e.target.value })}
        />
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <select className={`${INPUT} w-auto`} value={ip.mode}
            onChange={(e) => setIp({ ...ip, mode: e.target.value })}>
            <option value="OFF">معطّلة</option>
            <option value="WARN">تسجيل تنبيه فقط</option>
            <option value="BLOCK">منع التحضير من خارجها</option>
          </select>
          <button
            className={BTN}
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  saveZadIpPolicy({
                    ranges: ip.text.split("\n").map((r) => r.trim()).filter(Boolean),
                    mode: ip.mode as "OFF" | "WARN" | "BLOCK",
                  }),
                "حُفظت السياسة"
              )
            }
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} حفظ
          </button>
        </div>
      </div>
    </div>
  );
}
