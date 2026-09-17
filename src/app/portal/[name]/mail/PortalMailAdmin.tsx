"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleCheck,
  Clock,
  LoaderCircle,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import {
  approvePortalMail,
  getCharityMailSettings,
  getPortalPendingMails,
  returnPortalMail,
  setCharityMailApproval,
  setCharityMailApprovers,
} from "@/app/actions/charityMail";
import { htmlToPlainText } from "@/app/(dashboard)/main/(main)/mail/mailUtils";

export type PendingPortalMail = {
  id: string;
  subject: string;
  body: string;
  createdAt: string | Date;
  addressedAs: string;
  serviceName: string | null;
  approvalState: string;
  returnNote: string | null;
  draftCharityUserIds: string[];
  senderCharityUser: { id: string; name: string } | null;
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

/** إلى أين كانت الرسالة ذاهبة — يُقرأ من الرسالة نفسها، فلا مستلمين لها بعد. */
function destinationLabel(mail: PendingPortalMail, colleagues: { id: string; name: string }[]) {
  if (mail.addressedAs === "SERVICE") return `زاد | ${mail.serviceName ?? ""}`;
  const names = mail.draftCharityUserIds
    .map((id) => colleagues.find((c) => c.id === id)?.name)
    .filter(Boolean);
  if (names.length === 0) return "زملاء في الجمعية";
  if (names.length <= 2) return names.join(" و");
  return `${names[0]} و${names.length - 1} آخرين`;
}

/**
 * «بانتظار التعميد» في البوابة — ما أعمّده، وما وقف لي، وما أُرجع إليّ.
 *
 * والمُرجَع يبقى هنا لا يختفي: الجمعية بلا صندوق مسودات، فلو أُخفي لظنّ صاحبه
 * أن رسالته أُرسلت أو ضاعت.
 */
export function PortalApprovalsPanel({
  charityName,
  colleagues,
  onResend,
  onChanged,
}: {
  charityName: string;
  colleagues: { id: string; name: string }[];
  onResend: (mail: PendingPortalMail) => void;
  onChanged: () => void;
}) {
  const [toApprove, setToApprove] = useState<PendingPortalMail[]>([]);
  const [mine, setMine] = useState<PendingPortalMail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");

  // بلا setState قبل أول await: ضبط الحالة تزامناً داخل التأثير يُعيد الرسم
  // قبل أن يُرسم شيء. والتحميل الأول يبدأ من قيمة الحالة الابتدائية.
  const load = async () => {
    try {
      const data = await getPortalPendingMails(charityName);
      setToApprove(data.toApprove as unknown as PendingPortalMail[]);
      setMine(data.mine as unknown as PendingPortalMail[]);
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
    getPortalPendingMails(charityName)
      .then((data) => {
        if (cancelled) return;
        setToApprove(data.toApprove as unknown as PendingPortalMail[]);
        setMine(data.mine as unknown as PendingPortalMail[]);
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
  }, [charityName]);

  const approve = async (mail: PendingPortalMail) => {
    setBusyId(mail.id);
    setError(null);
    setNotice(null);
    try {
      const edits = editingId === mail.id ? { subject: draftSubject, body: draftBody } : undefined;
      const res = await approvePortalMail(charityName, mail.id, edits);
      setNotice(`اعتُمدت الرسالة ووصلت ${res.delivered} مستلماً.`);
      setEditingId(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر اعتماد الرسالة");
    } finally {
      setBusyId(null);
    }
  };

  const sendBack = async (mail: PendingPortalMail) => {
    setBusyId(mail.id);
    setError(null);
    setNotice(null);
    try {
      await returnPortalMail(charityName, mail.id, returnNote);
      setNotice("أُرجعت الرسالة إلى صاحبها مع ملاحظتك.");
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
      <div className="py-16 flex justify-center text-slate-400">
        <LoaderCircle className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/[0.08] text-primary dark:text-teal-300 text-sm font-medium">
          <CircleCheck className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}

      {toApprove.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">بانتظار تعميدك</h2>
          {toApprove.map((mail) => {
            const isEditing = editingId === mail.id;
            const isBusy = busyId === mail.id;
            return (
              <article
                key={mail.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <header className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      <span>{mail.senderCharityUser?.name}</span>
                      <span>←</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {destinationLabel(mail, colleagues)}
                      </span>
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
                        setDraftBody(htmlToPlainText(mail.body));
                      }}
                      className="h-8 px-3 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 flex items-center gap-1.5 text-xs font-semibold transition-colors"
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
                      className="h-8 px-3 rounded-lg text-amber-700 dark:text-amber-400 bg-amber-500/[0.10] hover:bg-amber-500/[0.18] flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      إرجاع
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(mail)}
                      disabled={isBusy}
                      className="h-8 px-3 rounded-lg text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
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
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-primary"
                    />
                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-primary"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      التعديل هنا نصٌّ مجرّد، ويحلّ محل النص الأصلي عند الاعتماد.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    {htmlToPlainText(mail.body)}
                  </p>
                )}

                {returningId === mail.id && (
                  <div className="rounded-lg border border-amber-300/60 dark:border-amber-900/50 bg-amber-500/[0.06] p-3 space-y-2">
                    <label className="block text-xs font-semibold text-amber-800 dark:text-amber-300">
                      سبب الإرجاع — يقرأه صاحب الرسالة
                    </label>
                    <textarea
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300/60 dark:border-amber-900/50 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => sendBack(mail)}
                      disabled={isBusy || !returnNote.trim()}
                      className="h-8 px-3 rounded-lg text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      إرجاع إلى صاحبها
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">رسائلك الموقوفة</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">لا رسائل لك تنتظر التعميد.</p>
        ) : (
          mine.map((mail) => {
            const isReturned = mail.approvalState === "RETURNED";
            return (
              <article
                key={mail.id}
                className={`rounded-xl border p-4 ${
                  isReturned
                    ? "border-amber-300/60 dark:border-amber-900/50 bg-amber-500/[0.06]"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  {isReturned ? <Undo2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{isReturned ? "أُرجعت إليك" : "بانتظار التعميد"}</span>
                  <span>·</span>
                  <span>{destinationLabel(mail, colleagues)}</span>
                  <span>·</span>
                  <span>{formatWhen(mail.createdAt)}</span>
                </div>
                <h3 className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {mail.subject || "(بدون موضوع)"}
                </h3>
                {isReturned && mail.returnNote && (
                  <p className="mt-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                    ملاحظة المعمِّد: {mail.returnNote}
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {htmlToPlainText(mail.body)}
                </p>
                {isReturned && (
                  <button
                    type="button"
                    onClick={() => onResend(mail)}
                    className="mt-2 h-8 px-3 rounded-lg text-white bg-primary hover:bg-primary/90 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    تعديل وإعادة الإرسال
                  </button>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

/**
 * إعدادات بريد الجمعية: اشتراط التعميد، ومن يعمّد.
 *
 * الاشتراط لا يُفعَّل بلا معمِّد، وينطفئ إن نُزع آخرهم — وإلا وقف صادر الجمعية
 * كله عند لا أحد.
 */
export function PortalMailSettingsPanel({ charityName }: { charityName: string }) {
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCharityMailSettings(charityName)
      .then((data) => {
        if (cancelled) return;
        setRequiresApproval(data.requiresApproval);
        setMembers(data.members);
        setApproverIds(data.approverIds);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "تعذّر جلب الإعدادات");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [charityName]);

  const saveApprovers = async (ids: string[]) => {
    const previous = approverIds;
    setApproverIds(ids);
    setIsSaving(true);
    setError(null);
    try {
      await setCharityMailApprovers(charityName, ids);
      if (ids.length === 0) setRequiresApproval(false);
    } catch (err) {
      setApproverIds(previous);
      setError(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleApproval = async (enabled: boolean) => {
    setIsSaving(true);
    setError(null);
    try {
      await setCharityMailApproval(charityName, enabled);
      setRequiresApproval(enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center text-slate-400">
        <LoaderCircle className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-5">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary dark:text-teal-300" />
          تعميد البريد الصادر من الجمعية
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          حين يُفعَّل، لا يخرج بريدٌ من الجمعية حتى يعتمده أحد المعمِّدين: يعتمده، أو يعدّله
          ثم يعتمده، أو يُرجعه إلى صاحبه بملاحظة. والمعمِّد لا يُعمَّد عليه بريده هو.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/[0.08] text-rose-600 dark:text-rose-400 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={requiresApproval}
            disabled={isSaving}
            onChange={(e) => toggleApproval(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            اشتراط التعميد قبل إرسال بريد الجمعية
          </span>
          {isSaving && <LoaderCircle className="w-3.5 h-3.5 animate-spin text-slate-400" />}
        </label>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">المعمِّدون</div>
          <div className="flex flex-wrap gap-2 items-center">
            {approverIds.map((id) => {
              const person = members.find((m) => m.id === id);
              return (
                <span
                  key={id}
                  className="h-7 px-2.5 rounded-full bg-primary/[0.08] text-primary dark:bg-primary/15 dark:text-teal-300 flex items-center gap-1.5 text-xs font-medium"
                >
                  {person?.name ?? id}
                  <button
                    type="button"
                    onClick={() => saveApprovers(approverIds.filter((i) => i !== id))}
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !approverIds.includes(e.target.value)) {
                  saveApprovers([...approverIds, e.target.value]);
                }
              }}
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-primary [&>option]:dark:bg-slate-800"
            >
              <option value="" disabled>
                {approverIds.length === 0 ? "تعيين معمِّد…" : "إضافة معمِّد…"}
              </option>
              {members
                .filter((m) => !approverIds.includes(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          {approverIds.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              بلا معمِّدين لا يمكن تفعيل الاشتراط، والبريد يخرج مباشرةً.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
