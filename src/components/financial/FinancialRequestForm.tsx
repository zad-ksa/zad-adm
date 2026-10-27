"use client";

import { useMemo, useState, useTransition } from "react";
import Select from "@/components/console/Select";
import { Dialog } from "@/components/console/Dialog";
import { btn, cx } from "@/components/console/ui";
import { uploadFiles } from "@/lib/clientUpload";
import { ACCEPT_ATTRIBUTE, maxBytesFor, maxLabelFor } from "@/lib/uploadPurposes";
import {
  AlertCircle, ChevronDown, ChevronUp, FileText, Landmark, Loader2, Send, Trash2,
} from "lucide-react";
import {
  OTHER_TYPE_NAME, amounts, formatAmount, isPlausibleIban, parseAmount,
} from "@/lib/financialRequest";
import { createFinancialRequest, resubmitFinancialRequest } from "@/app/actions/financialRequests";

const MAX_BYTES = maxBytesFor("approval_attachment");
const MAX_LABEL = maxLabelFor("approval_attachment");

const inputClass =
  "w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block";

type RequestType = { id: string; name: string };

type Attachment = { name: string; url: string; publicId?: string; size?: number };

export type FinancialInitial = {
  id: string;
  title: string;
  body: string | null;
  attachments?: unknown;
  financial: {
    typeId: string | null;
    typeLabel: string;
    amount: string;
    isTaxable: boolean;
    bankName: string | null;
    iban: string | null;
    accountNumber: string | null;
  } | null;
};

/**
 * نموذجُ الطلب المالي — رفعاً وإعادةَ رفعٍ بنفس الحقول.
 *
 * ولا حقلَ أولوية: حُذفت من الطلب المالي، و`Request.priority` يُكتب `MEDIUM`
 * في الخادم بلا سؤال.
 */
