import { prisma } from "@/lib/db";
import { getAssignedCharityIds } from "@/lib/access";
import { hasPermission } from "@/lib/permissions";

/**
 * من يرى «آخر المستجدات»، ومن يضيف فيها وأين.
 *
 * ثلاث درجات:
 * - view_latest_updates: التبويب والجدول، ولا شيء غيره.
 * - add_latest_updates: الإضافة في خلايا خدماته وحدها، وفي جمعياته المسنَدة.
 * - manage_latest_updates: الإضافة في كل خلية، والتعديل والحذف.
 *
 * ونطاق الإضافة من منح الخدمات نفسه (EmployeeServiceAccess ومجموعات الموظف
 * ومسمّاه)، لا من قائمةٍ ثانية تُحفظ هنا فتتنازع معه. و«بلا منح = بلا تقييد»
 * قاعدة عرضٍ لا تنطبق: من لم يُمنح خدمةً لا يضيف في شيء.
 *
 * ليس ملف "use server": تستدعيه الصفحة والأفعال المحروسة، ولو صُدّر من ملف
 * أفعال لصار مدخلاً HTTP بلا حارس.
 */

export type LatestUpdatesSession = {
  id: string;
  role: string;
  permissions?: string[];
  userType?: string;
};

export type LatestUpdatesAccess = {
  canView: boolean;
  canManage: boolean;
  /** null = كل خلية قائمة. وإلا مفاتيح cellKey التي يضيف فيها. */
  addable: Set<string> | null;
};

export function cellKey(charityId: string, serviceName: string) {
  return `${charityId}::${serviceName}`;
}

export async function getLatestUpdatesAccess(session: LatestUpdatesSession | null): Promise<LatestUpdatesAccess> {
  const none: LatestUpdatesAccess = { canView: false, canManage: false, addable: new Set() };
  if (!session?.id || session.userType === "CHARITY_USER") return none;

  const perms = session.permissions || [];
  const canView = hasPermission(session.role, perms, "view_latest_updates");
  if (!canView) return none;

  if (hasPermission(session.role, perms, "manage_latest_updates")) {
    return { canView, canManage: true, addable: null };
  }
  if (!hasPermission(session.role, perms, "add_latest_updates")) {
    return { canView, canManage: false, addable: new Set() };
  }

  const [assigned, direct, bundles] = await Promise.all([
    getAssignedCharityIds(session.id, session.role, perms),
    prisma.employeeServiceAccess.findMany({
      where: { employeeId: session.id },
      select: { serviceName: true, charityId: true },
    }),
    prisma.permissionBundle.findMany({
      where: {
        services: { isEmpty: false },
        OR: [
          { employees: { some: { employeeId: session.id } } },
          { roles: { some: { role: { key: session.role } } } },
        ],
      },
      select: { services: true },
    }),
  ]);

  // null = developer_mode، ويمرّ بالتحرير قبل هنا. فالقائمة هنا قائمةٌ دائماً،
  // والاحتياط لا يضرّ: بلا قائمة لا جمعيات.
  const charityIds = assigned ?? [];
  const addable = new Set<string>();

  // المنح المباشر قد يُقصَر على جمعيةٍ بعينها، فلا يتّسع إلى جمعياته كلها.
  for (const g of direct) {
    const targets = g.charityId ? charityIds.filter((id) => id === g.charityId) : charityIds;
    for (const id of targets) addable.add(cellKey(id, g.serviceName));
  }
  for (const name of new Set(bundles.flatMap((b) => b.services))) {
    for (const id of charityIds) addable.add(cellKey(id, name));
  }

  return { canView, canManage: false, addable };
}

export function canAddIn(access: LatestUpdatesAccess, charityId: string, serviceName: string): boolean {
  if (!access.canView) return false;
  if (access.addable === null) return true;
  return access.addable.has(cellKey(charityId, serviceName));
}
