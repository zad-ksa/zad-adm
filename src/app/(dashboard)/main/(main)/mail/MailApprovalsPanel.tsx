"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  CircleCheck,
  Clock,
  LoaderCircle,
  Pencil,
  Undo2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { approveMail, getPendingApprovalMails, returnMail } from "@/app/actions/mailApproval";
import { htmlToPlainText } from "./mailUtils";

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
  attachments: { id: string; fileName: string }[];
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
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-[length:var(--mail-fs-nav)] font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/[0.08] text-primary dark:text-teal-300 text-[length:var(--mail-fs-nav)] font-medium">
          <CircleCheck className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-[length:var(--mail-fs-subject)] font-semibold text-slate-900 dark:text-slate-100">
          بانتظار تعميدك
          {toApprove.length > 0 && (
            <span className="ms-2 h-5 min-w-5 px-1.5 inline-flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold align-middle">
              {toApprove.length}
            </span>
          )}
        </h2>

        {toApprove.length === 0 ? (
          <p className="text-[length:var(--mail-fs-nav)] text-slate-500 dark:text-slate-400">
            لا شيء ينتظرك. وما لا تكون معمِّداً لخدمته لا يظهر هنا.
          </p>
        ) : (
          toApprove.map((mail) => {
            const isEditing = editingId === mail.id;
            const isBusy = busyId === mail.id;
            return (
              <article
                key={mail.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-[length:var(--mail-fs-meta)] text-slate-500 dark:text-slate-400">
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
                      <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {mail.subject || "(بدون موضوع)"}
                      </h3>
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
                      className="h-8 px-3 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-semibold transition-colors"
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
                      className="h-8 px-3 rounded-lg text-amber-700 dark:text-amber-400 bg-amber-500/[0.10] hover:bg-amber-500/[0.18] flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-semibold transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      إرجاع
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(mail)}
                      disabled={isBusy}
                      className="h-8 px-3 rounded-lg text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-semibold transition-colors disabled:opacity-50"
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
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[length:var(--mail-fs-nav)] font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-primary"
                    />
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                      <MailRichTextEditor value={draftBody} onChange={setDraftBody} />
                    </div>
                    <p className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500">
                      التعديل يُحفظ مع الاعتماد — الرسالة تخرج كما تراها الآن.
                    </p>
                  </div>
                ) : (
                  <p className="text-[length:var(--mail-fs-nav)] text-slate-600 dark:text-slate-300 line-clamp-3">
                    {htmlToPlainText(mail.body)}
                  </p>
                )}

                {mail.attachments.length > 0 && (
                  <p className="text-[length:var(--mail-fs-meta)] text-slate-400 dark:text-slate-500">
                    {mail.attachments.length} مرفقاً: {mail.attachments.map((a) => a.fileName).join("، ")}
                  </p>
                )}

                {returningId === mail.id && (
                  <div className="rounded-lg border border-amber-300/60 dark:border-amber-900/50 bg-amber-500/[0.06] p-3 space-y-2">
                    <label className="block text-[length:var(--mail-fs-meta)] font-semibold text-amber-800 dark:text-amber-300">
                      سبب الإرجاع — يقرأه صاحب الرسالة مع مسودته
                    </label>
                    <textarea
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300/60 dark:border-amber-900/50 bg-white dark:bg-slate-900 text-[length:var(--mail-fs-nav)] text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleReturn(mail)}
                      disabled={isBusy || !returnNote.trim()}
                      className="h-8 px-3 rounded-lg text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 text-[length:var(--mail-fs-meta)] font-semibold transition-colors disabled:opacity-50"
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
        <h2 className="text-[length:var(--mail-fs-subject)] font-semibold text-slate-900 dark:text-slate-100">
          بريدك الموقوف على التعميد
        </h2>

        {mine.length === 0 ? (
          <p className="text-[length:var(--mail-fs-nav)] text-slate-500 dark:text-slate-400">
            لا رسائل لك تنتظر تعميد أحد.
          </p>
        ) : (
          mine.map((mail) => (
            <article
              key={mail.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4"
            >
              <div className="flex items-center gap-2 flex-wrap text-[length:var(--mail-fs-meta)] text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>بانتظار تعميد «{mail.serviceName}»</span>
                <span>·</span>
                <span>{mail.charity?.name}</span>
                <span>·</span>
                <span>{formatWhen(mail.createdAt)}</span>
              </div>
              <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                {mail.subject || "(بدون موضوع)"}
              </h3>
              <p className="mt-1 text-[length:var(--mail-fs-nav)] text-slate-600 dark:text-slate-300 line-clamp-2">
                {htmlToPlainText(mail.body)}
              </p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
