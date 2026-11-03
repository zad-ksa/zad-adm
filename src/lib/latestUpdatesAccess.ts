import { prisma } from "@/lib/db";
import { EXTERNAL_CHARITIES } from "@/lib/charityScope";
import { getAssignedCharityIds } from "@/lib/access";
import { hasPermission, isAdmin } from "@/lib/permissions";

/**
 * نطاق «آخر المستجدات»: ما يراه الشخص من الجدول، وأين يضيف، وأين يحرّر.
 *
 * ثلاث درجات:
 * - view_latest_updates: التبويب والجدول.
 * - add_latest_updates: الإضافة في الخانات التي يراها، وتعديل ما أضافه هو وحذفه.
 * - manage_latest_updates: تعديل ما أضافه غيره وحذفه أيضاً، وإدارة الأعمدة الخاصة
 *   والخدمات الفرعية.
 *
 * **ولا يرى أحدٌ إلا ما ارتبط به**: جمعياته المسنَدة، وخدماته الممنوحة (منحاً
 * مباشراً أو بمجموعته أو بمجموعة مسمّاه). و«بلا منح = بلا تقييد» قاعدةُ عرضٍ في
 * «عرض الخدمات» لا تنطبق هنا: من لم يُمنح خدمةً لا يرى عموداً منها. ويُستثنى
 * ADMIN وdeveloper_mode — يريان الكل.
 *
 * والأعمدة الخاصة (LatestUpdateColumn) ليست خدماتٍ تُمنح: تظهر لكل من يرى
 * الجدول، في جمعياته.
 *
 * ليس ملف "use server": تستدعيه الصفحتان والأفعال المحروسة، ولو صُدّر من ملف
 * أفعال لصار مدخلاً HTTP بلا حارس.
 */

export type LatestUpdatesSession = {
  id: string;
  role: string;
  permissions?: string[];
  userType?: string;
};

export type LatestColumn = {
  /** مفتاح العمود في LatestUpdate.serviceName. */
  key: string;
  name: string;
  custom: boolean;
};

export type LatestUpdatesScope = {
  canView: boolean;
  canAdd: boolean;
  canManage: boolean;
  charities: { id: string; name: string }[];
  /** الخدمات الأصلية أولاً بالأبجدية، ثم الأعمدة الخاصة بترتيبها. */
  columns: LatestColumn[];
  /** الخانات التي يراها: cellKey(charityId, columnKey). */
  cells: Set<string>;
};

export const CUSTOM_PREFIX = "custom:";

export function customKey(id: string) {
  return `${CUSTOM_PREFIX}${id}`;
}

export function customIdOf(key: string): string | null {
  return key.startsWith(CUSTOM_PREFIX) ? key.slice(CUSTOM_PREFIX.length) : null;
}

export function cellKey(charityId: string, columnKey: string) {
  return `${charityId}::${columnKey}`;
}

const EMPTY: LatestUpdatesScope = {
  canView: false,
  canAdd: false,
  canManage: false,
  charities: [],
  columns: [],
  cells: new Set(),
};

export async function getLatestUpdatesScope(session: LatestUpdatesSession | null): Promise<LatestUpdatesScope> {
  if (!session?.id || session.userType === "CHARITY_USER") return EMPTY;

  const perms = session.permissions || [];
  const canView = hasPermission(session.role, perms, "view_latest_updates");
  if (!canView) return EMPTY;
  const canManage = hasPermission(session.role, perms, "manage_latest_updates");
  const canAdd = canManage || hasPermission(session.role, perms, "add_latest_updates");
  const everything = isAdmin(session.role) || perms.includes("developer_mode");

  const [assigned, services, customs, direct, bundles] = await Promise.all([
    everything ? Promise.resolve(null) : getAssignedCharityIds(session.id, session.role, perms),
    prisma.service.findMany({
      where: { charity: EXTERNAL_CHARITIES },
      select: { name: true, charityId: true },
    }),
    prisma.latestUpdateColumn.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true },
    }),
    everything
      ? Promise.resolve([])
      : prisma.employeeServiceAccess.findMany({
          where: { employeeId: session.id },
          select: { serviceName: true, charityId: true },
        }),
    everything
      ? Promise.resolve([])
      : prisma.permissionBundle.findMany({
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

  const charities = await prisma.charity.findMany({
    where: assigned === null ? EXTERNAL_CHARITIES : { ...EXTERNAL_CHARITIES, id: { in: assigned } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const charityIds = new Set(charities.map((c) => c.id));

  // أين تسري كل خدمةٍ ممنوحة: null = في جمعياته كلها. والمنح المباشر قد
  // يُقصَر على جمعيةٍ بعينها فلا يتّسع إلى غيرها.
  const grantedIn = new Map<string, Set<string> | null>();
  const grantEverywhere = (name: string) => grantedIn.set(name, null);
  for (const name of new Set(bundles.flatMap((b) => b.services))) grantEverywhere(name);
  for (const g of direct) {
    if (!g.charityId) grantEverywhere(g.serviceName);
    else if (grantedIn.get(g.serviceName) !== null) {
      const set = grantedIn.get(g.serviceName) ?? new Set<string>();
      set.add(g.charityId);
      grantedIn.set(g.serviceName, set);
    }
  }
  const covers = (name: string, charityId: string) => {
    if (everything) return true;
    if (!grantedIn.has(name)) return false;
    const only = grantedIn.get(name);
    return only === null || only === undefined || only.has(charityId);
  };

  const cells = new Set<string>();
  const realNames = new Set<string>();
  for (const s of services) {
    if (!s.name.trim() || !charityIds.has(s.charityId) || !covers(s.name, s.charityId)) continue;
    cells.add(cellKey(s.charityId, s.name));
    realNames.add(s.name);
  }

  const columns: LatestColumn[] = [...realNames]
    .sort((a, b) => a.localeCompare(b, "ar"))
    .map((name) => ({ key: name, name, custom: false }));
  for (const c of customs) {
    const key = customKey(c.id);
    columns.push({ key, name: c.name, custom: true });
    for (const id of charityIds) cells.add(cellKey(id, key));
  }

  return { canView, canAdd, canManage, charities, columns, cells };
}

export function seesCell(scope: LatestUpdatesScope, charityId: string, columnKey: string) {
  return scope.canView && scope.cells.has(cellKey(charityId, columnKey));
}

export function seesColumn(scope: LatestUpdatesScope, columnKey: string) {
  return scope.canView && scope.columns.some((c) => c.key === columnKey);
}
