"use client";

import { useState } from "react";
import { X, Loader2, Undo2, Lock, MessageSquare, AlertTriangle } from "lucide-react";
import { returnRevisionToCharity } from "@/app/actions/designRequests";
import { RevisionNotesList } from "./RevisionNotesList";

/**
 * Zad's reply when the answer to the charity's notes is not a new delivery.
 *
 * The charity's own notes are shown above the reply box rather than left on
 * the card behind the modal: this is the one moment someone is writing a
 * response to them, and making them re-read from memory is how a reply ends up
 * answering two of the three points.
 *
 * The close/keep-open choice is presented as two full options with their
 * consequences spelled out, not a checkbox. Closing ends the request against
 * the charity's stated wishes — that deserves to be read, not ticked.
 */
export default function ReturnRevisionModal({
  requestId,
  title,
  charityNotes,
  onClose,
  onDone,
}: {
  requestId: string;
  title: string;
  charityNotes?: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [close, setClose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (notes.trim().length < 5) {
      setError("يرجى كتابة الملاحظات (5 أحرف على الأقل)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await returnRevisionToCharity({ requestId, notes, close });
      if (res.error) {
        setError(res.error);
        return;
      }
      onDone(close ? "أُغلق الطلب مع ملاحظاتك" : "أُعيد الطلب إلى الجمعية مع ملاحظاتك");
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const OPTIONS = [
    {
      value: false,
      Icon: MessageSquare,
      label: "إبقاء الطلب مفتوحاً",
      body: "تقرأ الجمعية ردّك ويمكنها إرسال ملاحظات جديدة، ويعود الطلب إليك.",
    },
    {
      value: true,
      Icon: Lock,
      label: "إغلاق الطلب",
      body: "ينتهي الطلب عند هذا الحد، وتظهر ملاحظاتك للجمعية سبباً لعدم تنفيذ التعديلات.",
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 dark:text-slate-100 truncate">
              الردّ على ملاحظات الجمعية
            </h3>
            <p className="text-[12px] text-slate-400 truncate mt-0.5">{title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-primary/[0.08] hover:text-primary rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {charityNotes && (
            <div className="rounded-xl bg-amber-500/[0.08] p-3">
              <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 mb-2">
                ما طلبته الجمعية
              </p>
              <RevisionNotesList notes={charityNotes} />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2">
              ردّك
              <span className="font-normal text-slate-400 mr-1">— تقرؤه الجمعية</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="وضّح ما نُفّذ وما لم يُنفّذ ولماذا..."
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder:text-slate-400"
            />
          </div>

          <div className="space-y-2">
            {OPTIONS.map((opt) => {
              const on = close === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => setClose(opt.value)}
                  className={`w-full text-right rounded-xl border p-3.5 transition-colors ${
                    on
                      ? opt.value
                        ? "border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10"
                        : "border-primary/50 bg-primary/[0.06] dark:bg-teal-500/10"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <p
                    className={`text-[13px] font-black flex items-center gap-1.5 ${
                      on
                        ? opt.value
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-primary dark:text-teal-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <opt.Icon className="w-4 h-4" />
                    {opt.label}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {opt.body}
                  </p>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="flex items-start gap-2 text-[12px] font-bold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-11 px-4 rounded-xl text-[13px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={busy || notes.trim().length < 5}
            className={`h-11 px-6 flex items-center gap-2 text-white rounded-xl text-[13px] font-bold transition-all disabled:opacity-50 active:translate-y-px ${
              close ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : close ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            {close ? "إغلاق الطلب" : "إعادة للجمعية"}
          </button>
        </div>
      </div>
    </div>
  );
}
