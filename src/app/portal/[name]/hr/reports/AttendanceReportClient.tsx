"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  MoonStar,
  PencilLine,
  Plus,
  Search,
  Table2,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { correctAttendance } from "@/app/actions/attendance";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendanceTime";
import {
  Chip,
  Field,
  HrCard,
  SectionHead,
  StatTile,
  fs,
  ctaClass,
  ghostClass,
  inputClass,
} from "../ui";

type SummaryRow = {
  id: string;
  name: string;
  present: number;
  late: number;
  earlyLeave: number;
  /** Derived from the schedule, not stored — see reports/page.tsx. */
  absent: number;
  suspicious: number;
  /** Working days this month covered by leave — neither present nor absent. */
  leaveDays: number;
  leaveAllowance: number;
  leaveUsedThisYear: number;
};

type RecordRow = {
  id: string;
  userName: string;
  workDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInDistance: number | null;
  checkInAccuracy: number | null;
  siteName: string | null;
  ipAddress: string | null;
  isSuspicious: boolean;
  suspiciousReason: string | null;
  /** Non-null means a manager entered this by hand — no device evidence. */
  manualAt: string | null;
  manualReason: string | null;
  /** Non-null means the nightly job ended this day; the time is an assumption. */
  autoClosedAt: string | null;
};

function riyadhTime(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Riyadh",
  }).format(new Date(iso));
}

function civilDay(iso: string): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Month options: the twelve months ending with the CURRENT one.
 *
 * Anchored on today rather than on the selection. Building the list from the
 * selected month meant choosing an older month deleted every newer month from
 * the picker, leaving no way back to the present without editing the URL.
 *
 * A selection older than the window is kept as an extra option, so a link to a
 * distant month still shows which month it is looking at.
 */
function recentMonths(currentMonth: string, selected: string): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  if (selected && !out.includes(selected)) {
    out.push(selected);
    out.sort().reverse();
  }
  return out;
}

const statusTone: Record<string, "primary" | "warn" | "danger" | "neutral"> = {
  PRESENT: "primary",
  LATE: "warn",
  EARLY_LEAVE: "warn",
  ABSENT: "danger",
};

const thClass =
  "text-right font-semibold px-4 py-2 text-slate-400 dark:text-slate-500 whitespace-nowrap";
const tdClass = "px-4 py-4 align-top";

