import { toISODate } from "./calendarGrid.ts";
import { isSafeLink, normalizeTime, type MediaSnapshot } from "./mediaPlan.ts";

/**
 * تنقيةُ مُدخَل المنشور — واحدةٌ لزادٍ وللجمعية.
 *
 * فالطرفان يكتبان الحقولَ نفسَها، ولو نُقِّيت في كلِّ فعلٍ على حدة لافترق
 * الشرطان: يُمنع الرابطُ غيرُ الآمن عند زادٍ ويُقبل من البوّابة — وهي الجهةُ
 * التي يُكتب منها ما لا يُوثق به. والتنقيةُ هنا تُختبر بلا قاعدةٍ ولا جلسة.
 *
 * **ولا `charityId` في المُدخَل**: جمعيةُ المنشور تُقرأ من صفِّه في الخادم. فلو
 * كانت حقلاً يُرسله المتصفّحُ لصار نقلُ منشورٍ إلى جمعيةٍ أخرى تعديلَ حقل.
 */

export type MediaPostFields = {
  /** «YYYY-MM-DD» */
  scheduledOn: string;
  /** «HH:MM» أو فراغ — الوقتُ اختياريّ. */
  scheduledAt?: string | null;
  content: string;
  platforms: string[];
  imageUrl?: string | null;
  imagePublicId?: string | null;
  linkUrl?: string | null;
};

export type CleanMediaPost = {
  content: string;
  platforms: string[];
  scheduledOn: Date;
  scheduledAt: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** مرسى اليوم (منتصفُ ليل UTC) من نصِّه، أو لا شيءٍ إن لم يكن يوماً. */
export function dayValue(value: string): Date | null {
  if (!DAY.test(value)) return null;
  const day = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(day.getTime()) ? null : day;
}

export function cleanMediaInput(input: MediaPostFields): { error: string } | { data: CleanMediaPost } {
  const content = (input.content ?? "").trim();
  if (!content) return { error: "نص المنشور مطلوب" };

  const day = dayValue(input.scheduledOn);
  if (!day) return { error: "يوم النشر غير صحيح" };

  const platforms = [...new Set((input.platforms ?? []).map((p) => p.trim()).filter(Boolean))];
  if (platforms.length === 0) return { error: "اختر منصة واحدة على الاقل" };

  const link = (input.linkUrl ?? "").trim();
  if (link && !isSafeLink(link)) return { error: "الرابط يجب أن يبدأ بـ http أو https" };

  return {
    data: {
      content,
      platforms,
      scheduledOn: day,
      scheduledAt: normalizeTime(input.scheduledAt),
      linkUrl: link || null,
      imageUrl: (input.imageUrl ?? "").trim() || null,
      imagePublicId: (input.imagePublicId ?? "").trim() || null,
    },
  };
}

/** اللقطةُ كما تُخزَّن في السجلّ وكما تُقارن. */
export function snapshotOfRow(row: {
  content: string;
  platforms: string[];
  imageUrl: string | null;
  linkUrl: string | null;
  scheduledOn: Date;
  scheduledAt: string | null;
}): MediaSnapshot {
  return {
    content: row.content,
    platforms: row.platforms,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    scheduledOn: toISODate(row.scheduledOn),
    scheduledAt: row.scheduledAt,
  };
}
