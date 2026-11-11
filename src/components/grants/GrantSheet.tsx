"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/console/overlays";
import Select from "@/components/console/Select";
import { MONO, btn, cx, field } from "@/components/console/ui";
import { notify } from "@/components/console/toastBus";
import { GRANT_STATUSES } from "@/lib/donorOrg";
import { addGrantApplication, updateGrantApplication } from "@/app/actions/charity";
import { confirmAndDeleteGrant } from "./deleteGrant";
import InitiativeNameField from "./InitiativeNameField";

export type GrantCharity = { id: string; name: string; isInternal?: boolean };
export type GrantDonor = { id: string; name: string };

/** المنحةُ المعدَّلة — بغيرها تكون اللوحةُ لوحةَ رفع. */
export type EditableGrant = {
  id: string;
  charityId: string;
  charityName: string;
  donorOrgId: string | null;
  initiativeName: string;
  requestedAmount: number;
  /** حالتُها — ليُقال في تأكيد الحذف ما لا يُحذف مع المعتمَدة. */
  status?: string;
};

/**
 * لوحةُ رفع منحةٍ أو تعديلِها — واحدةٌ لكلِّ موضعٍ يرفع منحةً أو يُعدِّلها.
 *
 * ولمَ مكوّنٌ مشترك: صفحةُ الجهة ترفع والجهةُ مثبَّتة، وجدولُ المنح يُعدِّل
 * والاثنان يُختاران، وصفحةُ منح الجمعية ترفع والجمعيةُ مثبَّتة. وثلاثةُ
 * نماذجَ لثلاثة مواضعَ تختلف بعد أوّلِ تعديلٍ في أحدها: يُضاف حقلٌ هنا ويُنسى
 * هناك، فيَرفع موظّفان منحتين ناقصةً إحداهما بحسب الصفحة التي كان فيها.
 *
 * **والجمعيةُ تُثبَّت في التعديل ولا تُعدَّل**: نقلُ منحةٍ من جمعيةٍ إلى أخرى
 * ليس تصحيحَ إدخال — المنحةُ المعتمدةُ لها سجلٌّ ماليٌّ في جمعيتها وأقساطٌ
 * جُدولت بها، فنقلُها يترك ذلك كلَّه حيث كان. والحارسُ في الخادم يرفضها
 * أصلاً، وهذا وجهُها في الواجهة.
 */