export default function AttendanceReportClient({
  charityName,
  month,
  currentMonth,
  summary,
  records,
  staff,
  canCorrect,
  charityId,
}: {
  charityName: string;
  month: string;
  /** Today's Riyadh month, from the server — the picker is anchored on it. */
  currentMonth: string;
  summary: SummaryRow[];
  records: RecordRow[];
  staff: { id: string; name: string }[];
  canCorrect: boolean;
  charityId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [onlySuspicious, setOnlySuspicious] = useState(false);

  // Correction dialog. `null` closed; a draft object open. Editing an existing
  // row pre-fills it and locks the person and the day, since those two are the
  // record's identity — changing them would silently write a different row.
  const [draft, setDraft] = useState<{
    targetUserId: string;
    userName: string;
    workDate: string;
    checkInAt: string;
    checkOutAt: string;
    reason: string;
    locked: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startCorrection] = useTransition();


  /** "HH:MM" in Riyadh for an instant, for pre-filling the time inputs. */
  function riyadhHhMm(iso: string | null): string {
    if (!iso) return "";
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Riyadh",
    }).format(new Date(iso));
    return parts;
  }

  function openEdit(r: RecordRow) {
    setSaveError(null);
    setDraft({
      targetUserId: staff.find((m) => m.name === r.userName)?.id ?? "",
      userName: r.userName,
      workDate: r.workDate.slice(0, 10),
      checkInAt: riyadhHhMm(r.checkInAt),
      checkOutAt: riyadhHhMm(r.checkOutAt),
      reason: r.manualReason ?? "",
      locked: true,
    });
  }

  function openCreate() {
    setSaveError(null);
    setDraft({
      targetUserId: staff[0]?.id ?? "",
      userName: staff[0]?.name ?? "",
      workDate: "",
      checkInAt: "",
      checkOutAt: "",
      reason: "",
      locked: false,
    });
  }

  async function submitCorrection() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await correctAttendance(charityId, {
        targetUserId: draft.targetUserId,
        workDate: draft.workDate,
        checkInAt: draft.checkInAt || null,
        checkOutAt: draft.checkOutAt || null,
        reason: draft.reason,
      });
      if (!res.success) {
        setSaveError(res.error);
        return;
      }
      setDraft(null);
      startCorrection(() => router.refresh());
    } finally {
      setSaving(false);
    }
  }
  const filtered = useMemo(() => {
    const q = query.trim();
    return records.filter((r) => {
      if (onlySuspicious && !r.isSuspicious) return false;
      if (q && !r.userName.includes(q)) return false;
      return true;
    });
  }, [records, query, onlySuspicious]);

  const totals = useMemo(
    () => ({
      records: records.length,
      late: records.filter((r) => r.status === "LATE").length,
      earlyLeave: records.filter((r) => r.status === "EARLY_LEAVE").length,
      suspicious: records.filter((r) => r.isSuspicious).length,
      autoClosed: records.filter((r) => r.autoClosedAt).length,
      // Summed across staff rather than counted from records: there IS no
      // record for a day someone did not come.
      absent: summary.reduce((total, row) => total + row.absent, 0),
      leave: summary.reduce((total, row) => total + row.leaveDays, 0),
    }),
    [records, summary]
  );

  /**
   * CSV export, built and downloaded in the browser. The BOM is what makes
   * Excel open Arabic text as UTF-8 instead of mojibake.
   */
  function exportCsv() {
    const header = [
      "الموظف",
      "التاريخ",
      "الحضور",
      "الانصراف",
      "الحالة",
      "الموقع",
      "المسافة (م)",
      "IP",
      "مراجعة",
    ];
    const rows = filtered.map((r) => [
      r.userName,
      civilDay(r.workDate),
      riyadhTime(r.checkInAt),
      riyadhTime(r.checkOutAt),
      ATTENDANCE_STATUS_LABELS[r.status] ?? r.status,
      r.siteName ?? "",
      r.checkInDistance !== null ? String(Math.round(r.checkInDistance)) : "",
      r.ipAddress ?? "",
      r.isSuspicious ? r.suspiciousReason ?? "يحتاج مراجعة" : "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `حضور-${charityName}-${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* People who never closed their day. Surfaced here rather than as a
          notification because the charity portal has no notification centre,
          and this is the screen a manager already opens to review attendance. */}
      {totals.autoClosed > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4
                        bg-amber-500/[0.07] shadow-[inset_0_0_0_1px_rgb(217_119_6_/_.22)]">
          <MoonStar className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-amber-700 dark:text-amber-400 font-semibold" style={fs.body}>
            {totals.autoClosed} يوم لم يُسجَّل انصرافه، وأُغلق آلياً على وقت نهاية الدوام
          </p>
          <span className="text-amber-600/80 dark:text-amber-400/70" style={fs.meta}>
            الأوقات المكتوبة فيها افتراضية — راجعها وصحّح ما يلزم
          </span>
        </div>
      )}

      {/* ── Bento: four counters, deliberately uneven spans ───────────────── */}
      <section className="grid grid-cols-12 gap-4 hr-reveal">
        <div className="col-span-6 lg:col-span-3">
          <StatTile label="سجلات الشهر" value={totals.records} />
        </div>
        <div className="col-span-6 lg:col-span-3">
          <StatTile label="تأخير" value={totals.late} tone="warn" />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <StatTile label="انصراف مبكر" value={totals.earlyLeave} tone="warn" />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <StatTile
            label="غياب"
            value={totals.absent}
            tone={totals.absent > 0 ? "danger" : "neutral"}
            hint="أيام عمل مضت بلا تحضير"
          />
        </div>
        <div className="col-span-6 lg:col-span-2">
          <StatTile label="إجازات" value={totals.leave} hint="لا تُحتسب غياباً" />
        </div>
        <div className="col-span-12 lg:col-span-12">
          <StatTile
            label="يحتاج مراجعة"
            value={totals.suspicious}
            tone={totals.suspicious > 0 ? "danger" : "neutral"}
            hint={totals.suspicious > 0 ? "مؤشرات للمراجعة، وليست إثباتاً للتزوير" : undefined}
          />
        </div>
      </section>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <HrCard className="p-4">
        <div className="grid grid-cols-12 gap-4 items-end">
          <Field label="الشهر" className="col-span-12 sm:col-span-3">
            <select
              value={month}
              onChange={(e) => router.push(`?month=${e.target.value}`)}
              className={`${inputClass} tabular-nums`}
              style={fs.body}
              dir="ltr"
            >
              {recentMonths(currentMonth, month).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <Field label="بحث باسم الموظف" className="col-span-12 sm:col-span-5">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`${inputClass} pr-10`}
                style={fs.body}
                placeholder="اسم الموظف"
              />
            </div>
          </Field>

          <div className="col-span-12 sm:col-span-4 flex flex-wrap gap-2">
            {totals.suspicious > 0 && (
              <button
                onClick={() => setOnlySuspicious(!onlySuspicious)}
                aria-pressed={onlySuspicious}
                style={fs.body}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium
                            transition-[box-shadow,color,background-color] duration-300 ${
                              onlySuspicious
                                ? "text-amber-700 dark:text-amber-300 bg-amber-500/[0.08] shadow-[var(--hr-shadow-warn)]"
                                : "text-slate-600 dark:text-slate-300 shadow-[inset_0_0_0_1px_rgb(100_116_139_/_.20)] hover:shadow-[var(--hr-shadow-warn)]"
                            }`}
              >
                <AlertTriangle className="w-4 h-4" />
                {onlySuspicious ? "عرض الكل" : `للمراجعة (${totals.suspicious})`}
              </button>
            )}
            <button onClick={exportCsv} className={ghostClass} style={fs.body}>
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
          </div>
        </div>
      </HrCard>

      {/* ── Bento: per-employee roll-up (4) beside the detail log (8) ─────── */}
      <section className="grid grid-cols-12 gap-4 hr-reveal">
        <div className="col-span-12 lg:col-span-4">
          <HrCard className="h-full">
            <div className="p-6 pb-4">
              <SectionHead icon={Users} title="ملخص الموظفين" hint={`${summary.length} موظف`} />
            </div>

            {summary.length === 0 ? (
              <p className="px-6 pb-8 text-slate-400" style={fs.body}>
                لا يوجد موظفون
              </p>
            ) : (
              <ul>
                {summary.map((row) => (
                  <li
                    key={row.id}
                    className="px-6 py-4 space-y-2
                               shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]
                               transition-colors duration-300
                               hover:bg-primary/[0.02] dark:hover:bg-teal-400/[0.02]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span
                        className="font-semibold text-slate-800 dark:text-slate-100 truncate"
                        style={fs.h3}
                      >
                        {row.name}
                      </span>
                      {row.suspicious > 0 && <Chip tone="danger">{row.suspicious} للمراجعة</Chip>}
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 tabular-nums"
                      style={fs.meta}
                    >
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {row.present} حاضر
                      </span>
                      <span className="text-amber-600 dark:text-amber-400">{row.late} متأخر</span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {row.earlyLeave} مبكر
                      </span>
                      <span
                        className={
                          row.absent > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-400 dark:text-slate-500"
                        }
                      >
                        {row.absent} غياب
                      </span>
                      {row.leaveDays > 0 && (
                        <span className="text-sky-600 dark:text-sky-400">
                          {row.leaveDays} إجازة
                        </span>
                      )}
                      <span
                        className="text-slate-400 dark:text-slate-500"
                        title="الرصيد السنوي المتبقي من الإجازات السنوية"
                      >
                        رصيد {Math.max(0, row.leaveAllowance - row.leaveUsedThisYear)} /{" "}
                        {row.leaveAllowance}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </HrCard>
        </div>

        <div className="col-span-12 lg:col-span-8">
          <HrCard className="h-full">
            <div className="p-6 pb-4">
              <SectionHead
                icon={Table2}
                title="السجلات التفصيلية"
                hint={`${filtered.length} من ${records.length}`}
                action={
                  canCorrect && staff.length > 0 ? (
                    <button onClick={openCreate} className={ghostClass} style={fs.meta}>
                      <Plus className="w-3.5 h-3.5" />
                      تسجيل يدوي
                    </button>
                  ) : undefined
                }
              />
            </div>

            {filtered.length === 0 ? (
              <p className="px-6 pb-8 text-slate-400" style={fs.body}>
                لا توجد سجلات مطابقة
              </p>
            ) : (
              // The table scrolls inside its own card rather than pushing the
              // page sideways — the header and summary stay put while reading.
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={fs.meta}>
                  <thead>
                    <tr className="shadow-[inset_0_-1px_0_0_rgb(100_116_139_/_.14)]">
                      <th className={`${thClass} hr-eyebrow`}>الموظف</th>
                      <th className={`${thClass} hr-eyebrow`}>التاريخ</th>
                      <th className={`${thClass} hr-eyebrow`}>حضور</th>
                      <th className={`${thClass} hr-eyebrow`}>انصراف</th>
                      <th className={`${thClass} hr-eyebrow`}>الحالة</th>
                      <th className={`${thClass} hr-eyebrow`}>الموقع</th>
                      <th className={`${thClass} hr-eyebrow`}>المسافة</th>
                      <th className={`${thClass} hr-eyebrow`}>IP</th>
                      {canCorrect && <th className={`${thClass} hr-eyebrow`}>تصحيح</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.id}
                        className={`shadow-[inset_0_1px_0_0_rgb(100_116_139_/_.10)]
                                    transition-colors duration-300
                                    hover:bg-primary/[0.02] dark:hover:bg-teal-400/[0.02]
                                    ${r.isSuspicious ? "bg-amber-500/[0.04]" : ""}`}
                      >
                        <td className={tdClass}>
                          <div className="flex items-center gap-2">
                            {r.isSuspicious && (
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                              {r.userName}
                            </span>
                            {r.manualAt && (
                              <Chip tone="neutral">
                                <PencilLine className="w-3 h-3" />
                                يدوي
                              </Chip>
                            )}
                          </div>
                          {r.manualAt && r.manualReason && (
                            <p
                              className="text-slate-400 dark:text-slate-500 mt-2 max-w-[200px]"
                              style={fs.eyebrow}
                            >
                              {r.manualReason}
                            </p>
                          )}
                          {r.isSuspicious && r.suspiciousReason && (
                            <p
                              className="text-amber-600 dark:text-amber-400 mt-2 max-w-[200px]"
                              style={fs.eyebrow}
                            >
                              {r.suspiciousReason}
                            </p>
                          )}
                        </td>
                        <td className={`${tdClass} text-slate-400 tabular-nums whitespace-nowrap`} dir="ltr">
                          {civilDay(r.workDate)}
                        </td>
                        <td className={`${tdClass} text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap`}>
                          {riyadhTime(r.checkInAt)}
                        </td>
                        <td className={`${tdClass} text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap`}>
                          {riyadhTime(r.checkOutAt)}
                          {r.autoClosedAt && (
                            <span
                              className="block text-amber-600 dark:text-amber-400 mt-1"
                              style={fs.eyebrow}
                              title="لم يسجّل انصرافه؛ أُغلق اليوم آلياً على وقت نهاية الدوام"
                            >
                              أُغلق تلقائياً
                            </span>
                          )}
                        </td>
                        <td className={tdClass}>
                          <Chip tone={statusTone[r.status] ?? "neutral"}>
                            {ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}
                          </Chip>
                        </td>
                        <td className={`${tdClass} text-slate-500 dark:text-slate-400 whitespace-nowrap`}>
                          {r.siteName ?? "—"}
                        </td>
                        <td
                          className={`${tdClass} text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap`}
                          dir="ltr"
                        >
                          {r.checkInDistance !== null ? `${Math.round(r.checkInDistance)} m` : "—"}
                          {r.checkInAccuracy !== null && (
                            <span className="text-slate-400 dark:text-slate-600">
                              {" "}
                              ±{Math.round(r.checkInAccuracy)}
                            </span>
                          )}
                        </td>
                        <td
                          className={`${tdClass} text-slate-400 dark:text-slate-600 font-mono tabular-nums whitespace-nowrap`}
                          dir="ltr"
                        >
                          {r.ipAddress ?? "—"}
                        </td>
                        {canCorrect && (
                          <td className={tdClass}>
                            <button
                              onClick={() => openEdit(r)}
                              className={ghostClass}
                              style={fs.meta}
                              title="تصحيح هذا السجل"
                            >
                              <PencilLine className="w-3.5 h-3.5" />
                              تصحيح
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </HrCard>
        </div>
      </section>

      {draft && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
          <HrCard className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-5 rounded-b-none sm:rounded-3xl">
            <SectionHead
              icon={PencilLine}
              title={draft.locked ? `تصحيح سجل ${draft.userName}` : "تسجيل حضور يدوياً"}
              hint={draft.locked ? undefined : "للحالات التي تعذّر فيها تحديد الموقع"}
              action={
                <button onClick={() => setDraft(null)} className={ghostClass} style={fs.meta}>
                  <X className="w-4 h-4" />
                </button>
              }
            />

            <p className="text-slate-400 dark:text-slate-500" style={fs.meta}>
              السجل المُدخَل يدوياً لا يحمل أي إثبات للموقع، ويظهر موسوماً بـ«يدوي» لكل
              من يطّلع على التقرير.
            </p>

            {!draft.locked && (
              <Field label="الموظف">
                <select
                  value={draft.targetUserId}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      targetUserId: e.target.value,
                      userName: staff.find((m) => m.id === e.target.value)?.name ?? "",
                    })
                  }
                  className={inputClass}
                  style={fs.body}
                >
                  {staff.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="التاريخ">
              <input
                type="date"
                value={draft.workDate}
                disabled={draft.locked}
                onChange={(e) => setDraft({ ...draft, workDate: e.target.value })}
                className={inputClass}
                style={fs.body}
                dir="ltr"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="وقت الحضور">
                <input
                  type="time"
                  value={draft.checkInAt}
                  onChange={(e) => setDraft({ ...draft, checkInAt: e.target.value })}
                  className={inputClass}
                  style={fs.body}
                  dir="ltr"
                />
              </Field>
              <Field label="وقت الانصراف">
                <input
                  type="time"
                  value={draft.checkOutAt}
                  onChange={(e) => setDraft({ ...draft, checkOutAt: e.target.value })}
                  className={inputClass}
                  style={fs.body}
                  dir="ltr"
                />
              </Field>
            </div>

            <Field
              label="سبب التصحيح"
              hint={draft.checkInAt ? undefined : "ترك وقت الحضور فارغاً يحذف السجل ويعيد اليوم غياباً."}
            >
              <input
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                placeholder="مثال: تعذّر تحديد الموقع داخل المبنى"
                className={inputClass}
                style={fs.body}
              />
            </Field>

            {saveError && (
              <p className="text-rose-600 dark:text-rose-400 font-semibold" style={fs.meta}>
                {saveError}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={submitCorrection}
                disabled={saving || draft.reason.trim().length < 3 || !draft.workDate}
                className={ctaClass}
                style={fs.body}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                حفظ التصحيح
              </button>
              <button onClick={() => setDraft(null)} className={ghostClass} style={fs.body}>
                إلغاء
              </button>
            </div>
          </HrCard>
        </div>
      )}
    </div>
  );
}
