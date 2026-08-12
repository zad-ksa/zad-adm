"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X, Paperclip, Send, Loader2, AlertTriangle, Minus, Maximize2, Trash2 } from "lucide-react";
import { sendMail, saveDraft, deleteDraft } from "@/app/actions/mail";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { isHtmlBody, htmlToPlainText } from "./mailUtils";

const MailRichTextEditor = dynamic(() => import("./MailRichTextEditor"), {
  ssr: false,
  loading: () => <div className="flex-1 min-h-[240px]" />,
});

const AUTOSAVE_DELAY_MS = 1500;

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  onSuccess: () => void;
  replyTo?: any; // Mail object if it's a reply
  forwardMail?: any; // Mail object if it's a forward
  draft?: any; // Existing draft row (InternalMail with isDraft: true) being reopened
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildQuoteHtml(source: any, kind: "reply" | "forward"): string {
  const originalBody = source.body || "";
  const safeBody = isHtmlBody(originalBody) ? originalBody : escapeHtml(originalBody).replace(/\n/g, "<br/>");
  const date = new Date(source.createdAt).toLocaleString("ar-SA");
  const head =
    kind === "reply"
      ? `في ${date}، كتب ${source.sender?.name || ""}:`
      : `--- رسالة معاد توجيهها --- من: ${source.sender?.name || ""}، التاريخ: ${date}، الموضوع: ${source.subject || ""}`;

  return `<p></p><div class="mail-quote"><p class="mail-quote-head">${escapeHtml(head)}</p><blockquote>${safeBody}</blockquote></div>`;
}

