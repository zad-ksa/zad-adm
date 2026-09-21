"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import { subscribeToConfirms, type ConfirmRequest } from "./confirmBus";
import { subscribeToPrompts, type PromptRequest } from "./promptBus";
import { btn, field } from "./ui";
import { Dialog } from "./Dialog";

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

  // التركيز على الحقل فور ظهوره يتولّاه Dialog عبر initialFocusRef.

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
        <Dialog
          size="sm"
          title={promptRequest.title}
          description={promptRequest.message}
          onClose={() => answerPrompt(null)}
          onSubmit={() => answerPrompt(value)}
          initialFocusRef={inputRef}
          footer={
            <>
              <button type="button" onClick={() => answerPrompt(null)} className={btn.secondary}>
                إلغاء
              </button>
              <button type="submit" className={btn.primary}>
                {promptRequest.confirmLabel ?? "حفظ"}
              </button>
            </>
          }
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={promptRequest.placeholder}
            aria-label={promptRequest.label ?? promptRequest.title}
            className={field}
          />
        </Dialog>
      )}
    </>
  );
}
