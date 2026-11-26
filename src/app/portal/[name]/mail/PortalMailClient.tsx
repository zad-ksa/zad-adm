"use client";

import { useState } from "react";
import { btn, cx, listRow } from "@/components/console/ui";
import {
  Mail,
  Send,
  Plus,
  Search,
  Paperclip,
  ArrowRight,
  Trash2,
  Reply,
  AlertTriangle,
  LoaderCircle,
  Inbox,
  Building2,
  ShieldCheck,
  Settings2,
  ChevronDown,
} from "lucide-react";
import {
  getPortalInbox,
  getPortalSent,
  getPortalMail,
  deletePortalMail,
} from "@/app/actions/charityMail";
import { htmlToPlainText, mailAuthorLabel } from "@/app/(dashboard)/main/(main)/mail/mailUtils";
import { MailAttachments } from "@/app/(dashboard)/main/(main)/mail/MailAttachments";
import { byMailSentAt, mailSentAt } from "@/lib/mailDates";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { notifyMailUnreadChanged } from "@/lib/mailBadge";
import PortalComposeModal, { type ReplyTarget, type ResendTarget } from "./PortalComposeModal";
import {
  PortalApprovalsPanel,
  PortalMailSettingsPanel,
  type PendingPortalMail,
} from "./PortalMailAdmin";

type Party = { id: string; name: string } | null | undefined;

type MailShape = {
  id: string;
  subject: string;
  body: string;
  createdAt: string | Date;
  /** لحظةُ الاعتماد، وهي لحظةُ الإرسال — بها تُؤرَّخ الرسالة لا بكتابتها. */
  approvedAt?: string | Date | null;
  serviceName: string | null;
  addressedAs: string;
  senderCharityUserId: string | null;
  sender: Party;
  senderCharityUser: Party;
  charity: Party;
  attachments: { id: string; fileUrl: string; fileName: string; fileSize: number | null }[];
  recipients: {
    type: string;
    employeeId: string | null;
    employee: Party;
    charityUserId: string | null;
    charityUser: Party;
  }[];
  replies?: MailShape[];
  parentId?: string | null;
  /** عددُ رسائل المحادثة في هذا الصندوق — من `groupMailThreads` في الخادم. */
  threadCount?: number;
  /** الرسالةُ التي طُلبت بمعرّفها، وقد يكون الرادُّ جذرَ سلسلتها. */
  openedId?: string;
};

type InboxRow = {
  id: string;
  isRead: boolean;
  isStarred: boolean;
  mail: MailShape;
  threadCount?: number;
};

/**
 * من يقف على الطرف الآخر من الرسالة، كما يُقرأ في القائمة.
 *
 * البريد الوارد من زاد لا يُنسب إلى كاتبه بل إلى خدمته: «زاد | خدمة الحوكمة».
 * هكذا أُرسل باسم الخدمة، وهكذا يُردّ عليه — والشخص خلفها قد يتغيّر غداً.
 */
function inboxParty(mail: MailShape) {
  return mailAuthorLabel(mail);
}

function sentParty(mail: MailShape) {
  if (mail.addressedAs === "SERVICE") return `زاد | ${mail.serviceName ?? ""}`;
  const names = mail.recipients.map((r) => r.charityUser?.name || r.employee?.name).filter(Boolean);
  if (names.length === 0) return "—";
  if (names.length <= 2) return names.join(" و");
  return `${names[0]} و${names.length - 1} آخرين`;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "numeric", day: "numeric" }).format(date);
}

