"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Table2, X } from "lucide-react";

/**
 * Every scheduled design on one timeline, a row per charity.
 *
 * The question it answers is the one no list can: whose work overlaps whose,
 * where the gaps are, and what the team is actually committed to next week. A
 * sorted list gives you dates one at a time; only a shared scale shows two
 * charities' designs landing on the same three days.
 *
 * The bar spans scheduled start → expected delivery, so its LENGTH is the
 * promise. Consecutive designs in one charity's queue are chained end-to-start
 * by the scheduler, so they touch — the 2px surface gap between them is what
 * keeps "one long job" from reading the same as "three short ones".
 */

/** Colour follows the state of the work, and every state is named in the legend. */
type Lane = "IN_PROGRESS" | "QUEUED" | "REVISING" | "DELIVERED";

const LANES: { key: Lane; label: string }[] = [
  { key: "IN_PROGRESS", label: "قيد التنفيذ" },
  { key: "QUEUED", label: "في الدور" },
  { key: "REVISING", label: "قيد التعديل" },
  { key: "DELIVERED", label: "سُلّم أو أُنجز" },
];

export type GanttItem = {
  id: string;
  title: string;
  charityName: string;
  status: string;
  startedAt: string | null;
  startMs: number;
  endMs: number;
};

function laneOf(item: GanttItem): Lane {
  if (item.status === "REVISION_REQUESTED") return "REVISING";
  if (item.status === "AWAITING_REVIEW" || item.status === "COMPLETED") return "DELIVERED";
  return item.startedAt ? "IN_PROGRESS" : "QUEUED";
}

const DAY = 24 * 60 * 60 * 1000;

const fmtDate = (ms: number) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" })
    .format(new Date(ms));

const fmtFull = (ms: number) =>
  new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" })
    .format(new Date(ms));

