"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatStrip, TableShell, Th, tbodyClass, tdClass, theadRowClass } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Badge, cx } from "@/components/console/ui";
import {
  budgetSummary,
  daysRemaining,
  expectedPercent,
  groupPercent,
  initiativePercent,
  initiativeStatus,
  scheduleAdherence,
  STATUS_LABEL,
  STATUS_TONE,
  type InitiativeStatus,
} from "@/lib/initiativeProgress";

export type DashboardPlan = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  weekCount: number;
  monthCount: number;
};

export type DashboardInitiative = {
  id: string;
  number: number;
  name: string;
  owningDept: string | null;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  steps: { progress: number; cost: number | null; actualCost: number | null }[];
};

const STATUS_ORDER: InitiativeStatus[] = ["NOT_STARTED", "RUNNING", "DONE", "AT_RISK"];

const STATUS_DOT: Record<InitiativeStatus, string> = {
  NOT_STARTED: "bg-slate-300 dark:bg-slate-600",
  RUNNING: "bg-amber-500",
  DONE: "bg-emerald-500",
  AT_RISK: "bg-red-500",
};

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const dash = <span className="text-slate-300 dark:text-slate-600">—</span>;

/**
 * لوحة معلومات المبادرات.
 *
 * ثلاث طبقات: أرقامُ الخطة كلّها، ثم توزيعُ الحالات، ثم مؤشراتُ الإدارات، ثم
 * صفٌّ لكل مبادرة. وكلّها من دالّات `initiativeProgress` — نفسها التي يحسب بها
 * الكشافُ وصفحةُ المبادرة.
 */
