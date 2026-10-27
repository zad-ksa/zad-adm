import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";
import { planMonths } from "@/lib/initiativeProgress";
import InitiativesClient, {
  type InitiativeRow,
  type ObjectiveOption,
  type PlanOption,
} from "./InitiativesClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - كشاف المبادرات | زاد التنموية` };
}

/**
 * كشاف المبادرات التشغيلية.
 *
 * والمحسوب فيه لا يُخزَّن: نسبةُ الإنجاز والحالةُ والأيامُ المتبقية والالتزامُ
 * بالجدول والمصروفُ والانحراف كلّها تُشتقّ من خطوات المبادرة عند العرض. وفي
 * ملف Excel المصدر صفوفٌ تحمل «متعثرة» منسوخةً ساكنة لا تتغيّر بتغيّر البيانات.
 */
export default async function InitiativesPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const [session, charity] = await Promise.all([
    getSession(),
    prisma.charity.findUnique({ where: { name: decodedName }, select: { id: true } }),
  ]);

  const canEdit = hasPermission(session?.role || "", session?.permissions || [], "manage_strategy");

  if (!charity) {
    return (
      <EmptyState
        icon={<ListChecks className="size-6" />}
        title="لا صفَّ لهذه الجمعية بعد"
        description="يُنشأ صفُّ الجمعية عند أول استبيانٍ تُعبّئه، ثم تُبنى خطتها التشغيلية."
      />
    );
  }

  const plans = await prisma.operationalPlan.findMany({
    where: { charityId: charity.id },
    orderBy: { startDate: "desc" },
    select: { id: true, label: true, startDate: true, endDate: true, weekCount: true },
  });

  const query = await searchParams;
  const selected = plans.find((p) => p.id === query?.plan) ?? plans[0] ?? null;

  const initiatives = selected
    ? await prisma.initiative.findMany({
        where: { planId: selected.id },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          name: true,
          description: true,
          durationText: true,
          managerName: true,
          owningDept: true,
          priority: true,
          startDate: true,
          endDate: true,
          budget: true,
          monthlyBudget: true,
          marketingKind: true,
          marketingUrl: true,
          marketingFileName: true,
          objective: { select: { id: true, code: true, name: true } },
          indicators: { select: { indicator: { select: { id: true, code: true, name: true } } } },
          steps: { select: { progress: true, cost: true, actualCost: true } },
        },
      })
    : [];

  // الأهداف والمؤشرات لنافذة التحرير — من الدليل نفسه، فلا تُكتب أسماءٌ باليد.
  const objectives: ObjectiveOption[] = (
    await prisma.strategyObjective.findMany({
      where: { perspective: { charityId: charity.id } },
      orderBy: [{ perspective: { order: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        perspective: { select: { name: true } },
        indicators: { orderBy: { order: "asc" }, select: { id: true, code: true, name: true } },
      },
    })
  ).map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    perspective: o.perspective.name,
    indicators: o.indicators,
  }));

  const text = (v: unknown) => (v === null || v === undefined ? null : String(v));

  const rows: InitiativeRow[] = initiatives.map((i) => ({
    id: i.id,
    number: i.number,
    name: i.name,
    description: i.description,
    durationText: i.durationText,
    managerName: i.managerName,
    owningDept: i.owningDept,
    priority: i.priority,
    startDate: i.startDate ? i.startDate.toISOString().slice(0, 10) : null,
    endDate: i.endDate ? i.endDate.toISOString().slice(0, 10) : null,
    budget: text(i.budget),
    monthlyBudget: (i.monthlyBudget as Record<string, number> | null) ?? null,
    marketingKind: i.marketingKind,
    marketingUrl: i.marketingUrl,
    marketingFileName: i.marketingFileName,
    objective: i.objective,
    indicators: i.indicators.map((x) => x.indicator),
    steps: i.steps.map((s) => ({
      progress: s.progress,
      cost: s.cost === null ? null : Number(s.cost),
      actualCost: s.actualCost === null ? null : Number(s.actualCost),
    })),
  }));

  const planOptions: PlanOption[] = plans.map((p) => ({
    id: p.id,
    label: p.label,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate.toISOString().slice(0, 10),
    weekCount: p.weekCount,
    months: planMonths(p.startDate, p.endDate),
  }));

  return (
    <InitiativesClient
      charityId={charity.id}
      charityName={decodedName}
      plans={planOptions}
      selectedPlanId={selected?.id ?? null}
      initiatives={rows}
      objectives={objectives}
      canEdit={canEdit}
    />
  );
}
