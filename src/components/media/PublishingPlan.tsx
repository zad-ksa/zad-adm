"use client";

import { useState, useTransition } from "react";
import { Check, ScrollText } from "lucide-react";
import { Note, Spinner, btn, cx, field } from "@/components/console/ui";
import { Sheet, FooterStatus } from "@/components/console/overlays";
import { notify } from "@/components/console/toastBus";
import {
  MAX_PUBLISHING_PLAN,
  PUBLISHING_PLAN_EMPTY,
  PUBLISHING_PLAN_HINT,
  PUBLISHING_PLAN_TITLE,
  cleanPublishingPlan,
  publishingPlanValue,
} from "@/lib/publishingPlan";

/**
 * زرُّ «خطة النشر» ولوحُه — واحدٌ للطرفين، ووظيفتُه بالجهة.
 *
 *   عند **زاد**: صندوقٌ يكتب فيه الموظَّفُ منهجَ النشر لهذه الجمعية ويحفظه.
 *   وعند **الجمعية**: المكتوبُ يُقرأ، لا أكثر.
 *
 * **والفرقُ `save` لا نسخةٌ ثانية**: بلا دالّةِ حفظٍ لا صندوقَ ولا زرَّ حفظ،
 * فلا يفترق اللوحان عند أوّل تعديلٍ في أحدهما. والحراسةُ في الفعل نفسِه كما في
 * بقيّة الصفحة — فإخفاءُ صندوقٍ ليس حراسة.
 */
export default function PublishingPlan({
  charityName,
  initialPlan,
  save,
}: {
  charityName: string;
  initialPlan: string | null;
  save?: (text: string) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [text, setText] = useState(initialPlan ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const show = () => {
    setError(null);
    setText(plan ?? "");
    setOpen(true);
  };

  const submit = () => {
    if (!save) return;
    setError(null);
    start(async () => {
      const result = await save(cleanPublishingPlan(text));
      if (result.error) {
        setError(result.error);
        return;
      }
      setPlan(publishingPlanValue(text));
      notify("ok", "تم حفظ خطة النشر");
      setOpen(false);
    });
  };

  return (
    <>
      <button type="button" onClick={show} className={cx(btn.ghost, "h-9")}>
        <ScrollText className="size-4" />
        {PUBLISHING_PLAN_TITLE}
        {/* نقطةٌ تقول «فيها مكتوب»: الجمعيةُ لا تفتح لوحاً لتجده فارغاً. */}
        {plan && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
      </button>

      {open && (
        <Sheet
          title={PUBLISHING_PLAN_TITLE}
          subtitle={charityName}
          leading={<ScrollText className="size-4 text-primary" />}
          onClose={() => setOpen(false)}
          busy={pending}
          footer={
            <FooterStatus error={error}>
              <button type="button" onClick={() => setOpen(false)} className={btn.ghost}>
                إغلاق
              </button>
              {save && (
                <button type="button" onClick={submit} className={btn.primary} disabled={pending}>
                  {pending ? <Spinner size={14} /> : <Check className="size-4" />}
                  حفظ
                </button>
              )}
            </FooterStatus>
          }
        >
          {save ? (
            <div className="space-y-2">
              <label htmlFor="publishing-plan" className="block text-meta font-semibold">
                {PUBLISHING_PLAN_TITLE}
              </label>
              <textarea
                id="publishing-plan"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_PUBLISHING_PLAN))}
                rows={14}
                placeholder="منهج النشر لهذا الشهر: المنصات، والوتيرة، والمحاور."
                className={cx(field, "h-auto resize-y py-2 leading-7")}
              />
              <p className="flex items-center justify-between text-caption text-slate-500">
                <span>{PUBLISHING_PLAN_HINT}</span>
                <span className="tabular-nums">
                  {text.length} / {MAX_PUBLISHING_PLAN}
                </span>
              </p>
            </div>
          ) : plan ? (
            <p className="whitespace-pre-wrap text-meta leading-7 text-slate-700 dark:text-slate-200">{plan}</p>
          ) : (
            <Note tone="brand">{PUBLISHING_PLAN_EMPTY}</Note>
          )}
        </Sheet>
      )}
    </>
  );
}
