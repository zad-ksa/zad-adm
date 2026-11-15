"use client";

import Image from "next/image";
import { Link2, ListOrdered, Paperclip } from "lucide-react";
import { Badge } from "@/components/console/ui";
import HashtagText from "@/components/console/HashtagText";
import { PlatformRow } from "@/components/console/PlatformMark";
import { formatDateShort } from "@/lib/calendarGrid";
import {
  diffSnapshots,
  eventLabel,
  formatTime,
  statusLabel,
  statusTone,
  type MediaSnapshot,
  type Side,
} from "@/lib/mediaPlan";
import { BADGE_TONE, type MarksOf, type MediaPost } from "./MediaCalendar";

/**
 * متنُ لوحِ المنشور وسجلُّه — ما يراه الطرفان سواءً.
 *
 * **والسجلُّ هو «ويظهر التعديلات التي تمت»**: كلُّ حدثٍ يحمل لقطةَ ما كان قبله،
 * فيُقابَل بما بعده — ولقطةُ الحدث الأحدث منه هي «ما بعده»، وآخرُ الأحداث
 * يُقابَل بالمنشور نفسِه. فيُقرأ الفرقُ حقلاً حقلاً بلا حقلٍ ثالثٍ يُخزَّن.
 *
 * وأزرارُ الفعل ليست هنا: لكلِّ طرفٍ أفعالُه وحارسُها، فتُمرَّر في `children`
 * أو في تذييل اللوح الذي يحتضن هذا المتن.
 */

export type MediaEventRow = {
  id: string;
  kind: string;
  actorSide: string;
  actorName: string | null;
  note: string | null;
  at: string;
  before: MediaSnapshot | null;
};

function snapshotOf(post: MediaPost): MediaSnapshot {
  return {
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
  events,
  side,
  platformName,
  marksOf,
  children,
}: {
  post: MediaPost;
  events: MediaEventRow[];
  side: Side;
  platformName: (key: string) => string;
  marksOf: MarksOf;
  /** صندوقُ الفعل الخاصُّ بالطرف — يُعرض قبل السجلّ. */
  children?: React.ReactNode;
}) {
  const changesOf = (index: number) => {
    const before = events[index]?.before;
    if (!before) return [];
    const after = index === 0 ? snapshotOf(post) : events[index - 1].before;
    if (!after) return [];
    return diffSnapshots(before, after, platformName);
  };

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

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-meta font-semibold text-slate-600 dark:text-slate-300">
          <ListOrdered className="size-3.5 text-slate-400" />
          السجلّ
        </h3>
        <ol className="space-y-2">
          {events.map((event, index) => {
            const changes = changesOf(index);
            return (
              <li key={event.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-meta font-medium text-slate-700 dark:text-slate-200">
                    {eventLabel(event.kind)}
                    {event.actorName ? ` — ${event.actorName}` : ""}
                  </span>
                  <span className="text-caption text-slate-400">{formatDateShort(event.at.slice(0, 10))}</span>
                </div>
                {event.note && <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">{event.note}</p>}
                {changes.length > 0 && (
                  <dl className="mt-2 space-y-1">
                    {changes.map((change) => (
                      <div key={change.field} className="text-caption">
                        <dt className="font-semibold text-slate-500">{change.label}</dt>
                        <dd className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-500/10 dark:text-red-300">
                            {change.before}
                          </span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {change.after}
                          </span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
