"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { saveHoliday, deleteHoliday } from "@/app/actions/zadCalendar";
import { WEEKDAY_LABELS } from "@/lib/attendanceTime";
import { BTN, Feedback, INPUT, useSettingsAction } from "../shared";

type HolidayRow = { id: string; name: string; startDate: string; endDate: string; scope: string };
type MonthSpec = {
  month: string;
  cells: number;
  gridStartIso: string;
  monthStartIso: string;
  monthEndIso: string;
};

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" — the key everything here is matched on. */
const key = (d: Date) => d.toISOString().slice(0, 10);

/**
 * ar-SA's CLDR default calendar for the SA region is islamic-umalqura, and
 * every date in this system is a Gregorian civil day. Pin it rather than
 * depend on which ICU build is answering.
 */
const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { ...opts, timeZone: "UTC" });

const monthName = (month: string) => fmt({ month: "long" }).format(new Date(`${month}-01T00:00:00Z`));
const monthYear = (month: string) =>
  fmt({ month: "long", year: "numeric" }).format(new Date(`${month}-01T00:00:00Z`));
const dayLabel = (iso: string) => fmt({ day: "numeric", month: "short" }).format(new Date(iso));

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Teal is the house colour, so it marks the official days; Zad's own closures
 *  take the second hue rather than a second shade of the same one. */
const SCOPE = {
  GLOBAL: {
    label: "رسمية",
    dot: "bg-primary",
    chip: "bg-primary/10 text-primary dark:bg-teal-500/15 dark:text-teal-300",
    tint: "bg-primary/10 text-primary dark:bg-teal-500/20 dark:text-teal-300",
  },
  COMPANY: {
    label: "خاصة بزاد",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
} as const;

const scopeOf = (s: string) => SCOPE[s as keyof typeof SCOPE] ?? SCOPE.GLOBAL;

/** الأحد → ح، الإثنين → ن … the conventional single-letter column heads. */
const INITIALS = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];

