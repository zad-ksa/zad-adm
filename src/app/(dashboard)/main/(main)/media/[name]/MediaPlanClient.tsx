"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  Check,
  ImagePlus,
  Megaphone,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  Undo2,
} from "lucide-react";
import { Badge, Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { useStoredChoice } from "@/components/console/useStoredChoice";
import { Segmented } from "@/components/console/layout";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
import { PlatformMark } from "@/components/console/PlatformMark";
import {
  CalendarNav,
  ListView,
  MonthView,
  WeekView,
  groupByDay,
  normalizePost,
  weekLabel,
  type MediaPlatformView,
  type MediaPost,
  type RawMediaPost,
} from "@/components/media/MediaCalendar";
import MediaPostSheet, { type MediaPostDraft } from "@/components/media/MediaPostSheet";
import PublishingPlan from "@/components/media/PublishingPlan";
import MediaPostDetail, { type MediaEventRow } from "@/components/media/MediaPostDetail";
import { WEEKDAY_LABELS } from "@/lib/attendanceTime";
import {
  addDaysISO,
  formatDateWithWeekday,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  weekStartISO,
} from "@/lib/calendarGrid";
import { MEDIA_STATUS, can, requiresNote } from "@/lib/mediaPlan";
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
  setCharityPublishingPlan,
  setMediaPlatformActive,
  updateMediaPost,
} from "@/app/actions/mediaPlan";

/**
 * الخطّةُ الإعلاميّةُ من جهة زاد — رفعاً وتعديلاً وتعميداً.
 *
 * والتقويمُ نفسُه وبطاقاتُه ولوحُ المنشور في العدة (`components/media`)، تقرؤها
 * بوّابةُ الجمعية كذلك: فما يراه الطرفان خطّةٌ واحدةٌ برسمٍ واحد، والفرقُ بينهما
 * `side` وأفعالٌ لكلٍّ حارسُها.
 *
 * وهنا ما هو لزادٍ وحدَه: إنشاءُ المنشور، وحذفُه، وتعميدُ تعديل الجمعية أو ردُّه
 * بسبب، وإدارةُ المنصّات.
 */

type ViewMode = "month" | "week" | "list";

const VIEW_KEY = "zad:media-view";
const VIEW_MODES = ["month", "week", "list"] as const;