export default function FinancialRequestForm({
  types, vatRate, hasActiveChain, initial, onClose, onDone,
}: {
  types: RequestType[];
  vatRate: number;
  /** بلا سلسلةٍ ماليةٍ نشطة لا يُرفع طلب: الخادم يرفضه، والزرّ هنا مغلق. */
  hasActiveChain: boolean;
  /** الطلبُ المُرجَع عند إعادة رفعه. */
  initial?: FinancialInitial;
  onClose: () => void;
  onDone: () => void;
}) {
  const isResubmit = Boolean(initial);
  const detail = initial?.financial ?? null;

  const [typeId, setTypeId] = useState(
    // نوعُ الطلب المُرجَع قد عُطِّل بين رفعه وإعادته — فلا يُفرض اختيارٌ لم
    // يبقَ في القائمة.
    detail?.typeId && types.some((t) => t.id === detail.typeId) ? detail.typeId : ""
  );
  const [otherLabel, setOtherLabel] = useState(() => {
    const label = detail?.typeLabel ?? "";
    const prefix = `${OTHER_TYPE_NAME} — `;
    return label.startsWith(prefix) ? label.slice(prefix.length) : "";
  });
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [amount, setAmount] = useState(detail ? String(Number(detail.amount)) : "");
  const [isTaxable, setIsTaxable] = useState(detail?.isTaxable ?? false);
  const [bankOpen, setBankOpen] = useState(
    Boolean(detail?.bankName || detail?.iban || detail?.accountNumber)
  );
  const [bankName, setBankName] = useState(detail?.bankName ?? "");
  const [iban, setIban] = useState(detail?.iban ?? "");
  const [accountNumber, setAccountNumber] = useState(detail?.accountNumber ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(
    Array.isArray(initial?.attachments) ? (initial?.attachments as Attachment[]) : []
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const selectedType = types.find((t) => t.id === typeId) ?? null;
  const needsOther = selectedType?.name === OTHER_TYPE_NAME;

  // الإجمالي حال الكتابة — بالدالّة المختبَرة نفسها التي يحسب بها الخادم
  // والبطاقة والـPDF، فلا رقمَ يختلف بين موضعين.
  const totals = useMemo(
    () => amounts({ amount, isTaxable, taxRate: vatRate }),
    [amount, isTaxable, vatRate]
  );
  const amountValid = parseAmount(amount) !== null;
  const ibanValid = !iban.trim() || isPlausibleIban(iban);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const tooBig = files.filter((f) => f.size > MAX_BYTES);
    if (tooBig.length) {
      setError(`تجاوز الحد (${MAX_LABEL}): ${tooBig.map((f) => f.name).join("، ")}`);
      return;
    }

    setIsUploading(true);
    setError("");
    try {
      const uploaded = await uploadFiles(files, "approval_attachment", (p) =>
        setUploadStatus(
          p.total > 1
            ? `جارٍ رفع ${p.index} من ${p.total}: ${p.fileName}${p.percent !== null ? ` — ${p.percent}%` : ""}`
            : `جارٍ الرفع${p.percent !== null ? ` — ${p.percent}%` : ""}`
        )
      );
      setAttachments((prev) => [
        ...prev,
        ...uploaded.map((u) => ({ name: u.name, url: u.url, publicId: u.publicId, size: u.size })),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل رفع الملف");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  }

  function handleSubmit() {
    if (!typeId) { setError("اختر نوع الطلب"); return; }
    if (needsOther && !otherLabel.trim()) { setError("حدّد نوع الطلب"); return; }
    if (!title.trim()) { setError("عنوان الطلب مطلوب"); return; }
    if (!body.trim()) { setError("تفاصيل الطلب مطلوبة"); return; }
    if (!amountValid) { setError("المبلغ غير صحيح — أدخل رقماً أكبر من صفر"); return; }
    if (!ibanValid) { setError("الآيبان غير صحيح — حرفان ثم أرقام وحروف"); return; }

    setError("");
    const payload = {
      typeId,
      otherLabel: needsOther ? otherLabel : undefined,
      title,
      body,
      amount,
      isTaxable,
      bankName: bankOpen ? bankName : "",
      iban: bankOpen ? iban : "",
      accountNumber: bankOpen ? accountNumber : "",
      attachments,
    };

    startTransition(async () => {
      try {
        if (isResubmit && initial) {
          await resubmitFinancialRequest({ ...payload, requestId: initial.id });
        } else {
          await createFinancialRequest(payload);
        }
        onDone();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "فشل إرسال الطلب");
      }
    });
  }

  return (
    <Dialog
      title={isResubmit ? "إعادة إرسال الطلب المالي" : "طلب مالي جديد"}
      onClose={onClose}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>إلغاء</button>
          <button type="button" onClick={handleSubmit}
            disabled={isPending || isUploading || !hasActiveChain}
            title={hasActiveChain ? undefined : "لا توجد سلسلة اعتماد مالية نشطة حالياً، راجع مسؤول النظام"}
            className={btn.primary}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isPending ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {!hasActiveChain && (
          <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            لا توجد سلسلة اعتماد مالية نشطة حالياً، راجع مسؤول النظام.
          </p>
        )}

        <div>
          <label className={labelClass}>نوع الطلب *</label>
          <Select
            variant="soft"
            value={typeId}
            onSelect={setTypeId}
            placeholder="اختر نوع الطلب…"
            options={types.map((t) => ({ value: t.id, label: t.name }))}
            className="w-full [&>button]:w-full [&>button]:justify-between"
          />
        </div>

        {needsOther && (
          <div>
            <label className={labelClass}>حدّد النوع *</label>
            <input value={otherLabel} onChange={(e) => setOtherLabel(e.target.value)}
              placeholder="مثال: رسوم حكومية"
              className={inputClass} />
            <p className="text-[11px] text-slate-400 mt-1">يُثبَّت في الطلب هكذا: «{OTHER_TYPE_NAME} — {otherLabel.trim() || "…"}»</p>
          </div>
        )}

        <div>
          <label className={labelClass}>عنوان الطلب *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="أدخل عنوان الطلب..." className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>تفاصيل الطلب *</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
            placeholder="اكتب تفاصيل الطلب هنا..."
            className={cx(inputClass, "resize-none")} />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div>
            <label className={labelClass}>المبلغ (ريال) *</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal" placeholder="0.00"
              className={cx(inputClass, "tabular-nums")} />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              احتساب ضريبة القيمة المضافة ({formatAmount(vatRate)}٪)
            </span>
          </label>

          {amountValid && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "المبلغ", value: totals.amount },
                { label: "الضريبة", value: totals.taxAmount },
                { label: "الإجمالي", value: totals.total },
              ].map((cell) => (
                <div key={cell.label} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-2 py-1.5">
                  <p className="text-[10px] text-slate-400">{cell.label}</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">{formatAmount(cell.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* الحساب البنكي — قسمٌ قابلٌ للطيّ، وكلُّه اختياري */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button type="button" onClick={() => setBankOpen(!bankOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-primary" />
              الحساب البنكي <span className="font-normal text-slate-400">(اختياري)</span>
            </span>
            {bankOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {bankOpen && (
            <div className="px-3 pb-3 pt-1 space-y-3 border-t border-slate-100 dark:border-slate-700">
              <div>
                <label className={labelClass}>اسم البنك</label>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثال: مصرف الراجحي" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>الآيبان</label>
                <input value={iban} onChange={(e) => setIban(e.target.value)} dir="ltr"
                  placeholder="SA0000000000000000000000"
                  className={cx(inputClass, "tabular-nums text-left")} />
                {!ibanValid && (
                  <p className="text-[11px] text-red-500 mt-1">صيغة الآيبان غير صحيحة</p>
                )}
              </div>
              <div>
                <label className={labelClass}>رقم الحساب <span className="font-normal text-slate-400">(اختياري)</span></label>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} dir="ltr"
                  className={cx(inputClass, "tabular-nums text-left")} />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={cx(labelClass, "flex items-center gap-1")}>
            <FileText className="w-3 h-3" /> المرفقات <span className="font-normal text-slate-400">(اختيارية — بحد أقصى {MAX_LABEL} للملف)</span>
          </label>
          <div className="space-y-2">
            <input type="file" multiple accept={ACCEPT_ATTRIBUTE} onChange={handleFileUpload}
              disabled={isUploading || isPending}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors cursor-pointer" />
            {isUploading && <p className="text-xs text-primary animate-pulse">{uploadStatus || "جاري الرفع..."}</p>}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((att, i) => (
                  <div key={`${att.url}-${i}`} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-medium truncate" title={att.name}>{att.name}</span>
                      {att.size && <span className="text-[10px] text-slate-400 shrink-0">({(att.size / 1024 / 1024).toFixed(2)} MB)</span>}
                    </div>
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}
      </div>
    </Dialog>
  );
}
