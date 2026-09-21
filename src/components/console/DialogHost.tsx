"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { subscribeToConfirms, type ConfirmRequest } from "./confirmBus";
import { subscribeToPrompts, type PromptRequest } from "./promptBus";
import { btn, cx, field } from "./ui";

/**
 * مُضيف الحوارات — يُركَّب مرةً واحدة في جذر التطبيق.
 *
 * يسمع نداءات `confirmAction()` و`promptAction()` من أي مكان، ويعرض الحوار،
 * ويعيد الجواب إلى من سأل. وطلبٌ واحدٌ في وقتٍ واحد: سؤالان معاً لا يقعان.
 *
 * والإغلاق بلا اختيار = رفض: صمتٌ عن فعلٍ خطِر يُقرأ «لا» لا «نعم». وفي طلب
 * النصّ يُقرأ إلغاءً — `null` لا نصّاً فارغاً، فالفرق بينهما أن الفارغ يمسح
 * الرابط والإلغاء يتركه.
 */
export default function DialogHost() {
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => subscribeToConfirms((next) => setConfirmRequest(next)), []);

  useEffect(
    () =>
      subscribeToPrompts((next) => {
        setValue(next.defaultValue ?? "");
        setPromptRequest(next);
      }),
    []
  );

  // التركيز على الحقل فور ظهوره: الطلب سؤالٌ، ومن يُسأل يكتب فوراً.
  useEffect(() => {
    if (promptRequest) inputRef.current?.focus();
  }, [promptRequest]);

  const answerConfirm = (ok: boolean) => {
    confirmRequest?.resolve(ok);
    setConfirmRequest(null);
  };

  const answerPrompt = (text: string | null) => {
    promptRequest?.resolve(text);
    setPromptRequest(null);
  };

  return (
    <>
      {confirmRequest && (
        <ConfirmDialog
          title={confirmRequest.title}
          message={confirmRequest.message}
          confirmLabel={confirmRequest.confirmLabel ?? "تأكيد"}
          tone={confirmRequest.tone ?? "danger"}
          variant={confirmRequest.variant ?? "soft"}
          onConfirm={() => answerConfirm(true)}
          onCancel={() => answerConfirm(false)}
        />
      )}

      {promptRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => answerPrompt(null)}
          />
          <form
            role="dialog"
            aria-modal="true"
            aria-label={promptRequest.title}
            onSubmit={(e) => {
              e.preventDefault();
              answerPrompt(value);
            }}
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-700/50 dark:bg-slate-800"
          >
            <h3 className="mb-1 text-lg font-bold text-slate-800 dark:text-slate-100">
              {promptRequest.title}
            </h3>
            {promptRequest.message && (
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{promptRequest.message}</p>
            )}

            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") answerPrompt(null);
              }}
              placeholder={promptRequest.placeholder}
              aria-label={promptRequest.label ?? promptRequest.title}
              className={cx(field, "mt-2")}
            />

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => answerPrompt(null)}
                className={cx(btn.secondary, "flex-1")}
              >
                إلغاء
              </button>
              <button type="submit" className={cx(btn.primary, "flex-1")}>
                {promptRequest.confirmLabel ?? "حفظ"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
