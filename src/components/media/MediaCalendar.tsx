"use client";

import { useMemo } from "react";
import Image from "next/image";
import { CalendarDays, ChevronLeft, ChevronRight, Link2, Megaphone, Plus } from "lucide-react";
import { Badge, btn, cx } from "@/components/console/ui";
import { EmptyState } from "@/components/console/layout";
import { PlatformRow } from "@/components/console/PlatformMark";
import { WEEKDAY_LABELS } from "@/lib/attendanceTime";
import {
  WEEKDAY_INITIALS,
  addDaysISO,
  formatDateShort,
  formatDateWithWeekday,
  type DayCell,
} from "@/lib/calendarGrid";
import {
  attentionMark,
  compareByTime,
  formatTime,
  statusLabel,
  statusTone,
  toStatus,
  type MediaStatus,
  type Side,
} from "@/lib/mediaPlan";

/**
 * تقويمُ الخطّة الإعلاميّة — ثلاثُ هيئاتٍ لبيانٍ واحد، للطرفين.
 *
 *   **الشهر** شبكةً: نظرةُ الخطّة كلِّها، وفيها تُرى الفجوات.
 *   **الأسبوع** أعمدةً: بطاقةٌ كاملةٌ لكلِّ منشورٍ بوقته وصورته ومنصّاته.
 *   **القائمة**: مرتَّبةٌ لمن يقرأ على الهاتف أو يطبع.
 *
 * **ولمَ في العدة لا في صفحة زاد**: الصفحةُ نفسُها تُفتح في بوّابة الجمعية،
 * فنسختان منها تفترقان عند أوّل تعديلٍ في واحدة — ويرى الطرفان خطّةً واحدةً
 * برسمَين. والفرقُ بينهما ليس في الرسم بل في `side`: اللونُ والوسمُ والوسامُ
 * كلُّها من `lib/mediaPlan.ts` بالجهة، فما ينتظر الجمعيةَ يُنبَّه به عندها
 * وحدَها، وما ينتظر زاداً يُنبَّه به عنده.
 *
 * واللونُ حالةٌ لا زينة: كهرمانيٌّ لما ينتظر فعلَ قارئه، وأخضرُ للمعتمَد،
 * ورماديٌّ لما ينتظر غيرَه.
 */

export type MediaPlatformView = {
  id: string;
  key: string;
  name: string;
  iconKey: string | null;
  logoUrl: string | null;
  color: string | null;
  isActive: boolean;
};

/** المنشورُ كما يُقرأ من الخادم — حالتُه نصٌّ لم يُفحص بعد. */
export type RawMediaPost = {
  id: string;
  scheduledOn: string;
  scheduledAt: string | null;
  content: string;
  platforms: string[];
  imageUrl: string | null;
  imagePublicId: string | null;
  linkUrl: string | null;
  status: string;
  createdByName: string | null;
  finalizedBy: string | null;
  finalizedSide: string | null;
};

export type MediaPost = Omit<RawMediaPost, "status"> & { status: MediaStatus };

export function normalizePost(post: RawMediaPost): MediaPost {
  return { ...post, status: toStatus(post.status) };
}

export type DayMap = Map<string, MediaPost[]>;
export type MarksOf = (keys: string[]) => MediaPlatformView[];

/** منشوراتُ كلِّ يومٍ مرتَّبةً بالوقت — ومن لا وقتَ له في آخر يومه. */
export function groupByDay(posts: MediaPost[]): DayMap {
  const map: DayMap = new Map();
  for (const post of posts) {
    const list = map.get(post.scheduledOn) ?? [];
    list.push(post);
    map.set(post.scheduledOn, list);
  }
  for (const list of map.values()) list.sort(compareByTime);
  return map;
}

export const TONE_RING: Record<string, string> = {
  warn: "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10",
  good: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  neutral: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
};

export const BADGE_TONE: Record<string, "warn" | "good" | "neutral"> = {
  warn: "warn",
  good: "good",
  neutral: "neutral",
};

/** وسمُ «ينتظرك» على البطاقة — وهو لجهةٍ واحدةٍ في الحالة الواحدة. */
function Mark({ status, side }: { status: MediaStatus; side: Side }) {
  const mark = attentionMark(status, side);
  if (!mark) return null;
  return <span className="shrink-0 text-caption font-semibold text-amber-600 dark:text-amber-400">{mark}</span>;
}

