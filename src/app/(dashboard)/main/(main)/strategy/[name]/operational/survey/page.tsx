import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireCharitySection } from "@/lib/sectionGuard";
import { ensurePlanSurvey } from "@/app/actions/planSurvey";
import { COMMITMENT_IDS, READINESS_IDS, ratingAverage } from "@/lib/planSurvey";
import PlanSurveyAdminClient, { type ResponseView } from "./PlanSurveyAdminClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - استبانة تنفيذ الخطة | زاد التنموية` };
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export default async function PlanSurveyAdminPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const charityName = decodeURIComponent(name);
  await requireCharitySection("manage_strategy", charityName);

  // الاستبانةُ تُنشأ عند أول فتح: هي رابطٌ للخطة القائمة لا قرارٌ يُتَّخذ.
  const survey = await ensurePlanSurvey(charityName);
  if (!survey) notFound();

  const [responses, initiatives] = await Promise.all([
    prisma.planSurveyResponse.findMany({
      where: { surveyId: survey.id },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.initiative.findMany({
      where: { plan: { charity: { name: charityName } } },
      select: { id: true, number: true, name: true },
      orderBy: { number: "asc" },
    }),
  ]);

  const nameOf = new Map(initiatives.map((i) => [i.id, `م${i.number} — ${i.name}`]));

  const rows: ResponseView[] = responses.map((r) => {
    const ratings = (r.ratings ?? {}) as Record<string, number>;
    return {
      id: r.id,
      department: r.department,
      role: r.role,
      submittedAt: fmt(r.submittedAt),
      initiatives: r.initiativeIds.map((id) => nameOf.get(id) ?? "مبادرةٌ محذوفة"),
      extraInitiatives: r.extraInitiatives,
      commitment: ratingAverage(ratings, COMMITMENT_IDS),
      readiness: ratingAverage(ratings, READINESS_IDS),
      ratings,
      tasks: (r.tasks ?? []) as ResponseView["tasks"],
      pace: r.pace,
      causes: r.causes,
      causeOther: r.causeOther,
      topCauses: r.topCauses,
      blockers: (r.blockers ?? []) as ResponseView["blockers"],
      outlook: r.outlook,
      achievements: r.achievements,
      neededAction: r.neededAction,
      suggestions: r.suggestions,
    };
  });

  /**
   * الرابطُ يُبنى في الخادم من ترويسة الطلب.
   *
   * فالنطاقُ يختلف بين التطوير والإنتاج، وبناؤه في المتصفّح يعني أن الخادمَ
   * يرسم نصّاً والمتصفّحُ يرسم غيرَه — وهو اختلافُ ترطيبٍ يُنبّه عليه React،
   * وعلاجُه حالةٌ تُضبط في أثر. والترويسةُ تقول النطاقَ قبل الرسم، فلا حالةَ
   * ولا أثرَ ولا اختلاف.
   */
  const head = await headers();
  const proto = head.get("x-forwarded-proto") ?? "https";
  const host = head.get("host") ?? "";
  const surveyUrl = host ? `${proto}://${host}/plan-survey/${survey.token}` : `/plan-survey/${survey.token}`;

  return (
    <PlanSurveyAdminClient
      charityName={charityName}
      surveyUrl={surveyUrl}
      isOpen={survey.isOpen}
      responses={rows}
    />
  );
}
