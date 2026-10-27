"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState, SearchField } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Badge, Spinner, btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { TableViewControls, useTableView } from "@/components/console/TableViewControls";
import { notify } from "@/components/console/toastBus";
import {
  budgetSummary,
  daysRemaining,
  expectedPercent,
  initiativePercent,
  initiativeStatus,
  scheduleAdherence,
  STATUS_LABEL,
  STATUS_TONE,
  type PlanMonth,
} from "@/lib/initiativeProgress";
import { deleteInitiative, deletePlan } from "@/app/actions/strategyOperational";
import { InitiativeDialog, PlanDialog } from "./InitiativeDialogs";

export type PlanOption = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  weekCount: number;
  months: PlanMonth[];
};

export type ObjectiveOption = {
  id: string;
  code: string;
  name: string;
  perspective: string;
  indicators: { id: string; code: string; name: string }[];
};

export type InitiativeRow = {
  id: string;
  number: number;
  name: string;
  description: string | null;
  durationText: string | null;
  managerName: string | null;
  owningDept: string | null;
  priority: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | null;
  monthlyBudget: Record<string, number> | null;
  /** الملف التسويقي — يُعدَّل من نافذة المبادرة أو من زرّها في صفحتها. */
  marketingKind: string | null;
  marketingUrl: string | null;
  marketingFileName: string | null;
  objective: { id: string; code: string; name: string } | null;
  indicators: { id: string; code: string; name: string }[];
  steps: { progress: number; cost: number | null; actualCost: number | null }[];
};

const cell = "border-l border-slate-200 p-2 align-middle transition-colors dark:border-slate-800";
const headCell = "h-10 border-l border-slate-200 px-3 transition-colors dark:border-slate-800";
const dash = <span className="text-slate-300 dark:text-slate-600">—</span>;

const PRIORITY_TONE: Record<string, "danger" | "warn" | "neutral"> = {
  عالية: "danger",
  متوسطة: "warn",
  منخفضة: "neutral",
};

const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * كشاف المبادرات.
 *
 * بتنسيق جدولَي الدليل والمتابعة: حدودٌ رقيقة، وترويسةٌ رمادية، وملء شاشةٍ
 * وتكبير. وأعمدةُ الأشهر مشتقّةٌ من فترة الخطة لا مثبّتةً في الكود، فخطةُ
 * خمسة أشهر خمسةُ أعمدة وخطةُ سنةٍ اثنا عشر.
 *
 * والمحسوب محسوبٌ عند العرض: نسبةُ الإنجاز متوسطٌ بسيطٌ لخطوات المبادرة،
 * والحالةُ من النسبة والتواريخ، والمصروفُ من تكاليف الخطوات الفعلية.
 */
