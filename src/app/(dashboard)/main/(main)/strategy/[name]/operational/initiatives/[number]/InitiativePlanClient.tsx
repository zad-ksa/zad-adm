"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, GanttChartSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { StatStrip } from "@/components/console/layout";
import { Badge, Spinner, btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { TableViewControls, useTableView } from "@/components/console/TableViewControls";
import { BarTooltip, useBarTooltip } from "@/components/console/BarTooltip";
import { notify } from "@/components/console/toastBus";
import {
  budgetSummary,
  currentPlanWeek,
  daysRemaining,
  expectedPercent,
  initiativePercent,
  initiativeStatus,
  scheduleAdherence,
  scheduleFlags,
  weekStartDate,
  STATUS_LABEL,
  STATUS_TONE,
  type PlanMonth,
} from "@/lib/initiativeProgress";
import { deleteStep, moveStep } from "@/app/actions/strategyOperational";
import { StepDialog } from "./StepDialog";

export type StepRow = {
  id: string;
  order: number;
  phase: string | null;
  title: string;
  evidence: string | null;
  owner: string | null;
  cost: string | null;
  actualCost: string | null;
  planStartWeek: number | null;
  planWeeks: number | null;
  actualStartWeek: number | null;
  actualWeeks: number | null;
  progress: number;
  monthlyCost: Record<string, number> | null;
};

export type InitiativeDetail = {
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
  objective: { code: string; name: string } | null;
  indicators: { id: string; code: string; name: string }[];
  plan: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    weekCount: number;
    months: PlanMonth[];
  };
};

const cell = "border-l border-slate-200 p-2 align-middle transition-colors dark:border-slate-800";
const headCell = "h-10 border-l border-slate-200 px-3 transition-colors dark:border-slate-800";
const dash = <span className="text-slate-300 dark:text-slate-600">—</span>;
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * صفحة المبادرة: بياناتها، وأرقامها، وجدول خطواتها، ومخطّط جانت أسبوعي.
 *
 * ومحور الأسابيع مشتقٌّ من فترة الخطة لا من المبادرة: أرقام الأسابيع في
 * الخطوات نسبيّةٌ إلى بداية الخطة، فمقياسٌ واحدٌ لكل مبادراتها يُقارَن بعضها
 * ببعض. والأسابيع مجموعةٌ بالأشهر في صفٍّ أعلى كما في الوثيقة.
 */
