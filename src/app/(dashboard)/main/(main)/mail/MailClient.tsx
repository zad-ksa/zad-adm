"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Inbox,
  Send,
  Star,
  Trash2,
  PenSquare,
  MailOpen,
  RefreshCw,
  Mail as MailIcon,
  Trash,
  FileText,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import {
  getInbox,
  getSentMails,
  getStarredMails,
  getTrashMails,
  getDrafts,
  markAsRead,
  markManyAsRead,
  toggleStar,
  moveToTrash,
  restoreFromTrash,
  deletePermanently,
  deleteDraft,
} from "@/app/actions/mail";
import { EmptyState, Rail, RailItem, SearchField } from "@/components/console/layout";
import { CheckMark, Skeleton, btn, cx, toolbarClass } from "@/components/console/ui";
import { Pagination } from "@/components/console/controls";
import { notifyMailUnreadChanged } from "@/lib/mailBadge";
import { toggleWithRange } from "@/lib/rangeSelect";
import ComposeModal from "./ComposeModal";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import MailRow from "./MailRow";
import { normalizeMailListItem } from "./mailUtils";
import MailApprovalsPanel from "./MailApprovalsPanel";
import MailSettingsPanel from "./MailSettingsPanel";

interface MailClientProps {
  session: any;
  employees: any[];
  initialTab: string;
  /** First page of `initialTab`, rendered on the server — see page.tsx. */
  initialMails: { mails: any[]; total: number; totalPages: number };
  /** يظهر تبويب «بانتظار التعميد» لمن يعمّد، أو لمن له بريدٌ موقوف. */
  showApprovals: boolean;
  pendingCount: number;
  canManageMailSettings: boolean;
}

type Folder = {
  key: string;
  label: string;
  Icon: typeof Inbox;
  accent?: "secondary";
  badge?: number;
};

const BASE_FOLDERS: Folder[] = [
  { key: "inbox", label: "البريد الوارد", Icon: Inbox },
  { key: "sent", label: "البريد المرسل", Icon: Send },
  { key: "drafts", label: "المسودات", Icon: FileText },
  { key: "starred", label: "المميزة بنجمة", Icon: Star, accent: "secondary" as const },
  { key: "trash", label: "سلة المهملات", Icon: Trash2 },
];

/** تبويبان لا يعرضان قائمة بريد، بل شاشةً خاصة بهما. */
const PANEL_TABS = ["approvals", "settings"];

type BulkAction = "trash" | "delete" | null;

