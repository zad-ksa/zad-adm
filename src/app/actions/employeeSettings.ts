"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * كان هذا الملف يحمل معه إعدادات تبويبات الموظفين والجمعيات: أنواعاً وقائمة
 * تبويباتٍ افتراضية وأربع دوال تكتب في EmployeeNavSetting وتبثّ الإعداد على
 * الحسابات. لم يبقَ منها شيء، لأن لا شيء كان يستدعيها: الصفحة الوحيدة التي
 * كانت تقرأ هذا الإعداد — «إعدادات تبويبات الجمعيات» — حُذفت، وإعداد
 * CHARITY_PORTAL_NAV لم يُحفظ في الإنتاج قطّ.
 *
 * وبقيت getAllEmployees وحدها لأن لها مستعملاً حقيقياً: مُبدِّل شخصية المطوّر.
 *
 * وجدول EmployeeNavSetting باقٍ في القاعدة بأربعة صفوف لا يقرأها أحد — إسقاطه
 * فعلٌ لاحقٌ للنشر لا سابقٌ له، وهو الترتيب الذي أسقط صفحات الموارد البشرية
 * مرّةً عند خلطه.
 */
export async function getAllEmployees() {
  const session = await getSession();
  if (!session) return [];

  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return employees;
  } catch (error) {
    console.error("Error fetching employees:", error);
    return [];
  }
}