export default function DesignGanttModal({
  items,
  now,
  onClose,
}: {
  items: GanttItem[];
  /**
   * "Today", stamped by the caller when the chart was opened.
   *
   * Passed in rather than read here: Date.now() during render is impure, and
   * the honest reading is anyway the moment the reader asked for the chart,
   * not the moment React happened to re-render it.
   */
  now: number;
  onClose: () => void;
}) {
  const [showDelivered, setShowDelivered] = useState(false);
  const [asTable, setAsTable] = useState(false);
  const [hovered, setHovered] = useState<{ item: GanttItem; x: number; y: number } | null>(null);

  const visible = useMemo(
    () => (showDelivered ? items : items.filter((i) => laneOf(i) !== "DELIVERED")),
    [items, showDelivered]
  );

  // The scale, padded by a day at each end so a bar never sits flush against
  // the frame and the first tick has room for its label.
  const scale = useMemo(() => {
    if (visible.length === 0) return null;
    const min = Math.min(...visible.map((i) => i.startMs)) - DAY;
    const max = Math.max(...visible.map((i) => i.endMs)) + DAY;
    return { min, max, span: Math.max(max - min, DAY) };
  }, [visible]);

  const rows = useMemo(() => {
    const byCharity = new Map<string, GanttItem[]>();
    for (const item of visible) {
      const list = byCharity.get(item.charityName) ?? [];
      list.push(item);
      byCharity.set(item.charityName, list);
    }
    return [...byCharity.entries()]
      .map(([charityName, list]) => ({
        charityName,
        items: [...list].sort((a, b) => a.startMs - b.startMs),
      }))
      // Busiest first: the row you scroll to is the one with the most on it.
      .sort((a, b) => b.items.length - a.items.length || a.charityName.localeCompare(b.charityName, "ar"));
  }, [visible]);

  /** Weekly ticks while the span is short, fortnightly once it stops fitting. */
  const ticks = useMemo(() => {
    if (!scale) return [];
    const days = scale.span / DAY;
    const stepDays = days <= 21 ? 3 : days <= 60 ? 7 : days <= 180 ? 14 : 30;
    const out: { ms: number; pct: number }[] = [];
    for (let ms = scale.min; ms <= scale.max; ms += stepDays * DAY) {
      out.push({ ms, pct: ((ms - scale.min) / scale.span) * 100 });
    }
    return out;
  }, [scale]);

  const nowPct = scale ? ((now - scale.min) / scale.span) * 100 : null;

  return (
    <div className="design-requests-ui fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="dr-gantt bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-[var(--dr-shadow-card)] w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        {/* The palette lives on the root as tokens so light/dark swap in one
            place, and both scopes are declared: the media query covers the OS
            setting, the data-theme scope covers the in-app toggle. */}
        <style>{`
          .dr-gantt {
            --g-surface: #ffffff;
            --g-grid: #e8e8e5;
            --g-in-progress: #2a78d6;
            --g-queued: #eb6834;
            --g-revising: #1baf7a;
            --g-delivered: #b9b8b2;
            --g-now: #d03b3b;
          }
          @media (prefers-color-scheme: dark) {
            :root:where(:not([data-theme="light"])) .dr-gantt {
              --g-surface: #0f172a;
              --g-grid: #2b2b28;
              --g-in-progress: #3987e5;
              --g-queued: #d95926;
              --g-revising: #199e70;
              --g-delivered: #5c5b56;
              --g-now: #e66767;
            }
          }
          :root[data-theme="dark"] .dr-gantt {
            --g-surface: #0f172a;
            --g-grid: #2b2b28;
            --g-in-progress: #3987e5;
            --g-queued: #d95926;
            --g-revising: #199e70;
            --g-delivered: #5c5b56;
            --g-now: #e66767;
          }
          .dr-gantt-bar {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            height: 18px;
            border-radius: 4px;
            /* The gap, not a stroke, is what separates two chained designs. */
            box-shadow: 0 0 0 2px var(--g-surface);
            cursor: default;
          }
          .dr-gantt-bar:hover,
          .dr-gantt-bar:focus-visible {
            filter: brightness(1.12);
            outline: none;
          }
        `}</style>

        <header className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[15px] font-black text-slate-900 dark:text-slate-100">
              المخطط الزمني للتصاميم
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              كل جمعية وأمامها تصاميمها من بدء التنفيذ إلى التسليم
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Filters and the view switch, one row above the chart. */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {LANES.map((lane) => (
              <span key={lane.key} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0"
                  style={{ background: `var(--g-${lane.key.toLowerCase().replace("_", "-")})` }}
                />
                {lane.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showDelivered}
                onChange={(e) => setShowDelivered(e.target.checked)}
                className="accent-primary"
              />
              إظهار المُسلَّمة
            </label>
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {asTable ? <CalendarRange className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
              {asTable ? "المخطط" : "جدول"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {rows.length === 0 || !scale ? (
            <p className="py-16 text-center text-[12px] text-slate-400 dark:text-slate-500">
              لا توجد تصاميم مجدولة لعرضها.
            </p>
          ) : asTable ? (
            // The table is not a fallback for failure — it is the relief the
            // palette check requires, and the way these values stay reachable
            // without a pointer.
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 text-right">
                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-800">الجهة</th>
                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-800">التصميم</th>
                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-800">بدء التنفيذ</th>
                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-800">التسليم</th>
                    <th className="py-2 px-3 font-bold border-b border-slate-200 dark:border-slate-800">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.flatMap((row) =>
                    row.items.map((item) => (
                      <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                        <td className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60">{row.charityName}</td>
                        <td className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60 font-bold">{item.title}</td>
                        <td className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60 tabular-nums">{fmtFull(item.startMs)}</td>
                        <td className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60 tabular-nums">{fmtFull(item.endMs)}</td>
                        <td className="py-2 px-3 border-b border-slate-100 dark:border-slate-800/60">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                              style={{ background: `var(--g-${laneOf(item).toLowerCase().replace("_", "-")})` }}
                            />
                            {LANES.find((l) => l.key === laneOf(item))?.label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-w-[640px]">
              {/* Date scale */}
              <div className="flex items-end gap-3 mb-1">
                <div className="w-36 shrink-0" />
                <div className="relative flex-1 h-5">
                  {ticks.map((t) => (
                    <span
                      key={t.ms}
                      className="absolute top-0 -translate-x-1/2 rtl:translate-x-1/2 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap"
                      style={{ insetInlineStart: `${t.pct}%` }}
                    >
                      {fmtDate(t.ms)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                {rows.map((row) => (
                  <div key={row.charityName} className="flex items-stretch gap-3">
                    <div className="w-36 shrink-0 flex items-center">
                      <span
                        className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate"
                        title={row.charityName}
                      >
                        {row.charityName}
                      </span>
                    </div>

                    <div className="relative flex-1 h-9 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      {/* Hairline gridlines, one step off the surface. */}
                      {ticks.map((t) => (
                        <span
                          key={t.ms}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ insetInlineStart: `${t.pct}%`, background: "var(--g-grid)" }}
                        />
                      ))}

                      {nowPct !== null && nowPct >= 0 && nowPct <= 100 && (
                        <span
                          className="absolute top-0 bottom-0 w-px z-10"
                          style={{ insetInlineStart: `${nowPct}%`, background: "var(--g-now)" }}
                          title="اليوم"
                        />
                      )}

                      {row.items.map((item) => {
                        const startPct = ((item.startMs - scale.min) / scale.span) * 100;
                        const widthPct = Math.max(
                          ((item.endMs - item.startMs) / scale.span) * 100,
                          0.8
                        );
                        const lane = laneOf(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="dr-gantt-bar"
                            style={{
                              insetInlineStart: `${startPct}%`,
                              inlineSize: `${widthPct}%`,
                              background: `var(--g-${lane.toLowerCase().replace("_", "-")})`,
                            }}
                            aria-label={`${item.title} — من ${fmtFull(item.startMs)} إلى ${fmtFull(item.endMs)}`}
                            onMouseEnter={(e) =>
                              setHovered({ item, x: e.clientX, y: e.clientY })
                            }
                            onMouseMove={(e) => setHovered({ item, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={(e) => {
                              const r = e.currentTarget.getBoundingClientRect();
                              setHovered({ item, x: r.left + r.width / 2, y: r.top });
                            }}
                            onBlur={() => setHovered(null)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tooltip: the design's name, which is what the pointer is asking for. */}
        {hovered && (
          <div
            className="fixed z-[60] pointer-events-none rounded-lg px-3 py-2 shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-[260px]"
            style={{
              insetInlineStart: Math.min(hovered.x + 12, window.innerWidth - 280),
              top: Math.max(hovered.y - 64, 8),
            }}
          >
            <p className="text-[12px] font-black text-slate-900 dark:text-slate-100 break-words leading-snug">
              {hovered.item.title}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              {fmtFull(hovered.item.startMs)} ← {fmtFull(hovered.item.endMs)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span
                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                style={{ background: `var(--g-${laneOf(hovered.item).toLowerCase().replace("_", "-")})` }}
              />
              {LANES.find((l) => l.key === laneOf(hovered.item))?.label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
