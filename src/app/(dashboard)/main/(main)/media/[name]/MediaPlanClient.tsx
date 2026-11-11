"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Link2,
  ListOrdered,
  Megaphone,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Badge, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { useStoredChoice } from "@/components/console/useStoredChoice";
import { EmptyState, Segmented } from "@/components/console/layout";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { PlatformMark, PlatformRow } from "@/components/console/PlatformMark";
import MultiSelect from "@/components/console/MultiSelect";
import DateField from "@/components/console/DateField";
import TimeField from "@/components/console/TimeField";
import {
  WEEKDAY_INITIALS,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  formatDateShort,
  formatDateWithWeekday,
} from "@/lib/calendarGrid";
import {
  MEDIA_STATUS,
  can,
  compareByTime,
  diffSnapshots,
  eventLabel,
  formatTime,
  requiresNote,
  statusLabel,
  statusTone,
  toStatus,
  type MediaSnapshot,
  type MediaStatus,
} from "@/lib/mediaPlan";
import { uploadFile } from "@/lib/clientUpload";
import { ACCEPT_IMAGES } from "@/lib/uploadPurposes";
import {
  certifyMediaPost,
  createMediaPlatform,
  createMediaPost,
  deleteMediaPost,
  getMediaPostDetail,
  listMediaPosts,
  rejectMediaEdit,
  setMediaPlatformActive,
  updateMediaPost,
  type MediaEventView,
} from "@/app/actions/mediaPlan";

/**
 * تقويمُ الخطّة الإعلاميّة — ثلاثُ هيئاتٍ لبيانٍ واحد.
 *
 *   **الشهر** شبكةً: نظرةُ الخطّة كلِّها، وفيها تُرى الفجوات.
 *   **الأسبوع** أعمدةً: بطاقةٌ كاملةٌ لكلِّ منشورٍ بوقته وصورته ومنصّاته.
 *   **القائمة**: مرتَّبةٌ لمن يقرأ على الهاتف أو يطبع.
 *
 * واللونُ حالةٌ لا زينة: كهرمانيٌّ لما ينتظر فعلَ قارئه، وأخضرُ للمعتمَد،
 * ورماديٌّ لما ينتظر غيرَه. و«ينتظر فعلَ قارئه» هنا هو تعديلُ الجمعية الذي
 * ينتظر تعميدَ زاد.
 */

type Platform = {
  id: string;
  key: string;
  name: string;
  iconKey: string | null;
  logoUrl: string | null;
  color: string | null;
  isActive: boolean;
};