export function MonthView({
  weeks,
  today,
  byDay,
  marksOf,
  side,
  onAdd,
  onOpen,
}: {
  weeks: DayCell[][];
  today: string;
  byDay: DayMap;
  marksOf: MarksOf;
  side: Side;
  /** بلا دالّةٍ: لا زرَّ إضافةٍ في الخلايا — والجمعيةُ لا تُنشئ منشوراً. */
  onAdd?: (day: string) => void;
  onOpen: (post: MediaPost) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
        {WEEKDAY_LABELS.map((name, i) => (
          <div key={name} className="px-2 py-1.5 text-center text-caption font-semibold text-slate-500">
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{WEEKDAY_INITIALS[i]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const list = byDay.get(cell.date) ?? [];
          return (
            <div
              key={cell.date}
              className={cx(
                "group relative min-h-[6.5rem] border-b border-s border-slate-100 p-1.5 dark:border-slate-800",
                !cell.inMonth && "bg-slate-50/60 dark:bg-slate-900/40"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cx(
                    "grid size-6 place-items-center rounded-full text-caption font-semibold",
                    cell.date === today
                      ? "bg-primary text-white"
                      : cell.inMonth
                        ? "text-slate-600 dark:text-slate-300"
                        : "text-slate-300 dark:text-slate-600"
                  )}
                >
                  {cell.day}
                </span>
                {onAdd && (
                  <button
                    type="button"
                    onClick={() => onAdd(cell.date)}
                    aria-label={`إضافة منشور في ${cell.date}`}
                    className="grid size-5 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 group-hover:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {list.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpen(post)}
                    className={cx(
                      "block w-full rounded-md border px-1.5 py-1 text-start outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                      TONE_RING[statusTone(post.status, side)]
                    )}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-caption font-medium text-slate-700 dark:text-slate-200">
                        {post.content}
                      </span>
                      {post.scheduledAt && (
                        <span className="shrink-0 text-caption text-slate-400">{formatTime(post.scheduledAt)}</span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between">
                      <PlatformRow platforms={marksOf(post.platforms)} size={12} max={4} />
                      <Mark status={post.status} side={side} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeekView({
  start,
  today,
  byDay,
  marksOf,
  side,
  onAdd,
  onOpen,
}: {
  start: string;
  today: string;
  byDay: DayMap;
  marksOf: MarksOf;
  side: Side;
  onAdd?: (day: string) => void;
  onOpen: (post: MediaPost) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid min-w-[56rem] grid-cols-7">
        {days.map((day, index) => {
          const list = byDay.get(day) ?? [];
          // يومُ الأسبوع من موضع العمود لا من `new Date(day)`: الأسبوعُ يبدأ
          // الأحدَ دائماً، فالعمودُ الأوّلُ أحدٌ ولو قُرئ اليومُ في منطقةٍ أخرى.
          const weekday = index;
          return (
            <div key={day} className="border-s border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center gap-1 border-b border-slate-100 py-2 dark:border-slate-800">
                <span className="text-caption font-semibold text-slate-500">{WEEKDAY_LABELS[weekday]}</span>
                <span
                  className={cx(
                    "grid size-7 place-items-center rounded-full text-body font-semibold",
                    day === today ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200"
                  )}
                >
                  {Number(day.slice(8, 10))}
                </span>
              </div>

              <div className="space-y-2 p-2">
                {list.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpen(post)}
                    className={cx(
                      "block w-full rounded-lg border p-2 text-start outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                      TONE_RING[statusTone(post.status, side)]
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="text-caption font-semibold text-slate-500">
                        {post.scheduledAt ? formatTime(post.scheduledAt) : "بدون وقت"}
                      </span>
                      <Mark status={post.status} side={side} />
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-meta leading-5 text-slate-700 dark:text-slate-200">
                      {post.content}
                    </p>
                    {post.linkUrl && <p className="mt-1 truncate text-caption text-primary">{post.linkUrl}</p>}
                    {post.imageUrl && (
                      <span className="mt-1.5 block overflow-hidden rounded-md">
                        <Image
                          src={post.imageUrl}
                          alt=""
                          width={240}
                          height={120}
                          className="h-16 w-full object-cover"
                        />
                      </span>
                    )}
                    <span className="mt-1.5 block">
                      <PlatformRow platforms={marksOf(post.platforms)} size={14} />
                    </span>
                  </button>
                ))}

                {onAdd && (
                  <button
                    type="button"
                    onClick={() => onAdd(day)}
                    aria-label={`إضافة منشور في ${day}`}
                    className="grid h-8 w-full place-items-center rounded-lg border border-dashed border-slate-200 text-slate-400 outline-none transition hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700"
                  >
                    <Plus className="size-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ListView({
  posts,
  today,
  marksOf,
  side,
  onOpen,
  onAdd,
  empty,
}: {
  posts: MediaPost[];
  today: string;
  marksOf: MarksOf;
  side: Side;
  onOpen: (post: MediaPost) => void;
  onAdd?: () => void;
  /** نصُّ الفراغ — يختلف بالطرف: زادٌ يُضيف، والجمعيةُ تنتظر. */
  empty: { title: string; description: string };
}) {
  const days = useMemo(() => {
    const map = new Map<string, MediaPost[]>();
    for (const post of [...posts].sort(
      (a, b) => a.scheduledOn.localeCompare(b.scheduledOn) || compareByTime(a, b)
    )) {
      const list = map.get(post.scheduledOn) ?? [];
      list.push(post);
      map.set(post.scheduledOn, list);
    }
    return [...map.entries()];
  }, [posts]);

  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title={empty.title}
          description={empty.description}
          action={
            onAdd ? (
              <button type="button" onClick={onAdd} className={btn.primary}>
                <Plus className="size-4" />
                منشور جديد
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map(([day, list]) => (
        <section
          key={day}
          className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="mb-2 flex items-center gap-2 text-body font-semibold">
            <CalendarDays className="size-4 text-slate-400" />
            {formatDateWithWeekday(day, WEEKDAY_LABELS)}
            {day === today && <Badge tone="brand">اليوم</Badge>}
          </h2>
          <div className="space-y-2">
            {list.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpen(post)}
                className={cx(
                  "flex w-full items-start gap-3 rounded-lg border p-2.5 text-start outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                  TONE_RING[statusTone(post.status, side)]
                )}
              >
                {post.imageUrl && (
                  <Image
                    src={post.imageUrl}
                    alt=""
                    width={96}
                    height={96}
                    className="size-16 shrink-0 rounded-md object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={BADGE_TONE[statusTone(post.status, side)]}>{statusLabel(post.status, side)}</Badge>
                    {post.scheduledAt && (
                      <span className="text-caption text-slate-500">{formatTime(post.scheduledAt)}</span>
                    )}
                  </span>
                  <span className="line-clamp-2 block whitespace-pre-wrap text-meta leading-5 text-slate-700 dark:text-slate-200">
                    {post.content}
                  </span>
                  <span className="mt-1.5 flex items-center gap-3">
                    <PlatformRow platforms={marksOf(post.platforms)} size={14} />
                    {post.linkUrl && <Link2 className="size-3.5 text-slate-400" />}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** شريطُ التنقّل بين الشهور والأسابيع — واحدٌ للطرفين. */
export function CalendarNav({
  label,
  onPrev,
  onNext,
  onToday,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={onPrev} aria-label="السابق" className={cx(btn.ghost, "size-9 justify-center p-0")}>
        <ChevronRight className="size-4" />
      </button>
      <span className="min-w-[9rem] text-center text-section font-semibold">{label}</span>
      <button type="button" onClick={onNext} aria-label="التالي" className={cx(btn.ghost, "size-9 justify-center p-0")}>
        <ChevronLeft className="size-4" />
      </button>
      <button type="button" onClick={onToday} className={cx(btn.ghost, "h-9")}>
        اليوم
      </button>
    </div>
  );
}

/** مدى الأسبوع كما يُكتب في العنوان. */
export function weekLabel(start: string): string {
  return `${formatDateShort(start)} — ${formatDateShort(addDaysISO(start, 6))}`;
}