export default function CalendarClient({
  view,
  month,
  year,
  months,
  todayIso,
  workDays,
  defaultGroupName,
  holidays,
}: {
  view: "month" | "year";
  month: string;
  year: string;
  months: MonthSpec[];
  todayIso: string;
  workDays: number[];
  defaultGroupName: string | null;
  holidays: HolidayRow[];
}) {
  const router = useRouter();
  const { busy, error, notice, run } = useSettingsAction();

  const [anchor, setAnchor] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: string; end: string } | null>(null);
  const [draft, setDraft] = useState({ name: "", scope: "GLOBAL" });

  const todayKey = todayIso.slice(0, 10);
  const compact = view === "year";

  const buildDays = (spec: MonthSpec) => {
    const gridStart = new Date(spec.gridStartIso).getTime();
    const monthStart = new Date(spec.monthStartIso).getTime();
    const monthEnd = new Date(spec.monthEndIso).getTime();
    return Array.from({ length: spec.cells }, (_, i) => {
      const date = new Date(gridStart + i * DAY_MS);
      const t = date.getTime();
      const k = key(date);
      return {
        key: k,
        number: date.getUTCDate(),
        inMonth: t >= monthStart && t < monthEnd,
        isToday: k === todayKey,
        isWorkDay: workDays.includes(date.getUTCDay()),
        marks: holidays.filter(
          (h) => t >= new Date(h.startDate).getTime() && t <= new Date(h.endDate).getTime()
        ),
      };
    });
  };

  /**
   * Two clicks make a span: the first anchors it, the second closes it in
   * whichever direction you clicked. Eid is days, not a day, and typing two
   * dates into two boxes is where a manager gets one of them wrong.
   */
  const pick = (k: string) => {
    if (anchor) {
      setSelection(anchor <= k ? { start: anchor, end: k } : { start: k, end: anchor });
      setAnchor(null);
    } else {
      setAnchor(k);
      setSelection({ start: k, end: k });
    }
  };

  const inSelection = (k: string) => !!selection && k >= selection.start && k <= selection.end;

  const goto = (m: string, v: "month" | "year" = view) => {
    setAnchor(null);
    setSelection(null);
    const suffix = v === "year" ? "&view=year" : "";
    router.push(`/main/attendance/settings/calendar?month=${m}${suffix}`);
  };

  const spanStart = new Date(months[0].monthStartIso).getTime();
  const spanEnd = new Date(months[months.length - 1].monthEndIso).getTime();
  const listed = holidays.filter((h) => {
    const s = new Date(h.startDate).getTime();
    const e = new Date(h.endDate).getTime();
    return s < spanEnd && e >= spanStart;
  });

  const spanDays = selection
    ? Math.round(
        (new Date(selection.end).getTime() - new Date(selection.start).getTime()) / DAY_MS
      ) + 1
    : 0;

  const TOGGLE =
    "h-8 px-3 rounded-lg text-[12px] font-bold transition-colors border";
  const toggleOn = "bg-primary text-white border-primary";
  const toggleOff =
    "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <div className="space-y-4" dir="rtl">
      <Feedback error={error} notice={notice} />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goto(shiftMonth(month, compact ? -12 : -1))}
            aria-label={compact ? "السنة السابقة" : "الشهر السابق"}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors inline-flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => goto(shiftMonth(month, compact ? 12 : 1))}
            aria-label={compact ? "السنة التالية" : "الشهر التالي"}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors inline-flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="mr-2 text-[15px] font-black text-slate-900 dark:text-slate-100 tabular-nums">
            {compact ? year : monthYear(month)}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => goto(month, "month")}
              className={`${TOGGLE} ${compact ? toggleOff : toggleOn}`}
            >
              شهر
            </button>
            <button
              onClick={() => goto(month, "year")}
              className={`${TOGGLE} ${compact ? toggleOn : toggleOff}`}
            >
              سنة
            </button>
          </div>
          <button
            onClick={() => goto(todayKey.slice(0, 7))}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            اليوم
          </button>
        </div>
      </div>

      {compact ? (
        /* Twelve months at a glance. Each cell is a tinted square — a name at
           this size is a smear, so colour carries the meaning and the title
           attribute carries the detail. */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {months.map((spec) => (
            <div
              key={spec.month}
              className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-950"
            >
              <button
                onClick={() => goto(spec.month, "month")}
                className="mb-2 text-[12px] font-black text-slate-700 dark:text-slate-200 hover:text-primary transition-colors"
              >
                {monthName(spec.month)}
              </button>

              <div className="grid grid-cols-7 gap-0.5">
                {INITIALS.map((letter, i) => (
                  <div
                    key={i}
                    className={`text-center text-[9px] font-bold pb-1 ${
                      workDays.includes(i)
                        ? "text-slate-400 dark:text-slate-500"
                        : "text-slate-300 dark:text-slate-700"
                    }`}
                  >
                    {letter}
                  </div>
                ))}

                {buildDays(spec).map((d, i) =>
                  !d.inMonth ? (
                    <div key={`${spec.month}-pad-${i}`} />
                  ) : (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => pick(d.key)}
                      title={d.marks.map((h) => h.name).join(" · ") || undefined}
                      className={`aspect-square rounded flex items-center justify-center text-[10px] tabular-nums transition-colors ${
                        inSelection(d.key)
                          ? "bg-primary text-white font-black"
                          : d.isToday
                            ? "ring-1 ring-primary text-primary font-black"
                            : d.marks.length > 0
                              ? `${scopeOf(d.marks[0].scope).tint} font-bold`
                              : d.isWorkDay
                                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                : "text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {d.number}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* One month. Hairlines come from a 1px gap over a darker ground, so
           every rule is exactly one device pixel and none of them double up. */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`bg-slate-50 dark:bg-slate-900 py-2 text-center text-[11px] font-bold ${
                  workDays.includes(i)
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{INITIALS[i]}</span>
              </div>
            ))}

            {buildDays(months[0]).map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => pick(d.key)}
                className={`relative min-h-[62px] sm:min-h-[92px] p-1.5 sm:p-2 text-right align-top transition-colors ${
                  inSelection(d.key)
                    ? "bg-primary/10 dark:bg-teal-500/15"
                    : d.inMonth
                      ? d.isWorkDay
                        ? "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900"
                        : "bg-slate-50/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900"
                      : "bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center tabular-nums text-[12px] leading-none ${
                    d.isToday
                      ? "h-6 w-6 rounded-full bg-primary text-white font-black"
                      : d.inMonth
                        ? "font-bold text-slate-700 dark:text-slate-200"
                        : "text-slate-300 dark:text-slate-700"
                  }`}
                >
                  {d.number}
                </span>

                {d.marks.length > 0 && (
                  <>
                    <span className="sm:hidden absolute bottom-1.5 right-1.5 flex gap-0.5">
                      {d.marks.slice(0, 3).map((h) => (
                        <span
                          key={h.id}
                          className={`w-1.5 h-1.5 rounded-full ${scopeOf(h.scope).dot}`}
                        />
                      ))}
                    </span>

                    <span className="hidden sm:flex flex-col gap-0.5 mt-1.5">
                      {d.marks.slice(0, 2).map((h) => (
                        <span
                          key={h.id}
                          title={h.name}
                          className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            scopeOf(h.scope).chip
                          }`}
                        >
                          {h.name}
                        </span>
                      ))}
                      {d.marks.length > 2 && (
                        <span className="text-[10px] text-slate-400 px-1.5">
                          +{d.marks.length - 2}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${SCOPE.GLOBAL.dot}`} /> {SCOPE.GLOBAL.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${SCOPE.COMPANY.dot}`} /> {SCOPE.COMPANY.label}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-slate-700" />
          يوم راحة
          {defaultGroupName && <span className="text-slate-400">حسب «{defaultGroupName}»</span>}
        </span>
      </div>

      {/* Add — the form only appears once a span is picked, so the calendar
          stays the way in rather than a decoration above a pair of date boxes. */}
      {selection ? (
        <div className="rounded-xl border border-primary/30 dark:border-teal-500/30 bg-primary/[0.03] dark:bg-teal-500/5 p-4">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
              {selection.start === selection.end
                ? dayLabel(selection.start)
                : `${dayLabel(selection.start)} ← ${dayLabel(selection.end)}`}
              <span className="mr-2 font-normal text-slate-400 tabular-nums">
                {spanDays} {spanDays === 1 ? "يوم" : "أيام"}
              </span>
              {anchor && (
                <span className="mr-2 font-normal text-primary dark:text-teal-400">
                  اختر يوماً آخر لتحديد مدة
                </span>
              )}
            </p>
            <button
              onClick={() => {
                setSelection(null);
                setAnchor(null);
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
            >
              <X className="w-3.5 h-3.5" /> إلغاء التحديد
            </button>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
            <input
              className={INPUT}
              placeholder="اسم المناسبة"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <select
              className={`${INPUT} sm:w-auto`}
              value={draft.scope}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
            >
              <option value="GLOBAL">رسمية (للجميع)</option>
              <option value="COMPANY">خاصة بزاد</option>
            </select>
            <button
              className={BTN}
              disabled={busy || !draft.name.trim()}
              onClick={async () => {
                const okDone = await run(
                  () =>
                    saveHoliday({
                      name: draft.name,
                      startDate: selection.start,
                      endDate: selection.end,
                      scope: draft.scope as "GLOBAL" | "COMPANY",
                    }),
                  "أُضيفت إلى التقويم"
                );
                if (okDone) {
                  setDraft({ name: "", scope: "GLOBAL" });
                  setSelection(null);
                  setAnchor(null);
                }
              }}
            >
              <Plus className="w-3.5 h-3.5" /> إضافة
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-slate-400 dark:text-slate-500">
          انقر يوماً لإضافة مناسبة، أو يومين لتحديد مدة.
        </p>
      )}

      {/* Entries in view */}
      {listed.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {listed.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="text-[12px] text-slate-700 dark:text-slate-300 min-w-0">
                <span className={`inline-block w-2 h-2 rounded-full ml-2 ${scopeOf(h.scope).dot}`} />
                <span className="font-bold">{h.name}</span>
                <span className="text-slate-400 tabular-nums">
                  {" · "}
                  {h.startDate === h.endDate
                    ? dayLabel(h.startDate)
                    : `${dayLabel(h.startDate)} ← ${dayLabel(h.endDate)}`}
                </span>
                <span className="mr-1.5 text-[10px] text-slate-400">{scopeOf(h.scope).label}</span>
              </span>
              <button
                className="text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                title="حذف"
                disabled={busy}
                onClick={() => run(() => deleteHoliday(h.id), "حُذفت من التقويم")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
