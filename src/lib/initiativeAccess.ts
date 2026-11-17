import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";
import { charityHasService, sectionService } from "@/lib/charityServices";
import { samePersonName } from "@/lib/personName";

/**
 * بابُ المبادرة: بابان لا باب.
 *
 * **الأوّلُ قسمُ الاستراتيجية**: صلاحيةُ `manage_strategy` مع إسناد الجمعية
 * وخدمتِها — وهو بابُ الكشّاف والخطة والمبادرات كلِّها في تلك الجمعية.
 *
 * **والثاني تكليفُ المبادرة نفسِها**: من كُتب اسمُه «مدير المبادرة» يفتحها
 * ويُعدّلها ولو لم يكن من أهل القسم ولا من المسنَدين إلى جمعيتها. فالمبادرةُ
 * التي كُتب اسمُه فيها عملُه، وصفحةٌ تُعرض له ولا تُفتح — أو تُفتح ولا تُعدَّل
 * — تكليفٌ بلا أداة. وكانت «مبادراتي» تعرض بطاقةً بلا رابطٍ لهذا السبب.
 *
 * **ونطاقُ البابِ الثاني مبادرتُه وحدَها**: لا الكشّافُ ولا الخطةُ ولا مبادرةٌ
 * أخرى في الجمعية، ولا حذفُ مبادرته — الحذفُ ليس تعديلاً، وهو قرارُ صاحب
 * الخطة. فالتكليفُ يُعطي أدواتَ العمل لا مفتاحَ الباب الأوّل.
 *
 * **والتكليفُ بالاسم لا بمُعرِّف**: `Initiative.managerName` عمودُ نصّ،
 * والمطابقةُ بـ`samePersonName` — تُسوّي رسمَ الهمزة والتاء المربوطة
 * والمسافات، ولا تُقرِّب اسماً من اسم. وهذه هي المطابقةُ التي تُبنى عليها
 * صفحةُ «مبادراتي»، فما يُعرض فيها هو ما يُفتح بعينه.
 */
export type AccessVia = "SECTION" | "MANAGER";

/** فحوصُ قسم الاستراتيجية في جمعيةٍ ما، بلا تحويلٍ ولا رمي: نعم أو لا. */
export async function hasStrategySectionAccess(
  session: { id: string; role: string; permissions?: string[] | null } | null,
  charityId: string,
  { requireService = true }: { requireService?: boolean } = {}
): Promise<boolean> {
  if (!session?.id) return false;
  if (!hasPermission(session.role, session.permissions || [], "manage_strategy")) return false;

  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions ?? undefined);
  if (assigned !== null && !assigned.includes(charityId)) return false;

  // والخدمةُ تُفحص في بابِ الصفحة لا في الأفعال: تلك فحوصُ
  // `requireCharitySection`، وأفعالُ `strategyOperational` لم تفحصها قطّ —
  // فلا يُشدَّد هنا على من كان يعمل.
  if (!requireService) return true;
  const service = sectionService("manage_strategy");
  return service ? charityHasService(charityId, service) : true;
}

/** اسمُ الموظّف من صفّه — لا من الجلسة: جلسةٌ قديمةٌ باسمٍ عُدِّل. */
export async function employeeName(employeeId: string): Promise<string> {
  const row = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { name: true },
  });
  return row?.name ?? "";
}

/** هل هذا الموظّفُ هو المكلَّفُ بهذه المبادرة؟ */
export async function isAssignedManager(
  employeeId: string,
  managerName: string | null | undefined
): Promise<boolean> {
  if (!managerName?.trim()) return false;
  return samePersonName(managerName, await employeeName(employeeId));
}

/**
 * الوصولُ إلى مبادرةٍ بعينها، ومن أيِّ بابٍ جاء — أو `null` فلا باب.
 *
 * ويُستدعى من الصفحة ومن الأفعال: ولو حُسب في كلٍّ منهما لافترق المعروضُ عن
 * المسموح، وهي علّةُ هذه الطبقة.
 */
export async function initiativeAccess(
  initiativeId: string,
  { requireService = true }: { requireService?: boolean } = {}
): Promise<{ via: AccessVia; employeeId: string } | null> {
  const session = await getSession();
  if (!session?.id) return null;

  const row = await prisma.initiative.findUnique({
    where: { id: initiativeId },
    select: { managerName: true, plan: { select: { charityId: true } } },
  });
  if (!row) return null;

  if (await hasStrategySectionAccess(session, row.plan.charityId, { requireService })) {
    return { via: "SECTION", employeeId: session.id };
  }
  if (await isAssignedManager(session.id, row.managerName)) {
    return { via: "MANAGER", employeeId: session.id };
  }
  return null;
}
