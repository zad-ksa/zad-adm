import type { Metadata } from "next";
import { ClipboardList, Compass, Target, CalendarRange } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCharitySection } from "@/lib/sectionGuard";
import { StatStrip } from "@/components/console/layout";
import { NavCard } from "@/components/console/ui";
import { getStrategySummary, currentPlanYear } from "@/lib/strategySummary";
import StrategyStatusField from "./StrategyStatusField";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - الاستراتيجية | زاد التنموية` };
}

/**
 * صفحة الاستراتيجية الجامعة.
 *
 * كان الدخول إلى استراتيجية جمعيةٍ يمرّ بقائمتين منسدلتين متداخلتين في الشريط
 * الجانبي (الخدمة ← الجمعية ← الصفحة)، فلا يرى الموظف حالة الجمعية ولا ترتيب
 * أطوار التخطيط، بل قائمة روابط. وهنا: حالةٌ واحدة، وأرقامٌ تقول ما أُنجز،
 * وأربعة مربّعاتٍ بترتيب العمل الاستراتيجي — تحليلٌ، فتوجّه، فأهدافٌ ومؤشرات،
 * فخطةٌ تشغيلية.
 */
export default async function StrategyHubPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const [session, charity, statusOptions] = await Promise.all([
    getSession(),
    prisma.charity.findUnique({
      where: { name: decodedName },
      select: { id: true, strategyStatus: true, strategyStatusUpdatedAt: true },
    }),
    prisma.strategyStatusOption.findMany({ orderBy: { order: "asc" } }),
  ]);

  const canEdit = hasPermission(session?.role || "", session?.permissions || [], "manage_strategy");
  const year = currentPlanYear();
  const summary = charity ? await getStrategySummary(charity.id, decodedName, year) : null;

  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;
  const analysisCount = (summary?.readinessResponses ?? 0) + (summary?.hexagonalResponses ?? 0);

  return (
    <div className="space-y-6">
      {charity && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] dark:border-slate-800 dark:bg-slate-900">
          <StrategyStatusField
            charityId={charity.id}
            current={charity.strategyStatus}
            updatedAt={
              charity.strategyStatusUpdatedAt
                ? charity.strategyStatusUpdatedAt.toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null
            }
            options={statusOptions.map((o) => ({ id: o.id, name: o.name, tone: o.tone, isActive: o.isActive }))}
            canEdit={canEdit}
          />
        </section>
      )}

      <StatStrip
        label={`ملخّص الخطة ${year}`}
        items={[
          { label: "الأهداف الاستراتيجية", value: summary?.objectives ?? 0 },
          { label: "مؤشرات الأداء", value: summary?.indicators ?? 0 },
          { label: "المبادرات التشغيلية", value: summary?.initiatives ?? 0 },
          {
            label: "اكتمال إدخال النتائج",
            value: summary?.entryCompletion ?? 0,
            unit: "%",
            dot:
              summary?.entryCompletion === null || summary?.entryCompletion === undefined
                ? "muted"
                : summary.entryCompletion >= 90
                  ? "active"
                  : summary.entryCompletion >= 40
                    ? "warn"
                    : "danger",
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <NavCard
          href={`${base}/analysis`}
          icon={<ClipboardList className="size-5" />}
          title="التحليل الاستراتيجي"
          description="استبيان الجاهزية للتخطيط، والتحليل السداسي لبيئة الجمعية."
          meta={analysisCount > 0 ? `${analysisCount} رداً` : "لا ردود بعد"}
          metaWarn={analysisCount === 0}
        />
        <NavCard
          href={`${base}/direction`}
          icon={<Compass className="size-5" />}
          title="بناء التوجه الاستراتيجي"
          description="استبيان الرؤية والرسالة والأثر، وما استُخلص منه."
          meta={
            summary && summary.visionMissionResponses > 0
              ? `${summary.visionMissionResponses} رداً`
              : "لا ردود بعد"
          }
          metaWarn={!summary || summary.visionMissionResponses === 0}
        />
        <NavCard
          href={`${base}/objectives`}
          icon={<Target className="size-5" />}
          title="دليل الأهداف والمؤشرات"
          description="الدليل المعتمد، ومتابعة الأداء، ولوحة المعلومات."
          meta={
            summary && summary.indicators > 0
              ? `${summary.objectives} هدفاً · ${summary.indicators} مؤشراً`
              : "لم يُبنَ الدليل بعد"
          }
          metaWarn={!summary || summary.indicators === 0}
        />
        <NavCard
          href={`${base}/operational`}
          icon={<CalendarRange className="size-5" />}
          title="الخطة التشغيلية"
          description="كشاف المبادرات، وخطة كل مبادرة ومخطّطها الزمني."
          meta={
            summary && summary.initiatives > 0
              ? `${summary.initiatives} مبادرة`
              : "لا خطة تشغيلية بعد"
          }
          metaWarn={!summary || summary.initiatives === 0}
        />
      </div>
    </div>
  );
}
