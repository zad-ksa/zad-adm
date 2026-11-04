"use client";

import { useState } from "react";
import { Dialog } from "@/components/console/Dialog";
import { MONO, btn, cx, field } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { grantStatusLabel } from "@/lib/donorOrg";
import { updateGrantApplicationStatus } from "@/app/actions/charity";

export type StatusTarget = {
  id: string;
  charityId: string;
  charityName: string;
  initiativeName: string;
  requestedAmount: number;
  status: string;
};

const money = (n: number) => n.toLocaleString("ar-SA-u-nu-latn", { maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

/**
 * تحويلُ حالةِ منحةٍ — وكلُّ حالةٍ تسأل عمّا تحتاجه وحدَه.
 *
 * فالحالاتُ الأربعُ ليست أربعَ قيمٍ لحقلٍ واحد:
 *
 *   · **مقبولة** تكتب سجلّاً ماليّاً للجمعية بالمبلغ المعتمد، وتُجدوِل أقساطَ
 *     العقد «المرتبطة بأول منحة». فتُسأل عن المبلغ، ويُعبَّأ المطلوبُ سلفاً
 *     لأنّه الجوابُ في عامّة الحال — والمعتمدُ قد ينقص عنه فيُحرَّر.
 *   · **مغلقة** تلزمها تاريخُ الإغلاق، وبغيره يبقى الصفُّ «مغلقاً بلا يوم».
 *   · **قيد الدراسة** و**مرفوضة** لا تسألان شيئاً، فلا تُفتح لهما نافذةٌ
 *     تطلب تأكيداً لا معنى له.
 *
 * ولذلك لم يكن الفرزُ قائمةً منسدلةً تكتب الحالةَ مباشرةً: كانت تُحوِّل إلى
 * «مقبولة» بلا مبلغ، فلا يظهر للمنحة أثرٌ في المالية ولا يُعلم لماذا.
 */
export default function GrantStatusDialog({
  grant,
  next,
  onClose,
  onSaved,
}: {
  grant: StatusTarget;
  /** الحالةُ المقصودة. */
  next: "APPROVED" | "CLOSED";
  onClose: () => void;
  onSaved: () => void;
}) {
  const approving = next === "APPROVED";
  const [amount, setAmount] = useState(String(grant.requestedAmount));
  const [beneficiaries, setBeneficiaries] = useState("");
  const [collected, setCollected] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);

  const save = () => {
    if (approving) {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) {
        notify("error", "المبلغ المعتمد غير صالح");
        return;
      }
    } else if (!date) {
      notify("error", "حدِّد تاريخ الإغلاق");
      return;
    }

    setBusy(true);
    void (async () => {
      const res = approving
        ? await updateGrantApplicationStatus(
            grant.id,
            grant.charityId,
            "APPROVED",
            Number(amount),
            null,
            null,
            beneficiaries ? Number(beneficiaries) : undefined,
            collected ? Number(collected) : undefined
          )
        : await updateGrantApplicationStatus(
            grant.id,
            grant.charityId,
            "CLOSED",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            // تاريخُ يومٍ يُحفظ عند منتصف ليل UTC كما في بقيّة تواريخ الموقع،
            // فلا يَزحف يوماً عند القراءة في منطقةٍ أخرى.
            new Date(`${date}T00:00:00Z`)
          );
      setBusy(false);
      if (!res.success) {
        notify("error", res.message || "تعذّر تحديث الحالة");
        return;
      }
      notify("ok", approving ? "اعتُمدت المنحة." : "أُغلقت المنحة.");
      onSaved();
    })();
  };

  return (
    <Dialog
      title={approving ? "اعتماد المنحة" : "إغلاق المنحة"}
      description={`${grant.initiativeName} — ${grant.charityName}`}
      size="sm"
      onClose={onClose}
      busy={busy}
      closeOnBackdrop={false}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      footer={
        <>
          <button type="submit" disabled={busy} className={btn.primary}>
            {approving ? "اعتماد" : "إغلاق"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {approving ? (
          <>
            <label className="block space-y-1.5">
              <span className="block text-body font-medium text-slate-700 dark:text-slate-300">
                المبلغ المعتمد (ريال)
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                type="number"
                min="1"
                step="1"
                dir="ltr"
                className={cx(field, MONO)}
              />
              <span className="block text-meta text-slate-500 dark:text-slate-400">
                المطلوبُ في الطلب {money(grant.requestedAmount)} ريال.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="block text-body font-medium text-slate-700 dark:text-slate-300">
                  عددُ المستفيدين
                  <span className="ms-1 text-meta font-normal text-slate-400">اختياري</span>
                </span>
                <input
                  value={beneficiaries}
                  onChange={(e) => setBeneficiaries(e.target.value)}
                  type="number"
                  min="0"
                  dir="ltr"
                  className={cx(field, MONO)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="block text-body font-medium text-slate-700 dark:text-slate-300">
                  المبلغ المحصَّل
                  <span className="ms-1 text-meta font-normal text-slate-400">اختياري</span>
                </span>
                <input
                  value={collected}
                  onChange={(e) => setCollected(e.target.value)}
                  type="number"
                  min="0"
                  dir="ltr"
                  className={cx(field, MONO)}
                />
              </label>
            </div>
            <p className="text-meta leading-5 text-slate-500 dark:text-slate-400">
              يُكتب بالاعتماد سجلٌّ ماليٌّ للجمعية بالمبلغ المعتمد، وتُجدوَل أقساطُ العقد المرتبطةُ
              بأوّل منحةٍ إن كانت بلا تاريخ.
            </p>
          </>
        ) : (
          <label className="block space-y-1.5">
            <span className="block text-body font-medium text-slate-700 dark:text-slate-300">تاريخ الإغلاق</span>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              type="date"
              dir="ltr"
              className={cx(field, MONO)}
            />
            <span className="block text-meta text-slate-500 dark:text-slate-400">
              الحالةُ الآن: {grantStatusLabel(grant.status)}.
            </span>
          </label>
        )}
      </div>
    </Dialog>
  );
}