export default function InitiativePlanClient({
  charityName,
  initiative,
  steps,
  canEdit,
}: {
  charityName: string;
  initiative: InitiativeDetail;
  steps: StepRow[];
  canEdit: boolean;
}) {
  const view = useTableView();
  const [editing, setEditing] = useState<{ step?: StepRow } | null>(null);
  const [removing, setRemoving] = useState<StepRow | null>(null);
  const [busy, startBusy] = useTransition();

  const today = useMemo(() => new Date(), []);
  const planStart = useMemo(() => new Date(`${initiative.plan.startDate}T00:00:00Z`), [initiative.plan.startDate]);

  const stepInputs = useMemo(
    () =>
      steps.map((s) => ({
        progress: s.progress,
        cost: s.cost === null ? null : Number(s.cost),
        actualCost: s.actualCost === null ? null : Number(s.actualCost),
        planStartWeek: s.planStartWeek,
        planWeeks: s.planWeeks,
        actualStartWeek: s.actualStartWeek,
        actualWeeks: s.actualWeeks,
      })),
    [steps]
  );

  const percent = initiativePercent(stepInputs);
  const start = initiative.startDate ? new Date(`${initiative.startDate}T00:00:00Z`) : null;
  const end = initiative.endDate ? new Date(`${initiative.endDate}T00:00:00Z`) : null;
  const status = initiativeStatus({ percent, startDate: start, endDate: end, today });
  const budget = budgetSummary(stepInputs, initiative.budget === null ? null : Number(initiative.budget));
  const remaining = daysRemaining(end, today);
  const adherence = scheduleAdherence(percent, expectedPercent(start, end, today));
  const currentWeek = currentPlanWeek(planStart, today, initiative.plan.weekCount);
  const flags = scheduleFlags(stepInputs, currentWeek);

  const run = (fn: () => Promise<{ error?: string }>, done?: () => void) =>
    startBusy(async () => {
      const res = await fn();
      if (res.error) return notify("error", res.error);
      done?.();
    });

  const base = `/main/strategy/${encodeURIComponent(charityName)}/operational`;

  return (
    <div className={cx("space-y-5", view.shellClass)}>
      {!view.isFullScreen && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">المبادرة {initiative.number}</Badge>
                <h2 className="text-section font-semibold text-slate-900 dark:text-slate-100">{initiative.name}</h2>
                <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                {initiative.priority && <Badge tone="neutral">أولوية {initiative.priority}</Badge>}
              </div>
              {initiative.description && (
                <p className="max-w-3xl text-body leading-6 text-slate-600 dark:text-slate-400">
                  {initiative.description}
                </p>
              )}
            </div>
            <Link href={`${base}/initiatives`} className={btn.secondary}>
              الكشاف
            </Link>
          </div>

          <dl className="mt-4 grid gap-3 text-body sm:grid-cols-2 lg:grid-cols-4">
            <Field label="الهدف المرتبط">
              {initiative.objective ? (
                <>
                  <span className="text-meta font-semibold text-slate-400 dark:text-slate-500">
                    {initiative.objective.code}
                  </span>{" "}
                  {initiative.objective.name}
                </>
              ) : (
                dash
              )}
            </Field>
            <Field label="المؤشرات المرتبطة">
              {initiative.indicators.length === 0 ? (
                dash
              ) : (
                <span className="flex flex-wrap gap-1">
                  {initiative.indicators.map((i) => (
                    <span key={i.id} title={i.name}>
                      <Badge tone="brand">{i.code}</Badge>
                    </span>
                  ))}
                </span>
              )}
            </Field>
            <Field label="مدير المبادرة">{initiative.managerName || dash}</Field>
            <Field label="الإدارة المالكة">{initiative.owningDept || dash}</Field>
            <Field label="المدة">{initiative.durationText || dash}</Field>
            <Field label="الفترة">
              {initiative.startDate && initiative.endDate ? (
                <span className="tabular-nums">
                  {initiative.startDate} ← {initiative.endDate}
                </span>
              ) : (
                dash
              )}
            </Field>
            <Field label="الأيام المتبقية">
              {remaining === null ? (
                dash
              ) : (
                <span className={cx("tabular-nums", remaining < 0 && "font-semibold text-red-600 dark:text-red-400")}>
                  {remaining}
                </span>
              )}
            </Field>
            <Field label="الالتزام بالجدول">
              {adherence === null ? dash : <span className="tabular-nums">{adherence}%</span>}
            </Field>
          </dl>
        </section>
      )}

      {!view.isFullScreen && (
        <StatStrip
          label="أرقام المبادرة"
          items={[
            {
              label: "نسبة الإنجاز",
              value: percent ?? 0,
              unit: "%",
              dot: percent === null ? "muted" : percent >= 90 ? "active" : percent >= 40 ? "warn" : "danger",
            },
            { label: "خطوات التنفيذ", value: steps.length },
            { label: "الموازنة المعتمدة", value: money(budget.budget), unit: "ريال" },
            { label: "المصروف الفعلي", value: money(budget.spent), unit: "ريال" },
            {
              label: "المتبقي من الموازنة",
              value: money(budget.variance),
              unit: "ريال",
              dot: budget.variance < 0 ? "danger" : "muted",
            },
          ]}
        />
      )}

      {!view.isFullScreen && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Flag
            label="أسابيع مجدولة بلا إنجاز"
            value={flags.plannedWithoutProgress}
            hint="خطواتٌ مضى أسبوعُ خطتها ولم يُسجَّل لها إنجاز."
          />
          <Flag
            label="إنجاز غير منضبط بالخطة"
            value={flags.offPlanSteps}
            hint="خطواتٌ نُفِّذت خارج أسابيعها المجدولة."
          />
          <Flag
            label="بداية قبل الخطة أو بعدها"
            value={flags.shiftedSteps}
            hint="خطواتٌ اختلف أسبوعُ بدايتها الفعلي عن المجدول."
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-title font-semibold text-slate-900 dark:text-slate-100">
          <GanttChartSquare className="size-5 text-primary dark:text-teal-300" />
          خطوات التنفيذ والمخطّط الزمني
        </h3>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button type="button" onClick={() => setEditing({})} className={btn.primary}>
              <Plus className="size-4" />
              خطوة
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

      <StepsTable
        steps={steps}
        plan={initiative.plan}
        currentWeek={currentWeek}
        planStart={planStart}
        canEdit={canEdit}
        busy={busy}
        zoom={view.zoom}
        frameClass={view.frameClass}
        onEdit={(step) => setEditing({ step })}
        onRemove={setRemoving}
        onMove={(id, direction) => run(() => moveStep(id, direction))}
      />

      {editing && (
        <StepDialog
          initiativeId={initiative.id}
          weekCount={initiative.plan.weekCount}
          months={initiative.plan.months}
          step={editing.step}
          onClose={() => setEditing(null)}
        />
      )}

      {removing && (
        <ConfirmDialog
          variant="console"
          title={`حذف الخطوة ${removing.order}؟`}
          message={removing.title}
          confirmLabel="حذف"
          isPending={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => run(() => deleteStep(removing.id), () => setRemoving(null))}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption font-semibold text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-700 dark:text-slate-200">{children}</dd>
    </div>
  );
}

function Flag({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div
      className={cx(
        "rounded-xl border p-4 transition-colors",
        value > 0
          ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      )}
    >
      <p className="text-meta font-medium text-slate-600 dark:text-slate-300">{label}</p>
      <p
        className={cx(
          "mt-1 text-stat font-semibold tabular-nums",
          value > 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-100"
        )}
      >
        {value}
      </p>
      <p className="text-caption leading-5 text-slate-400 dark:text-slate-500">{hint}</p>
    </div>
  );
}

type Bar = { kind: "plan" | "actual"; step: StepRow; from: number; span: number };

function StepsTable({
  steps,
  plan,
  currentWeek,
  planStart,
  canEdit,
  busy,
  zoom,
  frameClass,
  onEdit,
  onRemove,
  onMove,
}: {
  steps: StepRow[];
  plan: InitiativeDetail["plan"];
  currentWeek: number;
  planStart: Date;
  canEdit: boolean;
  busy: boolean;
  zoom: number;
  frameClass: string;
  onEdit: (step: StepRow) => void;
  onRemove: (step: StepRow) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const tooltip = useBarTooltip<Bar>();
  const weeks = useMemo(() => Array.from({ length: plan.weekCount }, (_, i) => i + 1), [plan.weekCount]);

  // الأسابيع مجموعةٌ بأشهرها لصفِّ الترويسة الأعلى — من تاريخ كل أسبوع لا
  // بتقسيمٍ متساوٍ: الأشهر غير متساوية الأسابيع.
  const monthSpans = useMemo(() => {
    const spans: { key: string; label: string; span: number }[] = [];
    for (const week of weeks) {
      const date = weekStartDate(planStart, week);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const last = spans[spans.length - 1];
      if (last && last.key === key) last.span++;
      else spans.push({ key, label: plan.months.find((m) => m.key === key)?.label ?? key, span: 1 });
    }
    return spans;
  }, [weeks, planStart, plan.months]);

  const columnCount = 12 + plan.weekCount + (canEdit ? 1 : 0);

  return (
    <div
      className={cx(
        "w-full rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900",
        frameClass
      )}
    >
      <table style={{ zoom: `${zoom}%` }} className="w-full border-collapse text-center text-caption">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-500 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <th className={cx(headCell, "w-10")} rowSpan={2}>ت</th>
            <th className={cx(headCell, "w-[90px]")} rowSpan={2}>المرحلة</th>
            <th className={cx(headCell, "min-w-[280px]")} rowSpan={2}>خطوات التنفيذ</th>
            <th className={cx(headCell, "min-w-[160px]")} rowSpan={2}>شاهد التنفيذ</th>
            <th className={cx(headCell, "w-[120px]")} rowSpan={2}>مسؤول التنفيذ</th>
            <th className={cx(headCell, "w-[90px]")} rowSpan={2}>التكلفة</th>
            <th className={cx(headCell, "w-[90px]")} rowSpan={2}>الفعلية</th>
            <th className={cx(headCell, "w-[70px]")} rowSpan={2}>أسبوع البداية</th>
            <th className={cx(headCell, "w-[70px]")} rowSpan={2}>مدة الخطة</th>
            <th className={cx(headCell, "w-[70px]")} rowSpan={2}>البداية الفعلية</th>
            <th className={cx(headCell, "w-[70px]")} rowSpan={2}>مدة التنفيذ</th>
            <th className={cx(headCell, "w-[80px] bg-primary/5 text-primary dark:bg-primary/10")} rowSpan={2}>
              نسبة الإنجاز
            </th>
            {canEdit && (
              <th className={cx(headCell, "w-[90px]")} rowSpan={2}>
                إجراءات
              </th>
            )}
            {monthSpans.map((m) => (
              <th key={m.key} className={cx(headCell, "text-primary dark:text-teal-300")} colSpan={m.span}>
                {m.label}
              </th>
            ))}
          </tr>
          <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-400 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {weeks.map((week) => (
              <th
                key={week}
                className={cx(
                  headCell,
                  "w-7 px-0 tabular-nums",
                  week === currentWeek && "bg-primary/10 text-primary dark:bg-teal-400/10 dark:text-teal-300"
                )}
                title={`الأسبوع ${week} — يبدأ ${weekStartDate(planStart, week).toISOString().slice(0, 10)}`}
              >
                {week}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="p-10 text-body text-slate-400 dark:text-slate-500">
                لا خطوات لهذه المبادرة بعد. وبلا خطوات لا نسبةَ إنجازٍ ولا مخطّطَ زمني.
              </td>
            </tr>
          ) : (
            steps.map((step, index) => {
              const planBar =
                step.planStartWeek && step.planWeeks
                  ? { kind: "plan" as const, step, from: step.planStartWeek, span: step.planWeeks }
                  : null;
              const actualBar =
                step.actualStartWeek && step.actualStartWeek > 0
                  ? { kind: "actual" as const, step, from: step.actualStartWeek, span: Math.max(step.actualWeeks ?? 1, 1) }
                  : null;

              return (
                <tr
                  key={step.id}
                  className={cx(
                    "border-b border-slate-200 transition-colors dark:border-slate-800",
                    index % 2 === 1
                      ? "bg-slate-100/70 hover:bg-slate-200/50 dark:bg-slate-800/80 dark:hover:bg-slate-700/50"
                      : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/50"
                  )}
                >
                  <td className={cx(cell, "font-semibold text-slate-500 tabular-nums dark:text-slate-400")}>
                    {step.order}
                  </td>
                  <td className={cell}>{step.phase ? <Badge tone="neutral">{step.phase}</Badge> : dash}</td>
                  <td className={cx(cell, "whitespace-normal text-right leading-5")}>{step.title}</td>
                  <td className={cx(cell, "whitespace-normal text-right leading-5 text-slate-600 dark:text-slate-400")}>
                    {step.evidence || dash}
                  </td>
                  <td className={cx(cell, "whitespace-normal")}>{step.owner || dash}</td>
                  <td className={cx(cell, "tabular-nums")}>{step.cost ? money(Number(step.cost)) : dash}</td>
                  <td className={cx(cell, "tabular-nums")}>
                    {step.actualCost ? money(Number(step.actualCost)) : dash}
                  </td>
                  <td className={cx(cell, "tabular-nums")}>{step.planStartWeek ?? dash}</td>
                  <td className={cx(cell, "tabular-nums")}>{step.planWeeks ?? dash}</td>
                  <td className={cx(cell, "tabular-nums")}>{step.actualStartWeek || dash}</td>
                  <td className={cx(cell, "tabular-nums")}>{step.actualWeeks || dash}</td>
                  <td className={cx(cell, "bg-primary/5 font-semibold tabular-nums dark:bg-primary/10")}>
                    {step.progress}%
                  </td>
                  {canEdit && (
                    <td className="p-1 align-middle">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => onMove(step.id, "up")}
                          aria-label={`نقل الخطوة ${step.order} أعلى`}
                          className={btn.icon}
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === steps.length - 1}
                          onClick={() => onMove(step.id, "down")}
                          aria-label={`نقل الخطوة ${step.order} أسفل`}
                          className={btn.icon}
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(step)}
                          aria-label={`تعديل الخطوة ${step.order}`}
                          className={btn.icon}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(step)}
                          aria-label={`حذف الخطوة ${step.order}`}
                          className={btn.iconDanger}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  )}

                  {weeks.map((week) => {
                    const inPlan = planBar && week >= planBar.from && week < planBar.from + planBar.span;
                    const inActual = actualBar && week >= actualBar.from && week < actualBar.from + actualBar.span;
                    const bar = inActual ? actualBar : inPlan ? planBar : null;

                    return (
                      <td
                        key={week}
                        className={cx(
                          "border-l border-slate-200 p-0 align-middle dark:border-slate-800",
                          week === currentWeek && "bg-primary/[0.06] dark:bg-teal-400/[0.08]"
                        )}
                      >
                        {bar && (
                          <span
                            tabIndex={0}
                            onMouseEnter={(e) => tooltip.show(bar, e.currentTarget)}
                            onMouseLeave={tooltip.dismiss}
                            onFocus={(e) => tooltip.show(bar, e.currentTarget)}
                            onBlur={tooltip.dismiss}
                            className={cx(
                              "mx-auto block h-4 w-full outline-none",
                              inActual
                                ? "bg-primary dark:bg-teal-500"
                                : "bg-primary/25 dark:bg-teal-400/25",
                              week === bar.from && "rounded-r-sm",
                              week === bar.from + bar.span - 1 && "rounded-l-sm"
                            )}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {tooltip.hovered && (
        <BarTooltip anchor={tooltip.hovered.anchor}>
          <p className="break-words text-meta font-semibold leading-snug text-slate-900 dark:text-slate-100">
            {tooltip.hovered.item.step.title}
          </p>
          <p className="mt-1 text-caption tabular-nums text-slate-500 dark:text-slate-400">
            {tooltip.hovered.item.kind === "actual" ? "التنفيذ الفعلي" : "الخطة"}: الأسبوع{" "}
            {tooltip.hovered.item.from}
            {tooltip.hovered.item.span > 1 && ` ← ${tooltip.hovered.item.from + tooltip.hovered.item.span - 1}`}
          </p>
          <p className="mt-0.5 text-caption text-slate-500 dark:text-slate-400">
            الإنجاز: {tooltip.hovered.item.step.progress}%
          </p>
        </BarTooltip>
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
