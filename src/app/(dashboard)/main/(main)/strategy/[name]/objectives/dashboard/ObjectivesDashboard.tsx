"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Gauge } from "lucide-react";
import { EmptyState, StatStrip, Th, tbodyClass, tdClass, theadRowClass, TableShell } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Badge, cx } from "@/components/console/ui";
import {
  GRADE_LABEL,
  GRADE_TONE,
  QUARTERS,
  annualActual,
  annualPercent,
  averagePercent,
  grade,
  gradeTally,
  periodPercent,
  type Grade,
  type IndicatorScoreInput,
  type Quarter,
} from "@/lib/indicatorScore";

export type DashboardIndicator = {
  id: string;
  code: string;
  name: string;
  cumulative: boolean;
  postponed: boolean;
  annualTarget: string | number | null;
  annualAchieved: string | number | null;
  annualOverride: boolean;
  quarters: Record<Quarter, { target: string | number | null; actual: string | number | null }>;
};

export type DashboardObjective = {
  id: string;
  code: string;
  name: string;
  indicators: DashboardIndicator[];
};

export type DashboardPerspective = {
  id: string;
  name: string;
  prefix: string;
  objectives: DashboardObjective[];
};

const num = (v: string | number | null): number | null => {
  if (v === null || v === undefined) return null;
  const raw = String(v).trim();
  if (!raw) return null;
  const n = parseFloat(raw.endsWith("%") ? raw.slice(0, -1) : raw);
  return Number.isFinite(n) ? n : null;
};

/** صفُّ المؤشر إلى مُدخَل دالّة الحساب — المصدر واحدٌ لكل أرقام النظام. */
function toScoreInput(indicator: DashboardIndicator): IndicatorScoreInput {
  const state = indicator.postponed ? "POSTPONED" : "ACTIVE";
  return {
    cumulative: indicator.cumulative,
    year: {
      target: num(indicator.annualTarget),
      actual: num(indicator.annualAchieved),
      state,
      isOverride: indicator.annualOverride,
    },
    quarters: Object.fromEntries(
      QUARTERS.map((q) => [
        q,
        { target: num(indicator.quarters[q].target), actual: num(indicator.quarters[q].actual), state },
      ])
    ),
  };
}

const GRADE_ORDER: Grade[] = ["EXCELLENT", "GOOD", "WEAK", "NO_DATA", "POSTPONED"];

const GRADE_DOT: Record<Grade, string> = {
  EXCELLENT: "bg-emerald-500",
  GOOD: "bg-amber-500",
  WEAK: "bg-red-500",
  NO_DATA: "bg-slate-300 dark:bg-slate-600",
  POSTPONED: "bg-slate-400",
};

const GRADE_RANGE: Record<Grade, string> = {
  EXCELLENT: "٩٠٪ – ١٠٠٪",
  GOOD: "٧٠٪ – ٩٠٪",
  WEAK: "أقلّ من ٧٠٪",
  NO_DATA: "بلا نتائج",
  POSTPONED: "مستثنى من المتوسطات",
};

const QUARTER_LABEL: Record<Quarter, string> = {
  Q1: "الربع الأول",
  Q2: "الربع الثاني",
  Q3: "الربع الثالث",
  Q4: "الربع الرابع",
};

/**
 * لوحة معلومات الأهداف والمؤشرات.
 *
 * ثلاث طبقات من الإجابة: أرقامٌ تقول حجم الخطة وحالتها، ثم توزيعُ الدرجات
 * للعام ولكل ربع، ثم النتيجةُ على مستوى الأبعاد والأهداف.
 *
 * والمؤجل مستثنًى من كل متوسطٍ هنا، و«لا توجد بيانات» صفرٌ لا فراغ — وهذا
 * نصُّ تعليمات وثيقة المتابعة، وتُنفّذه دالّةٌ واحدةٌ مختبَرة.
 */
