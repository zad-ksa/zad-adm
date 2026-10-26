import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCharitySection } from "@/lib/sectionGuard";
import { EmptyState } from "@/components/console/layout";
import PerformanceTable from "@/components/PerformanceTable";
import StrategyPermissionToggle from "@/components/StrategyPermissionToggle";
import { getTracking } from "@/app/actions/strategyTracking";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - متابعة الأداء | زاد التنموية` };
}

/**
 * متابعة الأداء — وهي مقياس الأداء نفسه بعد نقل مصدره.
 *
 * كانت شجرة المؤشرات كلّها حقلَ JSON واحداً في `PerformanceMetric` لكل (اسم
 * جمعية، سنة): لا يُستعلم عن مؤشرٍ بعينه، ولا يُربط بمبادرة، والجمعية مربوطةٌ
 * بالاسم نصاً. وصارت صفوفاً في الجداول العلائقية، يشترك فيها الدليل وهذه
 * الصفحة — فما يُعرَّف في الدليل تُدخَل نتائجه هنا، ولا نسختان من الحقيقة.
 *
 * والجدول نفسه لم يتغيّر شكلُه: المحور ← الهدف ← المؤشر، ومحدِّدا السنة والربع،
 * والشاشة الكاملة، وأداء الهدف والمحور والجمعية.
 */
export default async function TrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ year?: string; quarter?: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const query = await searchParams;
  const parsedYear = query?.year ? parseInt(query.year, 10) : NaN;
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  const quarter = ["Q1", "Q2", "Q3", "Q4"].includes(query?.quarter || "") ? query.quarter! : "Q1";

  const [session, charity] = await Promise.all([
    getSession(),
    prisma.charity.findUnique({ where: { name: decodedName }, select: { id: true, isPerformanceEditable: true } }),
  ]);

  const canManageStrategy = hasPermission(session?.role || "", session?.permissions || [], "manage_strategy");

  if (!charity) {
    return (
      <EmptyState
        icon={<LineChart className="size-6" />}
        title="لا صفَّ لهذه الجمعية بعد"
        description="يُنشأ صفُّ الجمعية عند أول استبيانٍ تُعبّئه، ثم تُتابَع مؤشراتها."
      />
    );
  }

  const axes = await getTracking(charity.id, year);

  return (
    <div className="transition-colors">
      {canManageStrategy && (
        <StrategyPermissionToggle
          charityName={decodedName}
          type="performance"
          initialState={charity.isPerformanceEditable}
          label="إتاحة التعديل على متابعة الأداء للجمعية"
          description="تفعيل هذا الخيار سيسمح لموظفي الجمعية بتعديل وتحديث مؤشرات الأداء بأنفسهم."
        />
      )}

      <p className="mt-8 mb-6 text-body text-slate-500 dark:text-slate-400">
        مستهدفات الربع {quarter} من عام {year} ومتحققها. والمحقق السنوي محسوبٌ من الأرباع وفق تراكمية كل مؤشر.
      </p>

      <PerformanceTable
        key={`${decodedName}-${year}`}
        charityId={charity.id}
        charityName={decodedName}
        year={year}
        quarter={quarter}
        initialData={axes.length > 0 ? axes : null}
      />
    </div>
  );
}
