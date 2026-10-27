"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ListPlus, Percent, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { notify } from "@/components/console/toastBus";
import { Spinner, btn, cx, field } from "@/components/console/ui";
import { isValidVatRate } from "@/lib/financialRequest";
import {
  addFinancialType,
  listFinancialTypes,
  moveFinancialType,
  reactivateFinancialType,
  removeFinancialType,
  renameFinancialType,
  setVatRate,
} from "@/app/actions/financialSettings";

type TypeRow = { id: string; name: string; order: number; isActive: boolean; usage: number };

/**
 * إعداداتُ صفحة الطلبات المالية — نسبةُ الضريبة وأنواعُ الطلب.
 *
 * وموضعُها في الصفحة التي تُستعمل فيها لا في شاشةٍ عامّةٍ للإعدادات: المكانُ
 * الذي تُقرأ فيه القائمة هو مكانُ تعديلها، كما في حالات الخطة الاستراتيجية.
 */
export default function FinancialSettingsSheet({
  vatRate, onClose, onSaved,
}: {
  vatRate: number;
  onClose: () => void;
  /** يُنعش الصفحة: النسبةُ والأنواعُ تُقرآن في الخادم عند الرسم. */
  onSaved: () => void;
}) {
  const [rate, setRate] = useState(String(vatRate));
  const [types, setTypes] = useState<TypeRow[] | null>(null);
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [removing, setRemoving] = useState<TypeRow | null>(null);
  const [busy, startBusy] = useTransition();

  const reload = () => {
    void listFinancialTypes()
      .then(setTypes)
      .catch((e) => notify("error", e instanceof Error ? e.message : "تعذّر قراءة الأنواع"));
  };

  // الأنواعُ كلُّها — المعطَّلةُ معها — تُقرأ عند الفتح. وصفحةُ الطلبات
  // تحمل المفعَّلةَ وحدها، فلا تكفي لإدارتها.
  useEffect(reload, []);

  const run = (fn: () => Promise<{ error?: string; deactivated?: boolean; reactivated?: boolean }>, done?: () => void) =>
    startBusy(async () => {
      const res = await fn();
      if (res.error) return notify("error", res.error);
      if (res.deactivated) notify("info", "النوع مستعملٌ في طلبٍ قائم، فعُطِّل بدل حذفه");
      if (res.reactivated) notify("info", "كان النوع معطَّلاً، فأُعيد تفعيله");
      reload();
      onSaved();
      done?.();
    });

  const rateValid = isValidVatRate(rate);
  const rateChanged = Number(rate) !== vatRate;

  return (
    <>
      <Dialog
        title="إعدادات الطلبات المالية"
        description="نسبةُ ضريبة القيمة المضافة وأنواعُ الطلب."
        icon={<ListPlus className="size-5" />}
        size="lg"
        onClose={onClose}
        busy={busy}
        footer={
          <button type="button" onClick={onClose} className={btn.secondary}>
            تمّ
          </button>
        }
      >
        <div className="space-y-6">
          {/* النسبة */}
          <section className="space-y-2">
            <h3 className="text-caption font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Percent className="size-3.5" /> نسبة ضريبة القيمة المضافة
            </h3>
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="w-32">
                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  inputMode="decimal"
                  className={cx(field, "tabular-nums")}
                />
              </div>
              <button
                type="button"
                disabled={busy || !rateValid || !rateChanged}
                onClick={() => run(() => setVatRate(rate))}
                className={btn.primary}
              >
                {busy ? <Spinner size={16} tone="onPrimary" /> : <Percent className="size-4" />}
                حفظ النسبة
              </button>
              <p className="w-full text-caption text-slate-500 dark:text-slate-400">
                تُطبَّق على ما يُرفع بعد الحفظ. والطلباتُ القائمة تحمل نسبتها وقت رفعها، فلا يتغيّر فيها شيء.
              </p>
              {!rateValid && <p className="w-full text-caption text-red-500">النسبة بين صفر ومئة</p>}
            </div>
          </section>

          {/* الأنواع */}
          <section className="space-y-2">
            <h3 className="text-caption font-semibold text-slate-500 dark:text-slate-400">أنواع الطلب</h3>

            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
              <div className="min-w-[170px] flex-1">
                <label className="mb-1 block text-caption font-semibold text-slate-500 dark:text-slate-400">
                  اسم النوع
                </label>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="مثل: سلفة مستديمة"
                  className={field}
                />
              </div>
              <button
                type="button"
                disabled={busy || !draftName.trim()}
                onClick={() => run(() => addFinancialType(draftName), () => setDraftName(""))}
                className={btn.primary}
              >
                {busy ? <Spinner size={16} tone="onPrimary" /> : <Plus className="size-4" />}
                إضافة
              </button>
            </div>

            {types === null ? (
              <p className="py-6 text-center text-caption text-slate-400">
                <Spinner size={16} /> جارٍ القراءة…
              </p>
            ) : (
              <ul className="space-y-2">
                {types.map((type, index) => (
                  <li
                    key={type.id}
                    className={cx(
                      "flex flex-wrap items-center gap-2 rounded-xl border p-3",
                      type.isActive
                        ? "border-slate-200 dark:border-slate-700"
                        : "border-slate-100 opacity-60 dark:border-slate-800"
                    )}
                  >
                    {editingId === type.id ? (
                      <>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={cx(field, "min-w-[150px] flex-1")}
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => renameFinancialType(type.id, editName), () => setEditingId(null))}
                          className={btn.primary}
                        >
                          حفظ
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className={btn.ghost}>
                          إلغاء
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-[150px] flex-1">
                          <span className="text-body text-slate-800 dark:text-slate-100">{type.name}</span>
                          {!type.isActive && (
                            <span className="mr-2 text-caption text-slate-400 dark:text-slate-500">(معطَّل)</span>
                          )}
                          {type.usage > 0 && (
                            <span className="mr-2 text-caption text-slate-400 dark:text-slate-500 tabular-nums">
                              {type.usage} طلب
                            </span>
                          )}
                        </span>

                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => run(() => moveFinancialType(type.id, "up"))}
                          aria-label={`تقديم ${type.name}`}
                          className={btn.icon}
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === types.length - 1}
                          onClick={() => run(() => moveFinancialType(type.id, "down"))}
                          aria-label={`تأخير ${type.name}`}
                          className={btn.icon}
                        >
                          <ArrowDown className="size-4" />
                        </button>

                        {type.isActive ? (
                          <>
                            <button
                              type="button"
                              onClick={() => { setEditingId(type.id); setEditName(type.name); }}
                              aria-label={`تعديل ${type.name}`}
                              className={btn.icon}
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoving(type)}
                              aria-label={`حذف ${type.name}`}
                              className={btn.iconDanger}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => reactivateFinancialType(type.id))}
                            className={btn.ghost}
                          >
                            <RotateCcw className="size-4" />
                            إعادة تفعيل
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-caption text-slate-500 dark:text-slate-400">
              تعديلُ المسمّى لا يُغيّر طلباً مرفوعاً: كلُّ طلبٍ يحمل مسمّى نوعه وقت رفعه.
            </p>
          </section>
        </div>
      </Dialog>

      {removing && (
        <ConfirmDialog
          variant="console"
          title={`حذف «${removing.name}»؟`}
          message={
            removing.usage > 0
              ? "النوع مستعملٌ في طلبٍ قائم، فسيُعطَّل بدل حذفه — ولا يختفي اسمٌ من وثيقةٍ معتمَدة."
              : "لم يُستعمل في طلبٍ بعد، فسيُحذف."
          }
          confirmLabel="حذف"
          isPending={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => run(() => removeFinancialType(removing.id), () => setRemoving(null))}
        />
      )}
    </>
  );
}
