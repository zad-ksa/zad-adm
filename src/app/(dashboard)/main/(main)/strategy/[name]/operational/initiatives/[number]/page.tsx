import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasStrategySectionAccess, isAssignedManager } from "@/lib/initiativeAccess";
import { planMonths } from "@/lib/initiativeProgress";
import { planPeopleGroups } from "@/lib/planPeople";
import { Crumbs, type Crumb } from "@/components/console/layout";
import { entityCrumbs } from "@/lib/crumbs";
import InitiativePlanClient, { type InitiativeDetail, type StepRow } from "./InitiativePlanClient";
import type { InitiativeRow, ObjectiveOption } from "../InitiativesClient";

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
 *
 * **وبابُها بابان** (`initiativeAccess`): قسمُ الاستراتيجية في جمعيتها،
 * أو تكليفُ المبادرة نفسِها — فمن كُتب اسمُه «مدير المبادرة» يفتحها
 * ويُعدّلها ولو لم يكن من أهل القسم. ولذلك لا يُحرسها
 * `requireCharitySection`: ذاك حارسٌ يَحجب أو يُحوّل، ولا يعرف إلا باباً
 * واحداً. والفحصُ بعد الاستعلام لأنّ التكليفَ مكتوبٌ في الصفّ نفسِه.
 */
export default async function InitiativePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string; number: string }>;
  /** `from=mine` — دُخلت من «مبادراتي»، فمسارُها وزرُّ رجوعها إليها. */
  searchParams: Promise<{ from?: string }>;
}) {
  const { name, number } = await params;
  const { from } = await searchParams;
  const fromMine = from === "mine";
  const decodedName = decodeURIComponent(name);

  const parsed = parseInt(number, 10);
  if (!Number.isFinite(parsed)) notFound();

  const [session, entity, initiative] = await Promise.all([
    getSession(),
    // والكيانُ الداخليُّ لا يبدأ مسارُه بـ«الجمعيات» — كما في ترويسة القسم.
    prisma.charity.findUnique({ where: { name: decodedName }, select: { isInternal: true } }),
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
        marketingKind: true,
        marketingUrl: true,
        marketingFileName: true,
        plan: { select: { id: true, charityId: true, label: true, startDate: true, endDate: true, weekCount: true } },
        objective: { select: { id: true, code: true, name: true } },
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

  // بابان: أهلُ القسم في جمعيتها، أو المكلَّفُ بها بعينه. ومن لا بابَ له
  // يُردّ، فلا يُقرأ ملفُّ مبادرةٍ بكتابة رابطها.
  const sectionAccess = await hasStrategySectionAccess(session, initiative.plan.charityId);
  const isManager = sectionAccess
    ? false
    : await isAssignedManager(session?.id ?? "", initiative.managerName);
  if (!sectionAccess && !isManager) redirect("/main");

  // وكلا البابين يُعدّل: التكليفُ بلا أداةِ تعديلٍ تكليفٌ ناقص.
  const canEdit = sectionAccess || isManager;
  // ومن دخل بتكليفه وحدَه لا يُعرض له مسارُ الاستراتيجية: حلقاتُه أبوابٌ
  // لا تُفتح له، فمسارُه «مبادراتي» ورجوعُه إليها — ولو جاء بالرابط مباشرةً.
  const asMine = fromMine || isManager;
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
    marketingKind: initiative.marketingKind,
    marketingUrl: initiative.marketingUrl,
    marketingFileName: initiative.marketingFileName,
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

  // ومسارُ هذه الصفحة يُكتب هنا لا في ترويسة القسم: آخرُ حلقةٍ فيه اسمُ
  // المبادرة، ولا يعرفه الرابطُ ولا الترويسةُ الجامعة. والعنوانُ لا يُكرَّر
  // فوقه: اسمُ المبادرة مكتوبٌ في بطاقتها أسفلَه.
  // زادُ نافذة تعديل البيانات: الأهدافُ والمؤشّراتُ من دليل الجمعية،
  // والأسماءُ من فريقَي زادٍ والجمعية — وهي استعلاماتٌ لا تُطلب لمن لا
  // يُعدِّل، فلا تُحمَّل الصفحةُ ما لا يُستعمل.
  const edit = canEdit
    ? await (async () => {
        const [objectiveRows, people] = await Promise.all([
          prisma.strategyObjective.findMany({
            where: { perspective: { charityId: initiative.plan.charityId } },
            orderBy: [{ perspective: { order: "asc" } }, { order: "asc" }],
            select: {
              id: true,
              code: true,
              name: true,
              perspective: { select: { name: true } },
              indicators: { orderBy: { order: "asc" }, select: { id: true, code: true, name: true } },
            },
          }),
          planPeopleGroups(initiative.plan.charityId),
        ]);

        const objectives: ObjectiveOption[] = objectiveRows.map((o) => ({
          id: o.id,
          code: o.code,
          name: o.name,
          perspective: o.perspective.name,
          indicators: o.indicators,
        }));

        // وصفُّ النافذة يُبنى هنا لا في العميل: هو صفُّ الكشّاف نفسُه
        // (`InitiativeRow`)، فتُفتح نافذةٌ واحدةٌ من البابين بلا شكلٍ ثانٍ.
        const row: InitiativeRow = {
          id: initiative.id,
          number: initiative.number,
          name: initiative.name,
          description: initiative.description,
          durationText: initiative.durationText,
          managerName: initiative.managerName,
          owningDept: initiative.owningDept,
          priority: initiative.priority,
          startDate: detail.startDate,
          endDate: detail.endDate,
          budget: text(initiative.budget),
          monthlyBudget: (initiative.monthlyBudget as Record<string, number> | null) ?? null,
          marketingKind: initiative.marketingKind,
          marketingUrl: initiative.marketingUrl,
          marketingFileName: initiative.marketingFileName,
          objective: initiative.objective,
          indicators: initiative.indicators.map((x) => x.indicator),
          steps: initiative.steps.map((s) => ({
            progress: s.progress,
            cost: s.cost === null ? null : Number(s.cost),
            actualCost: s.actualCost === null ? null : Number(s.actualCost),
            planStartWeek: s.planStartWeek,
            planWeeks: s.planWeeks,
            actualStartWeek: s.actualStartWeek,
            actualWeeks: s.actualWeeks,
          })),
        };

        return { objectives, people, row };
      })()
    : null;

  const base = `/main/strategy/${encodeURIComponent(decodedName)}`;
  const crumbs: Crumb[] = asMine
    ? // ومن جاء من «مبادراتي» لا يُعاد إلى شجرة الاستراتيجية: مسارُه حلقتان،
      // أولاهما الصفحةُ التي خرج منها.
      [{ label: "مبادراتي", href: "/main/my-initiatives" }, { label: initiative.name }]
    : entityCrumbs(
        decodedName,
        { isInternal: entity?.isInternal ?? false, sectionHref: base },
        { label: "الاستراتيجية", href: base },
        { label: "الخطة التشغيلية", href: `${base}/operational` },
        { label: "كشاف المبادرات", href: `${base}/operational/initiatives` },
        { label: initiative.name }
      );

  return (
    <>
      <div className="mb-4 print:hidden">
        <Crumbs items={crumbs} />
      </div>
      <InitiativePlanClient
        initiative={detail}
        steps={steps}
        canEdit={canEdit}
        edit={edit}
        back={
          asMine
            ? { href: "/main/my-initiatives", label: "مبادراتي" }
            : { href: `${base}/operational/initiatives`, label: "الكشاف" }
        }
      />
    </>
  );
}
