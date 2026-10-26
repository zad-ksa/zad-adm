import type { Metadata } from "next";
import { HardHat } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string; number: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - خطة المبادرة | زاد التنموية` };
}

/**
 * صفحة المبادرة ومخطّطها الزمني — تُبنى في المرحلة الثامنة من
 * docs/خطة-نظام-التخطيط-الاستراتيجي.md
 *
 * وهي صفحةٌ صريحة لا رابطٌ مكسور: اسم المبادرة في الكشاف يقود إليها من المرحلة
 * السابعة، فالأولى أن يصل إلى بيانٍ لا إلى ٤٠٤. وتُعرض معه بيانات المبادرة
 * المسجّلة كي لا تكون الصفحة فارغةً تماماً.
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
  const initiative = Number.isFinite(parsed)
    ? await prisma.initiative.findFirst({
        where: { number: parsed, plan: { charity: { name: decodedName } } },
        select: { name: true, _count: { select: { steps: true } } },
      })
    : null;

  return (
    <EmptyState
      icon={<HardHat className="size-6" />}
      title={initiative ? `خطة «${initiative.name}» قيد الإنشاء` : "هذه الصفحة قيد الإنشاء"}
      description={
        initiative
          ? `جدول خطوات التنفيذ ومخطّط جانت الأسبوعي. الخطوات المسجّلة حتى الآن: ${initiative._count.steps}.`
          : "جدول خطوات التنفيذ ومخطّط جانت الأسبوعي لكل مبادرة."
      }
    />
  );
}