type RawPost = {
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

type Post = Omit<RawPost, "status"> & { status: MediaStatus };

type ViewMode = "month" | "week" | "list";

const VIEW_KEY = "zad:media-view";
const VIEW_MODES = ["month", "week", "list"] as const;
const DAY_MS = 86_400_000;

const WEEKDAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function normalize(post: RawPost): Post {
  return { ...post, status: toStatus(post.status) };
}

function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function iso(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return iso(new Date(parseDay(value).getTime() + days * DAY_MS));
}

/** أحدُ الأسبوع الذي فيه هذا اليوم. */
function weekStart(value: string): string {
  const day = parseDay(value);
  return iso(new Date(day.getTime() - day.getUTCDay() * DAY_MS));
}

function snapshotOf(post: Post): MediaSnapshot {
  return {
    content: post.content,
    platforms: post.platforms,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    scheduledOn: post.scheduledOn,
    scheduledAt: post.scheduledAt,
  };
}

const TONE_RING: Record<string, string> = {
  warn: "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10",
  good: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  neutral: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
};

const BADGE_TONE: Record<string, "warn" | "good" | "neutral"> = {
  warn: "warn",
  good: "good",
  neutral: "neutral",
};

export default function MediaPlanClient({
  charityId,
  charityName,
  today,
  initialPosts,
  platforms: initialPlatforms,
}: {
  charityId: string;
  charityName: string;
  today: string;
  initialPosts: RawPost[];
  platforms: Platform[];
}) {
  // هيئةُ العرض تبقى كما تركها صاحبُها: من يعمل بالأسبوع يفتح على الأسبوع.
  const [view, chooseView] = useStoredChoice<ViewMode>(VIEW_KEY, "month", VIEW_MODES);
  const [anchor, setAnchor] = useState(today);
  const [posts, setPosts] = useState<Post[]>(() => initialPosts.map(normalize));
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<{ post: Post | null; day: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const month = useMemo(() => monthOf(anchor, today), [anchor, today]);
  const weeks = useMemo(() => monthGrid(month), [month]);

  // المدى المجلوب: شبكةُ الشهر كاملةً في هيئتَي الشهر والقائمة، والأسبوعُ وحدَه
  // في هيئته.
  const range = useMemo(() => {
    if (view === "week") {
      const start = weekStart(anchor);
      return { from: start, to: addDays(start, 6) };
    }
    return { from: weeks[0][0].date, to: weeks[5][6].date };
  }, [view, anchor, weeks]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await listMediaPosts(charityId, range.from, range.to);
      if (!alive) return;
      if ("posts" in result && result.posts) setPosts(result.posts.map(normalize));
    })();
    return () => {
      alive = false;
    };
  }, [charityId, range.from, range.to, reloads]);

  const reload = () => setReloads((n) => n + 1);

  const platformByKey = useMemo(() => {
    const map = new Map<string, Platform>();
    for (const p of platforms) map.set(p.key, p);
    return map;
  }, [platforms]);

  const marksOf = (keys: string[]) =>
    keys.map(
      (key) =>
        platformByKey.get(key) ?? {
          id: key,
          key,
          name: key,
          iconKey: null,
          logoUrl: null,
          color: null,
          isActive: false,
        }
    );

  const platformName = (key: string) => platformByKey.get(key)?.name ?? key;

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const list = map.get(post.scheduledOn) ?? [];
      list.push(post);
      map.set(post.scheduledOn, list);
    }
    for (const list of map.values()) list.sort(compareByTime);
    return map;
  }, [posts]);

  const waiting = posts.filter((p) => p.status === MEDIA_STATUS.PENDING_ZAD).length;

  const openCreate = (day: string) => setForm({ post: null, day });
  const openEdit = (post: Post) => setForm({ post, day: post.scheduledOn });

  const step = (direction: number) => {
    if (view === "week") setAnchor(addDays(weekStart(anchor), direction * 7));
    else {
      const next = shiftMonth(month, direction);
      setAnchor(`${next.year}-${String(next.month + 1).padStart(2, "0")}-01`);
    }
  };

  const remove = async (post: Post) => {
    const ok = await confirmAction({
      title: "حذف المنشور؟",
      message: "لا يُسترجع بعد الحذف.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    const result = await deleteMediaPost(post.id);
    setBusy(false);
    if (result.error) notify("error", result.error);
    else {
      notify("ok", "حُذف المنشور");
      setDetailId(null);
      reload();
    }
  };

  const headerLabel =
    view === "week"
      ? `${formatDateShort(weekStart(anchor))} — ${formatDateShort(addDays(weekStart(anchor), 6))}`
      : monthLabel(month);

  return (
    <div className="space-y-3">
      {/* شريطُ التحكّم */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="السابق"
            className={cx(btn.ghost, "size-9 justify-center p-0")}
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="min-w-[9rem] text-center text-section font-semibold">{headerLabel}</span>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="التالي"
            className={cx(btn.ghost, "size-9 justify-center p-0")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" onClick={() => setAnchor(today)} className={cx(btn.ghost, "h-9")}>
            اليوم
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {waiting > 0 && (
            <Badge tone="warn">
              {waiting} تعديلٌ ينتظر تعميدَك
            </Badge>
          )}
          <Segmented
            label="هيئة العرض"
            value={view}
            onChange={chooseView}
            options={[
              { id: "month", label: "شهر" },
              { id: "week", label: "أسبوع" },
              { id: "list", label: "قائمة" },
            ]}
          />
          <button type="button" onClick={() => setManaging(true)} className={cx(btn.ghost, "h-9")}>
            <Settings2 className="size-4" />
            المنصّات
          </button>
          <button type="button" onClick={() => openCreate(today)} className={btn.primary}>
            <Plus className="size-4" />
            منشور جديد
          </button>
        </div>
      </div>

      {view === "month" && (
        <MonthView
          weeks={weeks}
          today={today}
          byDay={byDay}
          marksOf={marksOf}
          onAdd={openCreate}
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "week" && (
        <WeekView
          start={weekStart(anchor)}
          today={today}
          byDay={byDay}
          marksOf={marksOf}
          onAdd={openCreate}
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "list" && (
        <ListView
          posts={posts}
          today={today}
          marksOf={marksOf}
          onOpen={(post) => setDetailId(post.id)}
          onAdd={() => openCreate(today)}
        />
      )}

      {form && (
        <PostSheet
          charityId={charityId}
          charityName={charityName}
          day={form.day}
          post={form.post}
          platforms={platforms.filter((p) => p.isActive || form.post?.platforms.includes(p.key))}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}

      {detailId && (
        <DetailSheet
          postId={detailId}
          platformName={platformName}
          marksOf={marksOf}
          busy={busy}
          onClose={() => setDetailId(null)}
          onEdit={(post) => {
            setDetailId(null);
            openEdit(post);
          }}
          onDelete={remove}
          onChanged={reload}
        />
      )}

      {managing && (
        <PlatformsSheet
          platforms={platforms}
          onClose={() => setManaging(false)}
          onChanged={(next) => setPlatforms(next)}
        />
      )}
    </div>
  );
}

// ── الهيئات ─────────────────────────────────────────────────────────────────

type DayMap = Map<string, Post[]>;
type MarksOf = (keys: string[]) => Platform[];

function MonthView({
  weeks,
  today,
  byDay,
  marksOf,
  onAdd,
  onOpen,
}: {
  weeks: { date: string; day: number; inMonth: boolean }[][];
  today: string;
  byDay: DayMap;
  marksOf: MarksOf;
  onAdd: (day: string) => void;
  onOpen: (post: Post) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
        {WEEKDAY_NAMES.map((name, i) => (
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
                <button
                  type="button"
                  onClick={() => onAdd(cell.date)}
                  aria-label={`إضافة منشور في ${cell.date}`}
                  className="grid size-5 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-primary/10 hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary/40 group-hover:opacity-100"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {list.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onOpen(post)}
                    className={cx(
                      "block w-full rounded-md border px-1.5 py-1 text-start outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40",
                      TONE_RING[statusTone(post.status, "ZAD")]
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
                      {post.status === MEDIA_STATUS.PENDING_ZAD && (
                        <span className="text-caption font-semibold text-amber-600 dark:text-amber-400">عُدِّل</span>
                      )}
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

function WeekView({
  start,
  today,
  byDay,
  marksOf,
  onAdd,
  onOpen,
}: {
  start: string;
  today: string;
  byDay: DayMap;
  marksOf: MarksOf;
  onAdd: (day: string) => void;
  onOpen: (post: Post) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="grid min-w-[56rem] grid-cols-7">
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          const weekday = parseDay(day).getUTCDay();
          return (
            <div key={day} className="border-s border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center gap-1 border-b border-slate-100 py-2 dark:border-slate-800">
                <span className="text-caption font-semibold text-slate-500">{WEEKDAY_NAMES[weekday]}</span>
                <span
                  className={cx(
                    "grid size-7 place-items-center rounded-full text-body font-semibold",
                    day === today ? "bg-primary text-white" : "text-slate-700 dark:text-slate-200"
                  )}
                >
                  {parseDay(day).getUTCDate()}
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
                      TONE_RING[statusTone(post.status, "ZAD")]
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="text-caption font-semibold text-slate-500">
                        {post.scheduledAt ? formatTime(post.scheduledAt) : "بلا وقت"}
                      </span>
                      {post.status === MEDIA_STATUS.PENDING_ZAD && (
                        <span className="text-caption font-semibold text-amber-600 dark:text-amber-400">عُدِّل</span>
                      )}
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-meta leading-5 text-slate-700 dark:text-slate-200">
                      {post.content}
                    </p>
                    {post.linkUrl && (
                      <p className="mt-1 truncate text-caption text-primary">{post.linkUrl}</p>
                    )}
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

                <button
                  type="button"
                  onClick={() => onAdd(day)}
                  aria-label={`إضافة منشور في ${day}`}
                  className="grid h-8 w-full place-items-center rounded-lg border border-dashed border-slate-200 text-slate-400 outline-none transition hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-slate-700"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({
  posts,
  today,
  marksOf,
  onOpen,
  onAdd,
}: {
  posts: Post[];
  today: string;
  marksOf: MarksOf;
  onOpen: (post: Post) => void;
  onAdd: () => void;
}) {
  const days = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of [...posts].sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn) || compareByTime(a, b))) {
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
          title="لا منشورات في هذا الشهر"
          description="أضفْ أوّلَ منشورٍ في يومه، واختر منصّاته."
          action={
            <button type="button" onClick={onAdd} className={btn.primary}>
              <Plus className="size-4" />
              منشور جديد
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map(([day, list]) => (
        <section key={day} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-2 flex items-center gap-2 text-body font-semibold">
            <CalendarDays className="size-4 text-slate-400" />
            {formatDateWithWeekday(day, WEEKDAY_NAMES)}
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
                  TONE_RING[statusTone(post.status, "ZAD")]
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
                    <Badge tone={BADGE_TONE[statusTone(post.status, "ZAD")]}>
                      {statusLabel(post.status, "ZAD")}
                    </Badge>
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

// ── نموذجُ المنشور ──────────────────────────────────────────────────────────

function PostSheet({
  charityId,
  charityName,
  day,
  post,
  platforms,
  onClose,
  onSaved,
}: {
  charityId: string;
  charityName: string;
  day: string;
  post: Post | null;
  platforms: Platform[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(post?.content ?? "");
  const [chosen, setChosen] = useState<string[]>(post?.platforms ?? []);
  const [date, setDate] = useState(post?.scheduledOn ?? day);
  const [time, setTime] = useState(post?.scheduledAt ?? "");
  const [link, setLink] = useState(post?.linkUrl ?? "");
  const [image, setImage] = useState<{ url: string; publicId: string } | null>(
    post?.imageUrl ? { url: post.imageUrl, publicId: post.imagePublicId ?? "" } : null
  );
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const status = post?.status ?? MEDIA_STATUS.PENDING_CHARITY;
  const needsNote = !!post && requiresNote("EDIT", status, "ZAD");

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFile(file, "media_post");
      setImage({ url: uploaded.url, publicId: uploaded.publicId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    setError(null);
    start(async () => {
      const input = {
        charityId,
        scheduledOn: date,
        scheduledAt: time || null,
        content,
        platforms: chosen,
        imageUrl: image?.url ?? null,
        imagePublicId: image?.publicId ?? null,
        linkUrl: link || null,
      };
      const result = post
        ? await updateMediaPost(post.id, input, note)
        : await createMediaPost(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      notify("ok", post ? "حُفظ التعديل" : "أُضيف المنشور");
      onSaved();
    });
  };

  return (
    <Sheet
      title={post ? "تعديل المنشور" : "منشور جديد"}
      subtitle={charityName}
      leading={<Megaphone className="size-4 text-primary" />}
      onClose={onClose}
      onSubmit={submit}
      busy={pending || uploading}
      footer={
        <FooterStatus error={error}>
          <button type="button" onClick={onClose} className={btn.ghost} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className={btn.primary} disabled={pending || uploading}>
            {pending ? <Spinner size={14} /> : <Check className="size-4" />}
            حفظ
          </button>
        </FooterStatus>
      }
    >
      <div className="space-y-3">
        {needsNote && (
          <Note tone="warn">
            هذا المنشور معتمَدٌ من الجمعية. تعديلُه يُعيده إلى اعتمادها ويُعرض عليها سببُك.
          </Note>
        )}

        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">نصّ المنشور</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            required
            placeholder="اكتب نصّ المنشور كما يُنشر…"
            className={cx(field, "min-h-[8rem] resize-y leading-6")}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">يوم النشر</span>
            <DateField value={date} onChange={setDate} required withWeekday />
          </div>
          <div className="space-y-1.5">
            <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">
              وقت النشر <span className="text-slate-400">(اختياري)</span>
            </span>
            <TimeField value={time} onChange={setTime} step={5} placeholder="بلا وقت" />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">المنصّات</span>
          <MultiSelect
            label="منصّات النشر"
            placeholder="اختر المنصّات"
            countNoun="منصّة"
            values={chosen}
            onChange={setChosen}
            options={platforms.map((p) => ({ value: p.key, label: p.name }))}
          />
          {chosen.length > 0 && (
            <PlatformRow
              platforms={chosen.map((key) => platforms.find((p) => p.key === key)!).filter(Boolean)}
              size={16}
              max={9}
            />
          )}
        </div>

        <label className="block space-y-1.5">
          <span className="text-meta font-medium text-slate-600 dark:text-slate-300">
            الرابط <span className="text-slate-400">(اختياري)</span>
          </span>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            type="url"
            inputMode="url"
            dir="ltr"
            placeholder="https://"
            className={field}
          />
        </label>

        <div className="space-y-1.5">
          <span className="block text-meta font-medium text-slate-600 dark:text-slate-300">
            الصورة <span className="text-slate-400">(اختياري)</span>
          </span>
          {image ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
              <Image src={image.url} alt="" width={96} height={96} className="size-16 rounded-md object-cover" />
              <button type="button" onClick={() => setImage(null)} className={cx(btn.ghost, "h-8")}>
                <X className="size-3.5" />
                إزالة
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT_IMAGES}
                className="hidden"
                onChange={(e) => void pick(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cx(btn.ghost, "h-9")}
                disabled={uploading}
              >
                {uploading ? <Spinner size={14} /> : <ImagePlus className="size-4" />}
                اختيار صورة
              </button>
            </>
          )}
        </div>

        {needsNote && (
          <label className="block space-y-1.5">
            <span className="text-meta font-medium text-slate-600 dark:text-slate-300">سبب التعديل</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              required
              placeholder="يُعرض على الجمعية مع طلب اعتمادها من جديد"
              className={cx(field, "resize-y leading-6")}
            />
          </label>
        )}
      </div>
    </Sheet>
  );
}

// ── لوحُ التفاصيل والسجلّ ───────────────────────────────────────────────────

function DetailSheet({
  postId,
  platformName,
  marksOf,
  busy,
  onClose,
  onEdit,
  onDelete,
  onChanged,
}: {
  postId: string;
  platformName: (key: string) => string;
  marksOf: MarksOf;
  busy: boolean;
  onClose: () => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
  onChanged: () => void;
}) {
  const [post, setPost] = useState<Post | null>(null);
  const [events, setEvents] = useState<MediaEventView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await getMediaPostDetail(postId);
      if (!alive) return;
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("post" in result && result.post) {
        setPost(normalize(result.post));
        setEvents(result.events ?? []);
      }
    })();
    return () => {
      alive = false;
    };
  }, [postId, loads]);

  const act = (run: () => Promise<{ error?: string; success?: boolean }>, done: string) => {
    setError(null);
    start(async () => {
      const result = await run();
      if (result.error) {
        setError(result.error);
        return;
      }
      notify("ok", done);
      setLoads((n) => n + 1);
      onChanged();
    });
  };

  const pendingEdit = post?.status === MEDIA_STATUS.PENDING_ZAD;

  // ما تغيَّر في كل حدث: لقطتُه «قبل»، ويقابلها ما بعده — وهو لقطةُ الحدث الأحدث
  // منه، أو المنشورُ نفسُه إن كان آخرَ الأحداث.
  const changesOf = (index: number): ReturnType<typeof diffSnapshots> => {
    if (!post) return [];
    const before = events[index]?.before;
    if (!before) return [];
    const after = index === 0 ? snapshotOf(post) : events[index - 1].before;
    if (!after) return [];
    return diffSnapshots(before, after, platformName);
  };

  return (
    <Sheet
      title="المنشور"
      subtitle={post ? formatDateWithWeekday(post.scheduledOn, WEEKDAY_NAMES) : "…"}
      leading={<Megaphone className="size-4 text-primary" />}
      onClose={onClose}
      busy={pending}
      footer={
        <FooterStatus error={error}>
          <button type="button" onClick={onClose} className={btn.ghost}>
            إغلاق
          </button>
          {post && can("EDIT", post.status, "ZAD") && (
            <button type="button" onClick={() => onEdit(post)} className={cx(btn.ghost, "h-9")}>
              <Pencil className="size-3.5" />
              تعديل
            </button>
          )}
          {post && can("DELETE", post.status, "ZAD") && (
            <button
              type="button"
              onClick={() => onDelete(post)}
              className={cx(btn.ghost, "h-9 text-red-600 hover:bg-red-50 dark:text-red-400")}
              disabled={busy}
            >
              <Trash2 className="size-3.5" />
              حذف
            </button>
          )}
          {pendingEdit && (
            <button
              type="button"
              onClick={() => act(() => certifyMediaPost(post!.id), "عُمِّد التعديل")}
              className={btn.primary}
              disabled={pending}
            >
              {pending ? <Spinner size={14} /> : <Check className="size-4" />}
              تعميد التعديل
            </button>
          )}
        </FooterStatus>
      }
    >
      {!post ? (
        <div className="grid place-items-center py-10">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={BADGE_TONE[statusTone(post.status, "ZAD")]}>{statusLabel(post.status, "ZAD")}</Badge>
            {post.scheduledAt && <Badge tone="neutral">{formatTime(post.scheduledAt)}</Badge>}
            {post.finalizedBy && <Badge tone="good">اعتمده: {post.finalizedBy}</Badge>}
          </div>

          <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-meta leading-6 dark:border-slate-800 dark:bg-slate-800/40">
            {post.content}
          </p>

          {post.imageUrl && (
            <Image
              src={post.imageUrl}
              alt=""
              width={640}
              height={360}
              className="w-full rounded-lg object-cover"
            />
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

          <div className="flex items-center gap-2">
            <span className="text-meta text-slate-500">المنصّات:</span>
            <PlatformRow platforms={marksOf(post.platforms)} size={18} max={9} />
          </div>

          {pendingEdit && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-meta font-semibold text-amber-800 dark:text-amber-300">
                عدّلت الجمعيةُ المنشور — عمِّدْ تعديلَها أو ردَّه بسبب.
              </p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="سببُ الردّ (يُعرض على الجمعية)"
                className={cx(field, "resize-y leading-6")}
              />
              <button
                type="button"
                onClick={() => act(() => rejectMediaEdit(post.id, reason), "رُدَّ التعديل واستُعيد النصُّ السابق")}
                className={cx(btn.ghost, "h-9")}
                disabled={pending}
              >
                <Undo2 className="size-3.5" />
                ردُّ التعديل
              </button>
            </div>
          )}

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-meta font-semibold text-slate-600 dark:text-slate-300">
              <ListOrdered className="size-3.5 text-slate-400" />
              السجلّ
            </h3>
            <ol className="space-y-2">
              {events.map((event, index) => {
                const changes = changesOf(index);
                return (
                  <li
                    key={event.id}
                    className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-meta font-medium text-slate-700 dark:text-slate-200">
                        {eventLabel(event.kind)}
                        {event.actorName ? ` — ${event.actorName}` : ""}
                      </span>
                      <span className="text-caption text-slate-400">
                        {formatDateShort(event.at.slice(0, 10))}
                      </span>
                    </div>
                    {event.note && (
                      <p className="mt-1 text-caption text-slate-500 dark:text-slate-400">{event.note}</p>
                    )}
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
      )}
    </Sheet>
  );
}

// ── المنصّات ────────────────────────────────────────────────────────────────

function PlatformsSheet({
  platforms,
  onClose,
  onChanged,
}: {
  platforms: Platform[];
  onClose: () => void;
  onChanged: (next: Platform[]) => void;
}) {
  const [list, setList] = useState(platforms);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = (next: Platform[]) => {
    setList(next);
    onChanged(next);
  };

  const toggle = (platform: Platform) => {
    start(async () => {
      const result = await setMediaPlatformActive(platform.id, !platform.isActive);
      if (result.error) {
        setError(result.error);
        return;
      }
      refresh(list.map((p) => (p.id === platform.id ? { ...p, isActive: !p.isActive } : p)));
    });
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file, "platform_logo");
      setLogo(uploaded.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الشعار");
    } finally {
      setUploading(false);
    }
  };

  const add = () => {
    setError(null);
    start(async () => {
      const result = await createMediaPlatform({ name, color, logoUrl: logo });
      if (result.error) {
        setError(result.error);
        return;
      }
      notify("ok", "أُضيفت المنصّة");
      setName("");
      setLogo(null);
      // الصفُّ الجديد يُقرأ من الخادم عند أوّل فتحةٍ تالية؛ ويُعرض هنا بما كُتب.
      refresh([
        ...list,
        {
          id: `new-${name}`,
          key: name,
          name,
          iconKey: null,
          logoUrl: logo,
          color,
          isActive: true,
        },
      ]);
    });
  };

  return (
    <Sheet
      title="منصّات النشر"
      subtitle="المشهورةُ مبذورةٌ بشعاراتها، وما سواها يُضاف هنا"
      leading={<Settings2 className="size-4 text-primary" />}
      onClose={onClose}
      busy={pending}
      footer={
        <FooterStatus error={error}>
          <button type="button" onClick={onClose} className={btn.ghost}>
            إغلاق
          </button>
        </FooterStatus>
      }
    >
      <div className="space-y-4">
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {list.map((platform) => (
            <li key={platform.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex items-center gap-2">
                <PlatformMark platform={platform} size={18} />
                <span className="text-meta font-medium">{platform.name}</span>
              </span>
              <button
                type="button"
                onClick={() => toggle(platform)}
                className={cx(btn.ghost, "h-8")}
                disabled={pending}
              >
                {platform.isActive ? "تعطيل" : "تفعيل"}
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2 rounded-lg border border-dashed border-slate-200 p-3 dark:border-slate-700">
          <p className="text-meta font-semibold text-slate-600 dark:text-slate-300">إضافة منصّة</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المنصّة"
              className={field}
            />
            <input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              type="color"
              aria-label="لون المنصّة"
              className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cx(btn.ghost, "h-9")}
              disabled={uploading}
            >
              {uploading ? <Spinner size={14} /> : <ImagePlus className="size-4" />}
              شعار
            </button>
          </div>
          {logo && <Image src={logo} alt="" width={32} height={32} className="size-8 rounded-md object-contain" />}
          <button type="button" onClick={add} className={btn.primary} disabled={pending || !name.trim()}>
            <Plus className="size-4" />
            إضافة
          </button>
        </div>
      </div>
    </Sheet>
  );
}
