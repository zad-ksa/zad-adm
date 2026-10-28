"use client";

import { useState } from "react";
import { MONO, btn, cx, field } from "@/components/console/ui";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import { notify } from "@/components/console/toastBus";
import { INTAKE_STATUSES, type IntakeStatus } from "@/lib/donorOrg";
import { createDonorOrg, updateDonorOrg } from "@/app/actions/donorOrgs";
import type { DonorRow } from "./donorData";

/**
 * لوحةُ إضافة جهةٍ وتعديلها.
 *
 * والرقمان معروضان فيها غيرَ قابلين للكتابة، ومعهما سطرٌ يقول من أين جاءا —
 * فحقلٌ رقميٌّ معطَّلٌ بلا تفسيرٍ يُقرأ كأنه نسي التحديث.
 */
export default function DonorSheet({
  row,
  kind,
  counts,
  onClose,
  onSaved,
}: {
  row: DonorRow | null;
  /** نوعُ الجهة — يُمرَّر كما هو فلا يُحوَّل صفُّ إحسان إلى مؤسسةٍ بحفظة. */
  kind: string;
  counts: { charities: number; grants: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [url, setUrl] = useState(row?.url ?? "");
  const [fields, setFields] = useState(row?.fields ?? "");
  const [status, setStatus] = useState<IntakeStatus>(row?.intakeStatus ?? "CLOSED");
  const [opensAt, setOpensAt] = useState(row?.opensAtInput ?? "");
  const [closesAt, setClosesAt] = useState(row?.closesAtInput ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const save = () => {
    setBusy(true);
    void (async () => {
      const input = {
        name,
        url: url || null,
        fields: fields || null,
        kind,
        intakeStatus: status,
        opensAt: opensAt || null,
        closesAt: closesAt || null,
        notes: notes || null,
      };
      const res = row ? await updateDonorOrg(row.id, input) : await createDonorOrg(input);
      setBusy(false);
      if (!res.ok) {
        notify("error", res.error);
        return;
      }
      notify("ok", row ? "حُفظ التعديل." : "أُضيفت الجهة.");
      onSaved();
    })();
  };

  return (
    <Sheet
      title={row ? row.name : "إضافة جهة مانحة"}
      subtitle={row ? "تعديلُ بيانات الجهة" : "بياناتُ الجهة تُعدَّل متى شئت"}
      onClose={onClose}
      onSubmit={save}
      busy={busy}
      footer={
        <>
          <button type="submit" disabled={busy} className={btn.primary}>
            {row ? "حفظ التعديل" : "إضافة"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">اسم الجهة</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={field} />
        </label>

        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">رابط بوّابة الجهة</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            dir="ltr"
            placeholder="https://…"
            className={field}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">مجالات الدعم</span>
          <textarea
            value={fields}
            onChange={(e) => setFields(e.target.value)}
            rows={4}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <span className="block text-body font-medium text-slate-700 dark:text-slate-300">حالة الرفع</span>
            <Select
              value={status}
              onSelect={(v) => setStatus(v === "OPEN" ? "OPEN" : "CLOSED")}
              placeholder="اختر الحالة"
              options={INTAKE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          </div>
          <label className="block space-y-1.5">
            <span className="block text-body font-medium text-slate-700 dark:text-slate-300">تاريخ الفتح</span>
            <input value={opensAt} onChange={(e) => setOpensAt(e.target.value)} type="date" className={field} />
          </label>
          <label className="block space-y-1.5">
            <span className="block text-body font-medium text-slate-700 dark:text-slate-300">تاريخ الإغلاق</span>
            <input value={closesAt} onChange={(e) => setClosesAt(e.target.value)} type="date" className={field} />
          </label>
        </div>

        <p className="text-meta leading-5 text-slate-500 dark:text-slate-400">
          الحالةُ هي ما يُعتمد عليه في الواجهة، والتاريخانِ بيانٌ معلن — فجهةٌ تُفتح بلا تاريخٍ، وأخرى
          تُغلق قبل موعدها. وإن خالفا الحالةَ قيل ذلك سطراً هادئاً ولم تُقلب الشارة.
        </p>

        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">ملاحظات</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cx(field, "h-auto py-2 leading-6")}
          />
        </label>

        {counts && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-body font-medium text-slate-700 dark:text-slate-300">أرقامٌ لا تُكتب</p>
            <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-meta text-slate-500">جمعياتُك التي رفعت</dt>
                <dd className={cx(MONO, "text-body font-semibold")}>{counts.charities}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-meta text-slate-500">إجماليُّ الطلبات</dt>
                <dd className={cx(MONO, "text-body font-semibold")}>{counts.grants}</dd>
              </div>
            </dl>
            <p className="mt-2 text-meta leading-5 text-slate-500">
              تُحسب من المنح المسجَّلة في الموقع لجمعياتك المسنَدة، فلا تُحرَّر هنا.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