export default function MailClient({
  session,
  employees,
  initialTab,
  initialMails,
  showApprovals,
  pendingCount,
  canManageMailSettings,
}: MailClientProps) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || initialTab;
  const isPanelTab = PANEL_TABS.includes(currentTab);

  // أول رسالةٍ تقف على التعميد تُظهر التبويب فوراً: الخادم حسبه قبل أن توجد،
  // ولو انتُظر تحديث الصفحة لبدت الرسالة وكأنها اختفت.
  const [approvalsVisible, setApprovalsVisible] = useState(showApprovals);

  // «بانتظار التعميد» بعد «المُرسَل» مباشرةً: هو المرحلة التي تسبقه.
  // و«إعدادات البريد» في آخر القائمة تحت سلة المهملات، كإعداداتٍ لا كصندوق.
  const FOLDERS: Folder[] = [
    ...BASE_FOLDERS.slice(0, 2),
    ...(approvalsVisible
      ? [{ key: "approvals", label: "بانتظار التعميد", Icon: ShieldCheck, badge: pendingCount }]
      : []),
    ...BASE_FOLDERS.slice(2),
    ...(canManageMailSettings
      ? [{ key: "settings", label: "إعدادات البريد", Icon: Settings2 }]
      : []),
  ];

  const [mails, setMails] = useState<any[]>(initialMails.mails);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialMails.totalPages);
  const [total, setTotal] = useState(initialMails.total);
  const [selectedMails, setSelectedMails] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<BulkAction>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);
  const [editingDraft, setEditingDraft] = useState<any>(null);

  const employeesById = employees.reduce((acc: Record<string, any>, e) => {
    acc[e.id] = e;
    return acc;
  }, {});

  // Clicking through folders quickly fires overlapping requests, and without a
  // guard the slowest one wins and paints the wrong folder's mail. Each request
  // carries a token; only the newest is allowed to write to state.
  const requestToken = useRef(0);

  /**
   * `quiet` is what makes a background refresh bearable: no spinner and no
   * clearing of the selection. A poll that flashed the skeleton every thirty
   * seconds and dropped whatever you had ticked would be worse than the
   * staleness it fixes.
   */
  const fetchMails = async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (PANEL_TABS.includes(currentTab)) return;
    const token = ++requestToken.current;
    if (!quiet) {
      setIsLoading(true);
      setSelectedMails([]);
    }
    try {
      let result;
      if (currentTab === "inbox") {
        result = await getInbox(page, 20, appliedSearch);
      } else if (currentTab === "sent") {
        result = await getSentMails(page, 20, appliedSearch);
      } else if (currentTab === "drafts") {
        result = await getDrafts(page, 20, appliedSearch);
      } else if (currentTab === "starred") {
        result = await getStarredMails(page, 20, appliedSearch);
      } else if (currentTab === "trash") {
        result = await getTrashMails(page, 20, appliedSearch);
      }

      if (token !== requestToken.current) return; // superseded while in flight

      if (result) {
        setMails(result.mails);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      }
    } catch (error) {
      console.error("Error fetching mails:", error);
    } finally {
      if (!quiet && token === requestToken.current) setIsLoading(false);
    }
  };

  // The server already sent page 1 of `initialTab` with no search applied,
  // which is exactly the state this component mounts in — fetching again on
  // mount would ask for bytes we are already holding and turn opening the mail
  // page into two round trips to ap-southeast-2 instead of one.
  const isInitialState = useRef(true);

  useEffect(() => {
    if (isInitialState.current) {
      isInitialState.current = false;
      return;
    }
    fetchMails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, page, appliedSearch]);

  /**
   * New mail arrives on its own; the list did not.
   *
   * It fetched on tab, page and search changes and on the refresh button —
   * so a message that landed while you sat on the inbox stayed invisible
   * until you reloaded. The sidebar badge, which polls, would meanwhile say
   * you had one. Badge and list disagreeing is what sends someone to F5.
   *
   * Inbox only: sent, drafts and trash change solely by your own action, and
   * polling them would be a query per thirty seconds asking nothing.
   *
   * Paused while the tab is hidden, and caught up the moment it is looked at
   * again — the same shape the approvals screen already uses.
   */
  useEffect(() => {
    if (currentTab !== "inbox") return;

    const tick = () => {
      if (document.hidden) return;
      fetchMails({ quiet: true });
      // Keep the badge in step with the list it counts, rather than letting
      // its own slower poll disagree with what is on screen.
      notifyMailUnreadChanged();
    };

    const interval = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
    // fetchMails closes over the current tab, page and search — the deps that
    // matter are exactly those, and it is redefined with them each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, page, appliedSearch]);

  // Search used to run as a client-side filter over whichever 20 rows the
  // current page happened to hold, so anything older than the first page was
  // unfindable. It is a real query now; this debounce keeps it from firing on
  // every keystroke, and resets to page 1 because the result set changed.
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /**
   * Switching folders is a different query on the same screen, not a different
   * page — so it no longer navigates.
   *
   * router.push() made it a real navigation: an RSC round trip to
   * ap-southeast-2, and because the page is force-dynamic it suspended, which
   * fired (main)/loading.tsx and blanked the entire mail interface to a spinner
   * before rebuilding it. Clicking "Sent" cost a full page transition.
   *
   * history.pushState updates the URL without any of that, and Next documents
   * it as integrating with the router — useSearchParams below stays in sync, so
   * currentTab still comes from the URL and Back/Forward still move between
   * folders. What changes is that only the list area reloads; the rail, the
   * toolbar and the shell stay on screen.
   */
  const handleTabChange = (tab: string) => {
    if (tab === currentTab) return;
    // Only touch what is actually off its default. Setting page/search
    // unconditionally would change state in this render and the URL in the
    // next, so the fetch effect would run twice and fire a request that is
    // immediately superseded. In the common case — page 1, no search — this
    // leaves the URL change as the single trigger.
    if (page !== 1) setPage(1);
    if (searchQuery) setSearchQuery("");
    if (appliedSearch) setAppliedSearch("");
    window.history.pushState(null, "", `/main/mail?tab=${tab}`);
  };

  const handleOpenMail = (mailId: string, isUnread: boolean) => {
    if (isUnread) {
      markAsRead(mailId)
        // The sidebar badge is rendered by a layout that does not re-render
        // on navigation, so it has to be told rather than left to notice.
        .then(notifyMailUnreadChanged)
        .catch((error) => console.error("Error marking mail as read:", error));
    }
  };

  const handleOpenDraft = (mailId: string) => {
    const draft = mails.find((m) => m.id === mailId);
    if (draft) setEditingDraft(draft);
  };

  const handleToggleStar = async (mailId: string) => {
    try {
      setMails((prev) =>
        prev.map((m) => {
          const rowMailId = m.mail?.id || m.id;
          if (rowMailId === mailId) {
            return { ...m, isStarred: !m.isStarred };
          }
          return m;
        })
      );
      await toggleStar(mailId);
      if (currentTab === "starred") {
        fetchMails();
      }
    } catch (error) {
      console.error("Error toggling star:", error);
      fetchMails();
    }
  };

  /**
   * مرساةُ المدى: آخرُ صفٍّ نُقر عليه بلا Shift.
   *
   * ولا تُمحى عند تغيّر القائمة: `indexOf` يردُّ −١ لمعرِّفٍ ليس في الصفحة
   * المعروضة، فيسقط المدى إلى نقرةٍ عاديّة — وهو الصوابُ بلا حرسٍ إضافيّ.
   */
  const rangeAnchor = useRef<string | null>(null);

  /**
   * التحديدُ بالنقر، وبـShift يُحدَّد كلُّ ما بين المرساة والمنقور.
   *
   * والحسابُ في `toggleWithRange` — خالصٌ مُختبَرٌ: مدىً محسوبٌ بالمقلوب
   * يُحدِّد صفوفاً غير التي أُشير إليها، ومن ضغط «نقل للمهملات» بعده نقل غيرَ
   * ما رأى. ولا يُكتشف في تجربةٍ عابرة، إذ تُحدَّد صفوفٌ فيبدو أنّ الأمر عمل.
   *
   * والترتيبُ المُمرَّرُ ترتيبُ `mails` المعروض: المدى ما بين الصفّين **على
   * الشاشة**، وهو ما تراه العينُ حين تُمسك Shift.
   */
  const handleToggleSelect = (rowId: string, shiftKey = false) => {
    const next = toggleWithRange(
      mails.map((m) => m.id),
      selectedMails,
      rowId,
      rangeAnchor.current,
      shiftKey
    );
    setSelectedMails(next.selected);
    rangeAnchor.current = next.anchor;
  };

  const allSelected = mails.length > 0 && selectedMails.length === mails.length;

  const handleSelectAll = () => {
    rangeAnchor.current = null;
    setSelectedMails(allSelected ? [] : mails.map((m) => m.id));
  };

  /**
   * تحديدُ المحدَّد مقروءاً.
   *
   * ويُحدَّث المعروضُ فوراً قبل انتظار الخادم: الفعلُ لا يُخطئ في عامّة الحال
   * (شرطُه `isRead: false` وحدَه)، وانتظارُ جولةٍ إلى سنغافورة ليزول ثِقَلُ
   * الخطِّ يجعل الزرَّ يبدو معطَّلاً. ثمّ تُجلب القائمةُ لتوافق القاعدة.
   */
  const handleMarkRead = async () => {
    const mailIds = selectedMails.map(resolveMailId).filter(Boolean) as string[];
    if (mailIds.length === 0) return;

    setMails((prev) =>
      prev.map((m) => (selectedMails.includes(m.id) && m.isRead === false ? { ...m, isRead: true } : m))
    );
    setIsBulkPending(true);
    try {
      await markManyAsRead(mailIds);
      // شارةُ الشريط تُرسمها طبقةٌ لا تُعاد عند هذا الفعل، فتُخبَر ولا تُترك
      // لتكتشف — وإلّا قالت «٣ غير مقروءة» وقائمةٌ لا تُظهر واحدة.
      notifyMailUnreadChanged();
      setSelectedMails([]);
      await fetchMails({ quiet: true });
    } catch (error) {
      console.error("Error marking mails as read:", error);
      await fetchMails();
    } finally {
      setIsBulkPending(false);
    }
  };

  const resolveMailId = (rowId: string) => {
    const mailObj = mails.find((m) => m.id === rowId);
    return mailObj?.mail?.id || mailObj?.id;
  };

  const runBulkAction = async (action: (mailId: string) => Promise<any>) => {
    setIsBulkPending(true);
    try {
      for (const rowId of selectedMails) {
        const mailId = resolveMailId(rowId);
        if (mailId) await action(mailId);
      }
      await fetchMails();
    } finally {
      setIsBulkPending(false);
      setConfirmAction(null);
    }
  };

  const handleBulkRestore = () => {
    if (!selectedMails.length) return;
    runBulkAction(restoreFromTrash);
  };

  const unreadFolder = currentTab !== "sent" && currentTab !== "drafts";

  return (
    <div className="flex h-[calc(100dvh-6rem)] overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-7.5rem)] dark:border-slate-800 dark:bg-slate-900">
      <Rail label="مجلدات البريد">
        <button type="button" onClick={() => setIsComposeOpen(true)} className={cx(btn.primary, "mb-2 w-full")}>
          <PenSquare className="size-4" />
          رسالة جديدة
        </button>
        {FOLDERS.map(({ key, label, Icon, accent, badge }) => (
          <RailItem
            key={key}
            label={label}
            active={currentTab === key}
            badge={badge}
            onClick={() => handleTabChange(key)}
            icon={
              <Icon
                className={cx(
                  "size-4 shrink-0",
                  accent === "secondary" && currentTab !== key && "text-secondary dark:text-amber-400"
                )}
              />
            }
          />
        ))}
      </Rail>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar — بحثٌ وأفعالٌ جماعية، لا معنى لها في شاشتَي التعميد
            والإعدادات. */}
        {!isPanelTab && (
          <div className={toolbarClass}>
            {/* الإنشاءُ في العمود على سطح المكتب؛ وعلى الهاتف لا عمودَ، فيأخذ
                أوّلَ موضعٍ في الشريط. */}
            <button
              type="button"
              onClick={() => setIsComposeOpen(true)}
              className={cx(btn.primary, "size-9 px-0 lg:hidden")}
              title="رسالة جديدة"
              aria-label="رسالة جديدة"
            >
              <PenSquare className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleSelectAll}
              className={cx(btn.icon, "hidden sm:inline-flex")}
              title={allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
              aria-label={allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
            >
              <CheckMark state={allSelected ? "on" : selectedMails.length > 0 ? "mixed" : "off"} />
            </button>

            <button
              type="button"
              onClick={() => fetchMails()}
              className={btn.icon}
              title="تحديث"
              aria-label="تحديث"
            >
              <RefreshCw className={cx("size-4", isLoading && "animate-spin text-primary dark:text-teal-300")} />
            </button>

            {selectedMails.length > 0 && (
              <div className="flex items-center gap-1 border-s border-slate-200 ps-2 dark:border-slate-700">
                <span className="hidden whitespace-nowrap text-caption text-slate-500 sm:inline dark:text-slate-400">
                  {selectedMails.length} محدَّدة
                </span>

                {/* تحديدٌ كمقروء: في المجلّدات التي للرسالة فيها حالُ قراءةٍ
                    أصلاً. و«المرسَل» و«المسودات» ليست منها. */}
                {unreadFolder && (
                  <button
                    type="button"
                    onClick={handleMarkRead}
                    disabled={isBulkPending}
                    className={btn.secondary}
                  >
                    <MailOpen className="size-3.5" />
                    تحديد كمقروء
                  </button>
                )}

                {/* النقلُ إلى المهملات فعلٌ يُرجَع عنه، فزرٌّ محايد. والحذفُ
                    النهائيُّ لا رجعةَ فيه، فهو وحدَه الأحمر. */}
                {currentTab !== "trash" && currentTab !== "drafts" && (
                  <button type="button" onClick={() => setConfirmAction("trash")} className={btn.secondary}>
                    <Trash2 className="size-3.5" />
                    نقل للمهملات
                  </button>
                )}
                {currentTab === "drafts" && (
                  <button type="button" onClick={() => setConfirmAction("delete")} className={btn.danger}>
                    <Trash className="size-3.5" />
                    حذف المسودات
                  </button>
                )}
                {currentTab === "trash" && (
                  <>
                    <button type="button" onClick={handleBulkRestore} className={btn.secondary}>
                      <RefreshCw className="size-3.5" />
                      استرجاع
                    </button>
                    <button type="button" onClick={() => setConfirmAction("delete")} className={btn.danger}>
                      <Trash className="size-3.5" />
                      حذف نهائي
                    </button>
                  </>
                )}
              </div>
            )}

            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              label="البحث في البريد"
              placeholder="البحث في البريد…"
              className="ms-auto w-full max-w-xs"
            />
          </div>
        )}

        {/* Folders on mobile: a scrolling strip, since the rail is hidden.
            Horizontal scroll rather than wrap so it stays one row tall. */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 px-2 py-1.5 lg:hidden dark:border-slate-800">
          {FOLDERS.map(({ key, label, Icon, accent }) => {
            const isActive = currentTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                aria-pressed={isActive}
                className={cx(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-meta font-medium transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary/[0.08] font-semibold text-primary dark:bg-teal-400/10 dark:text-teal-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon
                  className={cx(
                    "size-3.5",
                    !isActive && accent === "secondary" && "text-secondary dark:text-amber-400"
                  )}
                />
                {label}
              </button>
            );
          })}
        </div>

        {isPanelTab ? (
          currentTab === "approvals" ? (
            <MailApprovalsPanel />
          ) : (
            <MailSettingsPanel />
          )
        ) : (
          <>
            {/* Mail list */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-3">
                      <Skeleton className="size-6 rounded-full" />
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-3.5 w-12" />
                    </li>
                  ))}
                </ul>
              ) : mails.length === 0 ? (
                <EmptyState
                  icon={<MailIcon className="size-4" />}
                  title={appliedSearch ? `لا نتائج للبحث عن «${appliedSearch}»` : "لا توجد رسائل هنا"}
                  description={appliedSearch ? "جرِّب كلمةً أقلَّ تحديداً، أو امسح البحث." : undefined}
                />
              ) : (
                <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mails.map((item) => (
                    <MailRow
                      key={item.id}
                      item={normalizeMailListItem(item, currentTab, employeesById)}
                      isSelected={selectedMails.includes(item.id)}
                      showStar={currentTab !== "sent" && currentTab !== "trash" && currentTab !== "drafts"}
                      asButton={currentTab === "drafts"}
                      onToggleSelect={handleToggleSelect}
                      onToggleStar={handleToggleStar}
                      onOpen={currentTab === "drafts" ? handleOpenDraft : handleOpenMail}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* الترقيمُ من العدّة: المدى ثمّ الزرّان، وهو يختفي من نفسه حين
                تكون صفحةً واحدة. */}
            <div className="shrink-0 border-t border-slate-200 px-2 dark:border-slate-800">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={20}
                onChange={setPage}
                unit="رسالة"
              />
            </div>
          </>
        )}
      </div>

      {isComposeOpen && (
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={() => setIsComposeOpen(false)}
          employees={employees}
          onSuccess={(result) => {
            setIsComposeOpen(false);
            if (result?.pending) {
              setApprovalsVisible(true);
              handleTabChange("approvals");
              return;
            }
            fetchMails();
          }}
        />
      )}

      {editingDraft && (
        <ComposeModal
          isOpen={!!editingDraft}
          onClose={() => {
            setEditingDraft(null);
            fetchMails();
          }}
          employees={employees}
          draft={editingDraft}
          onSuccess={() => {
            setEditingDraft(null);
            fetchMails();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmAction !== null}
        title={confirmAction === "delete" ? (currentTab === "drafts" ? "حذف المسودات" : "حذف الرسائل نهائياً") : "نقل الرسائل إلى المهملات"}
        message={
          confirmAction === "delete"
            ? currentTab === "drafts"
              ? "هل أنت متأكد من حذف المسودات المحددة؟ لا يمكن التراجع عن هذا الإجراء."
              : "هل أنت متأكد من حذف الرسائل المحددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
            : "هل أنت متأكد من نقل الرسائل المحددة إلى سلة المهملات؟"
        }
        onCancel={() => setConfirmAction(null)}
        onConfirm={() =>
          runBulkAction(confirmAction === "delete" ? (currentTab === "drafts" ? deleteDraft : deletePermanently) : moveToTrash)
        }
        isPending={isBulkPending}
      />
    </div>
  );
}
