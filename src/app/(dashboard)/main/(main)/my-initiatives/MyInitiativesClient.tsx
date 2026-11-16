"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CalendarRange, ListChecks } from "lucide-react";
import { EmptyState, PageHeader, SearchField } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Badge, cx } from "@/components/console/ui";
import {
  STATUS_LABEL,
  STATUS_TONE,
  daysRemaining,
  initiativePercent,
  initiativeStatus,
} from "@/lib/initiativeProgress";

/**
 * «مبادراتي» — بطاقاتٌ لا جدول.
 *
 * والبطاقةُ هنا أصدق: المعروضُ مبادراتٌ من **جمعياتٍ شتّى**، لكلٍّ خطّتُها
 * وأشهرُها — فأعمدةٌ موحَّدةٌ تجمعها تُكذِّب ما بينها من فروق، وتعود بالجدول
 * العريض الذي يُلَفّ يميناً ويساراً. وما يُسأل عنه في هذه الصفحة قليل: أين هي،
 * وأين بلغت، وكم بقي لها.
 */

export type MyInitiativeRow = {
  id: string;
  number: number;
  name: string;
  charityId: string;
  charityName: string;
  planLabel: string;
  objective: string | null;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  steps: { progress: number; cost: number | null; actualCost: number | null }[];
  /** رابطُ صفحة المبادرة — أو `null` لمن لا يُفتح له بابُها. */
  href: string | null;
};

const BAR: Record<string, string> = {
  DONE: "bg-emerald-500",
  RUNNING: "bg-primary",
  AT_RISK: "bg-red-500",
  NOT_STARTED: "bg-slate-300 dark:bg-slate-600",
};

export default function MyInitiativesClient({
  myName,
  rows,
}: {
  myName: string;
  rows: MyInitiativeRow[];
}) {
  const [query, setQuery] = useState("");
  const [charityFilter, setCharityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const today = useMemo(() => new Date(), []);

  const computed = useMemo(
    () =>
      rows.map((row) => {
        const percent = initiativePercent(row.steps);
        const start = row.startDate ? new Date(`${row.startDate}T00:00:00Z`) : null;
        const end = row.endDate ? new Date(`${row.endDate}T00:00:00Z`) : null;
        return {
          row,
          percent,
          status: initiativeStatus({ percent, startDate: start, endDate: end, today }),
          remaining: daysRemaining(end, today),
        };
      }),
    [rows, today]
  );

  const charities = useMemo(
    () => [...new Set(rows.map((row) => row.charityName))].sort((a, b) => a.localeCompare(b, "ar")),
    [rows]
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return computed.filter(({ row, status }) => {
      if (charityFilter !== "all" && row.charityName !== charityFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!needle) return true;
      return [row.name, row.charityName, row.planLabel, row.objective].some(
        (value) => value && value.toLowerCase().includes(needle)
      );
    });
  }, [computed, query, charityFilter, statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of computed) map.set(item.status, (map.get(item.status) ?? 0) + 1);
    return map;
  }, [computed]);

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        icon={<ListChecks className="size-5 text-primary" />}
        title="مبادراتي"
        description={
          rows.length === 0
            ? "المبادرات التي كتب اسمك مديرا لها في الخطط التشغيلية"
            : `${rows.length} مبادرة انت مديرها في ${charities.length} ${charities.length === 1 ? "جمعية" : "جمعيات"}`
        }
        actions={
          rows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(STATUS_LABEL).map(([status, label]) =>
                counts.get(status) ? (
                  <Badge key={status} tone={STATUS_TONE[status as keyof typeof STATUS_TONE]}>
                    {label}: {counts.get(status)}
                  </Badge>
                ) : null
              )}
            </div>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title="لا مبادرات مكلف بها"
          description={`تظهر هنا كل مبادرة كتب فيها «${myName}» مديرا لها في الخطة التشغيلية لاي جمعية.`}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="ابحث في مبادراتك…"
              label="بحث في المبادرات"
              className="min-w-[180px] flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[190px]">
                <Select
                  variant="soft"
                  value={charityFilter}
                  onSelect={setCharityFilter}
                  placeholder="الجمعية"
                  options={[
                    { value: "all", label: "كل الجمعيات" },
                    ...charities.map((name) => ({ value: name, label: name })),
                  ]}
                />
              </div>
              <div className="w-[160px]">
                <Select
                  variant="soft"
                  value={statusFilter}
                  onSelect={setStatusFilter}
                  placeholder="الحالة"
                  options={[
                    { value: "all", label: "كل الحالات" },
                    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
                  ]}
                />
              </div>
            </div>
          </div>

          {shown.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="size-6" />}
              title="لا نتائج لهذه التصفية"
              description="غير الجمعية او الحالة او امسح البحث."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shown.map(({ row, percent, status, remaining }) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-caption text-slate-500 dark:text-slate-400">
                      <Building2 className="size-3.5 shrink-0" />
                      <span className="truncate">{row.charityName}</span>
                    </span>
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  </div>

                  <div className="min-w-0 space-y-1">
                    {row.href ? (
                      <Link
                        href={row.href}
                        className="block text-body font-semibold text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <p className="text-body font-semibold text-slate-800 dark:text-slate-100">{row.name}</p>
                    )}
                    {row.objective && (
                      <p className="line-clamp-2 text-caption text-slate-500 dark:text-slate-400">{row.objective}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-slate-500 dark:text-slate-400">نسبة الإنجاز</span>
                      <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {percent === null ? "—" : `${percent}%`}
                      </span>
                    </div>
                    {/* الشريطُ يقول ما تقوله الحالة، فلونُه لونُها لا لونٌ ثابت. */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={cx("h-full rounded-full transition-[width]", BAR[status])}
                        style={{ width: `${percent ?? 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-caption text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarRange className="size-3.5" />
                      <span className="tabular-nums">{row.startDate || "—"}</span>
                      <span aria-hidden>→</span>
                      <span className="tabular-nums">{row.endDate || "—"}</span>
                    </span>
                    {remaining !== null && (
                      <span className={cx("tabular-nums", remaining < 0 && "text-red-600 dark:text-red-400")}>
                        {remaining < 0 ? `تأخرت ${Math.abs(remaining)} يوما` : `بقي ${remaining} يوما`}
                      </span>
                    )}
                  </div>

                  <p className="text-caption text-slate-400 dark:text-slate-500">خطة: {row.planLabel}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
