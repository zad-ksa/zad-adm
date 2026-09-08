"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, Download, MoonStar, Wifi } from "lucide-react";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendanceTime";
import { copyToClipboard } from "@/lib/clipboard";

type Day = {
  workDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  isRemote: boolean;
  autoClosedAt: string | null;
  suspiciousReason: string | null;
};

type Row = {
  employeeId: string;
  name: string;
  groupName: string;
  present: number;
  late: number;
  earlyLeave: number;
  remote: number;
  absent: number;
  suspicious: number;
  days: Day[];
};

const time = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" })
        .format(new Date(iso))
    : "—";

const date = (iso: string) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", weekday: "short", timeZone: "Asia/Riyadh" })
    .format(new Date(iso));

export default function ReportClient({ month, rows }: { month: string; rows: Row[] }) {
  const router = useRouter();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totals = rows.reduce(
    (acc, r) => ({
      present: acc.present + r.present,
      late: acc.late + r.late,
      absent: acc.absent + r.absent,
      remote: acc.remote + r.remote,
    }),
    { present: 0, late: 0, absent: 0, remote: 0 }
  );

  /** CSV rather than a print sheet: this is a table people take into a spreadsheet. */
  const exportCsv = async () => {
    const header = ["الموظف", "المجموعة", "حاضر", "متأخر", "انصراف مبكر", "عن بُعد", "غياب"];
    const lines = rows.map((r) =>
      [r.name, r.groupName, r.present, r.late, r.earlyLeave, r.remote, r.absent].join(",")
    );
    // A BOM, so Excel opens Arabic as UTF-8 instead of mojibake.
    const csv = "﻿" + [header.join(","), ...lines].join("\n");
    const ok = await copyToClipboard(csv);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input
          type="month"
          value={month}
          dir="ltr"
          onChange={(e) => router.push(`/main/attendance/reports?month=${e.target.value}`)}
          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100"
        />
        <button
          onClick={exportCsv}
          className="h-9 px-4 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          {copied ? "نُسخ الجدول" : "نسخ كجدول"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "حاضر", value: totals.present },
          { label: "متأخر", value: totals.late },
          { label: "عن بُعد", value: totals.remote },
          { label: "غياب", value: totals.absent },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3"
          >
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className="text-[18px] font-black text-slate-900 dark:text-slate-100 tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-slate-400 dark:text-slate-500 text-right border-b border-slate-100 dark:border-slate-800">
                <th className="py-2.5 px-4 font-bold">الموظف</th>
                <th className="py-2.5 px-3 font-bold">المجموعة</th>
                <th className="py-2.5 px-3 font-bold">حاضر</th>
                <th className="py-2.5 px-3 font-bold">متأخر</th>
                <th className="py-2.5 px-3 font-bold">مبكر</th>
                <th className="py-2.5 px-3 font-bold">عن بُعد</th>
                <th className="py-2.5 px-3 font-bold">غياب</th>
                <th className="py-2.5 px-3 font-bold w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.employeeId}>
                  <tr
                    onClick={() => setOpenFor(openFor === r.employeeId ? null : r.employeeId)}
                    className="border-b border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {r.name}
                      {r.suspicious > 0 && (
                        <span
                          className="mr-1.5 text-amber-600 dark:text-amber-400"
                          title={`${r.suspicious} يوم عليه ملاحظة`}
                        >
                          <AlertTriangle className="w-3 h-3 inline" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{r.groupName}</td>
                    <td className="py-2.5 px-3 tabular-nums text-emerald-600 dark:text-emerald-400">{r.present}</td>
                    <td className="py-2.5 px-3 tabular-nums text-amber-600 dark:text-amber-400">{r.late}</td>
                    <td className="py-2.5 px-3 tabular-nums text-amber-600 dark:text-amber-400">{r.earlyLeave}</td>
                    <td className="py-2.5 px-3 tabular-nums text-indigo-600 dark:text-indigo-400">{r.remote}</td>
                    <td className="py-2.5 px-3 tabular-nums text-rose-600 dark:text-rose-400">{r.absent}</td>
                    <td className="py-2.5 px-3">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-300 transition-transform ${
                          openFor === r.employeeId ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>

                  {openFor === r.employeeId && (
                    <tr>
                      <td colSpan={8} className="bg-slate-50 dark:bg-slate-800/30 px-4 py-3">
                        {r.days.length === 0 ? (
                          <p className="text-[12px] text-slate-400">لا أيام مسجّلة هذا الشهر.</p>
                        ) : (
                          <ul className="space-y-1">
                            {r.days.map((d) => (
                              <li key={d.workDate} className="flex items-center gap-3 flex-wrap text-[12px]">
                                <span className="text-slate-600 dark:text-slate-300 w-24">{date(d.workDate)}</span>
                                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                                  {time(d.checkInAt)} ← {time(d.checkOutAt)}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {ATTENDANCE_STATUS_LABELS[d.status] ?? d.status}
                                </span>
                                {d.isRemote && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold inline-flex items-center gap-1">
                                    <Wifi className="w-3 h-3" /> عن بُعد
                                  </span>
                                )}
                                {d.autoClosedAt && (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold inline-flex items-center gap-1">
                                    <MoonStar className="w-3 h-3" /> أُغلق تلقائياً
                                  </span>
                                )}
                                {d.suspiciousReason && (
                                  <span className="text-amber-600 dark:text-amber-400">{d.suspiciousReason}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
        الغياب يُحسب على أيام العمل التي مضت في مجموعة كل موظف، بعد استبعاد العطل الرسمية
        وإجازاته وأي يوم عليه سجل. واليوم الجاري لا يُحسب غياباً على أحد.
      </p>
    </div>
  );
}
