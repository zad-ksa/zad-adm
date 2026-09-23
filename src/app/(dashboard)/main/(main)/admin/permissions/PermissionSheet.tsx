"use client";

import { useState, useTransition } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { SERVICE_LINKED_PERMISSION_IDS } from "@/lib/permissions";
import { setPermissionServices } from "@/app/actions/permissionBundles";
import {
  Badge,
  IconTile,
  MONO,
  NameList,
  Note,
  OptionRow,
  SectionHeader,
  SelectAll,
  btn,
  cx,
  toggleIn,
} from "@/components/console/ui";
import { FooterStatus, Sheet } from "@/components/console/overlays";

/**
 * لوحة الصلاحية: من يملكها ومن أين، وربطها بخدمة.
 *
 * الربط هو الموضع الوحيد الذي يُحرَّر منه: تختار خدمةً فتُمنح هذه الصلاحية
 * تلقائياً لكل من مُنحها. ولأن الخدمات تُنشأ وتُسمّى وتُحذف يدوياً، يُحفظ
 * الربط في القاعدة لا في الشيفرة — فيتبع التسمية ويزول مع الحذف.
 */
export function PermissionSheet({
  permission,
  holders,
  viaBundles,
  adminNames,
  serviceNames,
  linked,
  implies,
  carriedBy,
  onClose,
  onSaved,
}: {
  permission: { id: string; label: string };
  holders: string[];
  viaBundles: string[];
  adminNames: string[];
  serviceNames: string[];
  linked: string[];
  /** صلاحياتٌ تُمنح مع هذه تلقائياً — علاقةٌ في الشيفرة، للاطلاع. */
  implies: string[];
  /** صلاحياتٌ تمنح هذه تلقائياً — للاطلاع كذلك. */
  carriedBy: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(linked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty =
    selected.length !== linked.length || selected.some((s) => !linked.includes(s));

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await setPermissionServices(permission.id, selected);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSaved(
        selected.length === 0
          ? `أُلغي ربط «${permission.label}» بالخدمات`
          : `تُمنح «${permission.label}» الآن مع ${selected.length} خدمة`
      );
    });
  };

  return (
    <Sheet
      title={permission.label}
      subtitle={permission.id}
      leading={
        <IconTile>
          <KeyRound className="size-4" />
        </IconTile>
      }
      busy={isPending}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <FooterStatus error={error}>
            {selected.length === 0 ? (
              "غير مربوطة بخدمة"
            ) : (
              <>
                تُمنح مع <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{selected.length}</span> خدمة
              </>
            )}
          </FooterStatus>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className={btn.secondary}>
              {dirty ? "إلغاء" : "إغلاق"}
            </button>
            <button type="submit" disabled={isPending || !dirty} className={btn.primary}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-8">
        {SERVICE_LINKED_PERMISSION_IDS.includes(permission.id) && (
          <Note tone="brand">
            هذه الصلاحية لا تُمنح يدوياً لموظفٍ ولا لمسمّى ولا في مجموعة — تُنال بمنح خدمةٍ مربوطة بها أدناه، في الجمعيات
            المسنَدة للموظف وحدها.
          </Note>
        )}

        <NameList
          title="من يملكها"
          description="بعد جمع ما مُنح مباشرةً، وما جاء عبر المجموعات ومجموعات المسمى، وما يُمنح تلقائياً."
          names={holders}
          empty="لا يملكها أحد."
        />

        {adminNames.length > 0 && <Note tone="brand">ومدير النظام ({adminNames.join("، ")}) يمرّ بلا شرط.</Note>}

        <section className="space-y-2.5">
          <SectionHeader title="المجموعات التي تمنحها" />
          {viaBundles.length === 0 ? (
            <p className="text-body text-slate-500">لا تمنحها أي مجموعة.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {viaBundles.map((n) => (
                <Badge key={n} tone="brand">
                  {n}
                </Badge>
              ))}
            </div>
          )}
        </section>

        {implies.length > 0 && (
          <section className="space-y-2.5">
            <SectionHeader title="تمنح معها تلقائياً" />
            <div className="flex flex-wrap gap-1.5">
              {implies.map((n) => (
                <Badge key={n}>{n}</Badge>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionHeader
            title="تُمنح تلقائياً مع"
            description="اختر خدمةً فينالها كل من مُنح تلك الخدمة، في جلسته التالية. وتتبع الخدمة إن أُعيدت تسميتها، وتزول إن حُذفت."
            action={
              serviceNames.length > 0 ? (
                <SelectAll
                  count={selected.length}
                  total={serviceNames.length}
                  allOn={selected.length === serviceNames.length}
                  onClick={() => setSelected(selected.length === serviceNames.length ? [] : [...serviceNames])}
                />
              ) : undefined
            }
          />

          {carriedBy.length > 0 && (
            <p className="text-meta text-slate-500">
              وتُمنح كذلك مع: {carriedBy.join("، ")} — علاقةٌ ثابتة في النظام.
            </p>
          )}

          {serviceNames.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-body text-slate-500 dark:border-slate-700">
              لا توجد خدمات بعد.
            </p>
          ) : (
            <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
              {serviceNames.map((s) => (
                <OptionRow
                  key={s}
                  label={s}
                  checked={selected.includes(s)}
                  onToggle={() => setSelected(toggleIn(selected, s))}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}