export default function PortalMailClient({
  charityName,
  initialInbox,
  initialSent,
  colleagues,
  services,
  willAwaitApproval,
  showApprovals,
  pendingCount,
  canManageMail,
}: {
  charityName: string;
  initialInbox: InboxRow[];
  initialSent: MailShape[];
  colleagues: { id: string; name: string; title: string }[];
  services: string[];
  /** تقف رسائلي عند معمِّد الجمعية؟ */
  willAwaitApproval: boolean;
  showApprovals: boolean;
  pendingCount: number;
  canManageMail: boolean;
}) {
  const [tab, setTab] = useState<"inbox" | "sent" | "approvals" | "settings">("inbox");
  const [resendTarget, setResendTarget] = useState<ResendTarget | null>(null);
  const isPanelTab = tab === "approvals" || tab === "settings";
  // أول رسالةٍ تقف على التعميد تُظهر التبويب فوراً، لا بعد تحديث الصفحة.
  const [approvalsVisible, setApprovalsVisible] = useState(showApprovals);
  const [inbox, setInbox] = useState<InboxRow[]>(initialInbox);
  const [sent, setSent] = useState<MailShape[]>(initialSent);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openMail, setOpenMail] = useState<MailShape | null>(null);
  /** ما يُعرض متنُه من رسائل المحادثة المفتوحة. */
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MailShape | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const unreadCount = inbox.filter((row) => !row.isRead).length;

  const refresh = async (nextSearch = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextInbox, nextSent] = await Promise.all([
        getPortalInbox(charityName, 1, 20, nextSearch),
        getPortalSent(charityName, 1, 20, nextSearch),
      ]);
      setInbox(nextInbox.mails as unknown as InboxRow[]);
      setSent(nextSent.mails as unknown as MailShape[]);
    } catch {
      setError("تعذّر تحديث البريد — أعد المحاولة");
    } finally {
      setIsLoading(false);
    }
  };

  const openOne = async (mailId: string) => {
    setError(null);
    try {
      const mail = (await getPortalMail(charityName, mailId)) as unknown as MailShape;
      // المفتوحةُ والأخيرةُ وحدَهما تُفتحان، وما بقي من السلسلة مطويٌّ — فمن
      // دخل من سطرٍ فيه عشرُ رسائلَ لا يُستقبَل بعشرِ رسائلَ مفتوحة.
      const messages = [mail, ...(mail.replies ?? [])].sort(byMailSentAt);
      setExpandedIds(
        new Set(
          [mail.openedId ?? mailId, messages[messages.length - 1]?.id].filter(
            (id): id is string => !!id
          )
        )
      );
      setOpenMail(mail);
      // القراءة تُسجَّل على الخادم، فتُعكس هنا بلا إعادة جلب القائمة كلها.
      setInbox((prev) => prev.map((row) => (row.mail.id === mailId ? { ...row, isRead: true } : row)));
      notifyMailUnreadChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر فتح الرسالة");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // المحادثةُ كلُّها تُنقل لا رسالةٌ منها: الزرُّ على السلسلة المفتوحة،
      // ولو نُقلت الأولى وحدَها عاد سطرُها في الوارد بردودها.
      const ids = thread.length > 0 ? thread.map((message) => message.id) : [deleteTarget.id];
      for (const id of ids) await deletePortalMail(charityName, id);
      setInbox((prev) => prev.filter((row) => !ids.includes(row.mail.id)));
      notifyMailUnreadChanged();
      setOpenMail(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر حذف الرسالة");
    } finally {
      setIsDeleting(false);
    }
  };

  const startReply = (mail: MailShape) => {
    // محادثة الخدمة يُردّ فيها على الفريقين؛ ومراسلة الزملاء على كاتبها.
    setReplyTarget(
      !mail.serviceName && mail.senderCharityUserId
        ? {
            parentId: mail.id,
            subject: mail.subject,
            kind: "COLLEAGUES",
            toIds: [mail.senderCharityUserId],
            label: mail.senderCharityUser?.name ?? "",
          }
        : {
            parentId: mail.id,
            subject: mail.subject,
            kind: "SERVICE",
            serviceName: mail.serviceName ?? "",
            label: `زاد | ${mail.serviceName ?? ""}`,
          }
    );
  };

  /**
   * المحادثةُ المفتوحة من أوّلها: الرسالةُ الأولى ثمّ ردودُها على ترتيبها.
   *
   * و`getPortalMail` يردُّ جذر السلسلة أيّاً كانت الرسالةُ المطلوبة، فالقائمةُ
   * هنا كاملةٌ بلا استعلامٍ ثانٍ.
   */
  // ترتيبُ القراءة ترتيبُ الإرسال: المعتمَدةُ تأخذ مكانها بلحظة اعتمادها.
  const thread: MailShape[] = openMail ? [openMail, ...(openMail.replies ?? [])].sort(byMailSentAt) : [];
  const allExpanded = thread.length > 0 && thread.every((message) => expandedIds.has(message.id));

  const toggleMessage = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllMessages = () => {
    const last = thread[thread.length - 1]?.id;
    setExpandedIds(
      allExpanded
        ? new Set(last ? [last] : [])
        : new Set(thread.map((message) => message.id))
    );
  };

  const rows: { key: string; mail: MailShape; isUnread: boolean; party: string; count: number }[] =
    tab === "inbox"
      ? inbox.map((row) => ({
          key: row.id,
          mail: row.mail,
          isUnread: !row.isRead,
          party: inboxParty(row.mail),
          count: Math.max(1, row.threadCount ?? 1),
        }))
      : sent.map((mail) => ({
          key: mail.id,
          mail,
          isUnread: false,
          party: sentParty(mail),
          count: Math.max(1, mail.threadCount ?? 1),
        }));

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary dark:text-teal-300" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">البريد</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              مراسلة زملائك في {charityName}، أو خدمات زاد المفوَّض بها
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsComposeOpen(true)}
          className={btn.primary}
        >
          <Plus className="w-4 h-4" />
          رسالة جديدة
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {openMail ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setOpenMail(null)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/[0.06] transition-colors text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              العودة إلى القائمة
            </button>

            <div className="flex items-center gap-1">
              {tab === "inbox" && (
                <>
                  <button
                    type="button"
                    onClick={() => startReply(openMail)}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg text-primary dark:text-teal-300 hover:bg-primary/[0.08] transition-colors text-sm font-medium"
                  >
                    <Reply className="w-4 h-4" />
                    ردّ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(openMail)}
                    className={btn.iconDanger}
                    title="نقل إلى المهملات"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {openMail.subject || "(بدون موضوع)"}
              </h2>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {thread.length > 1 ? `${thread.length} رسائل في المحادثة` : formatDate(mailSentAt(openMail))}
                </span>
                {openMail.serviceName && (
                  <span className="h-6 px-2 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 font-medium">
                    <Building2 className="w-3 h-3 ml-1" />
                    {openMail.serviceName}
                  </span>
                )}
              </div>
            </div>

            {thread.length > 1 && (
              <button
                type="button"
                onClick={toggleAllMessages}
                className="h-8 px-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/[0.06] transition-colors text-xs font-medium shrink-0"
              >
                {allExpanded ? "طي الكل" : "توسيع الكل"}
              </button>
            )}
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* المحادثةُ كلُّها في صندوقٍ واحد: الرسالةُ الأولى وما رُدَّ عليها،
              كلُّ واحدةٍ تُفتح وتُطوى. وكانت الردودُ تُعرض مفتوحةً كلَّها في
              قائمةٍ أسفل الرسالة، ومرفقاتُها لا تظهر أصلاً. */}
          <div className="space-y-2">
            {thread.map((message) => (
              <PortalThreadMessage
                key={message.id}
                message={message}
                isExpanded={expandedIds.has(message.id)}
                onToggle={() => toggleMessage(message.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
            <div className="flex items-center p-0.5 gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
              {([
                { key: "inbox" as const, label: "الوارد", Icon: Inbox, badge: unreadCount },
                { key: "sent" as const, label: "المُرسَل", Icon: Send, badge: 0 },
                ...(approvalsVisible
                  ? [
                      {
                        key: "approvals" as const,
                        label: "بانتظار التعميد",
                        Icon: ShieldCheck,
                        badge: pendingCount,
                      },
                    ]
                  : []),
                ...(canManageMail
                  ? [
                      {
                        key: "settings" as const,
                        label: "إعدادات البريد",
                        Icon: Settings2,
                        badge: 0,
                      },
                    ]
                  : []),
              ]).map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-sm font-medium transition-colors ${
                    tab === key
                      ? "bg-white dark:bg-slate-900 text-primary dark:text-teal-300 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {badge > 0 && (
                    <span className="h-5 min-w-5 px-1 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {!isPanelTab && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                refresh();
              }}
              className="flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 min-w-[200px] flex-1 sm:flex-none sm:w-64"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في البريد…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
              {isLoading && <LoaderCircle className="w-4 h-4 animate-spin text-primary shrink-0" />}
            </form>
            )}
          </div>

          {tab === "approvals" ? (
            <PortalApprovalsPanel
              charityName={charityName}
              colleagues={colleagues}
              onChanged={() => refresh()}
              onResend={(mail: PendingPortalMail) => {
                setResendTarget({
                  id: mail.id,
                  subject: mail.subject,
                  body: mail.body,
                  kind: mail.addressedAs === "SERVICE" ? "SERVICE" : "COLLEAGUES",
                  toIds: mail.draftCharityUserIds,
                  serviceName: mail.serviceName ?? "",
                  // الردّ المُرجَع يعود ردّاً في سلسلته، لا رسالةً جديدة.
                  parentId: mail.parentId ?? null,
                });
              }}
            />
          ) : tab === "settings" ? (
            <PortalMailSettingsPanel charityName={charityName} />
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {tab === "inbox" ? "لا رسائل واردة" : "لم تُرسل رسائل بعد"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map(({ key, mail, isUnread, party, count }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openOne(mail.id)}
                    className={cx(
                      // الحالاتُ من `listRow` كما في بريد زاد: الأبيضُ لغير
                      // المقروء والرماديُّ الباهتُ للمقروء — فلا تختلف شاشتان
                      // لشيءٍ واحد.
                      listRow({ unread: isUnread }),
                      "gap-3 px-3 py-3 sm:px-4"
                    )}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0 ${
                        isUnread ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={cx(
                        "w-32 shrink-0 truncate text-body sm:w-40",
                        isUnread
                          ? "font-bold text-slate-900 dark:text-white"
                          : "font-normal text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {party}
                    </span>
                    {/* عددُ رسائل المحادثة — فالصفُّ محادثةٌ لا رسالة، والردُّ
                        لم يَعُد صفّاً مستقلاًّ عن رسالته الأولى. */}
                    {count > 1 && (
                      <span
                        title={`${count} رسائل في هذه المحادثة`}
                        className={cx(
                          "shrink-0 h-4 px-1 inline-flex items-center rounded text-[11px]",
                          isUnread
                            ? "bg-primary/[0.10] text-primary dark:bg-teal-400/10 dark:text-teal-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        {count}
                      </span>
                    )}
                    <span className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span
                        className={cx(
                          "truncate text-body",
                          isUnread
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-normal text-slate-700 dark:text-slate-300"
                        )}
                      >
                        {mail.subject || "(بدون موضوع)"}
                      </span>
                      <span className="hidden sm:inline truncate text-xs text-slate-400 dark:text-slate-500">
                        {htmlToPlainText(mail.body || "").slice(0, 90)}
                      </span>
                    </span>
                    {mail.attachments.length > 0 && (
                      <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 w-16 text-left">
                      {formatDate(mailSentAt(mail))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(isComposeOpen || replyTarget || resendTarget) && (
        <PortalComposeModal
          charityName={charityName}
          colleagues={colleagues}
          services={services}
          replyTarget={replyTarget}
          resendTarget={resendTarget}
          willAwaitApproval={willAwaitApproval}
          onClose={() => {
            setIsComposeOpen(false);
            setReplyTarget(null);
            setResendTarget(null);
          }}
          onSent={() => {
            setIsComposeOpen(false);
            setReplyTarget(null);
            setResendTarget(null);
            // ما يقف على التعميد لا يظهر في «المُرسَل»، فمكانه تبويب الانتظار.
            if (willAwaitApproval) setApprovalsVisible(true);
            setTab(willAwaitApproval ? "approvals" : "sent");
            setOpenMail(null);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="نقل الرسالة إلى المهملات"
        message={
          thread.length > 1
            ? `سيتم إخفاء محادثة «${deleteTarget?.subject || "(بدون موضوع)"}» كلها (${thread.length} رسائل) من صندوق الوارد.`
            : `سيتم إخفاء «${deleteTarget?.subject || "(بدون موضوع)"}» من صندوق الوارد.`
        }
        confirmLabel="نقل إلى المهملات"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isDeleting}
        tone="danger"
      />
    </div>
  );
}

/**
 * رسالةٌ واحدةٌ من المحادثة — تُفتح وتُطوى.
 *
 * والمطويُّ سطرٌ واحد: كاتبُها وأوّلُ سطرٍ من متنها ووقتُها — فالسلسلةُ الطويلةُ
 * تُقرأ كلُّها بنظرةٍ ثمّ يُفتح ما يُراد. وهو شكلُ `ThreadMessageCard` نفسُه في
 * بريد زاد، فلا تختلف شاشتان لشيءٍ واحد.
 */
function PortalThreadMessage({
  message,
  isExpanded,
  onToggle,
}: {
  message: MailShape;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const author = mailAuthorLabel(message);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className={cx(
          "flex h-11 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-right transition-colors",
          "hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40",
          "outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
      >
        <span className="shrink-0 text-body font-semibold text-slate-800 dark:text-slate-200">{author}</span>
        <span className="truncate text-xs text-slate-400 dark:text-slate-500">
          {htmlToPlainText(message.body || "").slice(0, 140)}
        </span>
        <span className="flex-1" />
        {message.attachments.length > 0 && (
          <Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        )}
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatDate(mailSentAt(message))}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-slate-300 dark:text-slate-600" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded
        className="flex w-full items-center gap-2 text-right outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
      >
        <span className="text-body font-semibold text-slate-800 dark:text-slate-200">{author}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(mailSentAt(message))}</span>
        <span className="flex-1" />
        <ChevronDown className="w-4 h-4 shrink-0 rotate-180 text-slate-300 dark:text-slate-600" />
      </button>

      <div
        className="mail-prose mt-3 text-slate-800 dark:text-slate-200"
        dangerouslySetInnerHTML={{ __html: message.body || "" }}
      />

      <MailAttachments attachments={message.attachments} className="pt-4" />
    </div>
  );
}
