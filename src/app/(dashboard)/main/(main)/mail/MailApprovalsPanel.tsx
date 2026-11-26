"use client";

import { useEffect, useState } from "react";
import { Badge, btn, cx, field, MONO } from "@/components/console/ui";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Eye,
  LoaderCircle,
  Pencil,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { approveMail, getPendingApprovalMails, returnMail } from "@/app/actions/mailApproval";
import { formatMailDate, htmlToPlainText, mailAuthorLabel } from "./mailUtils";
import { MailAttachments, type MailAttachmentItem } from "./MailAttachments";

const MailRichTextEditor = dynamic(() => import("./MailRichTextEditor"), {
  ssr: false,
  loading: () => <div className="min-h-[200px]" />,
});

type PendingMail = {
  id: string;
  subject: string;
  body: string;
  createdAt: string | Date;
  serviceName: string | null;
  returnNote: string | null;
  sender: { id: string; name: string } | null;
  charity: { id: string; name: string } | null;
  attachments: MailAttachmentItem[];
};

function formatWhen(value: string | Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * «بانتظار التعميد» — بشقّيه في شاشةٍ واحدة.
 *
 * ما أعمّده أنا، وما وقف لي عند غيري. والثاني ليس زينة: بدونه يظنّ المرسِل أن
 * بريده وصل، فالرسالة اختفت من «المسودات» ولم تظهر في «المُرسَل».
 */
export default function MailApprovalsPanel() {
  const [toApprove, setToApprove] = useState<PendingMail[]>([]);
  const [mine, setMine] = useState<PendingMail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");

  // الرسالةُ المفتوحة: واحدةٌ في الشاشة. وفتحُ غيرِها يطوي الأولى، فلا تصير
  // الشاشةُ كومةَ رسائلَ مفتوحة لا يُقرأ فيها شيء.
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleOpen = (id: string) => setOpenId((current) => (current === id ? null : id));

  // بلا setState قبل أول await: ضبط الحالة تزامناً داخل التأثير يُعيد الرسم
  // قبل أن يُرسم شيء. والتحميل الأول يبدأ من قيمة الحالة الابتدائية.
  const load = async () => {
    try {
      const data = await getPendingApprovalMails();
      setToApprove(data.toApprove as unknown as PendingMail[]);
      setMine(data.mine as unknown as PendingMail[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر جلب البريد المنتظر");
    } finally {
      setIsLoading(false);
    }
  };

  // التحميل الأول مكتوبٌ سلسلةَ وعود داخل التأثير نفسه: ضبط الحالة يقع في
  // ردّ النداء لا تزامناً مع الرسم، وهو ما يمنع إعادة رسمٍ قبل أول رسم.
  useEffect(() => {
    let cancelled = false;
    getPendingApprovalMails()
      .then((data) => {
        if (cancelled) return;
        setToApprove(data.toApprove as unknown as PendingMail[]);
        setMine(data.mine as unknown as PendingMail[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذّر جلب البريد المنتظر");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApprove = async (mail: PendingMail) => {
    setBusyId(mail.id);
    setError(null);
    setNotice(null);
    try {
      const edits = editingId === mail.id ? { subject: draftSubject, body: draftBody } : undefined;
      const res = await approveMail(mail.id, edits);
      setNotice(`اعتُمدت الرسالة ووصلت ${res.delivered} من المفوَّضين.`);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر اعتماد الرسالة");
    } finally {
      setBusyId(null);
    }
  };

  const handleReturn = async (mail: PendingMail) => {
    setBusyId(mail.id);
    setError(null);
    setNotice(null);
    try {
      await returnMail(mail.id, returnNote);
      setNotice("أُرجعت الرسالة إلى مسودات صاحبها مع ملاحظتك.");
      setReturningId(null);
      setReturnNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إرجاع الرسالة");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <LoaderCircle className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-body font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/[0.08] text-primary dark:text-teal-300 text-body font-medium">
          <CircleCheck className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-body font-semibold text-slate-900 dark:text-slate-100">
          بانتظار تعميدك
          {toApprove.length > 0 && (
            <span className="ms-2 h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold align-middle">
              {toApprove.length}
            </span>
          )}
        </h2>

        {toApprove.length === 0 ? (
          <p className="text-body text-slate-500 dark:text-slate-400">
            لا شيء ينتظرك. وما لا تكون معمِّداً لخدمته لا يظهر هنا.
          </p>
        ) : (
          toApprove.map((mail) => {
            const isEditing = editingId === mail.id;
            const isBusy = busyId === mail.id;
            const isOpen = openId === mail.id;
            return (
              <article
                key={mail.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-caption text-slate-500 dark:text-slate-400">
                      <span className="h-6 px-2 inline-flex items-center gap-1 rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 font-medium">
                        <Building2 className="w-3 h-3" />
                        {mail.charity?.name}
                      </span>
                      <span>زاد | {mail.serviceName}</span>
                      <span>·</span>
                      <span>{mail.sender?.name}</span>
                      <span>·</span>
                      <span>{formatWhen(mail.createdAt)}</span>
                    </div>
                    {!isEditing && (
                      <SubjectToggle
                        subject={mail.subject}
                        isOpen={isOpen}
                        onToggle={() => toggleOpen(mail.id)}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingId(null);
                          return;
                        }
                        setEditingId(mail.id);
                        setDraftSubject(mail.subject);
                        setDraftBody(mail.body);
                      }}
                      className={btn.secondary}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isEditing ? "إلغاء التعديل" : "تعديل"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReturningId(returningId === mail.id ? null : mail.id);
                        setReturnNote("");
                      }}
                      className={btn.secondary}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      إرجاع
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(mail)}
                      disabled={isBusy}
                      className={btn.primary}
                    >
                      {isBusy ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      اعتماد وإرسال
                    </button>
                  </div>
                </header>

                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      placeholder="موضوع الرسالة"
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-body font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-primary"
                    />
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                      <MailRichTextEditor value={draftBody} onChange={setDraftBody} />
                    </div>
                    <p className="text-caption text-slate-400 dark:text-slate-500">
                      التعديل يُحفظ مع الاعتماد — الرسالة تخرج كما تراها الآن.
                    </p>
                  </div>
                ) : isOpen ? (
                  <AsCharityReadsIt mail={mail} />
                ) : (
                  <Snippet body={mail.body} onOpen={() => toggleOpen(mail.id)} />
                )}

                {/* المرفقاتُ مذكورةٌ هنا بأسمائها حتى تُفتح الرسالة، فتُقرأ
                    بطاقاتُها كما تقرؤها الجمعية. */}
                {!isOpen && mail.attachments.length > 0 && (
                  <p className="text-caption text-slate-400 dark:text-slate-500">
                    {mail.attachments.length} مرفقاً: {mail.attachments.map((a) => a.fileName).join("، ")}
                  </p>
                )}

                {returningId === mail.id && (
                  <div className="rounded-lg border border-amber-300/60 dark:border-amber-900/50 bg-amber-500/[0.06] p-3 space-y-2">
                    <label className="block text-caption font-semibold text-amber-800 dark:text-amber-300">
                      سبب الإرجاع — يقرأه صاحب الرسالة مع مسودته
                    </label>
                    <textarea
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      rows={2}
                      className={field}
                    />
                    <button
                      type="button"
                      onClick={() => handleReturn(mail)}
                      disabled={isBusy || !returnNote.trim()}
                      className={btn.secondary}
                    >
                      {isBusy ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                      إرجاع إلى المسودات
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-body font-semibold text-slate-900 dark:text-slate-100">
          بريدك الموقوف على التعميد
        </h2>

        {mine.length === 0 ? (
          <p className="text-body text-slate-500 dark:text-slate-400">
            لا رسائل لك تنتظر تعميد أحد.
          </p>
        ) : (
          mine.map((mail) => {
            const isOpen = openId === mail.id;
            return (
              <article
                key={mail.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap text-caption text-slate-500 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>بانتظار تعميد «{mail.serviceName}»</span>
                    <span>·</span>
                    <span>{mail.charity?.name}</span>
                    <span>·</span>
                    <span>{formatWhen(mail.createdAt)}</span>
                  </div>
                  <SubjectToggle
                    subject={mail.subject}
                    isOpen={isOpen}
                    onToggle={() => toggleOpen(mail.id)}
                  />
                </div>

                {isOpen ? (
                  <AsCharityReadsIt mail={mail} />
                ) : (
                  <Snippet body={mail.body} onOpen={() => toggleOpen(mail.id)} />
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

/** الموضوعُ مفتاحُ الرسالة: الضغطُ عليه يفتحها ويطويها. */
function SubjectToggle({
  subject,
  isOpen,
  onToggle,
}: {
  subject: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      title={isOpen ? "طيّ الرسالة" : "عرض الرسالة كما ستصل الجمعية"}
      className="mt-1 flex items-center gap-2 rounded-lg text-right outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="font-semibold text-slate-900 dark:text-slate-100">{subject || "(بدون موضوع)"}</span>
      <ChevronDown
        className={cx(
          "w-4 h-4 shrink-0 text-slate-300 transition-transform dark:text-slate-600",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

/** أوّلُ النصّ مجرّداً من وسمه — وهو مفتاحٌ آخرُ لفتح الرسالة. */
function Snippet({ body, onOpen }: { body: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="عرض الرسالة كما ستصل الجمعية"
      className="block w-full rounded-lg text-right text-body text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="line-clamp-3">{htmlToPlainText(body)}</span>
    </button>
  );
}

/**
 * الرسالةُ كما تقرؤها الجمعيةُ في بوّابتها — لا ملخّصاً عنها.
 *
 * والمعمِّدُ يقرِّر في شيءٍ سيخرج باسم خدمته، فكان يقرأ ثلاثةَ أسطرٍ منزوعةَ
 * الوسم: لا فقراتٍ ولا قوائمَ ولا روابطَ ولا مرفقاتٍ تُفتح. وهذا هو نفسُه
 * معروضاً بوسمه (`mail-prose`) وبترويسته: الكاتبُ باسمه مع خدمته كما تُقرأ
 * هناك (`mailAuthorLabel`)، والمرفقاتُ بطاقاتِ تنزيل.
 *
 * ولا تظهر «إلى» فيها: صفوفُ الاستلام لا تُخلق إلا عند الاعتماد، وتُحسب من
 * تفويض تلك اللحظة لا من تفويض الآن — فذكرُ أسماءَ هنا وعدٌ قد يُخلف. والجمعيةُ
 * مذكورةٌ في ترويسة البطاقة فوقها.
 */
function AsCharityReadsIt({ mail }: { mail: PendingMail }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700 sm:p-4">
      <p className="mb-3 flex items-center gap-1.5 text-caption text-slate-400 dark:text-slate-500">
        <Eye className="w-3.5 h-3.5" />
        كما تقرؤها الجمعية في بوّابتها
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-body font-semibold text-slate-900 dark:text-slate-100">
          {mail.subject || "(بدون موضوع)"}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-slate-500 dark:text-slate-400">
          <span className={MONO}>{formatMailDate(mail.createdAt)}</span>
          {mail.serviceName && (
            <Badge tone="brand">
              <Building2 className="w-3 h-3" />
              {mail.serviceName}
            </Badge>
          )}
        </div>

        <hr className="my-3 border-slate-100 dark:border-slate-800" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body font-semibold text-slate-800 dark:text-slate-200">
            {mailAuthorLabel(mail)}
          </span>
          <span className="text-caption text-slate-400 dark:text-slate-500">·</span>
          <span className="text-caption text-slate-400 dark:text-slate-500">
            {formatMailDate(mail.createdAt)}
          </span>
        </div>

        <div
          className="mail-prose mt-3 text-slate-800 dark:text-slate-200"
          dangerouslySetInnerHTML={{ __html: mail.body || "" }}
        />

        <MailAttachments attachments={mail.attachments} className="mt-4" />
      </div>
    </div>
  );
}