export default function ObjectivesDashboard({
  charityName,
  year,
  perspectives,
}: {
  charityName: string;
  year: number;
  perspectives: DashboardPerspective[];
}) {
  const router = useRouter();

  const model = useMemo(() => {
    const indicators = perspectives.flatMap((p) => p.objectives.flatMap((o) => o.indicators));
    const inputs = indicators.map(toScoreInput);

    const annualGrades = inputs.map((i) => grade(annualPercent(i), i.year.state));
    const annual = gradeTally(annualGrades);

    const byQuarter = Object.fromEntries(
      QUARTERS.map((q) => {
        const grades = inputs.map((i) => {
          const result = i.quarters[q];
          if (!result) return grade(null);
          return grade(periodPercent(result), result.state);
        });
        return [q, { tally: gradeTally(grades), score: averagePercent(grades.map((g, idx) => {
          const result = inputs[idx].quarters[q];
          return result ? periodPercent(result) : null;
        })) }];
      })
    ) as Record<Quarter, { tally: Record<Grade, number>; score: number | null }>;

    const perspectiveRows = perspectives.map((p) => {
      const list = p.objectives.flatMap((o) => o.indicators).map(toScoreInput);
      return {
        id: p.id,
        name: p.name,
        prefix: p.prefix,
        count: list.length,
        score: averagePercent(list.map(annualPercent)),
      };
    });

    const objectiveRows = perspectives.flatMap((p) =>
      p.objectives.map((o) => {
        const list = o.indicators.map(toScoreInput);
        return {
          id: o.id,
          code: o.code,
          name: o.name,
          perspective: p.name,
          count: list.length,
          score: averagePercent(list.map(annualPercent)),
          quarters: Object.fromEntries(
            QUARTERS.map((q) => [
              q,
              averagePercent(list.map((i) => (i.quarters[q] ? periodPercent(i.quarters[q]!) : null))),
            ])
          ) as Record<Quarter, number | null>,
        };
      })
    );

    const filled = inputs.filter((i) => i.year.state !== "POSTPONED" && annualActual(i).value !== null).length;
    const active = inputs.filter((i) => i.year.state !== "POSTPONED").length;

    return {
      counts: {
        perspectives: perspectives.length,
        objectives: perspectives.reduce((n, p) => n + p.objectives.length, 0),
        indicators: indicators.length,
      },
      overall: averagePercent(inputs.map(annualPercent)),
      entry: active === 0 ? null : Math.round((filled / active) * 1000) / 10,
      annual,
      byQuarter,
      perspectiveRows,
      objectiveRows,
    };
  }, [perspectives]);

  if (model.counts.indicators === 0) {
    return (
      <EmptyState
        icon={<Gauge className="size-6" />}
        title="لا مؤشرات لهذه السنة بعد"
        description="تُبنى الأبعاد والأهداف والمؤشرات في الدليل، وتُدخل نتائجها في متابعة الأداء."
      />
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-[140px]">
          <Select
            variant="soft"
            value={String(year)}
            onSelect={(v) =>
              router.push(
                `/main/strategy/${encodeURIComponent(charityName)}/objectives/dashboard?year=${encodeURIComponent(v)}`
              )
            }
            placeholder="السنة"
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>
        <p className="text-meta text-slate-500 dark:text-slate-400">
          المؤجل مستثنًى من المتوسطات، و«لا توجد بيانات» يُحتسب صفراً.
        </p>
      </div>

      <StatStrip
        label={`ملخّص الأداء ${year}`}
        items={[
          { label: "الأبعاد الاستراتيجية", value: model.counts.perspectives },
          { label: "الأهداف", value: model.counts.objectives },
          { label: "مؤشرات الأداء", value: model.counts.indicators },
          {
            label: "اكتمال إدخال النتائج",
            value: model.entry ?? 0,
            unit: "%",
            dot: model.entry === null ? "muted" : model.entry >= 90 ? "active" : model.entry >= 40 ? "warn" : "danger",
          },
          {
            label: `نتيجة الأداء ${year}`,
            value: model.overall ?? 0,
            unit: "%",
            dot:
              model.overall === null ? "muted" : model.overall >= 90 ? "active" : model.overall >= 70 ? "warn" : "danger",
          },
        ]}
      />

      <GradeCard title={`حالة المؤشرات — ${year}`} tally={model.annual} />

      <div className="grid gap-4 lg:grid-cols-2">
        {QUARTERS.map((q) => (
          <GradeCard
            key={q}
            title={`${QUARTER_LABEL[q]} ${year}`}
            tally={model.byQuarter[q].tally}
            score={model.byQuarter[q].score}
          />
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="text-section font-semibold text-slate-900 dark:text-slate-100">
          النتيجة على مستوى الأبعاد
        </h3>
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th>البعد</Th>
              <Th className="w-[90px]">الرمز</Th>
              <Th className="w-[110px]">عدد المؤشرات</Th>
              <Th className="w-[120px]">متوسط الأداء</Th>
              <Th className="min-w-[180px]">الشريط</Th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {model.perspectiveRows.map((row) => (
              <tr key={row.id}>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{row.name}</td>
                <td className={cx(tdClass, "text-center")}>
                  <Badge tone="brand">{row.prefix}</Badge>
                </td>
                <td className={cx(tdClass, "text-center tabular-nums")}>{row.count}</td>
                <td className={cx(tdClass, "text-center")}>
                  <ScoreBadge score={row.score} />
                </td>
                <td className={tdClass}>
                  <Meter value={row.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>

      <section className="space-y-3">
        <h3 className="text-section font-semibold text-slate-900 dark:text-slate-100">
          النتيجة على مستوى الأهداف
        </h3>
        <TableShell>
          <thead>
            <tr className={theadRowClass}>
              <Th className="w-[90px]">الرمز</Th>
              <Th>الهدف</Th>
              <Th className="w-[130px]">البعد</Th>
              <Th className="w-[90px]">المؤشرات</Th>
              {QUARTERS.map((q) => (
                <Th key={q} className="w-[90px]">
                  {QUARTER_LABEL[q]}
                </Th>
              ))}
              <Th className="w-[110px]">متوسط {year}</Th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {model.objectiveRows.map((row) => (
              <tr key={row.id}>
                <td className={cx(tdClass, "whitespace-nowrap tabular-nums text-slate-500 dark:text-slate-400")}>
                  {row.code}
                </td>
                <td className={cx(tdClass, "font-medium text-slate-900 dark:text-slate-100")}>{row.name}</td>
                <td className={cx(tdClass, "whitespace-nowrap text-meta text-slate-500 dark:text-slate-400")}>
                  {row.perspective}
                </td>
                <td className={cx(tdClass, "text-center tabular-nums")}>{row.count}</td>
                {QUARTERS.map((q) => (
                  <td key={q} className={cx(tdClass, "text-center")}>
                    <PlainScore score={row.quarters[q]} />
                  </td>
                ))}
                <td className={cx(tdClass, "text-center")}>
                  <ScoreBadge score={row.score} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </section>
    </div>
  );
}

function GradeCard({
  title,
  tally,
  score,
}: {
  title: string;
  tally: Record<Grade, number>;
  score?: number | null;
}) {
  const total = GRADE_ORDER.reduce((n, g) => n + tally[g], 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {score !== undefined && <ScoreBadge score={score} />}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {GRADE_ORDER.map((g) => (
          <li
            key={g}
            className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-colors dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-center gap-2">
              <span aria-hidden className={cx("size-2 shrink-0 rounded-full", GRADE_DOT[g])} />
              <span className="text-meta font-medium text-slate-600 dark:text-slate-300">{GRADE_LABEL[g]}</span>
            </div>
            <p className="mt-1 text-stat font-semibold tabular-nums text-slate-900 dark:text-slate-100">{tally[g]}</p>
            <p className="text-caption text-slate-400 dark:text-slate-500">{GRADE_RANGE[g]}</p>
          </li>
        ))}
      </ul>

      {total > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {GRADE_ORDER.map((g) =>
            tally[g] === 0 ? null : (
              <span
                key={g}
                className={GRADE_DOT[g]}
                style={{ width: `${(tally[g] / total) * 100}%` }}
                title={`${GRADE_LABEL[g]}: ${tally[g]}`}
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) return <Badge tone="neutral">لا نتيجة</Badge>;
  const g = grade(score);
  return (
    <Badge tone={GRADE_TONE[g]}>
      <span className="tabular-nums">{score}%</span>
    </Badge>
  );
}

function PlainScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const g = grade(score);
  return (
    <span
      className={cx(
        "tabular-nums font-medium",
        g === "EXCELLENT"
          ? "text-emerald-600 dark:text-emerald-400"
          : g === "GOOD"
            ? "text-amber-600 dark:text-amber-400"
            : "text-red-600 dark:text-red-400"
      )}
    >
      {score}%
    </span>
  );
}

function Meter({ value }: { value: number | null }) {
  const pct = value ?? 0;
  const g = grade(value);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={cx("block h-full rounded-full", GRADE_DOT[g])}
          style={{ width: `${Math.max(pct, value === null ? 0 : 2)}%` }}
        />
      </div>
      <span className="w-10 text-left text-caption tabular-nums text-slate-500 dark:text-slate-400">
        {value === null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}
