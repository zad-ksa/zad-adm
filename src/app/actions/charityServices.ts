"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";
import { syncCharityAdminServicesQuietly } from "@/lib/charityAdminServices";

/**
 * إسناد الخدمات للجمعيات — من «إدارة الجمعيات» (خدمات جمعيةٍ واحدة) ومن
 * «إدارة الخدمات» (جمعيات خدمةٍ واحدة). والفعلان وجهان لعمليةٍ واحدة.
 *
 * الإسناد صفٌّ في `Service`، وهو خطة الجمعية في تلك الخدمة. فالإسناد الجديد
 * خطةٌ فارغة بلا مراحل، يكتبها الموظف من «الخدمات ← الكل»، وتُنبّه الصفحة إليها
 * ما بقيت فارغة. وإلغاء الإسناد يحذف الصفّ ومعه الخطة ومراحلها وخطواتها.
 *
 * والخدمات تُختار من الموجودة في الموقع وحدها: هذه الأفعال لا تُنشئ خدمة.
 * إنشاء خدمةٍ باسمٍ جديد من «إضافة خدمة جديدة» في «إدارة الخدمات».
 */

type Result = { success: true; added: number; removed: number } | { success: false; error: string };

async function requireServiceManager() {
  const session = await getSession();
  if (!session?.id || session.userType === "CHARITY_USER") return null;
  if (!hasPermission(session.role, session.permissions || [], "manage_services")) return null;
  return session;
}

/** قسم كل خدمةٍ كما في صفوفها القائمة — الإسناد الجديد يأخذه كما هو. */
async function siteServices() {
  const rows = await prisma.service.findMany({
    select: { name: true, department: true },
    orderBy: { createdAt: "asc" },
  });
  const byName = new Map<string, string | null>();
  for (const r of rows) if (!byName.has(r.name)) byName.set(r.name, r.department);
  return byName;
}

function revalidateServicePages(charityNames: string[]) {
  revalidatePath("/main/charities");
  revalidatePath("/main/manage-services");
  revalidatePath("/main/services-overview");
  for (const name of charityNames) {
    revalidatePath(`/main/services-overview/${encodeURIComponent(name)}`);
    revalidatePath(`/portal/${encodeURIComponent(name)}/services`);
  }
}

/** خدمات جمعيةٍ واحدة: تُضاف الخطط الفارغة لما اختير، وتُحذف خطط ما أُلغي. */
export async function setCharityServices(charityId: string, serviceNames: string[]): Promise<Result> {
  const session = await requireServiceManager();
  if (!session) return { success: false, error: "غير مصرح لك بإسناد الخدمات" };

  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
  if (assigned !== null && !assigned.includes(charityId)) {
    return { success: false, error: "لا يمكنك تعديل خدمات جمعية غير مرتبطة بك" };
  }

  const charity = await prisma.charity.findUnique({ where: { id: charityId }, select: { name: true } });
  if (!charity) return { success: false, error: "الجمعية غير موجودة" };

  const known = await siteServices();
  const wanted = new Set(serviceNames.map((n) => n.trim()).filter(Boolean));
  const unknown = [...wanted].filter((n) => !known.has(n));
  if (unknown.length > 0) return { success: false, error: `خدمة غير موجودة في الموقع: ${unknown.join("، ")}` };

  const current = await prisma.service.findMany({ where: { charityId }, select: { id: true, name: true } });
  const currentNames = new Set(current.map((s) => s.name));
  const toAdd = [...wanted].filter((n) => !currentNames.has(n));
  const toRemove = current.filter((s) => !wanted.has(s.name));

  await prisma.$transaction([
    prisma.service.deleteMany({ where: { id: { in: toRemove.map((s) => s.id) } } }),
    prisma.service.createMany({
      data: toAdd.map((name) => ({ name, department: known.get(name) ?? null, charityId })),
    }),
  ]);

  await syncCharityAdminServicesQuietly(charityId);
  revalidateServicePages([charity.name]);
  return { success: true, added: toAdd.length, removed: toRemove.length };
}

/** جمعيات خدمةٍ واحدة: تُضاف الخطط الفارغة لمن اختير، وتُحذف خطط من أُلغي. */
export async function setServiceCharities(serviceName: string, charityIds: string[]): Promise<Result> {
  const session = await requireServiceManager();
  if (!session) return { success: false, error: "غير مصرح لك بإسناد الخدمات" };

  const known = await siteServices();
  if (!known.has(serviceName)) return { success: false, error: "الخدمة غير موجودة في الموقع" };

  // من له نطاقٌ مسنَد لا يمسّ إلا جمعياته: لا يُضيف لغيرها، ولا يُلغي منها.
  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
  const inScope = (id: string) => assigned === null || assigned.includes(id);

  const wanted = new Set(charityIds);
  const current = await prisma.service.findMany({
    where: { name: serviceName },
    select: { id: true, charityId: true },
  });
  const currentIds = new Set(current.map((s) => s.charityId));
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));
  if (toAdd.some((id) => !inScope(id))) {
    return { success: false, error: "لا يمكنك إسناد الخدمة لجمعية غير مرتبطة بك" };
  }
  const toRemove = current.filter((s) => !wanted.has(s.charityId) && inScope(s.charityId));

  const touched = [...toAdd, ...toRemove.map((s) => s.charityId)];
  const charities = await prisma.charity.findMany({ where: { id: { in: touched } }, select: { id: true, name: true } });
  if (charities.length < new Set(touched).size) return { success: false, error: "جمعية غير موجودة" };

  await prisma.$transaction([
    prisma.service.deleteMany({ where: { id: { in: toRemove.map((s) => s.id) } } }),
    prisma.service.createMany({
      data: toAdd.map((charityId) => ({ name: serviceName, department: known.get(serviceName) ?? null, charityId })),
    }),
  ]);

  for (const id of new Set(touched)) await syncCharityAdminServicesQuietly(id);
  revalidateServicePages(charities.map((c) => c.name));
  return { success: true, added: toAdd.length, removed: toRemove.length };
}
