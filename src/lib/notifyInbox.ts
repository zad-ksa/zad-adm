import { prisma } from "@/lib/db";
import { effectiveCharityPermissions, hasCharityPermission } from "@/lib/charityPermissions";

/**
 * كتابةُ الإشعارات — لموظَّفي زادٍ ولحسابات الجمعيات.
 *
 * **ولمَ ليس ملفَّ `"use server"`**: ما يُصدَّر من ملفِّ أفعالٍ يصير مدخلاً HTTP
 * حقيقيّاً، وإشعارٌ يُكتب بطلبٍ من المتصفّح إشعارٌ مُنتحَل — يُرسل باسم زادٍ ما
 * لم يقله أحد. وهذا ما ألزم `createAppNotification` أن تحرس نفسَها بحارسٍ لا
 * معنى له (أيُّ جلسةٍ تكفيه). فمكانُها الصحيحُ هنا: تستدعيها الأفعالُ بعد أن
 * تحرس نفسَها، ولا سبيلَ إليها من الشبكة.
 *
 * وفشلُ الإشعار لا يُسقط الفعل: المنشورُ حُفظ، فلو رُمي الخطأُ لرأى الموظَّفُ
 * «تعذّر الحفظ» وقد حُفظ. فتُبلَع ويُكتب الأثرُ في السجلّ.
 */

export type Notice = {
  title: string;
  message?: string | null;
  /** مسارٌ داخليٌّ يُنقر إليه — صفحةُ الخطّة في الجهة المناسبة. */
  link?: string | null;
};

/** إشعارٌ لموظَّفين بأعيانهم — ومن لا وجود له يُسقطه القيدُ لا الاستعلام. */
export async function notifyEmployees(employeeIds: string[], notice: Notice): Promise<void> {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  if (ids.length === 0) return;
  try {
    const existing = await prisma.employee.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (existing.length === 0) return;
    await prisma.appNotification.createMany({
      data: existing.map((e) => ({
        employeeId: e.id,
        title: notice.title,
        message: notice.message ?? null,
        link: notice.link ?? null,
      })),
    });
  } catch (error) {
    console.error("notifyEmployees", error);
  }
}

/**
 * إشعارٌ لمن يرى هذا التبويبَ في جمعيةٍ بعينها.
 *
 * ولا يُرسل إلى كلِّ عضوٍ في الجمعية: الصلاحيةُ الفعليّةُ هي المِقياس — مديرُ
 * الجمعية، ومن فُوِّض بالخدمة المربوطة بالتبويب. فمن لا يرى الصفحةَ لا يُرسل
 * إليه إشعارٌ عنها، إذ النقرُ عليه يُفضي إلى منعٍ.
 */
export async function notifyCharityMembers(
  charityId: string,
  permission: string,
  notice: Notice
): Promise<void> {
  try {
    const members = await prisma.charityUserCharity.findMany({
      where: { charityId, isActive: true },
      select: {
        charityUserId: true,
        permissions: true,
        isAdmin: true,
        services: { select: { serviceName: true } },
      },
    });

    const recipients = members
      .filter((m) =>
        hasCharityPermission(
          effectiveCharityPermissions(
            (m.permissions as string[]) ?? [],
            m.services.map((s) => s.serviceName),
            // `isAdmin` في القاعدة = حسابُ الجمعية الرسميّ، وهو يحمل كلَّ شيء.
            m.isAdmin
          ),
          permission
        )
      )
      .map((m) => m.charityUserId);

    if (recipients.length === 0) return;

    await prisma.charityNotification.createMany({
      data: [...new Set(recipients)].map((charityUserId) => ({
        charityUserId,
        charityId,
        title: notice.title,
        message: notice.message ?? null,
        link: notice.link ?? null,
      })),
    });
  } catch (error) {
    console.error("notifyCharityMembers", error);
  }
}
