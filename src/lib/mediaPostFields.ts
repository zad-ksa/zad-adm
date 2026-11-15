import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/calendarGrid";
import { toStatus, type MediaStatus } from "@/lib/mediaPlan";
import { parseAttachments, type MediaAttachment } from "@/lib/mediaPostInput";

/**
 * حقولُ المنشور كما تقرؤها الشاشة، ومعها حراسةُ الأعمدة المستحدثة.
 *
 * **ولمَ حراسة**: العنوانُ والوصفُ والمرفقاتُ أعمدةٌ تُنشأ بـ
 * `prisma/sql/media-post-fields.sql` — والمخطَّطُ في هذا المستودع يُطبَّق بـSQL
 * خامٍ لا بـ`prisma migrate`. فحتى يُطبَّق، كلُّ استعلامٍ يسمّيها يُخفق.
 *
 * فتُسأل القاعدةُ مرّةً واحدةً في عمر العملية، فإن لم تكن الأعمدةُ قامت الصفحةُ
 * تقول ما يلزم — ولا تسقط، ولا تَعِد بحفظٍ لا يقع.
 *
 * وبنيةُ الاختيار تبقى **ثابتةً** مع ذلك: اختيارٌ يُبنى في وقت التشغيل يُفقد
 * Prisma استدلالَ النوع، فيصير صفُّ المنشور في كلِّ مُنادٍ كائناً بلا حقول —
 * ثمنٌ أغلى من رسالةٍ تُقال مرّةً حتى تُطبَّق هجرةٌ تُطبَّق مرّةً.
 */

export const MEDIA_FIELDS_SQL = "prisma/sql/media-post-fields.sql";

/** رسالةُ المنع — تُعرض كما هي، فلا تُترجَم مرّتين. */
export const MEDIA_FIELDS_MISSING = `يلزم تطبيق ${MEDIA_FIELDS_SQL} — عنوانُ المنشور ووصفُه ومرفقاتُه تحتاج أعمدتَه`;

let probe: Promise<boolean> | null = null;

/** هل أُنشئت أعمدةُ البنود؟ — سؤالٌ واحدٌ في عمر العملية. */
export function hasPostDetailColumns(): Promise<boolean> {
  probe ??= prisma
    .$queryRaw<
      { ok: number }[]
    >`select 1 as ok from information_schema.columns where table_name = 'MediaPost' and column_name = 'attachments' limit 1`
    .then((rows) => rows.length > 0)
    .catch((error) => {
      console.error("hasPostDetailColumns", error);
      return false;
    });
  return probe;
}

/** المنشورُ كما تقرأه الشاشة — بلا كائنات `Date` ولا حقولٍ لا تُعرض. */
export type MediaPostView = {
  id: string;
  scheduledOn: string;
  scheduledAt: string | null;
  title: string | null;
  content: string;
  description: string | null;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  attachments: MediaAttachment[];
  status: MediaStatus;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedSide: string | null;
};

/** من صفِّ القاعدة إلى ما تقرؤه الشاشة. */
export function toMediaPostView(row: {
  id: string;
  scheduledOn: Date;
  scheduledAt: string | null;
  title: string | null;
  content: string;
  description: string | null;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  attachments: unknown;
  status: string;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedSide: string | null;
}): MediaPostView {
  return {
    ...row,
    scheduledOn: toISODate(row.scheduledOn),
    status: toStatus(row.status),
    attachments: parseAttachments(row.attachments),
  };
}
