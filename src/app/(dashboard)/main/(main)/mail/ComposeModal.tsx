"use client";

import { useEffect, useRef, useState } from "react";
import Select from "@/components/console/Select";
import dynamic from "next/dynamic";
import { X, Paperclip, Send, Loader2, AlertTriangle, Minus, Maximize2, Trash2, Check, RotateCw, Users, Building2, Undo2, ShieldCheck } from "lucide-react";
import {
  sendMail,
  saveDraft,
  deleteDraft,
  sendMailToCharities,
  getCharityMailOptions,
  replyToCharityMail,
} from "@/app/actions/mail";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { isHtmlBody, htmlToPlainText } from "./mailUtils";
import { uploadFile } from "@/lib/clientUpload";
import { maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import { CHARITY_MAIL_ENABLED } from "@/lib/featureFlags";

const MailRichTextEditor = dynamic(() => import("./MailRichTextEditor"), {
  ssr: false,
  loading: () => <div className="flex-1 min-h-[240px]" />,
});

const AUTOSAVE_DELAY_MS = 1500;

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  /**
   * تُستدعى بعد الإرسال، ومعها ما يحتاجه المُنادي ليعرف أين ذهبت الرسالة:
   * `pending` تعني أنها وقفت عند معمِّدها ولن تظهر في «المُرسَل».
   */
  onSuccess: (result?: { pending?: boolean }) => void;
  replyTo?: any; // Mail object if it's a reply
  replyAll?: boolean; // Reply keeps the original TO/CC instead of just the sender
  forwardMail?: any; // Mail object if it's a forward
  draft?: any; // Existing draft row (InternalMail with isDraft: true) being reopened
  currentUserId?: string; // so reply-all does not address you back to yourself
}

// Resolved from the shared table rather than restated here — the old copy
// said 25MB while the platform actually rejected anything over a few.
const MAX_ATTACHMENT_BYTES = maxBytesFor("mail_attachment");
const MAX_ATTACHMENT_LABEL = maxLabelFor("mail_attachment");

/**
 * An attachment as the composer sees it. Files are uploaded the moment they are
 * chosen rather than at send time, so the draft can hold them and so a rejected
 * file is reported while there is still something to do about it.
 */
type AttachmentItem = {
  key: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "done" | "error";
  /** 0–100 while uploading; large files need visible progress. */
  percent?: number;
  fileUrl?: string;
  error?: string;
};

