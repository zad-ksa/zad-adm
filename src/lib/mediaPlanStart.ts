import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/calendarGrid";

/**
 * الشهرُ الذي يفتح عليه تقويمُ الخطّة الإعلاميّة، والمدى الذي يُجلب له.
 *
 * فشهرُ اليوم إن كان فيه منشور؛ وإلّا أقربُ شهرٍ قادمٍ فيه منشور، وإلّا آخرُ
 * شهرٍ مضى فيه منشور، وإلّا شهرُ اليوم. فلا يفتح التقويمُ على شهرٍ فارغٍ
 * والخطّةُ كلُّها في شهرٍ آخر.
 *
 * وليس ملفَّ `"use server"`: تستدعيه الصفحتان بعد حراستهما.
 */
export async function mediaPlanStart(charityId: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const upcoming = await prisma.mediaPost.findFirst({
    where: { charityId, scheduledOn: { gte: monthStart } },
    orderBy: { scheduledOn: "asc" },
    select: { scheduledOn: true },
  });
  const past = upcoming
    ? null
    : await prisma.mediaPost.findFirst({
        where: { charityId, scheduledOn: { lt: monthStart } },
        orderBy: { scheduledOn: "desc" },
        select: { scheduledOn: true },
      });

  const target = upcoming?.scheduledOn ?? past?.scheduledOn ?? today;
  const sameMonth =
    target.getUTCFullYear() === today.getUTCFullYear() && target.getUTCMonth() === today.getUTCMonth();
  // في شهر اليوم يبقى المرسى اليومَ نفسَه — فهيئةُ الأسبوع تفتح على أسبوعه.
  const anchor = sameMonth ? today : target;

  const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));

  return { today: toISODate(today), anchor: toISODate(anchor), from, to };
}
