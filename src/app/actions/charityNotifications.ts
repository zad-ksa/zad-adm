"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * إشعاراتُ حساب الجمعية — قراءةً ووسماً ومحواً.
 *
 * **والنطاقُ حسابُ القارئ لا الجمعية**: كلُّ استعلامٍ هنا مقيَّدٌ بـ
 * `charityUserId: session.id`، فلا يقرأ عضوٌ إشعاراتَ زميله ولا يمحوها ولو كتب
 * معرّفَها بيده. ولذلك لا حاجةَ إلى فحص عضويّةٍ في جمعية: ما ليس له لا يراه.
 *
 * وكتابةُ الإشعارات ليست هنا: تُكتب من `lib/notifyInbox.ts` بعد فعلٍ حرس نفسَه.
 * فلو صُدِّرت من ملفِّ أفعالٍ لصارت مدخلاً يُرسل باسم زادٍ ما لم يقله أحد.
 */

const TAKE = 20;

export type CharityNotice = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  at: string;
};

async function charityUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session?.id || session.userType !== "CHARITY_USER") return null;
  return session.id;
}

/**
 * آخرُ الإشعارات وعددُ غير المقروء.
 *
 * ولا تُرمى عند غياب الجدول: هذه تُنادى من تخطيط البوّابة الذي يحمل كلَّ صفحةٍ
 * فيها، فخطأٌ واحدٌ يُسقط البوّابةَ كلَّها على كلِّ جمعية. فالفراغُ أصدقُ من
 * صفحةِ خطأ.
 */
export async function listCharityNotices(): Promise<{ notices: CharityNotice[]; unread: number }> {
  const empty = { notices: [], unread: 0 };
  try {
    const id = await charityUserId();
    if (!id) return empty;

    const [rows, unread] = await Promise.all([
      prisma.charityNotification.findMany({
        where: { charityUserId: id },
        orderBy: { createdAt: "desc" },
        take: TAKE,
        select: { id: true, title: true, message: true, link: true, isRead: true, createdAt: true },
      }),
      prisma.charityNotification.count({ where: { charityUserId: id, isRead: false } }),
    ]);

    return {
      notices: rows.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        link: r.link,
        isRead: r.isRead,
        at: r.createdAt.toISOString(),
      })),
      unread,
    };
  } catch (error) {
    console.error("listCharityNotices", error);
    return empty;
  }
}

/** عددُ غير المقروء وحدَه — لعدّاد التبويب في الشريط. */
export async function countCharityNotices(): Promise<number> {
  try {
    const id = await charityUserId();
    if (!id) return 0;
    return await prisma.charityNotification.count({ where: { charityUserId: id, isRead: false } });
  } catch (error) {
    console.error("countCharityNotices", error);
    return 0;
  }
}

export async function markAllCharityNoticesRead() {
  const id = await charityUserId();
  if (!id) return { error: "غير مصرح" };
  await prisma.charityNotification.updateMany({
    where: { charityUserId: id, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

export async function deleteCharityNotice(noticeId: string) {
  const id = await charityUserId();
  if (!id) return { error: "غير مصرح" };
  // `deleteMany` لا `delete`: القيدُ على الحساب شرطٌ في الاستعلام نفسِه، فمعرّفٌ
  // لغيره لا يحذف شيئاً ولا يُنبِّئ صاحبَه بوجوده.
  await prisma.charityNotification.deleteMany({ where: { id: noticeId, charityUserId: id } });
  return { success: true };
}

export async function deleteAllCharityNotices() {
  const id = await charityUserId();
  if (!id) return { error: "غير مصرح" };
  await prisma.charityNotification.deleteMany({ where: { charityUserId: id } });
  return { success: true };
}
