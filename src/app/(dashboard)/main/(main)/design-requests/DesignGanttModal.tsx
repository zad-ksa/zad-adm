"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Table2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn, cx } from "@/components/console/ui";
import { theadRowClass, thClass, tbodyClass, tdClass } from "@/components/console/layout";

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

/**
 * Where the tooltip sits: centred over the bar it describes, read once from the
 * bar's box when the pointer arrives — not from the pointer, so it holds still
 * while the mouse travels along the bar.
 *
 * Physical `left`, not `inset-inline-start`: the box comes from
 * getBoundingClientRect, which measures from the left edge. Feeding that to a
 * logical property in an RTL page mirrored it — a bar on the right got its
 * tooltip on the left.
 *
 * Near a screen edge the tooltip slides inward to stay whole, and its pointer
 * shifts the other way so it still lands on the bar. With no room above (a bar
 * in the first rows), it opens below instead.
 */
const TOOLTIP_HALF = 130; // half of max-w-[260px]
const TOOLTIP_GAP = 8;
const TOOLTIP_ROOM = 96; // roughly the tooltip's height plus its gap

type Anchor = {
  item: GanttItem;
  center: number;
  top: number;
  bottom: number;
  below: boolean;
  arrowShift: number;
};

function anchorTo(item: GanttItem, bar: HTMLElement): Anchor {
  const r = bar.getBoundingClientRect();
  const barCenter = r.left + r.width / 2;
  const margin = TOOLTIP_HALF + 8;
  const center = Math.min(Math.max(barCenter, margin), window.innerWidth - margin);
  return {
    item,
    center,
    top: r.top,
    bottom: r.bottom,
    below: r.top < TOOLTIP_ROOM,
    arrowShift: barCenter - center,
  };
}

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
  const [hovered, setHovered] = useState<Anchor | null>(null);

  // The tooltip is pinned to where the bar was; once the chart scrolls, that
  // place is wrong. Hide it rather than leave it floating over another bar.
  useEffect(() => {
    if (!hovered) return;
    const hide = () => setHovered(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [hovered]);

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
    <Dialog
size="2xl"
flush
scopeClassName="design-requests-ui dr-gantt"
title="المخطط الزمني للتصاميم"
description="كل جمعية وأمامها تصاميمها من بدء التنفيذ إلى التسليم"
onClose={onClose}
>
<div>
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
{/* Filters and the view switch, one row above the chart. */}
<div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            {LANES.map((lane) => (
              <span key={lane.key} className="flex items-center gap-1.5 text-caption text-slate-600 dark:text-slate-300">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0"
                  style={{ background: `var(--g-${lane.key.toLowerCase().replace("_", "-")})` }}
                />
                {lane.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-caption font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
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
              className={btn.secondary}
            >
              {asTable ? <CalendarRange className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
              {asTable ? "المخطط" : "جدول"}
            </button>
          </div>
        </div>
<div className="flex-1 overflow-auto p-5">
          {rows.length === 0 || !scale ? (
            <p className="py-16 text-center text-meta text-slate-400 dark:text-slate-500">
              لا توجد تصاميم مجدولة لعرضها.
            </p>
          ) : asTable ? (
            // The table is not a fallback for failure — it is the relief the
            // palette check requires, and the way these values stay reachable
            // without a pointer.
            <div className="overflow-x-auto">
              <table className="w-full text-meta border-collapse">
                <thead>
                  <tr className={theadRowClass}>
                    <th className={thClass}>الجهة</th>
                    <th className={thClass}>التصميم</th>
                    <th className={thClass}>بدء التنفيذ</th>
                    <th className={thClass}>التسليم</th>
                    <th className={thClass}>الحالة</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {rows.flatMap((row) =>
                    row.items.map((item) => (
                      <tr key={item.id} className="text-slate-700 dark:text-slate-300">
                        <td className={tdClass}>{row.charityName}</td>
                        <td className={cx(tdClass, "font-semibold")}>{item.title}</td>
                        <td className={cx(tdClass, "tabular-nums")}>{fmtFull(item.startMs)}</td>
                        <td className={cx(tdClass, "tabular-nums")}>{fmtFull(item.endMs)}</td>
                        <td className={tdClass}>
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
                      className="absolute top-0 -translate-x-1/2 rtl:translate-x-1/2 text-caption text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap"
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
                        className="text-meta font-semibold text-slate-700 dark:text-slate-200 truncate"
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
                            onMouseEnter={(e) => setHovered(anchorTo(item, e.currentTarget))}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={(e) => setHovered(anchorTo(item, e.currentTarget))}
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
{/* Tooltip: the design's name, anchored to the bar itself — centred on it, with a
    pointer back to it, and still while the mouse moves along the bar. */}
{hovered && (
          <div
            role="tooltip"
            className="fixed z-[60] pointer-events-none"
            style={{
              left: hovered.center,
              top: hovered.below ? hovered.bottom + TOOLTIP_GAP : hovered.top - TOOLTIP_GAP,
              transform: hovered.below ? "translateX(-50%)" : "translate(-50%, -100%)",
            }}
          >
            <div className="relative w-max max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg motion-safe:animate-[zad-fade-in_120ms_ease-out] dark:border-slate-700 dark:bg-slate-900">
              <span
                aria-hidden
                className={`absolute size-2.5 rotate-45 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
                  hovered.below ? "-top-[6px] border-l border-t" : "-bottom-[6px] border-b border-r"
                }`}
                style={{ left: `calc(50% + ${hovered.arrowShift}px - 5px)` }}
              />
            <p className="text-meta font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
              {hovered.item.title}
            </p>
            <p className="mt-1 text-caption text-slate-500 dark:text-slate-400 tabular-nums">
              {fmtFull(hovered.item.startMs)} ← {fmtFull(hovered.item.endMs)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-slate-500 dark:text-slate-400">
              <span
                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                style={{ background: `var(--g-${laneOf(hovered.item).toLowerCase().replace("_", "-")})` }}
              />
              {LANES.find((l) => l.key === laneOf(hovered.item))?.label}
            </p>
            </div>
          </div>
        )}
</div>
</Dialog>
  );
}
