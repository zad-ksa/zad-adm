import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getAssignedCharityIds } from "@/lib/access";

/**
 * بوابة أقسام الجمعية: الاستراتيجية والحوكمة والمالية وتنمية الموارد.
 *
 * كانت هذه الصفحات بلا بوابة: من كتب رابطها دخلها، والصلاحية لا تحجب شيئاً بل
 * تحدّد ما يظهر في الشريط وما يُعدَّل داخلها. وصلاحيات هذه الأقسام صارت تُنال
 * بربط الخدمة (PermissionServiceLink) لا بمنحٍ يدوي، فصار الحجب بها حجباً
 * بمنح الخدمة نفسه.
 */
export async function requireSection(permission: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], permission)) {
    redirect("/main");
  }
  return session;
}

/** ومعها نطاق الإسناد: قسمٌ في جمعيةٍ ليست مسنَدة إلى الموظف لا يُفتح له. */
export async function requireCharitySection(permission: string, charityName: string) {
  const session = await requireSection(permission);

  const charity = await prisma.charity.findUnique({
    where: { name: charityName },
    select: { id: true },
  });
  // جمعيةٌ لا صفَّ لها بعد: بعض الصفحات تُنشئها من استبيانها، فلا تُحجب هنا.
  if (!charity) return session;

  const assigned = await getAssignedCharityIds(session.id, session.role, session.permissions);
  if (assigned !== null && !assigned.includes(charity.id)) {
    redirect("/main");
  }
  return session;
}
