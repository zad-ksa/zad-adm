import { prisma } from "@/lib/db";
import { requireSection } from "@/lib/sectionGuard";
import { getAssignedCharityIds } from "@/lib/access";

/**
 * نطاقُ صفحات الجهات المانحة: ما يُحسب وما يُعرض لكلِّ موظف.
 *
 * وبياناتُ الجهة نفسها (الاسم، الرابط، المجالات، الحالة، التاريخان) بياناتُ
 * زاد لا بياناتُ جمعية، فلا يُقيّدها إسناد. **وما سِوى ذلك مقصورٌ على الجمعيات
 * المسنَدة**: الأعدادُ وجدولُ الحسابات وجدولُ المنح.
 *
 * وثمنُه مقصود: البطاقةُ تُظهر رقمين مختلفين لموظفين مختلفين — فالرقمُ جوابُ
 * «كيف أداءُ جمعياتي مع هذه الجهة» لا «كم رفعت الجمعياتُ كلُّها». ولذلك تقول
 * الصفحةُ ذلك صراحةً في رأسها، ويُسمّى العمودُ «جمعياتُك التي رفعت» — وبغير
 * ذلك يُقارن اثنان رقمَيهما فيَظنّان أحدَهما معطوباً.
 *
 * و«شركة زاد» جمعيةٌ كغيرها هنا: تدخل النطاقَ المفتوح وتُسنَد كما تُسنَد
 * الجمعيات — ولا تُصفّى هذه الصفحةُ بـ`EXTERNAL_CHARITIES` (انظر
 * `INTERNAL_VISIBLE_IN` في `charityScope.ts`).
 */
export type DonorViewerCharity = { id: string; name: string; isInternal: boolean };

export type DonorViewer = {
  employeeId: string;
  /** الجمعياتُ التي تُحسب أرقامُها وتُعرض حساباتُها — مرتَّبةً للعرض. */
  charities: DonorViewerCharity[];
  charityIds: string[];
  /** نطاقٌ مفتوح (`developer_mode`): كلُّ الجمعيات، لا قائمةٌ مسنَدة. */
  unrestricted: boolean;
};

export async function requireDonorViewer(): Promise<DonorViewer> {
  const session = await requireSection("manage_resource_development");
  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);

  const charities = await prisma.charity.findMany({
    where: assigned === null ? undefined : { id: { in: assigned } },
    select: { id: true, name: true, isInternal: true },
    orderBy: { name: "asc" },
  });

  // الكيانُ الداخليُّ آخرَ القائمة: ليس جمعيةً متعاقدة، فلا يُدسّ بين
  // الجمعيات في مُرشِّحٍ يُقرأ بالاسم.
  const ordered = [...charities.filter((c) => !c.isInternal), ...charities.filter((c) => c.isInternal)];

  return {
    employeeId: session.id,
    charities: ordered,
    charityIds: ordered.map((c) => c.id),
    unrestricted: assigned === null,
  };
}

/**
 * أرقامُ الجهات على نطاق الرائي: لكل جهةٍ عددُ جمعياته التي رفعت وعددُ الطلبات.
 *
 * محسوبةٌ لا مخزَّنة — ولا سبيلَ غيرُه: العدّادُ المخزَّن رقمٌ واحدٌ للجميع،
 * والمطلوبُ رقمٌ لكل رائٍ بحسب إسناده. واستعلامٌ واحدٌ يكفي القائمةَ كلَّها.
 */
export type DonorCounts = { charities: number; grants: number };

export async function donorGrantCounts(charityIds: string[]): Promise<Map<string, DonorCounts>> {
  const out = new Map<string, DonorCounts>();
  if (charityIds.length === 0) return out;

  const rows = await prisma.grantApplication.groupBy({
    by: ["donorOrgId", "charityId"],
    where: { charityId: { in: charityIds }, donorOrgId: { not: null } },
    _count: { _all: true },
  });

  for (const row of rows) {
    if (!row.donorOrgId) continue;
    const prev = out.get(row.donorOrgId) ?? { charities: 0, grants: 0 };
    out.set(row.donorOrgId, { charities: prev.charities + 1, grants: prev.grants + row._count._all });
  }
  return out;
}

/** منحُ جمعيةٍ واحدةٍ عند كل جهة — لحالِ المُرشِّح حين تُختار جمعية. */
export async function donorGrantCountsForCharity(charityId: string): Promise<Map<string, number>> {
  const rows = await prisma.grantApplication.groupBy({
    by: ["donorOrgId"],
    where: { charityId, donorOrgId: { not: null } },
    _count: { _all: true },
  });
  return new Map(rows.filter((r) => r.donorOrgId).map((r) => [r.donorOrgId as string, r._count._all]));
}