export default function InitiativesClient({
  charityId,
  charityName,
  plans,
  selectedPlanId,
  initiatives,
  objectives,
  canEdit,
}: {
  charityId: string;
  charityName: string;
  plans: PlanOption[];
  selectedPlanId: string | null;
  initiatives: InitiativeRow[];
  objectives: ObjectiveOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const view = useTableView();
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<{ initiative?: InitiativeRow } | null>(null);
  const [planEditing, setPlanEditing] = useState<{ plan?: PlanOption } | null>(null);
  const [removing, setRemoving] = useState<InitiativeRow | null>(null);
  const [removingPlan, setRemovingPlan] = useState<PlanOption | null>(null);
  const [busy, startBusy] = useTransition();

  const plan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const today = useMemo(() => new Date(), []);

  const computed = useMemo(
    () =>
      initiatives.map((row) => {
        const percent = initiativePercent(row.steps);
        const start = row.startDate ? new Date(`${row.startDate}T00:00:00Z`) : null;
        const end = row.endDate ? new Date(`${row.endDate}T00:00:00Z`) : null;
        const status = initiativeStatus({ percent, startDate: start, endDate: end, today });
        const budget = budgetSummary(row.steps, row.budget === null ? null : Number(row.budget));
        const distributed = row.monthlyBudget
          ? Object.values(row.monthlyBudget).reduce((a, b) => a + Number(b || 0), 0)
          : 0;
        return {
          row,
          percent,
          status,
          remaining: daysRemaining(end, today),
          adherence: scheduleAdherence(percent, expectedPercent(start, end, today)),
          budget,
          distributed,
        };
      }),
    [initiatives, today]
  );

  const departments = useMemo(
    () => [...new Set(initiatives.map((i) => i.owningDept).filter((d): d is string => !!d))].sort(),
    [initiatives]
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return computed.filter(({ row, status }) => {
      if (deptFilter !== "all" && row.owningDept !== deptFilter) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!needle) return true;
      return [row.name, row.description, row.managerName, row.owningDept, row.objective?.name]
        .some((v) => v && v.toLowerCase().includes(needle));
    });
  }, [computed, query, deptFilter, statusFilter]);

  const run = (fn: () => Promise<{ error?: string }>, done?: () => void) =>
    startBusy(async () => {
      const res = await fn();
      if (res.error) return notify("error", res.error);
      done?.();
    });

  if (plans.length === 0) {
    return (
      <>
        <EmptyState
          icon={<CalendarRange className="size-6" />}
          title="لا خطة تشغيلية لهذه الجمعية بعد"
          description="الخطة هي صاحبة الزمن: منها تُشتقّ أسابيع المخطط وأشهر الموازنة. فتُعرَّف فترتها أولاً، ثم تُضاف مبادراتها."
          action={
            canEdit ? (
              <button type="button" onClick={() => setPlanEditing({})} className={btn.primary}>
                <Plus className="size-4" />
                خطة تشغيلية جديدة
              </button>
            ) : undefined
          }
        />
        {planEditing && (
          <PlanDialog charityId={charityId} plan={planEditing.plan} onClose={() => setPlanEditing(null)} />
        )}
      </>
    );
  }

  const months = plan?.months ?? [];
  const columnCount = 15 + months.length + 3 + (canEdit ? 1 : 0);

  return (
    <div className={cx("space-y-4", view.shellClass)}>
      <div className="flex shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors xl:flex-row xl:items-center xl:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[230px]">
            <Select
              variant="soft"
              value={selectedPlanId ?? ""}
              onSelect={(v) =>
                router.push(
                  `/main/strategy/${encodeURIComponent(charityName)}/operational/initiatives?plan=${encodeURIComponent(v)}`
                )
              }
              placeholder="الخطة"
              options={plans.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
          {canEdit && plan && (
            <>
              <button
                type="button"
                onClick={() => setPlanEditing({ plan })}
                aria-label="تعديل الخطة"
                title="تعديل فترة الخطة"
                className={btn.icon}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setRemovingPlan(plan)}
                aria-label="حذف الخطة"
                title="حذف الخطة ومبادراتها"
                className={btn.iconDanger}
              >
                <Trash2 className="size-4" />
              </button>
              <button type="button" onClick={() => setPlanEditing({})} className={btn.ghost}>
                <Plus className="size-4" />
                خطة
              </button>
            </>
          )}
        </div>

        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="ابحث في المبادرات…"
          label="بحث في المبادرات"
          className="min-w-[200px] flex-1"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[170px]">
            <Select
              variant="soft"
              value={deptFilter}
              onSelect={setDeptFilter}
              placeholder="الإدارة"
              options={[
                { value: "all", label: "كل الإدارات" },
                ...departments.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
          <div className="w-[150px]">
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
          {canEdit && (
            <button type="button" onClick={() => setEditing({})} className={btn.primary}>
              <Plus className="size-4" />
              مبادرة
            </button>
          )}
          <TableViewControls
            zoom={view.zoom}
            setZoom={view.setZoom}
            isFullScreen={view.isFullScreen}
            setFullScreen={view.setFullScreen}
          />
        </div>
      </div>

      {plan && (
        <p className="shrink-0 text-meta text-slate-500 dark:text-slate-400">
          فترة الخطة: {plan.startDate} ← {plan.endDate} · {plan.weekCount} أسبوعاً · {months.length} أشهر.
          ونسبةُ الإنجاز والمصروف محسوبان من خطوات كل مبادرة.
        </p>
      )}

      <div
        className={cx(
          "w-full rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900",
          view.frameClass
        )}
      >
        <table style={{ zoom: `${view.zoom}%` }} className="w-full border-collapse text-center text-caption">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <th className={cx(headCell, "w-10")}>م</th>
              <th className={cx(headCell, "min-w-[160px]")}>اسم المبادرة</th>
              <th className={cx(headCell, "min-w-[240px]")}>وصف المبادرة</th>
              <th className={cx(headCell, "min-w-[180px]")}>الهدف المرتبط</th>
              <th className={cx(headCell, "min-w-[180px]")}>المؤشرات المرتبطة</th>
              <th className={cx(headCell, "w-[90px]")}>المدة</th>
              <th className={cx(headCell, "w-[130px]")}>مدير المبادرة</th>
              <th className={cx(headCell, "w-[150px]")}>الإدارة المالكة</th>
              <th className={cx(headCell, "w-[90px]")}>الأولوية</th>
              <th className={cx(headCell, "w-[100px]")}>البداية</th>
              <th className={cx(headCell, "w-[100px]")}>النهاية</th>
              <th className={cx(headCell, "w-[90px] bg-primary/5 text-primary dark:bg-primary/10")}>نسبة الإنجاز</th>
              <th className={cx(headCell, "w-[90px]")}>الحالة</th>
              <th className={cx(headCell, "w-[90px]")}>الأيام المتبقية</th>
              <th className={cx(headCell, "w-[100px]")}>الالتزام بالجدول</th>
              <th className={cx(headCell, "w-[110px] bg-secondary/5 dark:bg-secondary/10")}>الموازنة</th>
              {months.map((m) => (
                <th key={m.key} className={cx(headCell, "w-[90px] bg-secondary/5 dark:bg-secondary/10")} title={m.key}>
                  {m.label}
                </th>
              ))}
              <th className={cx(headCell, "w-[110px] bg-secondary/5 dark:bg-secondary/10")}>إجمالي التوزيع</th>
              <th className={cx(headCell, "w-[110px]")}>المصروف الفعلي</th>
              <th className={cx(headCell, "w-[110px]")}>الانحراف</th>
              {canEdit && <th className="h-10 px-3">إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="p-10 text-body text-slate-400 dark:text-slate-500">
                  {initiatives.length === 0 ? "لا مبادرات في هذه الخطة بعد." : "لا نتائج لهذه التصفية."}
                </td>
              </tr>
            ) : (
              shown.map(({ row, percent, status, remaining, adherence, budget, distributed }, index) => (
                <tr
                  key={row.id}
                  className={cx(
                    "border-b border-slate-200 transition-colors dark:border-slate-800",
                    index % 2 === 1
                      ? "bg-slate-100/70 hover:bg-slate-200/50 dark:bg-slate-800/80 dark:hover:bg-slate-700/50"
                      : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/50"
                  )}
                >
                  <td className={cx(cell, "font-semibold text-slate-500 tabular-nums dark:text-slate-400")}>
                    {row.number}
                  </td>
                  <td className={cx(cell, "text-right")}>
                    <Link
                      href={`/main/strategy/${encodeURIComponent(charityName)}/operational/initiatives/${row.number}`}
                      className="font-medium text-primary transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-teal-300"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className={cx(cell, "text-right")}>
                    <span className="line-clamp-2 whitespace-normal text-body leading-5 text-slate-600 dark:text-slate-400">
                      {row.description || "—"}
                    </span>
                  </td>
                  <td className={cx(cell, "text-right")}>
                    {row.objective ? (
                      <span className="whitespace-normal text-body leading-5 text-slate-700 dark:text-slate-300">
                        <span className="text-meta font-semibold text-slate-400 dark:text-slate-500">
                          {row.objective.code}
                        </span>{" "}
                        {row.objective.name}
                      </span>
                    ) : (
                      dash
                    )}
                  </td>
                  <td className={cx(cell, "text-right")}>
                    {row.indicators.length === 0 ? (
                      dash
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {row.indicators.map((i) => (
                          <span key={i.id} title={i.name}>
                            <Badge tone="brand">{i.code}</Badge>
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={cell}>{row.durationText || dash}</td>
                  <td className={cell}>{row.managerName || dash}</td>
                  <td className={cx(cell, "whitespace-normal")}>{row.owningDept || dash}</td>
                  <td className={cell}>
                    {row.priority ? <Badge tone={PRIORITY_TONE[row.priority] ?? "neutral"}>{row.priority}</Badge> : dash}
                  </td>
                  <td className={cx(cell, "tabular-nums")}>{row.startDate || dash}</td>
                  <td className={cx(cell, "tabular-nums")}>{row.endDate || dash}</td>
                  <td className={cx(cell, "bg-primary/5 font-semibold tabular-nums dark:bg-primary/10")}>
                    {percent === null ? dash : `${percent}%`}
                  </td>
                  <td className={cell}>
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  </td>
                  <td className={cx(cell, "tabular-nums")}>
                    {remaining === null ? (
                      dash
                    ) : (
                      <span className={remaining < 0 ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
                        {remaining}
                      </span>
                    )}
                  </td>
                  <td className={cx(cell, "tabular-nums")}>{adherence === null ? dash : `${adherence}%`}</td>
                  <td className={cx(cell, "bg-secondary/5 font-semibold tabular-nums dark:bg-secondary/10")}>
                    {budget.budget === 0 ? dash : money(budget.budget)}
                  </td>
                  {months.map((m) => {
                    const value = row.monthlyBudget?.[m.key];
                    return (
                      <td key={m.key} className={cx(cell, "bg-secondary/5 tabular-nums dark:bg-secondary/10")}>
                        {value === undefined || value === null ? dash : money(Number(value))}
                      </td>
                    );
                  })}
                  <td className={cx(cell, "bg-secondary/5 tabular-nums dark:bg-secondary/10")}>
                    {distributed === 0 ? dash : money(distributed)}
                    {budget.budget > 0 && distributed > 0 && distributed !== budget.budget && (
                      <span
                        className="mr-1 text-caption font-semibold text-amber-600 dark:text-amber-400"
                        title={`التوزيع يخالف الموازنة المعتمدة بـ${money(Math.abs(budget.budget - distributed))}`}
                      >
                        ≠
                      </span>
                    )}
                  </td>
                  <td className={cx(cell, "tabular-nums")}>{budget.spent === 0 ? dash : money(budget.spent)}</td>
                  <td className={cx(cell, "tabular-nums")}>
                    {budget.budget === 0 ? (
                      dash
                    ) : (
                      <span className={budget.variance < 0 ? "font-semibold text-red-600 dark:text-red-400" : undefined}>
                        {money(budget.variance)}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="p-2 align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing({ initiative: row })}
                          aria-label={`تعديل ${row.name}`}
                          className={btn.icon}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemoving(row)}
                          aria-label={`حذف ${row.name}`}
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!plan && (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title="اختر خطة"
          description="لهذه الجمعية خططٌ تشغيلية، فاختر واحدةً من القائمة أعلاه."
        />
      )}

      {editing && plan && (
        <InitiativeDialog
          planId={plan.id}
          months={plan.months}
          objectives={objectives}
          initiative={editing.initiative}
          onClose={() => setEditing(null)}
        />
      )}

      {planEditing && (
        <PlanDialog charityId={charityId} plan={planEditing.plan} onClose={() => setPlanEditing(null)} />
      )}

      {removing && (
        <ConfirmDialog
          variant="console"
          title={`حذف مبادرة «${removing.name}»؟`}
          message={
            removing.steps.length === 0
              ? "المبادرة بلا خطوات، فلا يُحذف معها شيء."
              : `سيُحذف معها ${removing.steps.length} خطوة تنفيذٍ وتكاليفها.`
          }
          confirmLabel="حذف"
          isPending={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => run(() => deleteInitiative(removing.id), () => setRemoving(null))}
        />
      )}

      {removingPlan && (
        <ConfirmDialog
          variant="console"
          title={`حذف خطة «${removingPlan.label}»؟`}
          message={
            initiatives.length === 0
              ? "الخطة بلا مبادرات."
              : `سيُحذف معها ${initiatives.length} مبادرة وكل خطواتها — ولا رجعة.`
          }
          confirmLabel="حذف الخطة"
          isPending={busy}
          onCancel={() => setRemovingPlan(null)}
          onConfirm={() =>
            run(
              () => deletePlan(removingPlan.id),
              () => {
                setRemovingPlan(null);
                router.push(`/main/strategy/${encodeURIComponent(charityName)}/operational/initiatives`);
              }
            )
          }
        />
      )}

      {busy && (
        <span className="pointer-events-none fixed bottom-6 left-6 z-[95] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-meta shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Spinner size={16} />
          جارٍ التنفيذ…
        </span>
      )}
    </div>
  );
}
