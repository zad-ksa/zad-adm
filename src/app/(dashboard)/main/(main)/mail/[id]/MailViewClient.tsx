"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Reply,
  Forward,
  Trash2,
  Paperclip,
  Download,
  User,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import ComposeModal from "../ComposeModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { moveToTrash } from "@/app/actions/mail";
import Image from "next/image";
import { formatMailDate, htmlToPlainText } from "../mailUtils";

interface MailViewClientProps {
  session: any;
  mail: any;
  employees: any[];
}

type ThreadMessage = {
  id: string;
  senderId: string;
  sender: any;
  recipients: any[];
  body: string;
  attachments: any[];
  createdAt: string | Date;
};

export default function MailViewClient({ session, mail, employees }: MailViewClientProps) {
  const router = useRouter();
  const [replyTarget, setReplyTarget] = useState<ThreadMessage | null>(null);
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
        body: mail.body,
        attachments: mail.attachments,
        createdAt: mail.createdAt,
      },
      ...(mail.replies || []),
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

  return (
    <div className="mail-ui flex h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-6rem)] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-[var(--mail-shadow-card)] overflow-hidden flex-col">
      {/* Header / Toolbar */}
      <div className="h-12 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between px-2 sm:px-6 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="h-9 px-3 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 hover:bg-primary/[0.08] rounded-full transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-[length:var(--mail-fs-nav)] font-medium">العودة</span>
          </button>
          {messages.length > 1 && (
            <>
              <span className="h-6 px-2 rounded-full bg-primary/10 dark:bg-primary/15 text-primary dark:text-teal-300 text-[length:var(--mail-fs-meta)] font-semibold flex items-center">
                {messages.length} رسائل
              </span>
              <button
                onClick={() => (expanded.size >= messages.length ? collapseAll() : expandAll())}
                className="text-[length:var(--mail-fs-meta)] font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 px-2"
              >
                {expanded.size >= messages.length ? "طي الكل" : "توسيع الكل"}
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setIsConfirmDeleteOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/[0.10] transition-colors"
          title="نقل إلى المهملات"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {errorMessage && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-[length:var(--mail-fs-nav)] font-medium shrink-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Mail content */}
      {/* The body is the point of this screen — p-8 around it on a laptop was
          two inches of nothing on each side. */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-[length:var(--mail-fs-h1)] tracking-[var(--mail-tracking-h1)] font-semibold text-slate-900 dark:text-slate-100">
            {mail.subject || "(بدون موضوع)"}
          </h1>

          <div className="space-y-2">
            {messages.map((message) => (
              <ThreadMessageCard
                key={message.id}
                message={message}
                isExpanded={expanded.has(message.id)}
                onToggle={() => toggleExpanded(message.id)}
                onReply={() => setReplyTarget(message)}
                onForward={() => setForwardTarget(message)}
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
          replyTo={replyTarget}
          onSuccess={() => {
            setReplyTarget(null);
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
          onSuccess={() => setForwardTarget(null)}
        />
      )}

      <ConfirmModal
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
  onForward,
}: {
  message: ThreadMessage;
  isExpanded: boolean;
  onToggle: () => void;
  onReply: () => void;
  onForward: () => void;
}) {
  const toRecipients = (message.recipients || []).filter((r: any) => r.type === "TO");
  const ccRecipients = (message.recipients || []).filter((r: any) => r.type === "CC");

  if (!isExpanded) {
    return (
      <button
        onClick={onToggle}
        className="w-full h-12 px-4 flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-primary/[0.03] hover:shadow-[var(--mail-shadow-row-hover)] transition-all text-right"
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
          {message.sender?.avatarUrl ? (
            <Image src={message.sender.avatarUrl} alt={message.sender.name} width={24} height={24} className="object-cover w-full h-full" />
          ) : (
            <User className="w-3 h-3 text-primary dark:text-teal-300" />
          )}
        </div>
        <span className="font-semibold text-[length:var(--mail-fs-sender)] text-slate-800 dark:text-slate-200 shrink-0">
          {message.sender?.name}
        </span>
        <span className="truncate text-[length:var(--mail-fs-snippet)] text-slate-400 dark:text-slate-500">
          {htmlToPlainText(message.body).slice(0, 140)}
        </span>
        <span className="flex-1" />
        {message.attachments?.length > 0 && <Paperclip className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
        <span className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500 shrink-0">
          {formatMailDate(message.createdAt)}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/15 dark:border-primary/25 bg-white dark:bg-slate-900 shadow-[var(--mail-shadow-card)] p-3 sm:p-5">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <button onClick={onToggle} className="flex items-center gap-4 text-right">
          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            {message.sender?.avatarUrl ? (
              <Image src={message.sender.avatarUrl} alt={message.sender.name} width={40} height={40} className="object-cover w-full h-full" />
            ) : (
              <User className="w-5 h-5 text-primary dark:text-teal-300" />
            )}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-[length:var(--mail-fs-sender)]">{message.sender?.name}</div>
            <div className="text-[length:var(--mail-fs-meta)] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap mt-1">
              <span>إلى:</span>
              <span className="text-slate-600 dark:text-slate-300">{toRecipients.map((r: any) => r.employee.name).join("، ")}</span>
              {ccRecipients.length > 0 && (
                <>
                  <span className="mx-1">|</span>
                  <span>نسخة:</span>
                  <span className="text-slate-600 dark:text-slate-300">{ccRecipients.map((r: any) => r.employee.name).join("، ")}</span>
                </>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onReply}
            className="h-9 px-4 rounded-xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-teal-300 hover:bg-primary hover:text-white dark:hover:bg-primary transition-colors flex items-center gap-2 font-semibold text-[length:var(--mail-fs-meta)]"
          >
            <Reply className="w-3.5 h-3.5" />
            رد
          </button>
          <button
            onClick={onForward}
            className="h-9 px-4 rounded-xl bg-slate-100/70 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-2 font-semibold text-[length:var(--mail-fs-meta)]"
          >
            <Forward className="w-3.5 h-3.5" />
            إعادة توجيه
          </button>
          <span className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            {new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(
              new Date(message.createdAt)
            )}
          </span>
        </div>
      </div>

      <hr className="my-4 border-slate-100 dark:border-slate-800" />

      <div className="mail-prose text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: message.body }} />

      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[length:var(--mail-fs-meta)] font-medium text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Paperclip className="w-3.5 h-3.5" />
            المرفقات ({message.attachments.length})
          </h3>
          <div className="flex flex-wrap gap-3">
            {message.attachments.map((att: any) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-primary/[0.04] hover:border-primary/30 transition-colors group bg-white dark:bg-slate-900"
              >
                <div className="w-10 h-10 bg-primary/5 dark:bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Download className="w-4 h-4 text-primary dark:text-teal-300" />
                </div>
                <div>
                  <div className="text-[length:var(--mail-fs-nav)] font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{att.fileName}</div>
                  {att.fileSize && (
                    <div className="text-[length:var(--mail-fs-meta)] text-slate-500 dark:text-slate-400 mt-0.5">
                      {(att.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
