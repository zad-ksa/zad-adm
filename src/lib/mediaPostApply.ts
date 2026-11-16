import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MEDIA_STATUS,
  can,
  diffSnapshots,
  eventKind,
  toStatus,
  transition,
  type MediaAction,
  type MediaEventKind,
  type Side,
} from "@/lib/mediaPlan";
import {
  baselineOfRow,
  parseBaseline,
  restoreFromBaseline,
  snapshotOfBaseline,
  snapshotOfRow,
  type CleanMediaPost,
} from "@/lib/mediaPostInput";

/**
 * تطبيقُ فعلٍ على منشور — للطرفين، في موضعٍ واحد.
 *
 * فالحارسُ (من يكون الفاعل، وعلى أيِّ جمعية) في ملفِّ أفعال كلِّ طرف، وما
 * بعده واحد: جوازُ الفعل في حالة المنشور، والحالةُ التالية، وأصلُ التعديل
 * المعلَّق يُلتقط أو يُبقى أو يُردُّ إليه أو يُمحى، وحدثٌ في السجلّ.
 *
 * وليس ملفَّ `"use server"`: لا يُنادى إلا من خلف حارس.
 */

/** حقولُ المنشور التي يلزم الفعلَ قراءتُها. */
export const APPLY_FIELDS = {
  id: true,
  charityId: true,
  title: true,
  content: true,
  description: true,
  attachments: true,
  platforms: true,
  imageUrl: true,
  imagePublicId: true,
  linkUrl: true,
  scheduledOn: true,
  scheduledAt: true,
  status: true,
  baseline: true,
  createdById: true,
  charity: { select: { name: true } },
} as const;

export type ApplyPost = Prisma.MediaPostGetPayload<{ select: typeof APPLY_FIELDS }>;

/** أصلُ تعديل المنشور المعلَّق كما تقرؤه قواعدُ الحالة. */
export function baseKindOf(post: { baseline: unknown }) {
  return parseBaseline(post.baseline)?.kind ?? null;
}

const REFUSALS: Partial<Record<MediaAction, string>> = {
  APPROVE: "لا يوجد ما ينتظر اعتمادكم في هذا المنشور",
  CERTIFY: "لا يوجد تعديل بانتظار اعتمادك",
  REJECT: "لا يوجد تعديل يرد",
  EDIT: "لا يعدل فوق تعديل الطرف الآخر — اعتمده أو رده أولا",
  DELETE: "المنشور المعتمد لا يحذف",
};

export async function applyMediaAction({
  post,
  side,
  action,
  actor,
  input,
  note,
}: {
  post: ApplyPost;
  side: Side;
  action: Exclude<MediaAction, "DELETE">;
  actor: { id: string; name: string | null };
  /** للتعديل وحدَه: الحقولُ بعد تنقيتها. */
  input?: CleanMediaPost;
  note?: string | null;
}): Promise<{ error: string } | { kind: MediaEventKind; notify: boolean }> {
  const status = toStatus(post.status);
  const base = parseBaseline(post.baseline);
  if (!can(action, status, side, base?.kind ?? null)) {
    return { error: REFUSALS[action] ?? "هذا الاجراء غير متاح في الحالة الحالية" };
  }
  if (action === "EDIT" && !input) return { error: "لا تعديل" };
  if (action === "REJECT" && !base) return { error: REFUSALS.REJECT! };

  const t = transition(action, status, side, base?.kind ?? null);
  let nextStatus = t.status;
  let notify = t.notify;

  let fields: Record<string, unknown> = {};
  let baseline: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined;

  if (action === "EDIT") {
    fields = { ...input! };
    const newBase = t.base === "capture" ? baselineOfRow(post, t.baseKind as "FINAL" | "DRAFT") : base;
    if (t.base === "capture") baseline = newBase as unknown as Prisma.InputJsonValue;

    // تعديلٌ أعاد المنشورَ إلى أصله حرفاً: لا تعديلَ ينتظر أحداً. فالمعتمدُ
    // يبقى معتمداً، وما وضعه زادٌ يعود إلى انتظار الجمعية.
    if (newBase) {
      const now = snapshotOfRow({ ...post, ...input! });
      if (diffSnapshots(snapshotOfBaseline(newBase), now).length === 0) {
        nextStatus = newBase.kind === "FINAL" ? MEDIA_STATUS.FINAL : MEDIA_STATUS.PENDING_CHARITY;
        baseline = Prisma.DbNull;
        // ولا إشعار: لم يبقَ ما يُعتمد.
        notify = false;
      }
    }
  } else if (action === "REJECT") {
    fields = restoreFromBaseline(base!);
    baseline = Prisma.DbNull;
  } else {
    baseline = Prisma.DbNull;
  }

  const kind = eventKind(action, status, side);
  const finalNow = nextStatus === MEDIA_STATUS.FINAL;
  const wasFinal = status === MEDIA_STATUS.FINAL;

  await prisma.$transaction([
    prisma.mediaPost.update({
      where: { id: post.id },
      data: {
        ...(fields as Prisma.MediaPostUpdateInput),
        status: nextStatus,
        ...(baseline !== undefined ? { baseline } : {}),
        // تعديلٌ لم يغيّر شيئاً في معتمدٍ يُبقي اعتمادَه كما كان.
        ...(finalNow && wasFinal
          ? {}
          : finalNow
            ? { finalizedAt: new Date(), finalizedBy: actor.name, finalizedSide: side }
            : { finalizedAt: null, finalizedBy: null, finalizedSide: null }),
      },
    }),
    prisma.mediaPostEvent.create({
      data: {
        postId: post.id,
        kind,
        actorSide: side,
        actorId: actor.id,
        actorName: actor.name,
        note: (note ?? "").trim() || null,
        before: snapshotOfRow(post),
      },
    }),
  ]);

  return { kind, notify };
}
