import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";


/**
 * Returns null for developer_mode (unrestricted access).
 * Returns string[] for every other employee — may be empty (no access).
 *
 * «الوصول الشامل لجميع الجمعيات» (view_all_charities) كان تجاوزاً ثانياً هنا،
 * وأُلغي بطلب المالك: النطاق يُحدَّد بالجمعيات المسنَدة للموظف، وdeveloper_mode
 * وحدها تبقى تجاوزاً. وحاملوه الثلاثة كانوا مُسنَدين إلى ٨ أو ٩ من الجمعيات
 * التسع، فالفرق الفعلي جمعيةٌ واحدة لشخصٍ واحد.
 */
export async function getAssignedCharityIds(
  employeeId: string,
  role: string,
  permissions?: string[]
): Promise<string[] | null> {
  if (permissions?.includes("developer_mode")) return null;
  const rows = await prisma.employeeCharity.findMany({
    where: { employeeId },
    select: { charityId: true },
  });
  return rows.map((r) => r.charityId);
}

export async function assertCharityAccess(
  employeeId: string,
  role: string,
  charityId: string,
  permissions?: string[]
): Promise<void> {
  const assigned = await getAssignedCharityIds(employeeId, role, permissions);
  if (assigned === null) return;
  if (!assigned.includes(charityId)) throw new Error("FORBIDDEN");
}
