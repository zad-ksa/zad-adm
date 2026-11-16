"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Megaphone, Pencil } from "lucide-react";
import { Badge, Note, Spinner, btn, cx } from "@/components/console/ui";
import { useStoredChoice } from "@/components/console/useStoredChoice";
import { Segmented } from "@/components/console/layout";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import { confirmAction } from "@/components/console/confirmBus";
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
import { MEDIA_STATUS, can } from "@/lib/mediaPlan";
import {
  approvePortalMediaPost,
  getPortalMediaPostDetail,
  listPortalMediaPosts,
  updatePortalMediaPost,
} from "@/app/actions/mediaPlanPortal";

/**
 * الخطّةُ الإعلاميّةُ بعينِ الجمعية — اعتماداً وتعديلاً، لا أكثر.
 *
 * والتقويمُ ولوحُ المنشور وسجلُّه كلُّها من العدة (`components/media`)، هي نفسُها
 * التي يراها موظَّفُ زاد. والفرقُ `side="CHARITY"`: فاللونُ الكهرمانيُّ والوسمُ
 * هنا لما ينتظر **اعتمادَكم**، وعند زادٍ لما ينتظر تعميدَه.
 *
 * وما ليس هنا مقصودٌ غيابُه: لا إنشاءَ منشورٍ (الخطّةُ يضعها زاد)، ولا حذفَ،
 * ولا إدارةَ منصّات، ولا تعديلَ لمنشورٍ معتمَدٍ أو مرفوعٍ إلى تعميد زاد —
 * و`allowedActions` في `lib/mediaPlan.ts` هي التي تقول ذلك للشاشة وللحارس معاً.
 */

type ViewMode = "month" | "week" | "list";

const VIEW_KEY = "portal:media-view";
const VIEW_MODES = ["month", "week", "list"] as const;

