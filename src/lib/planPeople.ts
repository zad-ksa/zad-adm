import { prisma } from "@/lib/db";
import { DEFAULT_ROLE_LABELS } from "@/lib/constants";
import { charityMemberLabel } from "@/lib/charityPermissions";
import type { NameGroup } from "@/components/console/NameSelect";

/**
 * أسماءُ من يُسمَّى في خطةِ جمعيةٍ تشغيليّة: فريقُ زادٍ وفريقُ الجمعية.
 *
 * **والاسمُ هو المخزَّن لا مُعرِّفُه**: «مدير المبادرة» عمودُ نصٍّ في `Initiative`،
 * فالقائمةُ هنا تيسيرُ كتابةٍ لا رابطةُ صفوف — تُغني عن تهجئة اسمٍ معروفٍ يدوياً،
 * وتُبقي البابَ مفتوحاً لاسمٍ ليس في الموقع أصلاً (متطوّعٌ، أو موظّفُ جهةٍ ثالثة).
 *
 * **والمجموعتان تُقرآن من موضعيهما**: موظّفو زاد من `Employee` النشطين، وفريقُ
 * الجمعية من عضويّاتها النشطة — لا من جدولٍ ثالثٍ يُكتب فيه الاسمان معاً ويشيخ.
 *
 * وما تكرّر لا يُعاد: اسمٌ واحدٌ في المجموعتين يبقى في الأولى، فقيمةُ الخيار هي
 * الاسمُ نفسُه ولا تحتمل تكراراً.
 */
export async function planPeopleGroups(charityId: string): Promise<NameGroup[]> {
  const [employees, members, roles] = await Promise.all([
    prisma.employee.findMany({
      // وحسابُ عميلِ جمعيةٍ ليس من فريق زاد: يُعرف بأنّ له جمعيةً في صفّه.
      where: { isActive: true, charityId: null },
      orderBy: { name: "asc" },
      select: { name: true, role: true },
    }),
    prisma.charityUserCharity.findMany({
      where: { charityId, isActive: true, user: { isActive: true } },
      orderBy: { user: { name: "asc" } },
      select: { isAdmin: true, user: { select: { name: true, title: true } } },
    }),
    prisma.roleDefinition.findMany({ select: { key: true, displayName: true } }).catch(() => []),
  ]);

  const roleLabel = (key: string) =>
    roles.find((r) => r.key === key)?.displayName ?? DEFAULT_ROLE_LABELS[key] ?? key;

  const seen = new Set<string>();
  const take = (name: string) => {
    const clean = name.trim();
    if (!clean || seen.has(clean)) return null;
    seen.add(clean);
    return clean;
  };

  const zad: NameGroup = { label: "موظفو زاد", people: [] };
  for (const employee of employees) {
    const name = take(employee.name);
    if (name) zad.people.push({ name, hint: roleLabel(employee.role) });
  }

  const charity: NameGroup = { label: "موظفو الجمعية", people: [] };
  for (const member of members) {
    const name = take(member.user.name);
    if (name) charity.people.push({ name, hint: charityMemberLabel(member.isAdmin, member.user.title) });
  }

  return [zad, charity];
}
