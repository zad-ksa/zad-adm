/**
 * منطقُ رئيسية بوّابة الجمعية — ما ينتظر العضوَ، وما يقع في أيامه القادمة.
 *
 * **ولمَ رئيسيةٌ أصلاً**: البوّابةُ كانت تُحوِّل الداخلَ إلى أوّل تبويبٍ
 * يملكه، فالمطلوبُ منه موزَّعٌ على ستّة تبويبات ولا موضعَ يجمعه — وبعضُه
 * يَفوت: تسليمٌ يُعتمد تلقائياً بعد مهلته، وجهةٌ مانحةٌ تُغلق.
 *
 * **والمنطقُ هنا خالصٌ يُختبر**: الاستعلاماتُ في `portalHomeData`، وهذه
 * قواعدُ الترتيب والنافذة الزمنيّة — وهي ما يُخطئ، لا الاستعلام.
 */

/** ما ينتظر فعلاً من العضو — سطرٌ لكلِّ نوع. */
export type HomeTask = {
  id: string;
  label: string;
  count: number;
  href: string;
  /** `danger` لما يَفوت بمضيّ الوقت، و`warn` لما ينتظر، و`brand` لخبرٍ هادئ. */
  tone: "danger" | "warn" | "brand";
};

export type AgendaKind = "DESIGN" | "DONOR" | "MEDIA" | "HOLIDAY";

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  title: string;
  /** اليومُ المعنيُّ بالمللي ثانية — التصويغُ في الخادم لا هنا. */
  atMs: number;
  href?: string;
};

export const AGENDA_LABEL: Record<AgendaKind, string> = {
  DESIGN: "تسليم تصميم",
  DONOR: "إغلاق جهة",
  MEDIA: "نشر مجدول",
  HOLIDAY: "عطلة",
};

const DAY = 86_400_000;

/**
 * المهامُّ التي لها عددٌ وحدَها — وصفرٌ لا يُعرض.
 *
 * فسطرٌ يقول «٠ بانتظارك» يستدعي نظراً ليقول لا شيء. وغيابُ السطر هو الخبر.
 */
export function visibleTasks(tasks: readonly HomeTask[]): HomeTask[] {
  const order = { danger: 0, warn: 1, brand: 2 } as const;
  return tasks
    .filter((t) => t.count > 0)
    .slice()
    .sort((a, b) => order[a.tone] - order[b.tone] || b.count - a.count);
}

/**
 * ما يقع في الأيام القادمة، مرتَّباً بالأقرب.
 *
 * **والماضي يسقط إلّا يومَه**: موعدُ اليوم يُعرض وإن مضت ساعتُه — «يُسلَّم
 * اليوم» خبرٌ إلى آخر اليوم. وما قبله فات، ومحلُّه «بانتظارك» لا الأجندة.
 */
export function upcoming(
  items: readonly AgendaItem[],
  nowMs: number,
  days = 7
): AgendaItem[] {
  // والمقارنةُ على اليوم لا على اللحظة: موعدٌ في اليوم السابع الساعةَ
  // الحاديةَ عشرةَ ليلاً هو في الأسبوع، ومقارنةُ اللحظات تُخرجه.
  const from = startOfDay(nowMs);
  const to = from + days * DAY;
  return items
    .filter((i) => startOfDay(i.atMs) >= from && startOfDay(i.atMs) <= to)
    .slice()
    .sort((a, b) => a.atMs - b.atMs || a.title.localeCompare(b.title, "ar"));
}

/** بدايةُ يومِ الطابع الزمنيّ — بتوقيت الخادم، والتواريخُ هنا أيامٌ لا لحظات. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * قُربُ الموعد بكلمة: اليوم، غداً، بعد كذا يوماً.
 *
 * ولا يُقال «بعد يوم»: العربيّةُ تقول «غداً»، وقارئٌ يقرأ «بعد ١ يوم» يعرف
 * أنّ الذي كتبها آلة.
 */
export function whenLabel(atMs: number, nowMs: number): string {
  const days = Math.round((startOfDay(atMs) - startOfDay(nowMs)) / DAY);
  if (days <= 0) return "اليوم";
  if (days === 1) return "غدا";
  if (days === 2) return "بعد يومين";
  if (days <= 10) return `بعد ${days} أيام`;
  return `بعد ${days} يوما`;
}

/** هل في الأجندة ما يقع اليوم؟ — يُلوَّن سطرُه. */
export function isToday(atMs: number, nowMs: number): boolean {
  return startOfDay(atMs) === startOfDay(nowMs);
}
