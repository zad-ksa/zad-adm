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

/**
 * المرفق: رابط يكتب، أو ملف يرفع عبر منصة زاد.
 *
 * ونوعه مكتوب في الصف لا مستنبط من الرابط: ملف مرفوع ورابط خارجي كلاهما
 * `https://…`، فمن يقرأ لا يعرف أيهما إلا بالنوع — والشاشة تعرض الملف بزر
 * تنزيل والرابط بسهم خروج.
 */
export type MediaAttachmentKind = "LINK" | "FILE";

export type MediaAttachment = {
  id: string;
  kind: MediaAttachmentKind;
  url: string;
  /** معرف الملف عند المزود — للمرفوع وحده، وبه يحذف. */
  publicId?: string | null;
  /** اسم يعرض مكان الرابط العريان. */
  name?: string | null;
};

/** حد المرفقات في المنشور الواحد — فلا تصير الخطة مستودع ملفات. */
export const MAX_ATTACHMENTS = 10;

export type MediaPostFields = {
  /** «YYYY-MM-DD» */
  scheduledOn: string;
  /** «HH:MM» أو فراغ — الوقتُ اختياريّ. */
  scheduledAt?: string | null;
  /** عنوان المنشور — اختياري، وبه يعرف في التقويم. */
  title?: string | null;
  content: string;
  /** وصف أطول: سياق المنشور وما يراد منه. */
  description?: string | null;
  platforms: string[];
  imageUrl?: string | null;
  imagePublicId?: string | null;
  linkUrl?: string | null;
  attachments?: MediaAttachment[] | null;
};

export type CleanMediaPost = {
  title: string | null;
  content: string;
  description: string | null;
  platforms: string[];
  scheduledOn: Date;
  scheduledAt: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  attachments: MediaAttachment[];
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

  const files = cleanAttachments(input.attachments);
  if ("error" in files) return { error: files.error };

  return {
    data: {
      title: (input.title ?? "").trim() || null,
      content,
      description: (input.description ?? "").trim() || null,
      platforms,
      scheduledOn: day,
      scheduledAt: normalizeTime(input.scheduledAt),
      linkUrl: link || null,
      imageUrl: (input.imageUrl ?? "").trim() || null,
      imagePublicId: (input.imagePublicId ?? "").trim() || null,
      attachments: files.data,
    },
  };
}

/**
 * المرفقات كما تقرأ من القاعدة — وما لا يصلح منها يسقط ولا يرمى.
 *
 * فالخانة JSON، ومنشور قديم لا خانة له. وصف بلا رابط مرفق لا يفتح، فاسقاطه
 * اصدق من عرض زر لا يؤدي الى شيء.
 */
export function parseAttachments(value: unknown): MediaAttachment[] {
  if (!Array.isArray(value)) return [];
  const out: MediaAttachment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const bag = item as Record<string, unknown>;
    const url = String(bag.url ?? "").trim();
    if (!url) continue;
    out.push({
      id: String(bag.id ?? url),
      kind: bag.kind === "FILE" ? "FILE" : "LINK",
      url,
      publicId: bag.publicId ? String(bag.publicId) : null,
      name: bag.name ? String(bag.name) : null,
    });
  }
  return out;
}

/**
 * تنقية المرفقات المرسلة من الشاشة.
 *
 * وكل رابط يفحص هنا — المرفوع منها والمكتوب: الملف يرفع عبر منصة زاد فرابطه
 * منها، لكن ما يصل الخادم نص يكتبه المتصفح. فلا يقبل الا http(s)، ولا يفتح
 * مرفق ببروتوكول لا يوثق به في صفحة احد.
 */
export function cleanAttachments(
  value: MediaAttachment[] | null | undefined
): { error: string } | { data: MediaAttachment[] } {
  const list = Array.isArray(value) ? value : [];
  const out: MediaAttachment[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const url = (item?.url ?? "").trim();
    if (!url) continue;
    if (!isSafeLink(url)) return { error: "رابط المرفق يجب أن يبدأ بـ http أو https" };
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({
      id: String(item.id ?? url),
      kind: item.kind === "FILE" ? "FILE" : "LINK",
      url,
      publicId: item.publicId ? String(item.publicId) : null,
      name: (item.name ?? "").toString().trim() || null,
    });
  }

  if (out.length > MAX_ATTACHMENTS) {
    return { error: "لا تزد المرفقات على " + MAX_ATTACHMENTS };
  }
  return { data: out };
}

