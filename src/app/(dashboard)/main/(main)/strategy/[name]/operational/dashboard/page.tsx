import type { Metadata } from "next";
import { CalendarRange } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";
import { planMonths } from "@/lib/initiativeProgress";
import OperationalDashboard, { type DashboardInitiative, type DashboardPlan } from "./OperationalDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - لوحة معلومات المبادرات | زاد التنموية` };
}

/**
 * لوحة معلومات المبادرات التشغيلية.
 *
 * ولا رقم فيها مخزَّن: كلّها من `initiativeProgress` — الدالّات نفسها التي
 * يحسب بها الكشافُ وصفحةُ المبادرة، فلا يختلف رقمٌ بين ثلاث صفحات.
 */
export default async function OperationalDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const charity = await prisma.charity.findUnique({ where: { name: decodedName }, select: { id: true } });

  if (!charity) {
    return (
      <EmptyState
        icon={<CalendarRange className="size-6" />}
        title="لا صفَّ لهذه الجمعية بعد"
        description="يُنشأ صفُّ الجمعية عند أول استبيانٍ تُعبّئه."
      />
    );
  }

  const plans = await prisma.operationalPlan.findMany({
    where: { charityId: charity.id },
    orderBy: { startDate: "desc" },
    select: { id: true, label: true, startDate: true, endDate: true, weekCount: true },
  });

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={<CalendarRange className="size-6" />}
        title="لا خطة تشغيلية لهذه الجمعية بعد"
        description="تُعرَّف الخطة ومبادراتها في كشاف المبادرات، ثم تظهر أرقامها هنا."
      />
    );
  }

  const query = await searchParams;
  const selected = plans.find((p) => p.id === query?.plan) ?? plans[0];

  const initiatives = await prisma.initiative.findMany({
    where: { planId: selected.id },
    orderBy: { number: "asc" },
    select: {
      id: true,
      number: true,
      name: true,
      owningDept: true,
      priority: true,
      startDate: true,
      endDate: true,
      budget: true,
      steps: { select: { progress: true, cost: true, actualCost: true } },
    },
  });

  const rows: DashboardInitiative[] = initiatives.map((i) => ({
    id: i.id,
    number: i.number,
    name: i.name,
    owningDept: i.owningDept,
    priority: i.priority,
    startDate: i.startDate ? i.startDate.toISOString().slice(0, 10) : null,
    endDate: i.endDate ? i.endDate.toISOString().slice(0, 10) : null,
    budget: i.budget === null ? null : Number(i.budget),
    steps: i.steps.map((s) => ({
      progress: s.progress,
      cost: s.cost === null ? null : Number(s.cost),
      actualCost: s.actualCost === null ? null : Number(s.actualCost),
    })),
  }));

  const planOptions: DashboardPlan[] = plans.map((p) => ({
    id: p.id,
    label: p.label,
    startDate: p.startDate.toISOString().slice(0, 10),
    endDate: p.endDate.toISOString().slice(0, 10),
    weekCount: p.weekCount,
    monthCount: planMonths(p.startDate, p.endDate).length,
  }));

  return (
    <OperationalDashboard
      charityName={decodedName}
      plans={planOptions}
      selectedPlanId={selected.id}
      initiatives={rows}
    />
  );
}
