"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Download,
  Forward,
  Paperclip,
  Reply,
  ReplyAll,
  Trash2,
} from "lucide-react";
import ComposeModal from "../ComposeModal";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { Avatar, Badge, MONO, Note, btn, cx, toolbarClass } from "@/components/console/ui";
import { moveToTrash } from "@/app/actions/mail";
import { formatMailDate, htmlToPlainText, splitQuotedHtml } from "../mailUtils";

interface MailViewClientProps {
  session: any;
  mail: any;
  employees: any[];
}

type RecipientRow = {
  employeeId: string | null;
  type: string;
  employee?: { name: string } | null;
  /** الطرف الآخر قد يكون عضو جمعية، فأحد الحقلين مملوء والآخر فارغ. */
  charityUserId?: string | null;
  charityUser?: { name: string } | null;
};

/** اسم المستلم أياً كانت جهته. بلا هذا كان صفّ عضو الجمعية يُقرأ كـ undefined.name. */
function partyName(r: RecipientRow) {
  return r.employee?.name || r.charityUser?.name || "—";
}

type ThreadMessage = {
  id: string;
  senderId: string;
  sender: any;
  recipients: RecipientRow[];
  subject: string;
  body: string;
  attachments: any[];
  createdAt: string | Date;
  /** هوية البريد بين زاد وجمعية: الجمعية الطرف، والخدمة التي خرج باسمها. */
  senderCharityUser?: { id: string; name: string } | null;
  charity?: { id: string; name: string } | null;
  serviceName?: string | null;
};

/**
 * شاشةُ قراءةِ رسالةٍ ومحادثتها — بعدّة اللوحة.
 *
 * وكانت تُرسم بتدرّجٍ لونيٍّ في شريطها، وأزرارٍ بزوايا `rounded-xl` وخلفيّةٍ
 * شفّافةٍ من لون الهوية، وسُلّمِ خطٍّ خاصٍّ بالبريد — فبدت من مشروعٍ آخر.
 */
