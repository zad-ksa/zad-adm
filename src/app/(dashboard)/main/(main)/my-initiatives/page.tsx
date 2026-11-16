import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";
import { sectionService, serviceRowsWhere } from "@/lib/charityServices";
import { samePersonName } from "@/lib/personName";
import MyInitiativesClient, { type MyInitiativeRow } from "./MyInitiativesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "مبادراتي | زاد التنموية" };

/**
 * «مبادراتي» — ما كُلِّف به الموظَّفُ في الخطط التشغيليّة، عبر الجمعيات كلِّها.
 *
 * **والتكليفُ بالاسم لا بمُعرِّف**: «مدير المبادرة» عمودُ نصٍّ في `Initiative`
 * يُكتب أو يُختار من قائمة الأسماء، فالمطابقةُ هنا بـ`samePersonName` — تُسوّي
 * رسمَ الهمزة والتاء المربوطة والمسافات، ولا تُقرِّب اسماً من اسم.
 *
 * **ولا تُحجب بالإسناد**: مبادرةٌ كُتب فيها اسمُك هي عملُك، ولو كانت في جمعيةٍ
 * ليست في إسنادك — وإخفاؤها يُخفي واجباً. وما يُحجب هو **بابُ** صفحة المبادرة:
 * تلك خلف `manage_strategy` والإسنادِ والخدمة كما هي، فلا يُعرض رابطٌ يُردّ
 * صاحبُه عند النقر.
 */
export default async function MyInitiativesPage() {
  const session = await getSession();
  if (!session?.id) redirect("/login");

  // الاسمُ من صفِّه لا من الجلسة وحدَها: الجلسةُ قد تكون قديمةً باسمٍ عُدِّل.
  const me = await prisma.employee.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  const myName = me?.name ?? session.name ?? "";

  // والمبادراتُ مئاتٌ لا آلاف، والمطابقةُ تسويةُ رسمٍ لا تُكتب في SQL: تُقرأ
  // المسمّاةُ منها وتُرشَّح هنا.
  const all = await prisma.initiative.findMany({
    where: { managerName: { not: null } },
    orderBy: [{ plan: { startDate: "desc" } }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      name: true,
      managerName: true,
      startDate: true,
      endDate: true,
      priority: true,
      objective: { select: { code: true, name: true } },
      plan: {
        select: {
          label: true,
          charity: { select: { id: true, name: true } },
        },
      },
      steps: { select: { progress: true, cost: true, actualCost: true } },
    },
  });

  const mine = all.filter((row) => samePersonName(row.managerName, myName));

  // أيُّ الجمعيات يُفتح فيها بابُ صفحة المبادرة: الصلاحيةُ ثمّ الإسنادُ ثمّ
  // الخدمة — وهي فحوصُ `requireCharitySection` نفسُها، تُحسب هنا مرّةً للروابط.
  const charityIds = [...new Set(mine.map((row) => row.plan.charity.id))];
  const canStrategy = hasPermission(session.role, session.permissions || [], "manage_strategy");
  const service = sectionService("manage_strategy");

  let openable = new Set<string>();
  if (canStrategy && charityIds.length > 0) {
    const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
    const served = await prisma.charity.findMany({
      where: {
        id: { in: charityIds },
        ...(service ? { services: { some: serviceRowsWhere(service) } } : {}),
      },
      select: { id: true },
    });
    openable = new Set(
      served.map((c) => c.id).filter((id) => assigned === null || assigned.includes(id))
    );
  }

  const day = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

  const rows: MyInitiativeRow[] = mine.map((row) => ({
    id: row.id,
    number: row.number,
    name: row.name,
    charityId: row.plan.charity.id,
    charityName: row.plan.charity.name,
    planLabel: row.plan.label,
    objective: row.objective ? `${row.objective.code} — ${row.objective.name}` : null,
    priority: row.priority,
    startDate: day(row.startDate),
    endDate: day(row.endDate),
    steps: row.steps.map((step) => ({
      progress: step.progress,
      cost: step.cost === null ? null : Number(step.cost),
      actualCost: step.actualCost === null ? null : Number(step.actualCost),
    })),
    // ورابطُ صفحة المبادرة هو هو — ويحمل `from=mine` علامةً على البابِ الذي
    // دُخل منه: فتُكتب ترويستُه «مبادراتي / اسم المبادرة»، ويبقى الشريطُ
    // الجانبيُّ على «مبادراتي». وصفحةٌ ثانيةٌ لنفس المبادرة كانت تعني حارسَين
    // واستعلامَين يفترقان عند أوّل تعديل.
    href: openable.has(row.plan.charity.id)
      ? `/main/strategy/${encodeURIComponent(row.plan.charity.name)}/operational/initiatives/${row.number}?from=mine`
      : null,
  }));

  return <MyInitiativesClient myName={myName} rows={rows} />;
}
