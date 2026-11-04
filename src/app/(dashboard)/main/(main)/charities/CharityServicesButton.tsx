"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Layers } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import { btn } from "@/components/console/ui";
import { setCharityServices } from "@/app/actions/charityServices";

/**
 * خدمات الجمعية في «إدارة الجمعيات»: قائمة خدمات الموقع، والمفعّلة منها محدَّدة.
 *
 * التحديد يُسند الخدمة فتُنشأ للجمعية خطةٌ فارغة فيها، وإلغاؤه يحذف خطتها. وهو
 * زرٌّ بجوار البطاقة لا داخلها: البطاقة رابطٌ إلى ملف الجمعية.
 */
export default function CharityServicesButton({
  charityId,
  charityName,
  enabled,
  allServices,
}: {
  charityId: string;
  charityName: string;
  enabled: string[];
  allServices: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(enabled);
  const [isPending, startTransition] = useTransition();

  const removed = enabled.filter((n) => !selected.includes(n));
  const added = selected.filter((n) => !enabled.includes(n));

  const openDialog = () => {
    setSelected(enabled);
    setOpen(true);
  };

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (removed.length > 0 && !(await confirmAction({
      title: `سيُلغى إسناد ${removed.length} خدمة عن ${charityName} (${removed.join("، ")})، وتُحذف خطط الجمعية فيها ومراحلها نهائياً. هل أنت متأكد؟`,
    }))) return;

    startTransition(async () => {
      const res = await setCharityServices(charityId, selected);
      if (!res.success) {
        notify("error", res.error);
        return;
      }
      notify("ok", res.added > 0
        ? `تم حفظ خدمات ${charityName}، وأُنشئت خطة فارغة لـ ${res.added} خدمة`
        : `تم حفظ خدمات ${charityName}`);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" onClick={openDialog} className={btn.ghost} title="الخدمات المفعّلة للجمعية">
        <Layers className="w-3.5 h-3.5" />
        الخدمات
      </button>

      {open && (
        <Dialog
          title={<>خدمات {charityName}</>}
          description="الخدمات المفعّلة للجمعية من خدمات الموقع. كل خدمة تُفعَّل تُنشأ للجمعية فيها خطة فارغة في «الخدمات ← الكل»."
          onClose={() => setOpen(false)}
          busy={isPending}
          onSubmit={save}
          footer={
            <>
              <button type="button" onClick={() => setOpen(false)} disabled={isPending} className={btn.secondary}>
                إلغاء
              </button>
              <button type="submit" disabled={isPending || (added.length === 0 && removed.length === 0)} className={btn.primary}>
                {isPending ? "جاري الحفظ..." : "حفظ الخدمات"}
              </button>
            </>
          }
        >
          {allServices.length === 0 ? (
            <p className="text-caption text-slate-400">لا توجد خدمات في الموقع بعد. تُنشأ من «إدارة الخدمات».</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                {allServices.map((name) => {
                  const on = selected.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggle(name)}
                      className={`w-full px-3 py-2 flex items-center gap-2.5 text-right transition-colors ${on ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"}`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"}`}>
                        {on && <Check className="w-3 h-3" />}
                      </span>
                      <span className="text-caption font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-slate-400">
                مفعّلة: {selected.length} من {allServices.length}
              </p>
              {removed.length > 0 && (
                <p className="text-caption font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
                  سيُلغى إسناد: {removed.join("، ")} — وتُحذف خطط الجمعية فيها نهائياً.
                </p>
              )}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