export default function MailViewClient({ session, mail, employees }: MailViewClientProps) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = useState<{ message: ThreadMessage; all: boolean } | null>(null);
  const [forwardTarget, setForwardTarget] = useState<ThreadMessage | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messages: ThreadMessage[] = useMemo(
    () => [
      {
        id: mail.id,
        senderId: mail.senderId,
        sender: mail.sender,
        recipients: mail.recipients,
        subject: mail.subject,
        body: mail.body,
        attachments: mail.attachments,
        createdAt: mail.createdAt,
        senderCharityUser: mail.senderCharityUser,
        charity: mail.charity,
        serviceName: mail.serviceName,
      },
      // Replies inherit the thread's subject so a reply-to-a-reply is titled
      // from the conversation rather than from an empty field.
      ...(mail.replies || []).map((r: ThreadMessage) => ({ ...r, subject: r.subject || mail.subject })),
    ],
    [mail]
  );

  const lastMessageId = messages[messages.length - 1]?.id;
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([lastMessageId, mail.openedId].filter(Boolean))
  );

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(messages.map((m) => m.id)));
  const collapseAll = () => setExpanded(new Set([lastMessageId]));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await moveToTrash(mail.id);
      router.push("/main/mail");
    } catch (error) {
      console.error(error);
      setErrorMessage("حدث خطأ أثناء حذف الرسالة");
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const allExpanded = expanded.size >= messages.length;

  return (
    <div className="flex h-[calc(100dvh-6rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-7.5rem)] dark:border-slate-800 dark:bg-slate-900">
      <div className={toolbarClass}>
        <button type="button" onClick={() => router.back()} className={btn.ghost}>
          <ArrowRight className="size-4" />
          العودة
        </button>

        {messages.length > 1 && (
          <>
            <Badge tone="brand">{messages.length} رسائل</Badge>
            <button type="button" onClick={() => (allExpanded ? collapseAll() : expandAll())} className={btn.ghost}>
              {allExpanded ? "طي الكل" : "توسيع الكل"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsConfirmDeleteOpen(true)}
          className={cx(btn.iconDanger, "ms-auto")}
          title="نقل إلى المهملات"
          aria-label="نقل إلى المهملات"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {errorMessage && (
        <div className="mx-3 mt-3 shrink-0 sm:mx-6">
          <Note tone="danger">{errorMessage}</Note>
        </div>
      )}

      {/* Mail content */}
      {/* The body is the point of this screen — p-8 around it on a laptop was
          two inches of nothing on each side. */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <h1 className="text-section font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {mail.subject || "(بدون موضوع)"}
          </h1>

          <div className="space-y-2">
            {messages.map((message) => (
              <ThreadMessageCard
                key={message.id}
                message={message}
                isExpanded={expanded.has(message.id)}
                onToggle={() => toggleExpanded(message.id)}
                onReply={() => setReplyTarget({ message, all: false })}
                onReplyAll={() => setReplyTarget({ message, all: true })}
                onForward={() => setForwardTarget(message)}
                currentUserId={session?.id}
              />
            ))}
          </div>
        </div>
      </div>

      {replyTarget && (
        <ComposeModal
          isOpen={!!replyTarget}
          onClose={() => setReplyTarget(null)}
          employees={employees}
          replyTo={replyTarget.message}
          replyAll={replyTarget.all}
          currentUserId={session?.id}
          onSuccess={(result) => {
            setReplyTarget(null);
            // ردٌّ إلى جمعية وقف عند معمِّده: مكانه تبويب الانتظار، لا هذه الصفحة.
            if (result?.pending) {
              router.push("/main/mail?tab=approvals");
              return;
            }
            router.refresh();
          }}
        />
      )}

      {forwardTarget && (
        <ComposeModal
          isOpen={!!forwardTarget}
          onClose={() => setForwardTarget(null)}
          employees={employees}
          forwardMail={forwardTarget}
          currentUserId={session?.id}
          onSuccess={() => setForwardTarget(null)}
        />
      )}

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="نقل إلى المهملات"
        message="هل أنت متأكد من نقل هذه الرسالة إلى المهملات؟"
        onCancel={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  );
}

function ThreadMessageCard({
  message,
  isExpanded,
  onToggle,
  onReply,
  onReplyAll,
  onForward,
  currentUserId,
}: {
  message: ThreadMessage;
  isExpanded: boolean;
  onToggle: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  currentUserId?: string;
}) {
  const toRecipients: RecipientRow[] = (message.recipients || []).filter((r: RecipientRow) => r.type === "TO");
  const ccRecipients: RecipientRow[] = (message.recipients || []).filter((r: RecipientRow) => r.type === "CC");

  /**
   * Blind copies. The server has already stripped every row the viewer may
   * not see (stripHiddenBcc), so what arrives here is either the whole list —
   * because this is the sender's own copy — or the viewer's single row.
   */
  const bccRecipients: RecipientRow[] = (message.recipients || []).filter(
    (r: RecipientRow) => r.type === "BCC"
  );
  const isSender = message.senderId === currentUserId;

  /**
   * Who to name on the "إلى" line.
   *
   * A blind-copy-only message has no visible recipient at all, and the line
   * used to render as a bare "إلى:" followed by nothing. For the reader the
   * honest answer is their own name — as far as they can tell, and as far as
   * this message is willing to say, they are the only one who got it.
   */
  const addressedTo =
    toRecipients.length > 0
      ? toRecipients.map(partyName)
      : bccRecipients
          .filter((r) => r.employeeId === currentUserId)
          .map(partyName);

  // "Reply all" only earns its place when there is somebody else to include.
  const otherPeople = [...toRecipients, ...ccRecipients].filter(
    (r: RecipientRow) => r.employeeId !== currentUserId && r.employeeId !== message.senderId
  );
  // في محادثة الخدمة «ردّ» يصل الفريقين كاملين أصلاً، فلا معنى لزرٍّ ثانٍ.
  const canReplyAll = otherPeople.length > 0 && !(message.charity && message.serviceName);

  // The quoted history is split off the body so it collapses behind a control,
  // instead of repeating the whole conversation under every reply.
  const [mainBody, quotedBody] = splitQuotedHtml(message.body || "");

  // الطرف الذي كتب الرسالة: موظف زاد، أو عضو جمعيةٍ يُسبق اسمه باسم جمعيته.
  const senderLabel = message.senderCharityUser
    ? message.charity
      ? message.charity.name + " | " + message.senderCharityUser.name
      : message.senderCharityUser.name
    : message.sender?.name || "غير معروف";
  const [showQuoted, setShowQuoted] = useState(false);

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "flex h-12 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-right transition-colors",
          "hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40",
          "outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
      >
        <Avatar name={senderLabel} src={message.sender?.avatarUrl} size="sm" />
        <span className="shrink-0 text-body font-semibold text-slate-800 dark:text-slate-200">{senderLabel}</span>
        <span className="truncate text-meta text-slate-400 dark:text-slate-500">
          {htmlToPlainText(mainBody).slice(0, 140)}
        </span>
        <span className="flex-1" />
        {message.attachments?.length > 0 && (
          <Paperclip className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        )}
        <span className={cx(MONO, "shrink-0 text-caption text-slate-400 dark:text-slate-500")}>
          {formatMailDate(message.createdAt)}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-300 dark:text-slate-600" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button type="button" onClick={onToggle} className="flex items-center gap-4 text-right">
          <Avatar name={senderLabel} src={message.sender?.avatarUrl} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2 text-body font-semibold text-slate-900 dark:text-slate-100">
              {senderLabel}
              {/* البريد بين زاد والجمعيات يخرج باسم خدمةٍ لا باسم كاتبه، فتُذكر الخدمة صراحةً. */}
              {message.serviceName && <Badge tone="brand">زاد | {message.serviceName}</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-slate-500 dark:text-slate-400">
              <span>إلى:</span>
              <span className="text-slate-600 dark:text-slate-300">
                {message.charity && message.recipients?.some((r) => r.charityUserId)
                  ? message.charity.name + (addressedTo.length > 0 ? " — " + addressedTo.join("، ") : "")
                  : addressedTo.length > 0
                    ? addressedTo.join("، ")
                    : "—"}
              </span>
              {ccRecipients.length > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <span>نسخة:</span>
                  <span className="text-slate-600 dark:text-slate-300">{ccRecipients.map(partyName).join("، ")}</span>
                </>
              )}
              {/* Only ever the sender: a recipient's copy contains their own
                  row and nobody else's, and naming them back to themselves
                  here would just repeat the line above. */}
              {isSender && bccRecipients.length > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <span>نسخة مخفية:</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {bccRecipients.map(partyName).join("، ")}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {/* «ردّ» هو الفعلُ المقصودُ من هذه الشاشة، فهو وحدَه الأوّلُ. */}
          <button type="button" onClick={onReply} className={btn.primary}>
            <Reply className="size-3.5" />
            رد
          </button>
          {canReplyAll && (
            <button
              type="button"
              onClick={onReplyAll}
              title={`رد على الكل (${otherPeople.length + 1})`}
              className={btn.secondary}
            >
              <ReplyAll className="size-3.5" />
              رد على الكل
            </button>
          )}
          <button type="button" onClick={onForward} className={btn.secondary}>
            <Forward className="size-3.5" />
            إعادة توجيه
          </button>
          <span className={cx(MONO, "whitespace-nowrap text-caption text-slate-400 dark:text-slate-500")}>
            {new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
              new Date(message.createdAt)
            )}
          </span>
        </div>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      <div className="mail-prose text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: mainBody }} />

      {quotedBody && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowQuoted((v) => !v)}
            aria-expanded={showQuoted}
            title={showQuoted ? "إخفاء النص المقتبس" : "إظهار النص المقتبس"}
            className={cx(btn.ghost, "h-6 tracking-widest")}
          >
            •••
          </button>
          {showQuoted && (
            <div className="mail-prose mt-2 text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: quotedBody }} />
          )}
        </div>
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 flex items-center gap-2 text-meta font-medium text-slate-600 dark:text-slate-300">
            <Paperclip className="size-3.5" />
            المرفقات ({message.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-3">
            {message.attachments.map((att: any) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className={cx(
                  "group flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors",
                  "hover:border-primary/30 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40",
                  "outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 transition-colors group-hover:text-primary dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-teal-300">
                  <Download className="size-4" />
                </span>
                <span className="block">
                  <span className="block max-w-[200px] truncate text-body font-medium text-slate-900 dark:text-slate-100">
                    {att.fileName}
                  </span>
                  {att.fileSize && (
                    <span className={cx(MONO, "mt-0.5 block text-caption text-slate-500 dark:text-slate-400")}>
                      {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