export default function ComposeModal({ isOpen, onClose, employees, onSuccess, replyTo, forwardMail, draft }: ComposeModalProps) {
  const roleLabels = useRoleLabels();

  const [toIds, setToIdsRaw] = useState<string[]>(draft?.draftToIds || (replyTo ? [replyTo.senderId] : []));
  const [ccIds, setCcIdsRaw] = useState<string[]>(draft?.draftCcIds || []);
  const [bccIds, setBccIdsRaw] = useState<string[]>(draft?.draftBccIds || []);

  const [showCc, setShowCc] = useState((draft?.draftCcIds?.length || 0) > 0);
  const [showBcc, setShowBcc] = useState((draft?.draftBccIds?.length || 0) > 0);

  const initialSubject = draft
    ? draft.subject || ""
    : replyTo
      ? `رد: ${replyTo.subject}`
      : forwardMail
        ? `إعادة توجيه: ${forwardMail.subject}`
        : "";

  const initialBody = draft
    ? draft.body || ""
    : replyTo
      ? buildQuoteHtml(replyTo, "reply")
      : forwardMail
        ? buildQuoteHtml(forwardMail, "forward")
        : "";

  const [subject, setSubjectRaw] = useState(initialSubject);
  const [body, setBodyRaw] = useState(initialBody);

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftIdRef = useRef<string | undefined>(draft?.id);
  const hasEditedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDoneRef = useRef(false); // true once sent or discarded — stop autosaving after that

  const markEdited = () => {
    hasEditedRef.current = true;
  };
  const setToIds = (ids: string[]) => { markEdited(); setToIdsRaw(ids); };
  const setCcIds = (ids: string[]) => { markEdited(); setCcIdsRaw(ids); };
  const setBccIds = (ids: string[]) => { markEdited(); setBccIdsRaw(ids); };
  const setSubject = (v: string) => { markEdited(); setSubjectRaw(v); };
  const setBody = (v: string) => { markEdited(); setBodyRaw(v); };

  const flushSave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (isDoneRef.current || !hasEditedRef.current) return;
    const hasContent = subject.trim() || htmlToPlainText(body).trim() || toIds.length > 0;
    if (!hasContent) return;

    try {
      const saved = await saveDraft({
        id: draftIdRef.current,
        subject,
        body,
        toIds,
        ccIds,
        bccIds,
      });
      draftIdRef.current = saved.id;
    } catch (error) {
      console.error("Error autosaving draft:", error);
    }
  };

  // Debounced autosave while the user is actively editing
  useEffect(() => {
    if (!hasEditedRef.current || isDoneRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      flushSave();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, toIds, ccIds, bccIds]);

  // Best-effort save if the component is unmounted without going through handleClose
  // (e.g. the parent navigates away while this modal is still mounted).
  useEffect(() => {
    return () => {
      flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) return null;

  const uploadFiles = async (files: File[]) => {
    const uploadedAttachments: { fileUrl: string; fileName: string; fileSize: number }[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        uploadedAttachments.push({
          fileUrl: data.url,
          fileName: file.name,
          fileSize: file.size,
        });
      }
    }

    // Also include forward attachments if forwarding
    if (forwardMail && forwardMail.attachments) {
      for (const att of forwardMail.attachments) {
        uploadedAttachments.push({
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileSize: att.fileSize,
        });
      }
    }

    return uploadedAttachments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (toIds.length === 0) {
      setErrorMessage("يجب تحديد مستلم واحد على الأقل");
      return;
    }

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setIsSubmitting(true);
    try {
      const uploadedAttachments = await uploadFiles(attachments);

      await sendMail({
        subject: subject || "(بدون موضوع)",
        body,
        toIds,
        ccIds,
        bccIds,
        attachments: uploadedAttachments,
        parentId: replyTo?.id || undefined,
        draftId: draftIdRef.current,
      });

      isDoneRef.current = true;
      onSuccess();
    } catch (error) {
      console.error("Error sending mail:", error);
      setErrorMessage("حدث خطأ أثناء إرسال الرسالة");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMinimize = () => {
    flushSave();
    setIsMinimized(true);
  };

  const handleClose = () => {
    flushSave();
    onClose();
  };

  const handleDiscard = async () => {
    isDoneRef.current = true;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (draftIdRef.current) {
      try {
        await deleteDraft(draftIdRef.current);
      } catch (error) {
        console.error("Error discarding draft:", error);
      }
    }
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      markEdited();
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Helper for rendering employee multi-select
  const renderEmployeeSelect = (selectedIds: string[], setIds: (ids: string[]) => void, placeholder: string) => (
    <div className="flex flex-wrap gap-2 items-center w-full">
      {selectedIds.map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? (
          <div
            key={id}
            className="h-6 px-2 bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 rounded-full flex items-center gap-1 text-[length:var(--mail-fs-meta)] font-medium"
          >
            {emp.name}
            <button type="button" onClick={() => setIds(selectedIds.filter((i) => i !== id))} className="text-primary/60 dark:text-teal-300/70 hover:text-primary dark:hover:text-teal-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : null;
      })}
      <select
        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[length:var(--mail-fs-nav)] min-w-[150px] text-slate-700 dark:text-slate-200 [&>option]:dark:bg-slate-800"
        value=""
        onChange={(e) => {
          if (e.target.value && !selectedIds.includes(e.target.value)) {
            setIds([...selectedIds, e.target.value]);
          }
        }}
      >
        <option value="" disabled>
          {selectedIds.length === 0 ? placeholder : "إضافة موظف..."}
        </option>
        {employees
          .filter((e) => !selectedIds.includes(e.id))
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} - {roleLabels[e.role] || e.role}
            </option>
          ))}
      </select>
    </div>
  );

  const title = replyTo ? "الرد على رسالة" : forwardMail ? "إعادة توجيه رسالة" : draft ? "متابعة المسودة" : "رسالة جديدة";

  if (isMinimized) {
    return (
      <div className="mail-ui fixed bottom-4 end-4 z-50 w-72">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full h-12 px-4 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-t-xl shadow-[var(--mail-shadow-modal)] text-right"
        >
          <span className="flex-1 truncate text-[length:var(--mail-fs-nav)] font-medium text-slate-700 dark:text-slate-200">
            {subject || "رسالة جديدة"}
          </span>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </span>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-rose-500/[0.10] hover:text-rose-500"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="mail-ui fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-[var(--mail-shadow-modal)] w-full max-w-3xl h-[85vh] sm:h-[680px] max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200/70 dark:border-slate-800 shrink-0">
          <h2 className="text-[length:var(--mail-fs-subject)] font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDiscard}
              title="حذف المسودة"
              className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-rose-500/[0.10] hover:text-rose-500 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleMinimize}
              title="تصغير"
              className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              title="إغلاق (تُحفظ كمسودة)"
              className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-[length:var(--mail-fs-nav)] font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 divide-y divide-slate-100 dark:divide-slate-800 shrink-0">
            {/* TO field */}
            <div className="py-3 flex items-start gap-4">
              <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">إلى</div>
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between min-h-10">
                  {renderEmployeeSelect(toIds, setToIds, "المستلمون...")}

                  <div className="flex gap-2 ms-2">
                    {!showCc && (
                      <button type="button" onClick={() => setShowCc(true)} className="text-[length:var(--mail-fs-meta)] font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 px-2">
                        نسخة (Cc)
                      </button>
                    )}
                    {!showBcc && (
                      <button type="button" onClick={() => setShowBcc(true)} className="text-[length:var(--mail-fs-meta)] font-medium text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-teal-300 px-2">
                        نسخة مخفية (Bcc)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CC field */}
            {showCc && (
              <div className="py-3 flex items-start gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">نسخة</div>
                <div className="flex-1 flex items-center min-h-10">{renderEmployeeSelect(ccIds, setCcIds, "نسخة إلى...")}</div>
              </div>
            )}

            {/* BCC field */}
            {showBcc && (
              <div className="py-3 flex items-start gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">نسخة مخفية</div>
                <div className="flex-1 flex items-center min-h-10">{renderEmployeeSelect(bccIds, setBccIds, "نسخة مخفية إلى...")}</div>
              </div>
            )}

            {/* Subject field */}
            <div className="py-3 flex items-center gap-4">
              <div className="w-16 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">الموضوع</div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع الرسالة"
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[length:var(--mail-fs-subject-input)] font-semibold text-slate-900 dark:text-slate-100 py-2 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Body field — rich text editor */}
          <MailRichTextEditor value={body} onChange={setBody} />

          {/* Attachments list */}
          {(attachments.length > 0 || (forwardMail && forwardMail.attachments?.length > 0)) && (
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap gap-2 shrink-0">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-[length:var(--mail-fs-meta)] font-medium text-slate-700 dark:text-slate-200">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {forwardMail?.attachments?.map((att: any, i: number) => (
                <div key={`fwd-${i}`} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-[length:var(--mail-fs-meta)] font-medium text-slate-700 dark:text-slate-200">
                  <span className="truncate max-w-[150px]">{att.fileName}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal">(مرفق مُعاد توجيهه)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-t border-slate-200/70 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-primary/[0.08] hover:text-primary dark:hover:text-teal-300 rounded-full transition-colors"
              title="إرفاق ملف"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || toIds.length === 0}
            className="flex items-center gap-2 h-11 px-6 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--mail-shadow-cta)] hover:shadow-[var(--mail-shadow-cta-hover)] active:translate-y-px rounded-xl font-semibold text-[length:var(--mail-fs-nav)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}
