import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/console/layout";
import { SURVEY_TITLE, stepPlannedEnd } from "@/lib/planSurvey";
import PlanSurveyClient from "./PlanSurveyClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${SURVEY_TITLE} | زاد التنموية`,
  description: "استبانة قياس مستوى تنفيذ الخطة التشغيلية — إعداد شركة زاد التنموية",
  // الرابطُ يُرسل إلى موظفي الجمعية، ولا شأن لمحركات البحث به.
  robots: { index: false, follow: false },
};

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * صفحةُ الاستبانة العامّة — حارسُها الرمزُ في الرابط.
 *
 * ولا جلسةَ لها: المستجيبُ موظفٌ في الجمعية لا مستخدمٌ في الموقع. والرمزُ
 * يُعيّن الجمعيةَ فيأتي القسمُ الأول جاهزاً باسمها، وتأتي الإداراتُ والمبادراتُ
 * والخطواتُ من خطتها التشغيلية — فلا يُكتب في الاستبانة ما هو مكتوبٌ في الخطة.
 */
export default async function PlanSurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const survey = await prisma.planSurvey.findUnique({
    where: { token: decodeURIComponent(token) },
    select: {
      token: true,
      isOpen: true,
      charity: {
        select: {
          name: true,
          operationalPlans: {
            orderBy: { startDate: "desc" },
            take: 1,
            select: {
              label: true,
              startDate: true,
              initiatives: {
                orderBy: { number: "asc" },
                select: {
                  id: true,
                  number: true,
                  name: true,
                  owningDept: true,
                  steps: {
                    orderBy: { order: "asc" },
                    select: { id: true, order: true, phase: true, title: true, planStartWeek: true, planWeeks: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!survey || !survey.isOpen) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4" dir="rtl">
        <div className="w-full rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Lock className="size-4" />}
            title={survey ? "الاستبانة مغلقة" : "رابطٌ غير صالح"}
            description={
              survey
                ? "أُغلق استقبالُ الإجابات. راجع مسؤول متابعة الخطة في جمعيتك."
                : "تحقّق من الرابط، أو اطلبه من مسؤول متابعة الخطة في جمعيتك."
            }
          />
        </div>
      </main>
    );
  }

  const plan = survey.charity.operationalPlans[0] ?? null;

  const initiatives = (plan?.initiatives ?? []).map((i) => ({
    id: i.id,
    number: i.number,
    name: i.name,
    steps: i.steps.map((s) => ({
      id: s.id,
      order: s.order,
      phase: s.phase,
      title: s.title,
      // الموعدُ المخطَّطُ محسوبٌ من أسابيع الخطة: الخطوةُ أسبوعُ بدايةٍ وعددُ
      // أسابيع، لا تاريخان.
      plannedEnd: plan ? iso(stepPlannedEnd(plan.startDate, s.planStartWeek, s.planWeeks)) : null,
    })),
  }));

  const departments = [
    ...new Set((plan?.initiatives ?? []).map((i) => i.owningDept).filter((d): d is string => !!d)),
  ].sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <PlanSurveyClient
      token={survey.token}
      charityName={survey.charity.name}
      planLabel={plan?.label ?? null}
      departments={departments}
      initiatives={initiatives}
    />
  );
}
