"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Layers, LoaderCircle } from "lucide-react";
import { setEmployeeBundles } from "@/app/actions/permissionBundles";
import { Avatar, MONO, OptionRow, SectionHeader, btn, cx, toggleIn } from "@/components/console/ui";
import { EmptyState } from "@/components/console/layout";
import { FooterStatus, Sheet } from "@/components/console/overlays";
import type { BundleRow, PermEmployee } from "./types";

/**
 * مجموعات موظفٍ واحد، كاملةً. اختيار بعض ما في المجموعة مكانه نافذة الموظف في
 * «الموظفين»، لأنه منحٌ مباشر لا رابطٌ بالمجموعة.
 */
export function EmployeeBundlesSheet({
  employee,
  bundles,
  canManageEmployees,
  onClose,
  onSaved,
}: {
  employee: PermEmployee;
  bundles: BundleRow[];
  canManageEmployees: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(employee.bundleIds);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await setEmployeeBundles(employee.id, selected);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSaved(`تم تحديث مجموعات ${employee.name}`);
    });
  };

  return (
    <Sheet
      title={employee.name}
      subtitle={`${employee.roleLabel} · ${employee.effectiveCount} صلاحية فعّالة`}
      leading={<Avatar name={employee.name} size="lg" />}
      busy={isPending}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <FooterStatus error={error}>
            <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{selected.length}</span> مجموعة مباشرة
            {employee.roleBundleIds.length > 0 && (
              <>
                {" "}
                · <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{employee.roleBundleIds.length}</span> عبر المسمى
              </>
            )}
          </FooterStatus>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={isPending || bundles.length === 0} className={btn.primary}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              حفظ
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <SectionHeader
          title="مجموعات الصلاحيات"
          description="تُمنح كاملةً، وأي تعديلٍ على المجموعة يسري على الموظف تلقائياً. لاختيار بعض ما فيها افتح الموظف في «الموظفين»."
          action={
            canManageEmployees ? (
              <Link href="/main/employees" className={btn.link}>
                الموظفون
              </Link>
            ) : undefined
          }
        />
        {bundles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
            <EmptyState icon={<Layers className="size-5" />} title="لا توجد مجموعات بعد" description="أنشئ مجموعةً من تبويب «المجموعات» أولاً." />
          </div>
        ) : (
          <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 dark:border-slate-800">
            {bundles.map((b) => {
              const viaRole = employee.roleBundleIds.includes(b.id);
              return (
                <OptionRow
                  key={b.id}
                  label={b.name}
                  note={
                    viaRole
                      ? `عبر المسمى «${employee.roleLabel}» — تُدار من صفحة المسميات`
                      : b.description || `${b.permissions.length} صلاحية · ${b.services.length} خدمة`
                  }
                  checked={viaRole || selected.includes(b.id)}
                  locked={viaRole}
                  onToggle={() => setSelected(toggleIn(selected, b.id))}
                />
              );
            })}
          </div>
        )}
      </div>
    </Sheet>
  );
}
