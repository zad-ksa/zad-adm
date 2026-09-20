import { prisma } from "@/lib/db";

/**
 * فريقا الخدمة في محادثة بين زاد وجمعية.
 *
 * البريد الذي يحمل خدمةً وجمعيةً ليس مراسلةً بين شخصين، بل **محادثةٌ بين فريقين**:
 * موظفو زاد الحاملون للخدمة، وأعضاء الجمعية المفوَّضون بها. فكل رسالةٍ فيها —
 * أولها وكل ردٍّ عليها — تصل الفريقين كاملين إلا كاتبها، ويستطيع أيٌّ منهم أن
 * يكمل. وكل رسالةٍ تبقى منسوبةً إلى كاتبها الحقيقي، فيعرف الفريق من ردّ.
 *
 * ليس ملف "use server": هذه دوالٌّ داخلية تستدعيها أفعالٌ محروسة، ولو صُدّرت من
 * ملف أفعال لصارت كلٌّ منها مدخلاً HTTP بلا حارس.
 */

export type ServiceMailAuthor = { kind: "EMPLOYEE"; id: string } | { kind: "CHARITY_USER"; id: string };

export type ServiceRecipientRow = {
  employeeId?: string;
  charityUserId?: string;
  charityId?: string;
  type: string;
};

/**
 * موظفو زاد الحاملون لخدمةٍ ما.
 *
 * ثلاثة مصادر كما في getEmployeeServiceNames: منحٌ مباشر، ومجموعةٌ للموظف،
 * ومجموعةٌ لمسمّاه. والمنح المباشر قد يكون مقصوراً على جمعيةٍ بعينها، فيُقبل
 * منه ما كان عامّاً أو كان لهذه الجمعية.
 *
 * و«بلا منح = بلا تقييد» لا تنطبق هنا: تلك قاعدة عرضٍ لا قاعدة تسليم، ولو
 * طُبّقت لوصل بريد الجمعية كل موظفٍ لم يُمنح شيئاً.
 *
 * وبلا `charityId` تُعيد حاملي الخدمة أينما كانت: هذا سؤال «من يملك الخدمة
 * أصلاً؟» لا «من يستلم بريد هذه الجمعية؟» — وعليه يقوم اختيار معمِّديها.
 */
export async function zadServiceTeam(serviceName: string, charityId?: string): Promise<string[]> {
  const [direct, bundles] = await Promise.all([
    prisma.employeeServiceAccess.findMany({
      where: charityId ? { serviceName, OR: [{ charityId: null }, { charityId }] } : { serviceName },
      select: { employeeId: true },
    }),
    prisma.permissionBundle.findMany({
      where: { services: { has: serviceName } },
      select: {
        employees: { select: { employeeId: true } },
        roles: { select: { role: { select: { key: true } } } },
      },
    }),
  ]);

  const ids = new Set<string>(direct.map((r) => r.employeeId));
  for (const bundle of bundles) {
    for (const e of bundle.employees) ids.add(e.employeeId);
  }

  const roleKeys = [...new Set(bundles.flatMap((b) => b.roles.map((r) => r.role.key)))];
  if (roleKeys.length > 0) {
    const byRole = await prisma.employee.findMany({
      where: { role: { in: roleKeys } },
      select: { id: true },
    });
    for (const e of byRole) ids.add(e.id);
  }

  if (ids.size === 0) return [];

  // الموقوفون لا يستقبلون: صندوقٌ لا يفتحه أحد.
  const active = await prisma.employee.findMany({
    where: { id: { in: [...ids] }, isActive: true },
    select: { id: true },
  });
  return active.map((e) => e.id);
}

/** أعضاء الجمعية المفوَّضون بالخدمة فيها، في عضوياتٍ نشطة. */
export async function charityServiceTeam(serviceName: string, charityId: string): Promise<string[]> {
  const rows = await prisma.charityMemberService.findMany({
    where: { serviceName, membership: { isActive: true, charityId } },
    select: { membership: { select: { charityUserId: true } } },
  });
  return [...new Set(rows.map((r) => r.membership.charityUserId))];
}

/**
 * مستلمو رسالةٍ في محادثة خدمة.
 *
 * الفريق الآخر في «إلى»، وزملاء الكاتب في فريقه في «نسخة» — فيرى زملاؤه ما
 * كتبه باسمهم، ولا يُرسل الكاتب إلى نفسه. ويُرفض التسليم إن خلا الفريق الآخر:
 * رسالةٌ لا يستلمها أحدٌ في الطرف المقابل ليست رسالة.
 */
export async function serviceConversationRecipients(args: {
  serviceName: string;
  charityId: string;
  author: ServiceMailAuthor;
}): Promise<ServiceRecipientRow[]> {
  const { serviceName, charityId, author } = args;
  const [zad, charity] = await Promise.all([
    zadServiceTeam(serviceName, charityId),
    charityServiceTeam(serviceName, charityId),
  ]);

  const zadRows = (type: string) =>
    zad
      .filter((id) => !(author.kind === "EMPLOYEE" && author.id === id))
      .map((employeeId) => ({ employeeId, type }));
  const charityRows = (type: string) =>
    charity
      .filter((id) => !(author.kind === "CHARITY_USER" && author.id === id))
      .map((charityUserId) => ({ charityUserId, charityId, type }));

  if (author.kind === "EMPLOYEE") {
    if (charity.length === 0) {
      throw new Error(`لا أحد مفوَّض بخدمة «${serviceName}» في الجمعية — تعذّر التسليم`);
    }
    return [...charityRows("TO"), ...zadRows("CC")];
  }

  if (zad.length === 0) {
    throw new Error(`لا يوجد موظف مسؤول عن «${serviceName}» حالياً — راجع إدارة زاد`);
  }
  return [...zadRows("TO"), ...charityRows("CC")];
}

/** رسالةٌ سُلّمت فعلاً — لا منتظرة ولا مُرجَعة ولا مسودة. تُعرض في السلسلة وحدها. */
export function isDelivered(m: { approvalState: string; isDraft: boolean }): boolean {
  return !m.isDraft && (m.approvalState === "NONE" || m.approvalState === "APPROVED");
}