export default function OperationalDashboard({
  charityName,
  plans,
  selectedPlanId,
  initiatives,
}: {
  charityName: string;
  plans: DashboardPlan[];
  selectedPlanId: string;
  initiatives: DashboardInitiative[];
}) {
  const router = useRouter();
  const plan = plans.find((p) => p.id === selectedPlanId)!;
  const today = useMemo(() => new Date(), []);

  const model = useMemo(() => {
    const rows = initiatives.map((row) => {
      const percent = initiativePercent(row.steps);
      const start = row.startDate ? new Date(`${row.startDate}T00:00:00Z`) : null;
      const end = row.endDate ? new Date(`${row.endDate}T00:00:00Z`) : null;
      const status = initiativeStatus({ percent, startDate: start, endDate: end, today });
      const budget = budgetSummary(row.steps, row.budget);
      return {
        row,
        percent,
        status,
        remaining: daysRemaining(end, today),
        adherence: scheduleAdherence(percent, expectedPercent(start, end, today)),
        budget,
      };
    });

    const tally = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<InitiativeStatus, number>;
    for (const r of rows) tally[r.status]++;

    const totals = rows.reduce(
      (acc, r) => ({
        budget: acc.budget + r.budget.budget,
        planned: acc.planned + r.budget.planned,
        spent: acc.spent + r.budget.spent,
        steps: acc.steps + r.row.steps.length,
      }),
      { budget: 0, planned: 0, spent: 0, steps: 0 }
    );

    const departments = [...new Set(rows.map((r) => r.row.owningDept ?? "بلا إدارة"))].sort().map((dept) => {
      const list = rows.filter((r) => (r.row.owningDept ?? "بلا إدارة") === dept);
      const deptTally = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<InitiativeStatus, number>;
      for (const r of list) deptTally[r.status]++;
      return {
        dept,
        count: list.length,
        percent: groupPercent(list.map((r) => r.percent)),
        tally: deptTally,
        budget: list.reduce((a, r) => a + r.budget.budget, 0),
        spent: list.reduce((a, r) => a + r.budget.spent, 0),
      };
    });

    return {
      rows,
      tally,
      totals,
      overall: groupPercent(rows.map((r) => r.percent)),
      spentPercent: totals.budget === 0 ? null : Math.round((totals.spent / totals.budget) * 1000) / 10,
      departments,
    };
  }, [initiatives, today]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-[240px]">
          <Select
            variant="soft"
            value={selectedPlanId}
            onSelect={(v) =>
              router.push(
                `/main/strategy/${encodeURIComponent(charityName)}/operational/dashboard?plan=${encodeURIComponent(v)}`
              )
            }
            placeholder="الخطة"
            options={plans.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>
        <p className="text-meta text-slate-500 dark:text-slate-400">
          {plan.startDate} ← {plan.endDate} · {plan.weekCount} أسبوعاً · {plan.monthCount} أشهر ·{" "}
          {model.totals.steps} خطوة تنفيذ
        </p>
      </div>

      <StatStrip
        label="أرقام الخطة"
        items={[
          { label: "إجمالي المبادرات", value: initiatives.length },
          {
            label: "نسبة الإنجاز العامة",
            value: model.overall ?? 0,
            unit: "%",
            dot: model.overall === null ? "muted" : model.overall >= 90 ? "active" : model.overall >= 40 ? "warn" : "danger",
          },
          { label: "الموازنة المعتمدة", value: money(model.totals.budget), unit: "ريال" },
          { label: "المصروف الفعلي", value: money(model.totals.spent), unit: "ريال" },
          {
            label: "نسبة الصرف",
            value: model.spentPercent ?? 0,
            unit: "%",
            dot: model.spentPercent === null ? "muted" : model.spentPercent > 100 ? "danger" : "muted",
          },
        ]}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-title font-semibold text-slate-900 dark:text-slate-100">حالات المبادرات</h3>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <li
              key={status}
              className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-colors dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={cx("size-2 shrink-0 rounded-full", STATUS_DOT[status])} />
                <span className="text-meta font-medium text-slate-600 dark:text-slate-300">
                  {STATUS_LABEL[status]}
                </span>
              </div>
              <p className="mt-1 text-stat font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {model.tally[status]}
              </p>
            </li>
          ))}
        </ul>
        {initiatives.length > 0 && (
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {STATUS_ORDER.map((status) =>
              model.tally[status] === 0 ? null : (
                <span
                  key={status}
                  className={STATUS_DOT[status]}
                  style={{ width: `${(model.tally[status] / initiatives.length) * 100}%` }}
                  title={`${STATUS_LABEL[status]}: ${model.tally[status]}`}
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-section font-semibold text-slate-900 dark:text-slate-100">مؤشرات الإدارات</h3>
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th>الإدارة</Th>
              <Th className="w-[90px]">المبادرات</Th>
              <Th className="w-[110px]">نسبة الإنجاز</Th>
              {STATUS_ORDER.map((s) => (
                <Th key={s} className="w-[80px]">
                  {STATUS_LABEL[s]}
                </Th>
              ))}
              <Th className="w-[120px]">الموازنة</Th>
              <Th className="w-[120px]">المصروف</Th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {model.departments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-body text-slate-400 dark:text-slate-500">
                  لا مبادرات في هذه الخطة بعد.
                </td>
              </tr>
            ) : (
              model.departments.map((d) => (
                <tr key={d.dept}>
                  <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{d.dept}</td>
                  <td className={cx(tdClass, "text-center tabular-nums")}>{d.count}</td>
                  <td className={tdClass}>
                    <Meter value={d.percent} />
                  </td>
                  {STATUS_ORDER.map((s) => (
                    <td key={s} className={cx(tdClass, "text-center tabular-nums")}>
                      {d.tally[s] === 0 ? dash : d.tally[s]}
                    </td>
                  ))}
                  <td className={cx(tdClass, "text-center tabular-nums")}>
                    {d.budget === 0 ? dash : money(d.budget)}
                  </td>
                  <td className={cx(tdClass, "text-center tabular-nums")}>
                    {d.spent === 0 ? dash : money(d.spent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </section>

      <section className="space-y-3">
        <h3 className="text-section font-semibold text-slate-900 dark:text-slate-100">نسبة الإنجاز لكل مبادرة</h3>
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th className="w-10">م</Th>
              <Th>المبادرة</Th>
              <Th className="w-[150px]">الإدارة</Th>
              <Th className="w-[90px]">الأولوية</Th>
              <Th className="min-w-[160px]">نسبة الإنجاز</Th>
              <Th className="w-[90px]">الحالة</Th>
              <Th className="w-[100px]">الأيام المتبقية</Th>
              <Th className="w-[110px]">الالتزام بالجدول</Th>
              <Th className="w-[110px]">المصروف</Th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {model.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-body text-slate-400 dark:text-slate-500">
                  لا مبادرات في هذه الخطة بعد.
                </td>
              </tr>
            ) : (
              model.rows.map(({ row, percent, status, remaining, adherence, budget }) => (
                <tr key={row.id}>
                  <td className={cx(tdClass, "text-center tabular-nums text-slate-500 dark:text-slate-400")}>
                    {row.number}
                  </td>
                  <td className={tdClass}>
                    <Link
                      href={`/main/strategy/${encodeURIComponent(charityName)}/operational/initiatives/${row.number}`}
                      className="font-medium text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className={cx(tdClass, "text-meta text-slate-500 dark:text-slate-400")}>
                    {row.owningDept || dash}
                  </td>
                  <td className={cx(tdClass, "text-center")}>
                    {row.priority ? <Badge tone="neutral">{row.priority}</Badge> : dash}
                  </td>
                  <td className={tdClass}>
                    <Meter value={percent} />
                  </td>
                  <td className={cx(tdClass, "text-center")}>
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  </td>
                  <td className={cx(tdClass, "text-center tabular-nums")}>
                    {remaining === null ? (
                      dash
                    ) : (
                      <span className={remaining < 0 ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
                        {remaining}
                      </span>
                    )}
                  </td>
                  <td className={cx(tdClass, "text-center tabular-nums")}>
                    {adherence === null ? dash : `${adherence}%`}
                  </td>
                  <td className={cx(tdClass, "text-center tabular-nums")}>
                    {budget.spent === 0 ? dash : money(budget.spent)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}

function Meter({ value }: { value: number | null }) {
  const pct = value ?? 0;
  const tone =
    value === null
      ? "bg-slate-300 dark:bg-slate-600"
      : pct >= 90
        ? "bg-emerald-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span className={cx("block h-full rounded-full", tone)} style={{ width: `${Math.max(pct, value === null ? 0 : 2)}%` }} />
      </div>
      <span className="w-10 text-left text-caption tabular-nums text-slate-500 dark:text-slate-400">
        {value === null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}