/** أوّلُ يومٍ في الشهر وآخرُه، «YYYY-MM-DD». */
function monthRange({ year, month }: { year: number; month: number }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` };
}

export default function PortalMediaClient({
  charityId,
  charityName,
  today,
  initialAnchor,
  initialPosts,
  platforms,
  canEdit,
  publishingPlan,
}: {
  charityId: string;
  charityName: string;
  today: string;
  /** اليومُ الذي يفتح عليه التقويم — شهرٌ فيه منشورات. */
  initialAnchor?: string;
  initialPosts: RawMediaPost[];
  platforms: MediaPlatformView[];
  /** خطّةُ النشر كما كتبها فريقُ زاد — تُقرأ هنا ولا تُكتب. */
  publishingPlan: string | null;
  /** «تحرير الخطة الإعلامية» — وبغيرها اطّلاعٌ محض. */
  canEdit: boolean;
}) {
  const [view, chooseView] = useStoredChoice<ViewMode>(VIEW_KEY, "month", VIEW_MODES);
  const [anchor, setAnchor] = useState(initialAnchor ?? today);
  const [posts, setPosts] = useState<MediaPost[]>(() => initialPosts.map(normalizePost));
  const [reloads, setReloads] = useState(0);

  const [editing, setEditing] = useState<MediaPost | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const month = useMemo(() => monthOf(anchor, today), [anchor, today]);
  const weeks = useMemo(() => monthGrid(month), [month]);

  const range = useMemo(() => {
    if (view === "week") {
      const start = weekStartISO(anchor);
      return { from: start, to: addDaysISO(start, 6) };
    }
    // الشهرُ وحدَه لا شبكتُه: أيّامُ الشهرين المجاورين في أطراف الشبكة تُرسم
    // باهتةً بلا منشورات، والقائمةُ لا تخلط بشهرها منشوراتِ غيره.
    return monthRange(month);
  }, [view, anchor, month]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await listPortalMediaPosts(charityId, range.from, range.to);
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
  const waiting = posts.filter((p) => p.status === MEDIA_STATUS.PENDING_CHARITY).length;

  const step = (direction: number) => {
    if (view === "week") setAnchor(addDaysISO(weekStartISO(anchor), direction * 7));
    else {
      const next = shiftMonth(month, direction);
      setAnchor(`${next.year}-${String(next.month + 1).padStart(2, "0")}-01`);
    }
  };

  const headerLabel = view === "week" ? weekLabel(weekStartISO(anchor)) : monthLabel(month);

  const empty = {
    title: "لا منشورات في هذا الشهر",
    description: "المنشورات التي يضعها زاد تظهر هنا في يوم نشرها.",
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CalendarNav
          label={headerLabel}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setAnchor(today)}
        />

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && waiting > 0 && <Badge tone="warn">{waiting} منشورٌ ينتظر اعتمادَكم</Badge>}
          <PublishingPlan charityName={charityName} initialPlan={publishingPlan} />
          <Segmented
            label="طريقة العرض"
            value={view}
            onChange={chooseView}
            options={[
              { id: "month", label: "شهر" },
              { id: "week", label: "اسبوع" },
              { id: "list", label: "قائمة" },
            ]}
          />
        </div>
      </div>

      {view === "month" && (
        <MonthView
          weeks={weeks}
          today={today}
          byDay={byDay}
          marksOf={marksOf}
          side="CHARITY"
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "week" && (
        <WeekView
          start={weekStartISO(anchor)}
          today={today}
          byDay={byDay}
          marksOf={marksOf}
          side="CHARITY"
          onOpen={(post) => setDetailId(post.id)}
        />
      )}

      {view === "list" && (
        <ListView
          posts={posts}
          today={today}
          marksOf={marksOf}
          side="CHARITY"
          onOpen={(post) => setDetailId(post.id)}
          empty={empty}
        />
      )}

      {editing && (
        <MediaPostSheet
          title="تعديل المنشور"
          subtitle={charityName}
          day={editing.scheduledOn}
          post={editing}
          platforms={platforms.filter((p) => p.isActive || editing.platforms.includes(p.key))}
          banner={
            <Note tone="brand">
              التعديل يرفع الى زاد لاعتماده، ويظهر له ما تم تغييره. ولا يمكن تعديله مرة
              اخرى قبل الرد عليه.
            </Note>
          }
          savedMessage="تم رفع التعديل الى زاد"
          submit={(draft: MediaPostDraft) => updatePortalMediaPost(editing.id, draft)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setDetailId(null);
            reload();
          }}
        />
      )}

      {detailId && (
        <PortalDetailSheet
          canEdit={canEdit}
          postId={detailId}
          platformName={platformName}
          marksOf={marksOf}
          onClose={() => setDetailId(null)}
          onEdit={(post) => {
            setDetailId(null);
            setEditing(post);
          }}
          onChanged={reload}
        />
      )}
    </div>
  );
}

// ── لوحُ التفاصيل: المتنُ من العدة، والفعلُ اعتمادٌ أو تعديل ────────────────

function PortalDetailSheet({
  canEdit,
  postId,
  platformName,
  marksOf,
  onClose,
  onEdit,
  onChanged,
}: {
  canEdit: boolean;
  postId: string;
  platformName: (key: string) => string;
  marksOf: (keys: string[]) => MediaPlatformView[];
  onClose: () => void;
  onEdit: (post: MediaPost) => void;
  onChanged: () => void;
}) {
  const [post, setPost] = useState<MediaPost | null>(null);
  const [events, setEvents] = useState<MediaEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const result = await getPortalMediaPostDetail(postId);
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

  /**
   * الاعتمادُ يُسأل عنه قبل أن يُفعل: لا رجعةَ للجمعية بعده — وهذا شرطُ صاحب
   * الموقع: «واذا عمد موظف الجمعية المنشور لا يستطيع بعدها التعديل ابدا».
   */
  const approve = async () => {
    if (!post) return;
    const ok = await confirmAction({
      title: "اعتماد المنشور نهائيا؟",
      message: "بعد الاعتماد لا يمكن تعديله — ولا يفتح الا من زاد بسبب يعرض عليكم.",
      confirmLabel: "اعتماد",
      tone: "primary",
    });
    if (!ok) return;
    setError(null);
    start(async () => {
      const result = await approvePortalMediaPost(post.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      notify("ok", "تم اعتماد المنشور");
      setLoads((n) => n + 1);
      onChanged();
    });
  };

  // والفعلُ يلزمه الأمران: جوازُه في حالة المنشور، وصلاحيّةُ التحرير. فمن
  // يطّلع وحدَه لا يُعرض له زرٌّ يُرَدُّ عنه.
  const mayApprove = canEdit && !!post && can("APPROVE", post.status, "CHARITY");
  const mayEdit = canEdit && !!post && can("EDIT", post.status, "CHARITY");

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
          {mayEdit && post && (
            <button type="button" onClick={() => onEdit(post)} className={cx(btn.ghost, "h-9")}>
              <Pencil className="size-3.5" />
              تعديل
            </button>
          )}
          {mayApprove && (
            <button type="button" onClick={() => void approve()} className={btn.primary} disabled={pending}>
              {pending ? <Spinner size={14} /> : <Check className="size-4" />}
              اعتماد المنشور
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
        <MediaPostDetail post={post} events={events} side="CHARITY" platformName={platformName} marksOf={marksOf}>
          {post.status === MEDIA_STATUS.PENDING_CHARITY && (
            <Note tone="warn">
              {canEdit
                ? "بانتظار اعتماد الجمعية: يمكن اعتماده كما هو أو تعديله."
                : "بانتظار اعتماد الجمعية — والاعتماد لمن يملك صلاحية تحرير الخطة الاعلامية."}
            </Note>
          )}
          {post.status === MEDIA_STATUS.PENDING_ZAD && (
            <Note tone="brand">التعديل مرفوع الى زاد بانتظار اعتماده، وما تم تغييره مكتوب في السجل ادناه.</Note>
          )}
          {post.status === MEDIA_STATUS.FINAL && (
            <Note tone="brand">معتمد نهائيا. ولا يفتح الا من زاد بسبب يعرض عليكم، ثم يعود لاعتماد الجمعية.</Note>
          )}
        </MediaPostDetail>
      )}
    </Sheet>
  );
}
