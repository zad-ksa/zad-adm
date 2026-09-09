"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarOff,
  Check,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Users,
  Wifi,
  X,
} from "lucide-react";
import {
  saveZadLeave,
  deleteZadLeave,
  saveLeaveAllowance,
  setRemoteWorkAllowed,
} from "@/app/actions/zadCalendar";
import { LEAVE_TYPE_LABELS } from "@/lib/attendanceTime";
import { BTN, CARD, Feedback, GHOST, INPUT, useSettingsAction } from "../shared";

type Employee = {
  id: string;
  name: string;
  annualLeaveDays: number;
  remoteWorkAllowed: boolean;
  usedLeaveDays: number;
};
type Leave = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  deducts: boolean;
};
type Holiday = { name: string; startDate: string; endDate: string };

const DAY_MS = 86_400_000;

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { ...opts, timeZone: "UTC" });

const dayLabel = (iso: string) => fmt({ day: "numeric", month: "short" }).format(new Date(iso));
const key = (t: number) => new Date(t).toISOString().slice(0, 10);

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

/** Annual is the only kind that spends the balance, so it wears the house
 *  colour; the rest are recorded, not charged. */
const TYPE = {
  ANNUAL: { bar: "bg-primary", chip: "bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300" },
  SICK: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  UNPAID: { bar: "bg-slate-400", chip: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300" },
  OTHER: { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" },
} as const;

const typeOf = (t: string) => TYPE[t as keyof typeof TYPE] ?? TYPE.OTHER;
const label = (t: string) => LEAVE_TYPE_LABELS[t] ?? t;

function KPI({
  icon: Icon,
  label: text,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[11px] font-bold">{text}</p>
      </div>
      <p
        className={`mt-1.5 text-[22px] font-black tabular-nums ${
          tone ?? "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const emptyDraft = { employeeId: "", type: "ANNUAL", startDate: "", endDate: "" };

export default function LeavesClient({
  todayIso,
  horizonDays,
  workDays,
  employees,
  leaves,
  holidays,
}: {
  todayIso: string;
  horizonDays: number;
  workDays: number[];
  employees: Employee[];
  leaves: Leave[];
  holidays: Holiday[];
}) {
  const { busy, error, notice, run } = useSettingsAction();

  const [draft, setDraft] = useState(emptyDraft);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const today = new Date(todayIso).getTime();
  const horizonEnd = today + (horizonDays - 1) * DAY_MS;

  const spanOf = (l: Leave) => [new Date(l.startDate).getTime(), new Date(l.endDate).getTime()];
  const covers = (l: Leave, t: number) => {
    const [s, e] = spanOf(l);
    return t >= s && t <= e;
  };

  const remaining = (e: Employee) => e.annualLeaveDays - e.usedLeaveDays;

  // ── the four numbers an HR desk opens this page for ──────────────────────
  const outToday = leaves.filter((l) => covers(l, today));
  const upcoming = leaves.filter((l) => {
    const s = new Date(l.startDate).getTime();
    return s > today && s <= horizonEnd;
  });
  const spentThisYear = leaves.filter((l) => l.deducts).reduce((sum, l) => sum + l.days, 0);
  const atRisk = employees.filter((e) => remaining(e) <= 3);

  // ── the strip ───────────────────────────────────────────────────────────
  const strip = Array.from({ length: horizonDays }, (_, i) => {
    const t = today + i * DAY_MS;
    const d = new Date(t);
    return {
      t,
      key: key(t),
      number: d.getUTCDate(),
      isWorkDay: workDays.includes(d.getUTCDay()),
      holiday: holidays.find(
        (h) => t >= new Date(h.startDate).getTime() && t <= new Date(h.endDate).getTime()
      ),
    };
  });
  const inHorizon = employees.filter((e) =>
    leaves.some((l) => {
      const [s, en] = spanOf(l);
      return l.employeeId === e.id && s <= horizonEnd && en >= today;
    })
  );

  // ── the add form's live arithmetic ───────────────────────────────────────
  const draftEmployee = employees.find((e) => e.id === draft.employeeId);
  const draftDays =
    draft.startDate && draft.endDate && draft.endDate >= draft.startDate
      ? Math.round(
          (new Date(draft.endDate).getTime() - new Date(draft.startDate).getTime()) / DAY_MS
        ) + 1
      : 0;
  const draftDeducts = draft.type === "ANNUAL";
  const draftAfter = draftEmployee
    ? remaining(draftEmployee) - (draftDeducts ? draftDays : 0)
    : null;
  const draftHolidays = holidays.filter(
    (h) =>
      draft.startDate &&
      draft.endDate &&
      new Date(h.startDate).getTime() <= new Date(draft.endDate).getTime() &&
      new Date(h.endDate).getTime() >= new Date(draft.startDate).getTime()
  );

  const shownEmployees = employees
    .filter((e) => e.name.includes(query.trim()))
    .sort((a, b) => remaining(a) - remaining(b));

  const shownLeaves = leaves.filter(
    (l) => (!typeFilter || l.type === typeFilter) && l.employeeName.includes(query.trim())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Feedback error={error} notice={notice} />

      {/* ── الأرقام ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={CalendarOff} label="خارج الدوام اليوم" value={outToday.length} />
        <KPI icon={Users} label={`إجازات تبدأ خلال ${horizonDays} يوماً`} value={upcoming.length} />
        <KPI icon={TrendingUp} label="أيام مخصومة هذا العام" value={spentThisYear} />
        <KPI
          icon={AlertTriangle}
          label="رصيده ٣ أيام أو أقل"
          value={atRisk.length}
          tone={atRisk.length > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
      </div>

      {/* ── من هو خارج الدوام اليوم ───────────────────────────────────── */}
      {outToday.length > 0 && (
        <div className={CARD}>
          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100 mb-3">
            خارج الدوام اليوم
          </p>
          <div className="flex flex-wrap gap-2">
            {outToday.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 pr-1.5 pl-3 py-1.5"
              >
                <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-500 dark:text-slate-300 inline-flex items-center justify-center">
                  {initials(l.employeeName)}
                </span>
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                  {l.employeeName}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeOf(l.type).chip}`}>
                  {label(l.type)}
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  حتى {dayLabel(l.endDate)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── شريط الفريق ───────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">
            من سيغيب خلال {horizonDays} يوماً
          </p>
          <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-400">
            {Object.keys(TYPE).map((t) => (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={`w-2 h-2 rounded-sm ${typeOf(t).bar}`} /> {label(t)}
              </span>
            ))}
          </div>
        </div>

        {inHorizon.length === 0 ? (
          <p className="text-[12px] text-slate-400 dark:text-slate-500">
            لا إجازات مسجّلة في هذه المدة.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Day scale */}
              <div className="flex items-end gap-px pr-28 mb-1">
                {strip.map((d, i) => (
                  <div key={d.key} className="flex-1 text-center">
                    <span
                      className={`text-[9px] tabular-nums ${
                        i % 5 === 0 ? "text-slate-400" : "text-transparent"
                      }`}
                    >
                      {d.number}
                    </span>
                  </div>
                ))}
              </div>

              {inHorizon.map((e) => (
                <div key={e.id} className="flex items-center gap-px mb-1">
                  <span className="w-28 shrink-0 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate pl-2">
                    {e.name}
                  </span>
                  {strip.map((d) => {
                    const leave = leaves.find(
                      (l) => l.employeeId === e.id && covers(l, d.t)
                    );
                    return (
                      <div
                        key={d.key}
                        title={
                          leave
                            ? `${e.name} · ${label(leave.type)} · ${dayLabel(leave.startDate)} ← ${dayLabel(leave.endDate)}`
                            : d.holiday
                              ? d.holiday.name
                              : undefined
                        }
                        className={`flex-1 h-6 rounded-[3px] ${
                          leave
                            ? typeOf(leave.type).bar
                            : d.holiday
                              ? "bg-slate-200 dark:bg-slate-700"
                              : d.isWorkDay
                                ? "bg-slate-50 dark:bg-slate-800/50"
                                : "bg-slate-100/80 dark:bg-slate-800"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── تسجيل إجازة ───────────────────────────────────────────────── */}
      {adding ? (
        <div className="rounded-2xl border border-primary/30 dark:border-teal-500/30 bg-primary/[0.03] dark:bg-teal-500/5 p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">تسجيل إجازة</p>
            <button
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-4 gap-2">
            <select
              className={INPUT}
              value={draft.employeeId}
              onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
            >
              <option value="">اختر الموظف</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <select
              className={INPUT}
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value })}
            >
              {Object.entries(LEAVE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              className={INPUT}
              type="date"
              dir="ltr"
              value={draft.startDate}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  startDate: e.target.value,
                  // A one-day leave is the common case; typing the same date
                  // twice is friction nobody asked for.
                  endDate: draft.endDate && draft.endDate >= e.target.value ? draft.endDate : e.target.value,
                })
              }
            />
            <input
              className={INPUT}
              type="date"
              dir="ltr"
              min={draft.startDate || undefined}
              value={draft.endDate}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </div>

          {/* What this will actually do, before it does it. */}
          {draftDays > 0 && (
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 space-y-1.5">
              <p className="text-[12px] text-slate-600 dark:text-slate-300">
                <span className="font-bold tabular-nums">{draftDays}</span>{" "}
                {draftDays === 1 ? "يوم" : "أيام"}
                {draftDeducts ? (
                  <span className="text-slate-400"> تُخصم من الرصيد</span>
                ) : (
                  <span className="text-slate-400"> تُسجَّل ولا تُخصم من الرصيد</span>
                )}
              </p>
              {draftEmployee && draftDeducts && (
                <p
                  className={`text-[12px] font-bold tabular-nums ${
                    (draftAfter ?? 0) < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  رصيد {draftEmployee.name} بعدها: {draftAfter}
                  {(draftAfter ?? 0) < 0 && " — سيتجاوز رصيده"}
                </p>
              )}
              {draftHolidays.length > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  تتقاطع مع: {draftHolidays.map((h) => h.name).join("، ")} — أيام العطل تُخصم ضمن
                  المدة كما أُدخلت.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              className={BTN}
              disabled={busy || !draft.employeeId || !draft.startDate || !draft.endDate}
              onClick={async () => {
                const okDone = await run(
                  () =>
                    saveZadLeave({
                      employeeId: draft.employeeId,
                      type: draft.type as "ANNUAL" | "SICK" | "UNPAID" | "OTHER",
                      startDate: draft.startDate,
                      endDate: draft.endDate,
                    }),
                  "أُضيفت الإجازة"
                );
                if (okDone) {
                  setDraft(emptyDraft);
                  setAdding(false);
                }
              }}
            >
              <Check className="w-3.5 h-3.5" /> تسجيل
            </button>
            <button
              className={GHOST}
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setDraft(emptyDraft);
              }}
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <button className={BTN} onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> تسجيل إجازة
        </button>
      )}

      {/* ── البحث ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
        <input
          className="h-9 w-full sm:w-72 pr-9 pl-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[12px] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          placeholder="ابحث باسم الموظف"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* ── الأرصدة ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">
            الأرصدة
            <span className="mr-2 text-[11px] font-normal text-slate-400">
              مرتّبة بالأقل رصيداً أولاً
            </span>
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {shownEmployees.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">لا نتائج.</p>
          )}
          {shownEmployees.map((e) => {
            const left = remaining(e);
            const pct =
              e.annualLeaveDays > 0
                ? Math.min(100, Math.max(0, (e.usedLeaveDays / e.annualLeaveDays) * 100))
                : 0;
            return (
              <div
                key={e.id}
                className="px-4 py-3 bg-white dark:bg-slate-900 flex items-center gap-4 flex-wrap"
              >
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-300 inline-flex items-center justify-center shrink-0">
                  {initials(e.name)}
                </span>

                <div className="min-w-[9rem] flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {e.name}
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        left < 0 ? "bg-rose-500" : left <= 3 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 tabular-nums">
                    استهلك {e.usedLeaveDays} من {e.annualLeaveDays}
                  </p>
                </div>

                <div className="text-center shrink-0">
                  <p
                    className={`text-[18px] font-black tabular-nums ${
                      left < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : left <= 3
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-900 dark:text-slate-100"
                    }`}
                  >
                    {left}
                  </p>
                  <p className="text-[10px] text-slate-400">متبقٍ</p>
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  الرصيد
                  <input
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={e.annualLeaveDays}
                    dir="ltr"
                    disabled={busy}
                    className="w-16 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] text-center text-slate-900 dark:text-slate-100"
                    onBlur={(ev) => {
                      const v = Number(ev.target.value);
                      if (v !== e.annualLeaveDays) {
                        run(() => saveLeaveAllowance(e.id, v), "حُفظ الرصيد");
                      }
                    }}
                  />
                </label>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer shrink-0">
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
            );
          })}
        </div>
      </div>

      {/* ── السجل ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">
            سجل هذا العام
            <span className="mr-2 text-[11px] font-normal text-slate-400 tabular-nums">
              {shownLeaves.length}
            </span>
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setTypeFilter("")}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
                typeFilter === ""
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              الكل
            </button>
            {Object.keys(LEAVE_TYPE_LABELS).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(typeFilter === t ? "" : t)}
                className={`h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
                  typeFilter === t
                    ? "bg-primary text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {label(t)}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {shownLeaves.length === 0 && (
            <p className="px-4 py-6 text-center text-[12px] text-slate-400">لا إجازات مسجّلة.</p>
          )}
          {shownLeaves.map((l) => (
            <div
              key={l.id}
              className="px-4 py-2.5 bg-white dark:bg-slate-900 flex items-center gap-3 flex-wrap"
            >
              <span className={`w-1 h-8 rounded-full shrink-0 ${typeOf(l.type).bar}`} />
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 min-w-[7rem]">
                {l.employeeName}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeOf(l.type).chip}`}>
                {label(l.type)}
              </span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400 tabular-nums">
                {l.startDate === l.endDate
                  ? dayLabel(l.startDate)
                  : `${dayLabel(l.startDate)} ← ${dayLabel(l.endDate)}`}
                <span className="text-slate-400">
                  {" · "}
                  {l.days} {l.days === 1 ? "يوم" : "أيام"}
                  {!l.deducts && " · بلا خصم"}
                </span>
              </span>
              <button
                className="mr-auto text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                title="حذف"
                disabled={busy}
                onClick={() => run(() => deleteZadLeave(l.id), "حُذفت الإجازة")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        تُخصم السنوية وحدها من الرصيد؛ المرضية وبدون راتب وغيرها تُسجَّل ولا تُخصم. والمدة تُحسب
        بالأيام الكاملة كما أُدخلت، بما فيها العطل الواقعة داخلها.
      </p>
    </div>
  );
}