/** اللقطةُ كما تُخزَّن في السجلّ وكما تُقارن. */
export function snapshotOfRow(row: {
  title?: string | null;
  content: string;
  description?: string | null;
  platforms: string[];
  imageUrl: string | null;
  linkUrl: string | null;
  attachments?: unknown;
  scheduledOn: Date;
  scheduledAt: string | null;
}): MediaSnapshot {
  return {
    title: row.title ?? null,
    content: row.content,
    description: row.description ?? null,
    platforms: row.platforms,
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl,
    // والمرفقُ يُكتب في اللقطة باسمه إن كان له اسم: سجلٌّ يعرض رابطاً طويلاً
    // لا يُقرأ منه شيء.
    attachments: parseAttachments(row.attachments).map((file) => file.name || file.url),
    scheduledOn: toISODate(row.scheduledOn),
    scheduledAt: row.scheduledAt,
  };
}

// ── أصلُ التعديل المعلَّق ────────────────────────────────────────────────────

/**
 * أصلُ التعديل المعلَّق كما يُحفظ في `MediaPost.baseline`: حقولُ المنشور كاملةً
 * — بمرفقاتها ومعرّف صورتها — كي يُردَّ إليها، ونوعُه كي يُعرف ما يعود إليه.
 */
export type StoredBaseline = {
  kind: "FINAL" | "DRAFT";
  title: string | null;
  content: string;
  description: string | null;
  platforms: string[];
  scheduledOn: string;
  scheduledAt: string | null;
  linkUrl: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  attachments: MediaAttachment[];
};

type PostRow = {
  title?: string | null;
  content: string;
  description?: string | null;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId?: string | null;
  linkUrl: string | null;
  attachments?: unknown;
  scheduledOn: Date;
  scheduledAt: string | null;
};

/** التقاطُ المنشور الحاضر أصلاً. */
export function baselineOfRow(row: PostRow, kind: "FINAL" | "DRAFT"): StoredBaseline {
  return {
    kind,
    title: row.title ?? null,
    content: row.content,
    description: row.description ?? null,
    platforms: row.platforms,
    scheduledOn: toISODate(row.scheduledOn),
    scheduledAt: row.scheduledAt,
    linkUrl: row.linkUrl,
    imageUrl: row.imageUrl,
    imagePublicId: row.imagePublicId ?? null,
    attachments: parseAttachments(row.attachments),
  };
}

/** الأصلُ كما يُقرأ من القاعدة، أو لا شيء إن لم يصلح. */
export function parseBaseline(value: unknown): StoredBaseline | null {
  if (!value || typeof value !== "object") return null;
  const bag = value as Record<string, unknown>;
  if (typeof bag.content !== "string" || typeof bag.scheduledOn !== "string") return null;
  if (!dayValue(bag.scheduledOn)) return null;
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    kind: bag.kind === "FINAL" ? "FINAL" : "DRAFT",
    title: text(bag.title),
    content: bag.content,
    description: text(bag.description),
    platforms: Array.isArray(bag.platforms) ? bag.platforms.map(String) : [],
    scheduledOn: bag.scheduledOn,
    scheduledAt: text(bag.scheduledAt),
    linkUrl: text(bag.linkUrl),
    imageUrl: text(bag.imageUrl),
    imagePublicId: text(bag.imagePublicId),
    attachments: parseAttachments(bag.attachments),
  };
}

/** حقولُ المنشور التي يُردُّ إليها عند ردِّ التعديل. */
export function restoreFromBaseline(base: StoredBaseline) {
  return {
    title: base.title,
    content: base.content,
    description: base.description,
    platforms: base.platforms,
    scheduledOn: dayValue(base.scheduledOn)!,
    scheduledAt: base.scheduledAt,
    linkUrl: base.linkUrl,
    imageUrl: base.imageUrl,
    imagePublicId: base.imagePublicId,
    attachments: base.attachments,
  };
}

/** لقطةُ المقارنة من الأصل — لتُعرض الفروقُ مقابل الحاضر. */
export function snapshotOfBaseline(base: StoredBaseline): MediaSnapshot {
  return {
    title: base.title,
    content: base.content,
    description: base.description,
    platforms: base.platforms,
    imageUrl: base.imageUrl,
    linkUrl: base.linkUrl,
    attachments: base.attachments.map((file) => file.name || file.url),
    scheduledOn: base.scheduledOn,
    scheduledAt: base.scheduledAt,
  };
}
