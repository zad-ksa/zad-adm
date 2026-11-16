"use client";

import Image from "next/image";
import { GitCompare, Link2, Paperclip } from "lucide-react";
import { Badge } from "@/components/console/ui";
import HashtagText from "@/components/console/HashtagText";
import { PlatformRow } from "@/components/console/PlatformMark";
import {
  MEDIA_STATUS,
  diffSnapshots,
  formatTime,
  waitingOn,
  statusLabel,
  statusTone,
  type MediaSnapshot,
  type Side,
} from "@/lib/mediaPlan";
import { BADGE_TONE, type MarksOf, type MediaPost } from "./MediaCalendar";

/**
 * متنُ لوحِ المنشور — ما يراه الطرفان سواءً.
 *
 * **ولا سجلَّ يُعرض**: يُعرض التعديلُ المعلَّق وحدَه مقابل أصله — ما حُذف
 * مشطوباً وما حلّ محلّه — ويُمحى باعتماده أو ردِّه. فلا يقرأ أحدٌ إلا ما ينتظر
 * قراره.
 *
 * وأزرارُ الفعل ليست هنا: لكلِّ طرفٍ أفعالُه وحارسُها، فتُمرَّر في `children`
 * أو في تذييل اللوح الذي يحتضن هذا المتن.
 */

/** أصلُ التعديل المعلَّق: نوعُه ولقطتُه. */
export type MediaPendingBaseView = { kind: "FINAL" | "DRAFT"; snapshot: MediaSnapshot };

function snapshotOf(post: MediaPost): MediaSnapshot {
  return {
    title: post.title ?? null,
    description: post.description ?? null,
    attachments: (post.attachments ?? []).map((file) => file.name || file.url),
    content: post.content,
    platforms: post.platforms,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    scheduledOn: post.scheduledOn,
    scheduledAt: post.scheduledAt,
  };
}

export default function MediaPostDetail({
  post,
  base,
  side,
  platformName,
  marksOf,
  children,
}: {
  post: MediaPost;
  base: MediaPendingBaseView | null;
  side: Side;
  platformName: (key: string) => string;
  marksOf: MarksOf;
  /** صندوقُ الفعل الخاصُّ بالطرف — يُعرض قبل السجلّ. */
  children?: React.ReactNode;
}) {
  // الفروقُ بين الأصل والحاضر — ولا شيءَ في معتمدٍ أو جديدٍ لا أصلَ له.
  const changes =
    base && post.status !== MEDIA_STATUS.FINAL
      ? diffSnapshots(base.snapshot, snapshotOf(post), platformName)
      : [];
  const awaited = waitingOn(post.status);
  const other = side === "ZAD" ? "الجمعية" : "زاد";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={BADGE_TONE[statusTone(post.status, side)]}>{statusLabel(post.status, side)}</Badge>
        {post.scheduledAt && <Badge tone="neutral">{formatTime(post.scheduledAt)}</Badge>}
        {post.finalizedBy && <Badge tone="good">اعتمده: {post.finalizedBy}</Badge>}
      </div>

      {post.title && (
        <h3 className="text-body font-semibold leading-6 text-slate-900 dark:text-slate-100">{post.title}</h3>
      )}

      <div className="space-y-1">
        <span className="block text-caption font-medium text-slate-400">نص التصميم</span>
        <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-meta leading-6 dark:border-slate-800 dark:bg-slate-800/40">
          {post.content}
        </p>
      </div>

      {post.description && (
        <div className="space-y-1">
          <span className="block text-caption font-medium text-slate-400">نص المنشور</span>
          {/* والهاشتاقاتُ بالأزرق: هو لونُها في منصّات النشر، فتُقرأ هنا كما
              تُقرأ هناك — ومسؤولُ الإعلام ينسخها بعينه. */}
          <HashtagText
            text={post.description}
            className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-meta leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200"
          />
        </div>
      )}

      {post.imageUrl && (
        <Image src={post.imageUrl} alt="" width={640} height={360} className="w-full rounded-lg object-cover" />
      )}

      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="flex items-center gap-2 text-meta text-primary hover:underline"
        >
          <Link2 className="size-3.5" />
          {post.linkUrl}
        </a>
      )}

      {(post.attachments ?? []).length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-caption font-medium text-slate-400">المرفقات</span>
          <ul className="space-y-1.5">
            {(post.attachments ?? []).map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-2 dark:border-slate-800"
              >
                {file.kind === "FILE" ? (
                  <Paperclip className="size-3.5 shrink-0 text-slate-400" />
                ) : (
                  <Link2 className="size-3.5 shrink-0 text-slate-400" />
                )}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir={file.name ? undefined : "ltr"}
                  className="min-w-0 flex-1 truncate text-meta text-primary hover:underline"
                >
                  {file.name || file.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-meta text-slate-500">المنصات:</span>
        <PlatformRow platforms={marksOf(post.platforms)} size={18} max={9} />
      </div>

      {children}

      {changes.length > 0 && (
        <section className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <h3 className="flex items-center gap-2 text-meta font-semibold text-amber-800 dark:text-amber-300">
            <GitCompare className="size-3.5" />
            {awaited === side
              ? `${side === "ZAD" ? "عدلت الجمعية" : "عدل زاد"} المنشور — المشطوب هو النص قبل التعديل`
              : `${side === "ZAD" ? "تعديلاتك" : "تعديلاتكم"} بانتظار اعتماد ${other}`}
          </h3>
          <dl className="space-y-2">
            {changes.map((change) => (
              <div key={change.field} className="text-caption">
                <dt className="mb-1 font-semibold text-slate-500">{change.label}</dt>
                {change.hunks ? (
                  <dd className="space-y-1.5">
                    {change.hunks.map((hunk, h) => (
                      <HunkView key={h} hunk={hunk} />
                    ))}
                  </dd>
                ) : (
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className={REMOVED}>{change.before}</span>
                    <span className={ADDED}>{change.after}</span>
                  </dd>
                )}
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

const REMOVED =
  "whitespace-pre-wrap rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-500/10 dark:text-red-300";
const ADDED =
  "whitespace-pre-wrap rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
const NOTE = "rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400";

/** مقطعٌ معدَّل: ما حُذف مشطوباً ثمّ ما حلّ محلّه — والأسطرُ الفارغةُ تُسمّى لا تُرسم فراغاً. */
function HunkView({ hunk }: { hunk: { removed: string[]; added: string[] } }) {
  const text = (lines: string[]) => lines.filter((line) => line.trim() !== "").join("\n");
  const blanks = (lines: string[]) => lines.filter((line) => line.trim() === "").length;
  const removed = text(hunk.removed);
  const added = text(hunk.added);
  const blankDelta = blanks(hunk.added) - blanks(hunk.removed);
  return (
    <div className="flex flex-col items-start gap-1">
      {removed && <span className={REMOVED}>{removed}</span>}
      {added && <span className={ADDED}>{added}</span>}
      {!removed && !added && blankDelta > 0 && <span className={NOTE}>أُضيف سطرٌ فارغ{blankDelta > 1 ? ` (${blankDelta})` : ""}</span>}
      {!removed && !added && blankDelta < 0 && <span className={NOTE}>حُذف سطرٌ فارغ{blankDelta < -1 ? ` (${-blankDelta})` : ""}</span>}
      {!removed && !added && blankDelta === 0 && <span className={NOTE}>تعديلٌ في المسافات</span>}
    </div>
  );
}