export default function GrantSheet({
  grant,
  donor,
  donorOptions,
  charities,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** بغيرها: رفعُ منحةٍ جديدة. */
  grant?: EditableGrant;
  /** جهةٌ مثبَّتةٌ لا تُختار — صفحةُ الجهة. */
  donor?: GrantDonor;
  /** جهاتٌ تُختار — يلزم أحدُهما: `donor` أو هذه. */
  donorOptions?: GrantDonor[];
  /** جمعياتٌ تُختار عند الرفع. تُهمَل عند التعديل: جمعيةُ المنحة مثبَّتة. */
  charities: GrantCharity[];
  onClose: () => void;
  onSaved: () => void;
  /**
   * حُذفت المنحةُ من داخل اللوحة. وبغيره لا يُعرض زرُّ الحذف: شاشةٌ لا تعرف
   * كيف تُحدِّث نفسَها بعد الحذف تُبقي صفّاً محذوفاً معروضاً.
   */
  onDeleted?: () => void;
}) {
  const editing = grant !== undefined;

  const [charityId, setCharityId] = useState(
    grant?.charityId ?? (charities.length === 1 ? charities[0].id : "")
  );
  const [donorOrgId, setDonorOrgId] = useState(donor?.id ?? grant?.donorOrgId ?? "");
  const [initiative, setInitiative] = useState(grant?.initiativeName ?? "");
  const [amount, setAmount] = useState(grant ? String(grant.requestedAmount) : "");
  const [status, setStatus] = useState("PENDING");
  const [busy, setBusy] = useState(false);

  /**
   * تبديلُ الجمعية يُفرِّغ اسمَ المشروع، ويُعاد بناءُ حقله من جديد
   * (`key={charityId}` أدناه) فتُنسى المبادرةُ المختارةُ وقائمتُها.
   *
   * فالمبادراتُ خطةُ جمعيةٍ بعينها: لو بقيت مختارةً بعد التبديل لرُفعت منحةٌ
   * لجمعيةٍ باسم مبادرةٍ من خطة غيرها — وهو خطأٌ لا يُرى في الجدول بعد الرفع.
   */
  const chooseCharity = (id: string) => {
    if (id === charityId) return;
    setCharityId(id);
    setInitiative("");
  };
  const save = () => {
    // `Select` زرٌّ لا حقلٌ في النموذج، فـ`required` لا يمسّه — والتحقّقُ هنا
    // صريحاً وإلّا مضى الإرسالُ بلا جمعيةٍ أو بلا جهة.
    if (!charityId) {
      notify("error", "اختر الجمعية");
      return;
    }
    if (!donorOrgId) {
      notify("error", "اختر الجهة المانحة");
      return;
    }
    // ولا يُتَّكل على `required` في الحقل: حين تُفتح قائمةُ المبادرات يغيب
    // الحقلُ عن النموذج، فيغيب حكمُه معه ويمضي الإرسالُ باسمٍ فارغ.
    if (initiative.trim() === "") {
      notify("error", "اكتب اسم المشروع أو اجلب مبادرةً من الخطة");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      notify("error", "المبلغ غير صالح");
      return;
    }

    setBusy(true);
    void (async () => {
      const res = editing
        ? await updateGrantApplication(grant.id, {
            initiativeName: initiative.trim(),
            requestedAmount: value,
            donorOrgId,
          })
        : await addGrantApplication(charityId, initiative.trim(), value, donorOrgId, status);
      setBusy(false);
      if (!res.success) {
        notify("error", res.message || (editing ? "تعذّر تعديل المنحة" : "تعذّر رفع المنحة"));
        return;
      }
      notify("ok", editing ? "حُفظت المنحة." : "رُفعت المنحة.");
      onSaved();
    })();
  };

  /** السؤالُ والفعلُ في `deleteGrant` المشترك، فلا تسأل اللوحةُ غيرَ ما يسأل الجدول. */
  const remove = () => {
    if (!grant || !onDeleted) return;
    setBusy(true);
    void (async () => {
      const done = await confirmAndDeleteGrant(grant);
      setBusy(false);
      if (done) onDeleted();
    })();
  };

  const donorList = donor ? [donor] : (donorOptions ?? []);

  return (
    <Sheet
      title={editing ? "تعديل المنحة" : "إضافة منحة"}
      subtitle={donor ? `إلى ${donor.name}` : editing ? grant.charityName : undefined}
      onClose={onClose}
      onSubmit={save}
      busy={busy}
      footer={
        <>
          <button type="submit" disabled={busy} className={btn.primary}>
            {editing ? "حفظ" : "رفع المنحة"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className={btn.ghost}>
            إلغاء
          </button>
          {/* الحذفُ في طرف الذيل لا بجوار «حفظ»: فعلٌ لا رجعةَ فيه لا يُجاور
              زرَّ الحفظ الذي تذهب إليه اليدُ بلا نظر. */}
          {editing && onDeleted && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className={cx(btn.ghost, "ms-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10")}
            >
              <Trash2 className="size-3.5" />
              حذف المنحة
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">الجمعية</span>
          {editing ? (
            // لا تُعدَّل، ولا تُعرض حقلاً مُعطَّلاً يُوهم أنّها ستُفتح يوماً.
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-body text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              {grant.charityName}
            </p>
          ) : (
            <Select
              value={charityId}
              onSelect={chooseCharity}
              placeholder="اختر الجمعية…"
              emptyLabel="لا جمعياتٍ مسنَدةً إليك"
              options={charities.map((c) => ({
                value: c.id,
                label: c.name,
                hint: c.isInternal ? "كيانٌ داخلي" : undefined,
              }))}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">الجهة المانحة</span>
          {donor ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-body text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              {donor.name}
            </p>
          ) : (
            <Select
              value={donorOrgId}
              onSelect={setDonorOrgId}
              placeholder="اختر الجهة…"
              emptyLabel="لا جهاتٍ مسجَّلة"
              options={donorList.map((d) => ({ value: d.id, label: d.name }))}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          )}
        </label>

        {/* اسمُ المشروع — حقلٌ واحدٌ مشتركٌ مع نموذج صفحةِ منح الجمعية:
            يُكتب باليد أو يُجلب من الخطة التشغيلية. و`key` هو الجمعية، فتبديلُها
            يُنشئ الحقلَ من جديدٍ بلا مبادرةٍ من خطةٍ أخرى. */}
        <InitiativeNameField
          key={charityId}
          charityId={charityId}
          value={initiative}
          onChange={setInitiative}
        />

        <label className="block space-y-1.5">
          <span className="block text-body font-medium text-slate-700 dark:text-slate-300">
            التكلفة الإجمالية (ريال)
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
        </label>

        {!editing && (
          <label className="block space-y-1.5">
            <span className="block text-body font-medium text-slate-700 dark:text-slate-300">حالة الطلب الأولية</span>
            <Select
              value={status}
              onSelect={setStatus}
              placeholder="حالة المنحة"
              // ولا «مغلقة»: الإغلاقُ يلزمه تاريخُه، ولا يكون لمنحةٍ تُرفع الآن.
              options={GRANT_STATUSES.filter((s) => s.value !== "CLOSED").map((s) => ({
                value: s.value,
                label: s.label,
              }))}
              className="w-full [&>button]:w-full [&>button]:justify-between"
            />
          </label>
        )}

        <p className="text-meta leading-5 text-slate-500 dark:text-slate-400">
          {editing
            ? "والحالةُ تُغيَّر من زرِّ الحالة في الجدول: الاعتمادُ يكتب سجلّاً ماليّاً للجمعية، فليس تعديلَ حقل."
            : "تُسجَّل المنحةُ باسم الجهة وقتَ الرفع، وتظهر في جدول المنح وفي صفحة الجهة وصفحة منح الجمعية."}
        </p>
      </div>
    </Sheet>
  );
}