export default function MediaPlanClient({
  charityId,
  charityName,
  today,
  initialPosts,
  platforms: initialPlatforms,
  publishingPlan,
}: {
  charityId: string;
  charityName: string;
  today: string;
  initialPosts: RawMediaPost[];
  platforms: MediaPlatformView[];
  /** خطّةُ النشر المكتوبةُ لهذه الجمعية — يكتبها الموظَّفُ هنا. */
  publishingPlan: string | null;
}) {
  // هيئةُ العرض تبقى كما تركها صاحبُها: من يعمل بالأسبوع يفتح على الأسبوع.
  const [view, chooseView] = useStoredChoice<ViewMode>(VIEW_KEY, "month", VIEW_MODES);
  const [anchor, setAnchor] = useState(today);
  const [posts, setPosts] = useState<MediaPost[]>(() => initialPosts.map(normalizePost));
  const [platforms, setPlatforms] = useState<MediaPlatformView[]>(initialPlatforms);
  const [reloads, setReloads] = useState(0);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<{ post: MediaPost | null; day: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);

  const month = useMemo(() => monthOf(anchor, today), [anchor, today]);
  const weeks = useMemo(() => monthGrid(month), [month]);

  // المدى المجلوب: شبكةُ الشهر كاملةً في هيئتَي الشهر والقائمة، والأسبوعُ وحدَه
  // في هيئته.
  const range = useMemo(() => {
    if (view === "week") {
      const start = weekStartISO(anchor);
      return { from: start, to: addDaysISO(start, 6) };
    }
    return { from: weeks[0][0].date, to: weeks[5][6].date };
  }, [view, anchor, weeks]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await listMediaPosts(charityId, range.from, range.to);
      if (!alive) return;
      if ("posts" in result && result.posts) setPosts(result.posts.map(normalizePost));
    })();
    return () => {
      alive = false;
    };
  }, [charityId, range.from, range.to, reloads]);

  const reload = () => setReloads((n) => n + 1);

  const platformByKey = useMemo(() => {
    const map = new Map<string, MediaPlatformView>();
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

  const byDay = useMemo(() => groupByDay(posts), [posts]);

  const waiting = posts.filter((p) => p.status === MEDIA_STATUS.PENDING_ZAD).length;

  const openCreate = (day: string) => setForm({ post: null, day });
  const openEdit = (post: MediaPost) => setForm({ post, day: post.scheduledOn });

  const step = (direction: number) => {
    if (view === "week") setAnchor(addDaysISO(weekStartISO(anchor), direction * 7));
    else {
      const next = shiftMonth(month, direction);
      setAnchor(`${next.year}-${String(next.month + 1).padStart(2, "0")}-01`);
    }
  };

  const remove = async (post: MediaPost) => {
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

  const headerLabel = view === "week" ? weekLabel(weekStartISO(anchor)) : monthLabel(month);

  return (
    <div className="space-y-3">
      {/* شريطُ التحكّم */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CalendarNav
          label={headerLabel}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setAnchor(today)}
        />

        <div className="flex flex-wrap items-center gap-2">
          {waiting > 0 && <Badge tone="warn">{waiting} تعديلٌ ينتظر تعميدَك</Badge>}
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
          <PublishingPlan
            charityName={charityName}
            initialPlan={publishingPlan}
            save={(text) => setCharityPublishingPlan(charityId, text)}
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
          side="ZAD"
          onAdd={openCreate}
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "week" && (
        <WeekView
          start={weekStartISO(anchor)}
          today={today}
          byDay={byDay}
          marksOf={marksOf}
          side="ZAD"
          onAdd={openCreate}
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "list" && (
        <ListView
          posts={posts}
          today={today}
          marksOf={marksOf}
          side="ZAD"
          onOpen={(post) => setDetailId(post.id)}
          onAdd={() => openCreate(today)}
          empty={{
            title: "لا منشورات في هذا الشهر",
            description: "أضفْ أوّلَ منشورٍ في يومه، واختر منصّاته.",
          }}
        />
      )}

      {form && (
        <MediaPostSheet
          title={form.post ? "تعديل المنشور" : "منشور جديد"}
          subtitle={charityName}
          day={form.day}
          post={form.post}
          platforms={platforms.filter((p) => p.isActive || form.post?.platforms.includes(p.key))}
          note={
            form.post && requiresNote("EDIT", form.post.status, "ZAD")
              ? {
                  required: true,
                  label: "سبب التعديل",
                  hint: "يُعرض على الجمعية مع طلب اعتمادها من جديد",
                }
              : undefined
          }
          banner={
            form.post && requiresNote("EDIT", form.post.status, "ZAD") ? (
              <Note tone="warn">
                هذا المنشور معتمَدٌ من الجمعية. تعديلُه يُعيده إلى اعتمادها ويُعرض عليها سببُك.
              </Note>
            ) : undefined
          }
          savedMessage={form.post ? "حُفظ التعديل" : "أُضيف المنشور"}
          submit={(draft: MediaPostDraft, note: string) =>
            form.post
              ? updateMediaPost(form.post.id, { ...draft, charityId }, note)
              : createMediaPost({ ...draft, charityId })
          }
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reload();
          }}
        />
      )}

      {detailId && (
        <ZadDetailSheet
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

// ── لوحُ التفاصيل: المتنُ من العدة، والأفعالُ لزاد ──────────────────────────

function ZadDetailSheet({
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
  marksOf: (keys: string[]) => MediaPlatformView[];
  busy: boolean;
  onClose: () => void;
  onEdit: (post: MediaPost) => void;
  onDelete: (post: MediaPost) => void;
  onChanged: () => void;
}) {
  const [post, setPost] = useState<MediaPost | null>(null);
  const [events, setEvents] = useState<MediaEventRow[]>([]);
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
        setPost(normalizePost(result.post));
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

  return (
    <Sheet
      title="المنشور"
      subtitle={post ? formatDateWithWeekday(post.scheduledOn, WEEKDAY_LABELS) : "…"}
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
        <MediaPostDetail post={post} events={events} side="ZAD" platformName={platformName} marksOf={marksOf}>
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
        </MediaPostDetail>
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
  platforms: MediaPlatformView[];
  onClose: () => void;
  onChanged: (next: MediaPlatformView[]) => void;
}) {
  const [list, setList] = useState(platforms);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748b");
  const [logo, setLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = (next: MediaPlatformView[]) => {
    setList(next);
    onChanged(next);
  };

  const toggle = (platform: MediaPlatformView) => {
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
