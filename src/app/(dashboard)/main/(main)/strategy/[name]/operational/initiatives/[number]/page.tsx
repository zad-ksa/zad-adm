import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCharitySection } from "@/lib/sectionGuard";
import { planMonths } from "@/lib/initiativeProgress";
import InitiativePlanClient, { type InitiativeDetail, type StepRow } from "./InitiativePlanClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string; number: string }>;
}): Promise<Metadata> {
  const { name, number } = await params;
  return { title: `${decodeURIComponent(name)} - المبادرة ${number} | زاد التنموية` };
}

/**
 * صفحة المبادرة: خطواتها ومخطّطها الزمني.
 *
 * ومفتاح المسار رقمُ المبادرة في كشافها لا مُعرِّفها: رابطٌ يُقرأ ويُنسخ
 * ويُفهم. والرقم فريدٌ داخل خطته، فالاستعلام يقيّده بجمعية المسار.
 */
export default async function InitiativePage({
  params,
}: {
  params: Promise<{ name: string; number: string }>;
}) {
  const { name, number } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const parsed = parseInt(number, 10);
  if (!Number.isFinite(parsed)) notFound();

  const [session, initiative] = await Promise.all([
    getSession(),
    prisma.initiative.findFirst({
      where: { number: parsed, plan: { charity: { name: decodedName } } },
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
        plan: { select: { id: true, label: true, startDate: true, endDate: true, weekCount: true } },
        objective: { select: { code: true, name: true } },
        indicators: { select: { indicator: { select: { id: true, code: true, name: true } } } },
        steps: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            phase: true,
            title: true,
            evidence: true,
            owner: true,
            cost: true,
            actualCost: true,
            planStartWeek: true,
            planWeeks: true,
            actualStartWeek: true,
            actualWeeks: true,
            progress: true,
            monthlyCost: true,
          },
        },
      },
    }),
  ]);

  if (!initiative) notFound();

  const canEdit = hasPermission(session?.role || "", session?.permissions || [], "manage_strategy");
  const text = (v: unknown) => (v === null || v === undefined ? null : String(v));

  const steps: StepRow[] = initiative.steps.map((s) => ({
    id: s.id,
    order: s.order,
    phase: s.phase,
    title: s.title,
    evidence: s.evidence,
    owner: s.owner,
    cost: text(s.cost),
    actualCost: text(s.actualCost),
    planStartWeek: s.planStartWeek,
    planWeeks: s.planWeeks,
    actualStartWeek: s.actualStartWeek,
    actualWeeks: s.actualWeeks,
    progress: s.progress,
    monthlyCost: (s.monthlyCost as Record<string, number> | null) ?? null,
  }));

  const detail: InitiativeDetail = {
    id: initiative.id,
    number: initiative.number,
    name: initiative.name,
    description: initiative.description,
    durationText: initiative.durationText,
    managerName: initiative.managerName,
    owningDept: initiative.owningDept,
    priority: initiative.priority,
    startDate: initiative.startDate ? initiative.startDate.toISOString().slice(0, 10) : null,
    endDate: initiative.endDate ? initiative.endDate.toISOString().slice(0, 10) : null,
    budget: text(initiative.budget),
    objective: initiative.objective,
    indicators: initiative.indicators.map((x) => x.indicator),
    plan: {
      id: initiative.plan.id,
      label: initiative.plan.label,
      startDate: initiative.plan.startDate.toISOString().slice(0, 10),
      endDate: initiative.plan.endDate.toISOString().slice(0, 10),
      weekCount: initiative.plan.weekCount,
      months: planMonths(initiative.plan.startDate, initiative.plan.endDate),
    },
  };

  return <InitiativePlanClient charityName={decodedName} initiative={detail} steps={steps} canEdit={canEdit} />;
}
