import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";
import { getTracking } from "@/app/actions/strategyTracking";
import ObjectivesDashboard, { type DashboardPerspective } from "./ObjectivesDashboard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - لوحة معلومات الأهداف | زاد التنموية` };
}

/**
 * لوحة معلومات الأهداف والمؤشرات.
 *
 * ولا رقم فيها مخزَّن: كلّها مشتقّةٌ من نتائج المؤشرات بدالّةٍ خالصةٍ واحدة
 * (`indicatorScore`) هي نفسها التي تحسب أرقام جدول المتابعة — فلا يختلف رقمٌ
 * بين صفحتين.
 *
 * وتُحسب للأرباع الأربعة لا للثالث والرابع وحدهما كما في ملف Excel: السنة
 * حقلٌ، والربع فترةٌ في صفٍّ، فلا ثابتَ في الكود.
 */
export default async function ObjectivesDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const query = await searchParams;
  const parsedYear = query?.year ? parseInt(query.year, 10) : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();

  const charity = await prisma.charity.findUnique({
    where: { name: decodedName },
    select: { id: true },
  });

  if (!charity) {
    return (
      <EmptyState
        icon={<Gauge className="size-6" />}
        title="لا صفَّ لهذه الجمعية بعد"
        description="يُنشأ صفُّ الجمعية عند أول استبيانٍ تُعبّئه."
      />
    );
  }

  const axes = await getTracking(charity.id, year);

  // الشجرة نفسها التي يقرأها جدول المتابعة، لا استعلامٌ ثانٍ بشكلٍ آخر.
  const perspectives: DashboardPerspective[] = axes.map((axis) => ({
    id: axis.id,
    name: axis.name,
    prefix: axis.prefix ?? "",
    objectives: axis.goals.map((goal) => ({
      id: goal.id,
      code: goal.code ?? "",
      name: goal.name,
      indicators: goal.indicators.map((indicator) => ({
        id: indicator.id,
        code: indicator.code ?? "",
        name: indicator.name,
        cumulative: indicator.cumulative ?? false,
        postponed: indicator.postponed ?? false,
        annualTarget: indicator.annualTarget ?? null,
        annualAchieved: indicator.annualAchieved ?? null,
        annualOverride: indicator.annualOverride ?? false,
        quarters: {
          Q1: { target: indicator.q1Target ?? null, actual: indicator.q1Achieved ?? null },
          Q2: { target: indicator.q2Target ?? null, actual: indicator.q2Achieved ?? null },
          Q3: { target: indicator.q3Target ?? null, actual: indicator.q3Achieved ?? null },
          Q4: { target: indicator.q4Target ?? null, actual: indicator.q4Achieved ?? null },
        },
      })),
    })),
  }));

  return <ObjectivesDashboard charityName={decodedName} year={year} perspectives={perspectives} />;
}
