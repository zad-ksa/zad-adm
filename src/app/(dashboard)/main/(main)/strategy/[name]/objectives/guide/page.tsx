import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { requireCharitySection } from "@/lib/sectionGuard";
import GuideClient, { type GuidePerspective } from "./GuideClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${decodeURIComponent(name)} - دليل الأهداف والمؤشرات | زاد التنموية` };
}

/**
 * دليل الأهداف والمؤشرات — الوثيقة المعتمدة للجمعية.
 *
 * الشجرة كلّها في استعلامٍ واحد: `relationJoins` مُفعَّلة في المخطّط، فالعلاقات
 * المتداخلة تصير LATERAL JOIN واحداً لا رحلةً لكل طبقة — والقاعدة في سيدني،
 * فالرحلة الواحدة تكلّف مئات المللي.
 */
export default async function GuidePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  await requireCharitySection("manage_strategy", decodedName);

  const [session, charity] = await Promise.all([
    getSession(),
    prisma.charity.findUnique({ where: { name: decodedName }, select: { id: true } }),
  ]);

  const canEdit = hasPermission(session?.role || "", session?.permissions || [], "manage_strategy");

  const perspectives = charity
    ? await prisma.strategyPerspective.findMany({
        where: { charityId: charity.id },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          prefix: true,
          objectives: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              indicators: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  unit: true,
                  formula: true,
                  frequency: true,
                  polarity: true,
                  cumulative: true,
                  owner: true,
                  execOwner: true,
                  measureOwner: true,
                  baseline: true,
                },
              },
            },
          },
        },
      })
    : [];

  // `Decimal` لا يعبر إلى مكوّن العميل، فيُحوَّل نصاً هنا — والنصّ يحفظ المنازل
  // كما أُدخلت بلا تقريبٍ عابر.
  const data: GuidePerspective[] = perspectives.map((p) => ({
    id: p.id,
    name: p.name,
    prefix: p.prefix,
    objectives: p.objectives.map((o) => ({
      id: o.id,
      code: o.code,
      name: o.name,
      description: o.description,
      indicators: o.indicators.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        description: i.description,
        unit: i.unit,
        formula: i.formula,
        frequency: i.frequency,
        polarity: i.polarity,
        cumulative: i.cumulative,
        owner: i.owner,
        execOwner: i.execOwner,
        measureOwner: i.measureOwner,
        baseline: i.baseline === null ? null : String(i.baseline),
      })),
    })),
  }));

  return <GuideClient charityId={charity?.id ?? null} perspectives={data} canEdit={canEdit} />;
}