function attachmentKey() {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Rows already stored on the server (a reopened draft, or a forwarded mail). */
function toUploadedItem(att: { fileUrl: string; fileName: string; fileSize?: number | null }): AttachmentItem {
  return {
    key: attachmentKey(),
    fileName: att.fileName,
    fileSize: att.fileSize ?? 0,
    status: "done",
    fileUrl: att.fileUrl,
  };
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} مB`;
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
      ? `في ${date}، كتب ${source.sender?.name || source.senderCharityUser?.name || ""}:`
      : `--- رسالة معاد توجيهها --- من: ${source.sender?.name || source.senderCharityUser?.name || ""}، التاريخ: ${date}، الموضوع: ${source.subject || ""}`;

  return `<p></p><div class="mail-quote"><p class="mail-quote-head">${escapeHtml(head)}</p><blockquote>${safeBody}</blockquote></div>`;
}

type RecipientRow = { employeeId: string; type: string };

/** جمعيةٌ مسنَدة، ومعها عدد المفوَّضين فيها بكل خدمة. */
type CharityOption = { id: string; name: string; counts: Record<string, number> };
type CharityMailOptions = {
  services: string[];
  needsApproval: string[];
  /** خدماتٌ بلا معمِّد: لا يخرج بريدها إلى الجمعيات. */
  noApprover: string[];
  charities: CharityOption[];
};

function recipientsLabel(n: number) {
  if (n === 0) return "لا مستلم";
  if (n === 1) return "مستلم واحد";
  if (n === 2) return "مستلمان";
  return `${n} مستلمين`;
}

function initialReplyRecipients(replyTo: any, replyAll: boolean, currentUserId?: string) {
  if (!replyTo) return { to: [] as string[], cc: [] as string[] };

  const isMe = (id: string) => id === currentUserId;
  // senderId فارغ حين يكون المرسِل عضو جمعية، فيُسقَط: صفُّ مستلمٍ بلا موظف
  // كان سيُرفض من قاعدة البيانات بعد أن كُتبت الرسالة كاملة.
  const to = [replyTo.senderId].filter((id): id is string => !!id && !isMe(id));

  if (!replyAll) return { to, cc: [] as string[] };

  // Everyone who was on the original TO line joins the reply, minus you and
  // minus the sender (already there). CC stays CC. BCC is absent from the
  // payload by design, so a blind copy is never revealed by replying to all.
  const recipients: RecipientRow[] = replyTo.recipients || [];
  for (const r of recipients) {
    if (r.type !== "TO") continue;
    if (isMe(r.employeeId) || to.includes(r.employeeId)) continue;
    to.push(r.employeeId);
  }
  const cc = recipients
    .filter((r) => r.type === "CC" && !isMe(r.employeeId) && !to.includes(r.employeeId))
    .map((r) => r.employeeId);

  return { to, cc };
}

export default function ComposeModal({ isOpen, onClose, employees, onSuccess, replyTo, replyAll = false, forwardMail, draft, currentUserId }: ComposeModalProps) {
  const roleLabels = useRoleLabels();

  const initialRecipients = initialReplyRecipients(replyTo, replyAll, currentUserId);

  const [toIds, setToIdsRaw] = useState<string[]>(draft?.draftToIds || initialRecipients.to);
  const [ccIds, setCcIdsRaw] = useState<string[]>(draft?.draftCcIds || initialRecipients.cc);
  const [bccIds, setBccIdsRaw] = useState<string[]>(draft?.draftBccIds || []);

  const [showCc, setShowCc] = useState((draft?.draftCcIds?.length || 0) > 0 || initialRecipients.cc.length > 0);
  const [showBcc, setShowBcc] = useState((draft?.draftBccIds?.length || 0) > 0);

  // الردّ وإعادة التوجيه يتبعان رسالتهما، فلا وجه لتبديل الجهة فيهما. والبريد
  // إلى الجمعيات مُقفَل بعلَمه، فلا يظهر مبدِّل الجهة أصلاً.
  const canAddressCharities = CHARITY_MAIL_ENABLED && !replyTo && !forwardMail;
  // ردٌّ في محادثة خدمةٍ مع جمعية — على رسالةٍ منها أو من زميلٍ في زاد، أو ردٌّ
  // أرجعه المعمِّد فعاد مسودة. الطرف مُثبَّت: فريق الخدمة في الجمعية، وزملاء
  // الكاتب نسخة. فلا مُنتقيات ولا نسخ يدوية.
  const charityReply: { id: string; charityName: string; serviceName: string } | null =
    replyTo?.charity && replyTo?.serviceName
      ? { id: replyTo.id, charityName: replyTo.charity.name, serviceName: replyTo.serviceName }
      : draft?.parentId && draft?.charityId && draft?.serviceName
        ? { id: draft.parentId, charityName: draft.charity?.name ?? "", serviceName: draft.serviceName }
        : null;
  const [audience, setAudienceRaw] = useState<"EMPLOYEES" | "CHARITIES">(
    (draft?.draftCharityIds?.length || 0) > 0 ? "CHARITIES" : "EMPLOYEES"
  );
  const [charityIds, setCharityIdsRaw] = useState<string[]>(draft?.draftCharityIds || []);
  const [serviceName, setServiceNameRaw] = useState<string>(draft?.serviceName || "");
  const [charityOptions, setCharityOptions] = useState<CharityMailOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  // الطلب مرةٌ واحدة لكل نافذة: مرجعٌ لا حالة، فتعليم الطلب لا يُعيد الرسم.
  const optionsRequestedRef = useRef(false);

  const initialSubject = draft
    ? draft.subject || ""
    : replyTo
      ? `رد: ${replyTo.subject ?? ""}`
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

  const [attachments, setAttachments] = useState<AttachmentItem[]>(() => [
    ...(draft?.attachments || []).map(toUploadedItem),
    ...(forwardMail?.attachments || []).map(toUploadedItem),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadingCount = attachments.filter((a) => a.status === "uploading").length;
  const failedCount = attachments.filter((a) => a.status === "error").length;

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
  const setCharityIds = (ids: string[]) => { markEdited(); setCharityIdsRaw(ids); };
  const setServiceName = (v: string) => { markEdited(); setServiceNameRaw(v); };
  const setAudience = (v: "EMPLOYEES" | "CHARITIES") => { markEdited(); setAudienceRaw(v); };

  // الردّ في محادثة خدمةٍ ليس «رسالةً جديدة إلى جمعيات»، ولو فُتح من مسودةٍ تحمل جمعية.
  const toCharities = audience === "CHARITIES" && !charityReply;
  const availableServices = charityOptions?.services ?? [];
  const charityList = charityOptions?.charities ?? [];
  const selectedCharities = charityList.filter((c) => charityIds.includes(c.id));
  // خدمةٌ لها معمِّد: الرسالة تُحفظ منتظرة ولا تصل الجمعية حتى تُعتمد.
  const willAwaitApproval =
    toCharities && !!serviceName && (charityOptions?.needsApproval ?? []).includes(serviceName);
  // التعميد إلزامي: خدمةٌ بلا معمِّد لا يُرسل بريدها، فيُمنع الزر ويُقال السبب.
  const serviceLacksApprover =
    toCharities && !!serviceName && (charityOptions?.noApprover ?? []).includes(serviceName);

  const flushSave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (isDoneRef.current || !hasEditedRef.current) return;
    // المسودة لا تحفظ مستلماً من جمعية، فحفظ هذا الردّ ينتج مسودةً بلا وجهة.
    if (charityReply) return;
    const uploaded = attachments.filter((a) => a.status === "done");
    const hasContent =
      subject.trim() ||
      htmlToPlainText(body).trim() ||
      toIds.length > 0 ||
      charityIds.length > 0 ||
      uploaded.length > 0;
    if (!hasContent) return;

    setSaveState("saving");
    try {
      const saved = await saveDraft({
        id: draftIdRef.current,
        subject,
        body,
        toIds,
        ccIds,
        bccIds,
        attachments: uploaded.map((a) => ({
          fileUrl: a.fileUrl as string,
          fileName: a.fileName,
          fileSize: a.fileSize,
        })),
        // الجهة المحفوظة هي الظاهرة الآن، فلا تعود المسودة بجمعياتٍ تُرك اختيارها.
        charityIds: toCharities ? charityIds : [],
        serviceName: toCharities ? serviceName || null : null,
      });
      draftIdRef.current = saved.id;
      setSaveState("saved");
    } catch (error) {
      console.error("Error autosaving draft:", error);
      setSaveState("idle");
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
  }, [subject, body, toIds, ccIds, bccIds, attachments, audience, charityIds, serviceName]);

  // The unmount cleanup below runs with the closure it was created with, which
  // would be the very first render's — saving an empty draft over a written
  // one. Pointing it at the latest flushSave through a ref updated in an effect
  // (never during render) keeps the cleanup honest.
  const flushSaveRef = useRef(flushSave);
  useEffect(() => {
    flushSaveRef.current = flushSave;
  });

  // Best-effort save if the component is unmounted without going through handleClose
  // (e.g. the parent navigates away while this modal is still mounted).
  useEffect(() => {
    return () => {
      flushSaveRef.current();
    };
  }, []);

  // الجمعيات والخدمات تُجلب عند الحاجة إليها لا مع كل فتح للنافذة: أكثر البريد
  // داخليٌّ بين الموظفين، ولا وجه لاستعلامٍ لا يُقرأ.
  useEffect(() => {
    if (!isOpen || !toCharities || optionsRequestedRef.current) return;
    optionsRequestedRef.current = true;
    let cancelled = false;
    getCharityMailOptions()
      .then((data) => {
        if (cancelled) return;
        setCharityOptions(data);
        // خدمةٌ واحدة لا اختيار فيها، فتُثبَّت ولا يُسأل عنها.
        if (data.services.length === 1) setServiceNameRaw(data.services[0]);
      })
      .catch(() => {
        if (!cancelled) setOptionsFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, toCharities]);

  if (!isOpen) return null;

  const patchAttachment = (key: string, patch: Partial<AttachmentItem>) => {
    setAttachments((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  /**
   * Uploads one file and records the outcome on its row.
   *
   * The previous version ran every upload inside the send handler and skipped
   * anything the server rejected, so a file over the size cap or with a
   * disallowed extension vanished without a word and the mail went out without
   * it. Now the rejection reason from /api/upload is kept and shown.
   */
  const uploadOne = async (key: string, file: File) => {
    try {
      // Straight to Cloudinary now, so the ceiling is the one advertised
      // rather than the serverless request-body limit that silently
      // truncated it.
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
    if (!files.length) return;
    markEdited();

    for (const file of files) {
      const key = attachmentKey();
      const tooBig = file.size > MAX_ATTACHMENT_BYTES;

      setAttachments((prev) => [
        ...prev,
        {
          key,
          fileName: file.name,
          fileSize: file.size,
          // Checked here as well as on the server so an oversized file fails
          // instantly instead of after a long doomed upload.
          status: tooBig ? "error" : "uploading",
          error: tooBig ? `حجم الملف يتجاوز ${MAX_ATTACHMENT_LABEL}` : undefined,
        },
      ]);

      if (!tooBig) uploadOne(key, file);
    }
  };

  const retryAttachment = (key: string) => {
    const input = fileInputRef.current;
    if (input) input.value = "";
    // The File object is gone once the input is cleared, so a retry means
    // picking the file again — the row is removed to make that unambiguous.
    setAttachments((prev) => prev.filter((a) => a.key !== key));
    input?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (charityReply) {
      // لا شرط على المستلم: هو معروفٌ من الرسالة الأصلية.
    } else if (toCharities) {
      if (charityIds.length === 0) {
        setErrorMessage("اختر جمعيةً واحدة على الأقل");
        return;
      }
      if (!serviceName) {
        setErrorMessage("اختر الخدمة التي يتبع لها البريد");
        return;
      }
      if (serviceLacksApprover) {
        setErrorMessage(
          `لا يوجد معمِّد لخدمة «${serviceName}» — لا يُرسل بريدٌ إلى الجمعيات بلا تعميد. راجع مسؤول النظام`
        );
        return;
      }
      // جمعيةٌ لم تُفوِّض أحداً بهذه الخدمة لا مستلم لها — يُقال ذلك قبل الإرسال
      // لا بعده، والخادم يرفضه كذلك.
      const empty = selectedCharities.filter((c) => (c.counts[serviceName] ?? 0) === 0);
      if (empty.length > 0) {
        setErrorMessage(
          `لا أحد مفوَّض بـ«${serviceName}» في: ${empty.map((c) => c.name).join("، ")}`
        );
        return;
      }
    } else if (toIds.length + ccIds.length + bccIds.length === 0) {
      // Any of the three counts. A blind-copy-only message needs nobody in the
      // open — that is the whole point of it.
      setErrorMessage("يجب تحديد مستلم واحد على الأقل");
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

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    setIsSubmitting(true);
    try {
      const uploadedAttachments = attachments
        .filter((a) => a.status === "done")
        .map((a) => ({ fileUrl: a.fileUrl as string, fileName: a.fileName, fileSize: a.fileSize }));

      let sendResult: { pending?: boolean } | undefined;

      if (charityReply) {
        sendResult = await replyToCharityMail({
          parentId: charityReply.id,
          subject: subject || "(بدون موضوع)",
          body,
          attachments: uploadedAttachments,
          // ردٌّ مُرجَع أُعيد فتحه من المسودات: تُزال المسودة بعد إرساله.
          draftId: draft ? draftIdRef.current : undefined,
        });
      } else if (toCharities) {
        sendResult = await sendMailToCharities({
          subject: subject || "(بدون موضوع)",
          body,
          charityIds,
          serviceName,
          attachments: uploadedAttachments,
          draftId: draftIdRef.current,
        });
      } else {
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
      }

      isDoneRef.current = true;
      onSuccess(sendResult);
    } catch (error) {
      console.error("Error sending mail:", error);
      // سبب الرفض من الخادم مفيد: «لا تملك هذه الخدمة»، «ليست مسنَدة إليك» —
      // وابتلاعه في عبارةٍ عامة يترك المرسِل يخمّن.
      setErrorMessage(
        error instanceof Error && error.message ? error.message : "حدث خطأ أثناء إرسال الرسالة"
      );
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
    addFiles(Array.from(e.target.files || []));
    e.target.value = ""; // so picking the same file twice in a row still fires
  };

  // Ctrl+V يرفق صورة أو أي ملف كان في الحافظة (نسخته من مستكشف الملفات مثلاً) —
  // بنفس مسار "إرفاق ملف" تماماً. على مستوى document لا عنصر بعينه، لأن حدث
  // paste يصعد من العنصر المُركَّز فقط وقد لا يكون أي عنصر داخل النافذة مُركَّزاً.
  // لا يمسّ لصق النص العادي في الموضوع أو المحرر: لا يتدخّل ولا يستدعي
  // preventDefault إلا حين تحتوي الحافظة فعلاً على ملف.
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeAttachment = (key: string) => {
    markEdited();
    setAttachments((prev) => prev.filter((a) => a.key !== key));
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
      <Select
        variant="soft"
        onSelect={(id) => setIds([...selectedIds, id])}
        placeholder={selectedIds.length === 0 ? placeholder : "إضافة موظف…"}
        emptyLabel="لا مزيد من الموظفين"
        options={employees
          .filter((e) => !selectedIds.includes(e.id))
          .map((e) => ({ value: e.id, label: e.name, hint: roleLabels[e.role] || e.role }))}
        className="flex-1 min-w-[150px]"
      />
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
    <div className="mail-ui fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
      <div
        dir="rtl"
        className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-[var(--mail-shadow-modal)] w-full sm:max-w-3xl h-[92dvh] sm:h-[680px] sm:max-h-[90vh] flex flex-col overflow-hidden"
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

        {/* رسالةٌ أُرجعت من معمِّدها: سببُ الإرجاع يُقرأ هنا لا في مكانٍ آخر،
            فهو أول ما يحتاجه من يفتح المسودة. */}
        {draft?.returnNote && (
          <div className="mx-6 mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/[0.10] text-amber-800 dark:text-amber-300 text-[length:var(--mail-fs-nav)] font-medium shrink-0">
            <Undo2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              أُرجعت هذه الرسالة إليك: {draft.returnNote}
            </span>
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 divide-y divide-slate-100 dark:divide-slate-800 shrink-0">
            {/* ردٌّ إلى جمعية: الطرف مُثبَّت، يُعرض ولا يُختار */}
            {charityReply && (
              <div className="py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
                <div className="w-16 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">إلى</div>
                <span className="h-7 px-3 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 text-[length:var(--mail-fs-meta)] font-medium">
                  {charityReply.charityName} — مفوَّضو «{charityReply.serviceName}»
                </span>
                <span className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500">
                  ويصل زملاءك في الخدمة نسخةً
                </span>
              </div>
            )}

            {/* الجهة المخاطَبة — موظفو زاد أو جمعية. الاختيار أولاً لأنه يغيّر
                بقية الحقول: لا نسخة ولا نسخة مخفية في بريد الجمعيات، بل خدمةٌ
                يخرج البريد باسمها. */}
            {canAddressCharities && !charityReply && (
              <div className="py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
                <div className="w-16 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">الجهة</div>
                <div className="flex items-center p-0.5 gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60">
                  {([
                    { key: "EMPLOYEES" as const, label: "موظفو زاد", Icon: Users },
                    { key: "CHARITIES" as const, label: "جمعية", Icon: Building2 },
                  ]).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAudience(key)}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-[10px] text-[length:var(--mail-fs-meta)] font-medium transition-colors ${
                        audience === key
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
            )}

            {/* الخدمة — هوية البريد عند الجمعية: «زاد | خدمة كذا» */}
            {toCharities && (
              <div className="py-2 sm:py-3 flex items-start gap-2 sm:gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">الخدمة</div>
                <div className="flex-1 flex items-center min-h-10">
                  {!charityOptions && !optionsFailed ? (
                    <span className="flex items-center gap-2 text-[length:var(--mail-fs-nav)] text-slate-400 dark:text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      جارٍ جلب خدماتك وجمعياتك…
                    </span>
                  ) : optionsFailed ? (
                    <span className="text-[length:var(--mail-fs-nav)] text-rose-600 dark:text-rose-400">تعذّر جلب الخدمات — أغلق النافذة وأعد المحاولة</span>
                  ) : availableServices.length === 0 ? (
                    <span className="text-[length:var(--mail-fs-nav)] text-rose-600 dark:text-rose-400">
                      لم تُمنح أي خدمة، فلا يمكنك مراسلة الجمعيات — راجع مسؤول النظام
                    </span>
                  ) : availableServices.length === 1 ? (
                    // خدمةٌ واحدة: تُعرض مثبَّتة، فلا قائمةَ بخيارٍ واحد.
                    <span className="h-7 px-3 inline-flex items-center rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 text-[length:var(--mail-fs-meta)] font-medium">
                      زاد | {availableServices[0]}
                    </span>
                  ) : (
                    <Select
                      variant="soft"
                      value={serviceName}
                      onSelect={setServiceName}
                      placeholder="اختر الخدمة التي يتبع لها البريد…"
                      options={availableServices.map((name) => ({ value: name, label: name }))}
                      className="flex-1"
                    />
                  )}
                </div>
              </div>
            )}

            {/* الجمعيات — المسنَدة إليك وحدها، ومع كل واحدة عدد من سيستلم */}
            {toCharities && (
              <div className="py-2 sm:py-3 flex items-start gap-2 sm:gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">الجمعيات</div>
                <div className="flex-1 flex flex-col gap-1.5 min-h-10 justify-center">
                  <div className="flex flex-wrap gap-2 items-center w-full">
                    {selectedCharities.map((c) => {
                      const n = serviceName ? c.counts[serviceName] ?? 0 : 0;
                      return (
                        <div
                          key={c.id}
                          className={`h-6 px-2 rounded-full flex items-center gap-1 text-[length:var(--mail-fs-meta)] font-medium ${
                            serviceName && n === 0
                              ? "bg-rose-500/[0.10] text-rose-600 dark:text-rose-400"
                              : "bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300"
                          }`}
                        >
                          {c.name}
                          {serviceName && <span className="opacity-70">· {recipientsLabel(n)}</span>}
                          <button
                            type="button"
                            onClick={() => setCharityIds(charityIds.filter((id) => id !== c.id))}
                            className="opacity-60 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                    <Select
                      variant="soft"
                      onSelect={(id) => setCharityIds([...charityIds, id])}
                      placeholder={charityIds.length === 0 ? "اختر الجمعية…" : "إضافة جمعية…"}
                      emptyLabel="لا جمعيات مسنَدة إليك"
                      options={charityList
                        .filter((c) => !charityIds.includes(c.id))
                        .map((c) => ({
                          value: c.id,
                          label: c.name,
                          // عدد من سيستلم تلميحٌ بجانب الاسم، لا نصٌّ ملصوقٌ به.
                          hint: serviceName ? recipientsLabel(c.counts[serviceName] ?? 0) : undefined,
                        }))}
                      className="flex-1 min-w-[150px]"
                    />
                  </div>
                  {charityIds.length > 1 && (
                    // يُقال صراحةً: فلا يظنّ المرسِل أنه بعث رسالةً واحدة يرى
                    // مستلموها بعضهم، ولا يُفاجأ بصفوفٍ عدّة في «المُرسَل».
                    <p className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500">
                      تُرسَل رسالةٌ مستقلة لكل جمعية — فلا ترى جمعيةٌ مستلمي الأخرى.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TO field */}
            {!toCharities && !charityReply && (
            <div className="py-2 sm:py-3 flex items-start gap-2 sm:gap-4">
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
            )}

            {/* CC field */}
            {!toCharities && !charityReply && showCc && (
              <div className="py-2 sm:py-3 flex items-start gap-2 sm:gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">نسخة</div>
                <div className="flex-1 flex items-center min-h-10">{renderEmployeeSelect(ccIds, setCcIds, "نسخة إلى...")}</div>
              </div>
            )}

            {/* BCC field */}
            {!toCharities && !charityReply && showBcc && (
              <div className="py-2 sm:py-3 flex items-start gap-2 sm:gap-4">
                <div className="w-16 pt-1 text-[length:var(--mail-fs-nav)] font-medium text-slate-500 dark:text-slate-400">نسخة مخفية</div>
                <div className="flex-1 flex items-center min-h-10">{renderEmployeeSelect(bccIds, setBccIds, "نسخة مخفية إلى...")}</div>
              </div>
            )}

            {/* Subject field */}
            <div className="py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
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

          {/* Attachments — one row per file, carrying its own upload state */}
          {attachments.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap gap-2 shrink-0 max-h-32 overflow-y-auto">
              {attachments.map((att) => (
                <div
                  key={att.key}
                  className={`flex items-center gap-2 bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-xl text-[length:var(--mail-fs-meta)] font-medium ${
                    att.status === "error"
                      ? "border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400"
                      : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                  title={att.error || att.fileName}
                >
                  {att.status === "uploading" && (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-primary dark:text-teal-300 shrink-0" />
                      {att.percent !== undefined && (
                        <span className="text-primary dark:text-teal-300 shrink-0">{att.percent}%</span>
                      )}
                    </>
                  )}
                  {att.status === "done" && <Check className="w-3 h-3 text-primary dark:text-teal-300 shrink-0" />}
                  {att.status === "error" && <AlertTriangle className="w-3 h-3 shrink-0" />}

                  <span className="truncate max-w-[150px]">{att.fileName}</span>

                  {att.status === "error" ? (
                    <span className="font-normal">— {att.error}</span>
                  ) : (
                    att.fileSize > 0 && <span className="text-slate-400 dark:text-slate-500 font-normal">{formatBytes(att.fileSize)}</span>
                  )}

                  {att.status === "error" && (
                    <button type="button" onClick={() => retryAttachment(att.key)} className="text-slate-400 hover:text-primary" title="إعادة المحاولة">
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                  <button type="button" onClick={() => removeAttachment(att.key)} className="text-slate-400 dark:text-slate-500 hover:text-rose-500" title="إزالة">
                    <X className="w-3 h-3" />
                  </button>
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
              title="إرفاق ملف — أو الصق صورة/ملف مباشرة بـ Ctrl+V"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />

            {/* Closing this window saves silently; without a marker there was no
                way to tell whether it was safe to close. */}
            {serviceLacksApprover && (
              <span className="flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                لا معمِّد لخدمة «{serviceName}» — لا يُرسل
              </span>
            )}

            {willAwaitApproval && (
              <span className="flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] text-amber-700 dark:text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                تقف عند معمِّد «{serviceName}» قبل أن تصل الجمعية
              </span>
            )}

            {saveState !== "idle" && (
              <span className="flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500">
                {saveState === "saving" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جارٍ الحفظ…
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3" />
                    تم حفظ المسودة
                  </>
                )}
              </span>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              uploadingCount > 0 ||
              failedCount > 0 ||
              (charityReply
                ? false
                : toCharities
                  ? charityIds.length === 0 || !serviceName || serviceLacksApprover
                  : toIds.length + ccIds.length + bccIds.length === 0)
            }
            className="flex items-center gap-2 h-11 px-6 text-white bg-gradient-to-b from-[#17857c] via-primary to-[#0c645d] shadow-[var(--mail-shadow-cta)] hover:shadow-[var(--mail-shadow-cta-hover)] active:translate-y-px rounded-xl font-semibold text-[length:var(--mail-fs-nav)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {willAwaitApproval ? "إرسال للتعميد" : "إرسال"}
          </button>
        </div>
      </div>
    </div>
  );
}
