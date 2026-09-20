"use client";

import { useState } from "react";
import {
  Mail,
  Send,
  Plus,
  Search,
  Paperclip,
  ArrowRight,
  Trash2,
  Reply,
  Download,
  AlertTriangle,
  LoaderCircle,
  Inbox,
  Building2,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import {
  getPortalInbox,
  getPortalSent,
  getPortalMail,
  deletePortalMail,
} from "@/app/actions/charityMail";
import { htmlToPlainText } from "@/app/(dashboard)/main/(main)/mail/mailUtils";
import ConfirmModal from "@/components/ui/ConfirmModal";
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
};

type InboxRow = { id: string; isRead: boolean; isStarred: boolean; mail: MailShape };

/**
 * من يقف على الطرف الآخر من الرسالة، كما يُقرأ في القائمة.
 *
 * البريد الوارد من زاد لا يُنسب إلى كاتبه بل إلى خدمته: «زاد | خدمة الحوكمة».
 * هكذا أُرسل باسم الخدمة، وهكذا يُردّ عليه — والشخص خلفها قد يتغيّر غداً.
 */
function inboxParty(mail: MailShape) {
  return authorLabel(mail);
}

/**
 * كاتب الرسالة كما يُعرض: عضو الجمعية باسمه، وموظف زاد باسمه مع خدمته.
 *
 * محادثة الخدمة يشترك فيها الفريقان، فالخدمة وحدها لا تكفي: يلزم أن يعرف
 * الفريق مَن ردّ منه ومَن ردّ من زاد.
 */
function authorLabel(mail: MailShape) {
  if (mail.senderCharityUser) return mail.senderCharityUser.name;
  const name = mail.sender?.name;
  if (mail.serviceName) return name ? `${name} — زاد | ${mail.serviceName}` : `زاد | ${mail.serviceName}`;
  return name || "زاد";
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
      const mail = await getPortalMail(charityName, mailId);
      setOpenMail(mail as unknown as MailShape);
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
      await deletePortalMail(charityName, deleteTarget.id);
      setInbox((prev) => prev.filter((row) => row.mail.id !== deleteTarget.id));
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

  const rows: { key: string; mail: MailShape; isUnread: boolean; party: string }[] =
    tab === "inbox"
      ? inbox.map((row) => ({
          key: row.id,
          mail: row.mail,
          isUnread: !row.isRead,
          party: inboxParty(row.mail),
        }))
      : sent.map((mail) => ({ key: mail.id, mail, isUnread: false, party: sentParty(mail) }));

  return (
    <div className="mail-ui space-y-4" dir="rtl">
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
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4">
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
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/[0.10] transition-colors"
                    title="نقل إلى المهملات"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {openMail.subject || "(بدون موضوع)"}
            </h2>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {tab === "inbox" ? inboxParty(openMail) : sentParty(openMail)}
              </span>
              <span>·</span>
              <span>{formatDate(openMail.createdAt)}</span>
              {openMail.serviceName && (
                <span className="h-6 px-2 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 font-medium">
                  <Building2 className="w-3 h-3 ml-1" />
                  {openMail.serviceName}
                </span>
              )}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          <div
            className="mail-prose text-slate-800 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: openMail.body || "" }}
          />

          {openMail.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {openMail.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-primary/[0.04] hover:border-primary/30 transition-colors bg-white dark:bg-slate-900"
                >
                  <div className="w-9 h-9 bg-primary/5 dark:bg-primary/10 rounded-lg flex items-center justify-center">
                    <Download className="w-4 h-4 text-primary dark:text-teal-300" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                      {att.fileName}
                    </div>
                    {att.fileSize ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          )}

          {openMail.replies && openMail.replies.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">الردود</div>
              {openMail.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {authorLabel(reply)}
                    </span>
                    <span>·</span>
                    <span>{formatDate(reply.createdAt)}</span>
                  </div>
                  <div
                    className="mail-prose text-slate-800 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: reply.body || "" }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
              {rows.map(({ key, mail, isUnread, party }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openOne(mail.id)}
                    className={`w-full text-right flex items-start sm:items-center gap-3 px-3 sm:px-4 py-3 transition-colors hover:bg-primary/[0.04] ${
                      isUnread ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0 ${
                        isUnread ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`w-32 sm:w-40 shrink-0 truncate text-sm ${
                        isUnread
                          ? "font-bold text-slate-900 dark:text-white"
                          : "font-medium text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {party}
                    </span>
                    <span className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span
                        className={`truncate text-sm ${
                          isUnread ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"
                        }`}
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
                      {formatDate(mail.createdAt)}
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

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="نقل الرسالة إلى المهملات"
        message={`سيتم إخفاء «${deleteTarget?.subject || "(بدون موضوع)"}» من صندوق الوارد.`}
        confirmLabel="نقل إلى المهملات"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isPending={isDeleting}
        tone="danger"
      />
    </div>
  );
}
