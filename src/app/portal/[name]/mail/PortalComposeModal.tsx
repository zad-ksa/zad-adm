"use client";

import { useRef, useState } from "react";
import Select from "@/components/console/Select";
import dynamic from "next/dynamic";
import {
  X,
  Send,
  Paperclip,
  Check,
  RotateCw,
  AlertTriangle,
  LoaderCircle,
  Users,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { sendPortalMail } from "@/app/actions/charityMail";
import { uploadFile } from "@/lib/clientUpload";
import { maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";

const MailRichTextEditor = dynamic(
  () => import("@/app/(dashboard)/main/(main)/mail/MailRichTextEditor"),
  { ssr: false, loading: () => <div className="flex-1 min-h-[220px]" /> }
);

const MAX_ATTACHMENT_BYTES = maxBytesFor("mail_attachment");
const MAX_ATTACHMENT_LABEL = maxLabelFor("mail_attachment");

/** ردٌّ على رسالةٍ قائمة: الجهة مُثبَّتة، فلا يُعاد اختيارها. */
export type ReplyTarget = {
  parentId: string;
  subject: string;
  /** إلى أين يعود الردّ، ومعه ما يُعرَّف به الطرف في الترويسة. */
  label: string;
} & (
  | { kind: "COLLEAGUES"; toIds: string[] }
  | { kind: "SERVICE"; serviceName: string }
);

type AttachmentItem = {
  key: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "done" | "error";
  percent?: number;
  fileUrl?: string;
  error?: string;
};

function attachmentKey() {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} مB`;
}

/** رسالةٌ أُرجعت من معمِّدها، تُفتح كما كُتبت ليصحّحها صاحبها ويرسلها. */
export type ResendTarget = {
  id: string;
  subject: string;
  body: string;
  kind: "COLLEAGUES" | "SERVICE";
  toIds: string[];
  serviceName: string;
  /** ردٌّ أُرجع: يبقى معلّقاً بسلسلته عند إعادة الإرسال. */
  parentId: string | null;
};

export default function PortalComposeModal({
  charityName,
  colleagues,
  services,
  replyTarget,
  resendTarget,
  willAwaitApproval,
  onClose,
  onSent,
}: {
  charityName: string;
  colleagues: { id: string; name: string; title: string }[];
  services: string[];
  replyTarget: ReplyTarget | null;
  resendTarget?: ResendTarget | null;
  willAwaitApproval?: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const isReply = !!replyTarget;
  const [kind, setKind] = useState<"COLLEAGUES" | "SERVICE">(
    replyTarget?.kind ?? resendTarget?.kind ?? "COLLEAGUES"
  );
  const [toIds, setToIds] = useState<string[]>(
    replyTarget && replyTarget.kind === "COLLEAGUES"
      ? replyTarget.toIds
      : (resendTarget?.toIds ?? [])
  );
  const [serviceName, setServiceName] = useState<string>(
    replyTarget && replyTarget.kind === "SERVICE"
      ? replyTarget.serviceName
      : resendTarget?.serviceName
        ? resendTarget.serviceName
        : services.length === 1
          ? services[0]
          : ""
  );
  const [subject, setSubject] = useState(
    replyTarget ? `رد: ${replyTarget.subject}` : (resendTarget?.subject ?? "")
  );
  const [body, setBody] = useState(resendTarget?.body ?? "");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadingCount = attachments.filter((a) => a.status === "uploading").length;
  const failedCount = attachments.filter((a) => a.status === "error").length;

  const patchAttachment = (key: string, patch: Partial<AttachmentItem>) => {
    setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const uploadOne = async (key: string, file: File) => {
    try {
      const data = await uploadFile(file, "mail_attachment", (percent) =>
        patchAttachment(key, { percent })
      );
      patchAttachment(key, { status: "done", fileUrl: data.url, percent: 100, error: undefined });
    } catch (err) {
      patchAttachment(key, {
        status: "error",
        error: err instanceof Error ? err.message : "تعذّر رفع الملف",
      });
    }
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const key = attachmentKey();
      const tooBig = file.size > MAX_ATTACHMENT_BYTES;
      setAttachments((prev) => [
        ...prev,
        {
          key,
          fileName: file.name,
          fileSize: file.size,
          // يُرفض هنا كما يُرفض على الخادم، فلا ينتظر المستخدم رفعاً محكوماً بالفشل.
          status: tooBig ? "error" : "uploading",
          error: tooBig ? `حجم الملف يتجاوز ${MAX_ATTACHMENT_LABEL}` : undefined,
        },
      ]);
      if (!tooBig) uploadOne(key, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (kind === "COLLEAGUES" && toIds.length === 0) {
      setErrorMessage("اختر مستلماً واحداً على الأقل");
      return;
    }
    if (kind === "SERVICE" && !serviceName) {
      setErrorMessage("اختر الخدمة التي تريد مراسلتها");
      return;
    }
    if (uploadingCount > 0) {
      setErrorMessage("انتظر حتى يكتمل رفع المرفقات");
      return;
    }
    if (failedCount > 0) {
      setErrorMessage("بعض المرفقات لم تُرفع — أزلها أو أعد المحاولة قبل الإرسال");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPortalMail(charityName, {
        subject: subject || "(بدون موضوع)",
        body,
        kind,
        toIds: kind === "COLLEAGUES" ? toIds : undefined,
        serviceName: kind === "SERVICE" ? serviceName : undefined,
        parentId: replyTarget?.parentId ?? resendTarget?.parentId ?? undefined,
        resendOf: resendTarget?.id,
        attachments: attachments
          .filter((a) => a.status === "done")
          .map((a) => ({ fileUrl: a.fileUrl as string, fileName: a.fileName, fileSize: a.fileSize })),
      });
      onSent();
    } catch (error) {
      // سبب الرفض من الخادم — «لست مفوَّضاً بهذه الخدمة» وأمثاله — أنفع من عبارةٍ عامة.
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "تعذّر إرسال الرسالة"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mail-ui fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xl w-full sm:max-w-3xl h-[92dvh] sm:h-[640px] sm:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isReply ? "الرد على رسالة" : resendTarget ? "تعديل رسالةٍ أُرجعت" : "رسالة جديدة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/[0.08] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-sm font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 divide-y divide-slate-100 dark:divide-slate-800 shrink-0">
            {isReply ? (
              <div className="py-3 flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">إلى</div>
                <span className="h-7 px-3 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 text-xs font-medium">
                  {replyTarget?.label}
                </span>
              </div>
            ) : (
              <>
                <div className="py-3 flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">الجهة</div>
                  <div className="flex items-center p-0.5 gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                    {([
                      { key: "COLLEAGUES" as const, label: "زملاء الجمعية", Icon: Users },
                      { key: "SERVICE" as const, label: "خدمة من زاد", Icon: Building2 },
                    ]).map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setKind(key)}
                        className={`flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-xs font-medium transition-colors ${
                          kind === key
                            ? "bg-white dark:bg-slate-900 text-primary dark:text-teal-300 shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {kind === "COLLEAGUES" ? (
                  <div className="py-3 flex items-start gap-4">
                    <div className="w-16 pt-1 text-sm font-medium text-slate-500 dark:text-slate-400">إلى</div>
                    <div className="flex-1 flex flex-wrap gap-2 items-center min-h-10">
                      {toIds.map((id) => {
                        const person = colleagues.find((c) => c.id === id);
                        return person ? (
                          <span
                            key={id}
                            className="h-6 px-2 rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 flex items-center gap-1 text-xs font-medium"
                          >
                            {person.name}
                            <button
                              type="button"
                              onClick={() => setToIds(toIds.filter((i) => i !== id))}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                      <Select
                        variant="soft"
                        onSelect={(id) => setToIds([...toIds, id])}
                        placeholder={toIds.length === 0 ? "اختر المستلمين…" : "إضافة مستلم…"}
                        emptyLabel="لا زملاء في هذه الجمعية بعد"
                        options={colleagues
                          .filter((c) => !toIds.includes(c.id))
                          .map((c) => ({ value: c.id, label: c.name }))}
                        className="flex-1 min-w-[150px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-3 flex items-start gap-4">
                    <div className="w-16 pt-1 text-sm font-medium text-slate-500 dark:text-slate-400">الخدمة</div>
                    <div className="flex-1 flex items-center min-h-10">
                      {services.length === 0 ? (
                        <span className="text-sm text-rose-600 dark:text-rose-400">
                          لم تُفوَّض بأي خدمة من زاد بعد — راجع مدير الجمعية
                        </span>
                      ) : services.length === 1 ? (
                        // خدمةٌ واحدة لا اختيار فيها، فتُعرض مثبَّتة.
                        <span className="h-7 px-3 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 text-xs font-medium">
                          زاد | {services[0]}
                        </span>
                      ) : (
                        <Select
                          variant="soft"
                          value={serviceName}
                          onSelect={setServiceName}
                          placeholder="اختر الخدمة…"
                          options={services.map((name) => ({ value: name, label: name }))}
                          className="flex-1"
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="py-3 flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-slate-500 dark:text-slate-400">الموضوع</div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع الرسالة"
                className="flex-1 bg-transparent border-none outline-none text-base font-semibold text-slate-900 dark:text-slate-100 py-2 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          <MailRichTextEditor value={body} onChange={setBody} />

          {attachments.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap gap-2 shrink-0 max-h-32 overflow-y-auto">
              {attachments.map((att) => (
                <div
                  key={att.key}
                  className={`flex items-center gap-2 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-xl text-xs font-medium ${
                    att.status === "error"
                      ? "border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                  title={att.error || att.fileName}
                >
                  {att.status === "uploading" && (
                    <>
                      <LoaderCircle className="w-3 h-3 animate-spin text-primary shrink-0" />
                      {att.percent !== undefined && <span className="text-primary shrink-0">{att.percent}%</span>}
                    </>
                  )}
                  {att.status === "done" && <Check className="w-3 h-3 text-primary shrink-0" />}
                  {att.status === "error" && <AlertTriangle className="w-3 h-3 shrink-0" />}
                  <span className="truncate max-w-[150px]">{att.fileName}</span>
                  {att.status === "error" ? (
                    <span className="font-normal">— {att.error}</span>
                  ) : (
                    att.fileSize > 0 && (
                      <span className="text-slate-400 dark:text-slate-500 font-normal">{formatBytes(att.fileSize)}</span>
                    )
                  )}
                  {att.status === "error" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachments((prev) => prev.filter((a) => a.key !== att.key));
                        fileInputRef.current?.click();
                      }}
                      className="text-slate-400 hover:text-primary"
                      title="إعادة المحاولة"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.key !== att.key))}
                    className="text-slate-400 hover:text-rose-500"
                    title="إزالة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
          {willAwaitApproval && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 me-auto order-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              تقف الرسالة عند معمِّد الجمعية قبل أن تخرج
            </span>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-primary/[0.08] hover:text-primary rounded-full transition-colors"
            title="إرفاق ملف"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
            className="hidden"
            multiple
          />

          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              uploadingCount > 0 ||
              failedCount > 0 ||
              (kind === "COLLEAGUES" ? toIds.length === 0 : !serviceName)
            }
            className="flex items-center gap-2 h-11 px-6 text-white bg-primary hover:bg-primary/90 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {willAwaitApproval ? "إرسال للتعميد" : "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
