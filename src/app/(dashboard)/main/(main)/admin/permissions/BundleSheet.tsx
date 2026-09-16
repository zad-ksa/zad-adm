"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Layers, LoaderCircle, Trash2 } from "lucide-react";
import {
  ALL_PERMISSIONS,
  IMPLIES,
  PERMISSION_GROUPS,
  SERVICE_LINKED_PERMISSION_IDS,
  effectivePermissions,
} from "@/lib/permissions";
import { createBundle, deleteBundle, setBundleEmployees, updateBundle } from "@/app/actions/permissionBundles";
import {
  Badge,
  Field,
  IconTile,
  MONO,
  Note,
  OptionRow,
  SectionHeader,
  SelectAll,
  btn,
  cx,
  field,
  toggleIn,
} from "@/components/console/ui";
import { SearchField, Tabs } from "@/components/console/layout";
import { ConfirmDialog, FooterStatus, Sheet } from "@/components/console/overlays";
import type { BundleRow, PermEmployee, RoleRow } from "./types";

type Tab = "details" | "permissions" | "services" | "holders";

const LABEL = new Map(ALL_PERMISSIONS.map((p) => [p.id, p.label]));

/**
 * إنشاء مجموعة أو تعديلها: التعريف، والصلاحيات، والخدمات، والحاملون.
 *
 * الحاملون فعلٌ ثانٍ على جدولٍ ثانٍ، ويجري بعد وجود المجموعة: المجموعة الجديدة
 * لا معرّف لها قبل إنشائها، فلا تُمنح لأحد قبله.
 */
export function BundleSheet({
  bundle,
  employees,
  roles,
  serviceNames,
  onClose,
  onSaved,
}: {
  bundle: BundleRow | null;
  employees: PermEmployee[];
  roles: RoleRow[];
  serviceNames: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isNew = bundle === null;
  const [tab, setTab] = useState<Tab>("details");
  const [name, setName] = useState(bundle?.name ?? "");
  const [description, setDescription] = useState(bundle?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(bundle?.permissions ?? []);
  const [services, setServices] = useState<string[]>(bundle?.services ?? []);
  const [holderIds, setHolderIds] = useState<string[]>(bundle?.employeeIds ?? []);
  const [permQuery, setPermQuery] = useState("");
  const [holderQuery, setHolderQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ما يُمنح تلقائياً مع المختار — يُعرض محدداً ومقفلاً، فلا يُظنّ ناقصاً.
  const effective = useMemo(() => effectivePermissions(permissions), [permissions]);
  const impliedBy = (id: string) => permissions.find((held) => held !== id && IMPLIES[held]?.includes(id));

  const linkedRoles = roles.filter((r) => bundle?.roleIds.includes(r.id));

  const save = () => {
    setError(null);
    if (!name.trim()) {
      setTab("details");
      setError("اسم المجموعة مطلوب");
      return;
    }
    if (permissions.length === 0 && services.length === 0) {
      setTab("permissions");
      setError("اختر صلاحيةً أو خدمةً واحدة على الأقل");
      return;
    }
    const payload = { name, description, permissions, services };
    startTransition(async () => {
      let bundleId: string;
      if (bundle) {
        const res = await updateBundle(bundle.id, payload);
        if (!res.success) {
          setError(res.error);
          return;
        }
        bundleId = bundle.id;
      } else {
        const res = await createBundle(payload);
        if (!res.success) {
          setError(res.error);
          return;
        }
        bundleId = res.id;
      }
      const linked = await setBundleEmployees(bundleId, holderIds);
      if (!linked.success) {
        setError(linked.error);
        return;
      }
      onSaved(bundle ? `تم حفظ «${name.trim()}»` : `تم إنشاء «${name.trim()}»`);
    });
  };

  const remove = () => {
    if (!bundle) return;
    startTransition(async () => {
      const res = await deleteBundle(bundle.id);
      setConfirmDelete(false);
      if (!res.success) {
        setError(res.error);
        return;
      }
      onSaved(`حُذفت «${bundle.name}»`);
    });
  };

  const q = permQuery.trim();
  // صلاحيات أقسام الجمعية تُنال بربط الخدمة وحده، فلا تُعرض هنا.
  const groups = PERMISSION_GROUPS.map((g) => ({
    title: g.title,
    items: g.permissions.filter(
      (p) => !SERVICE_LINKED_PERMISSION_IDS.includes(p.id) && (!q || p.label.includes(q) || p.id.includes(q))
    ),
  })).filter((g) => g.items.length > 0);

  const hq = holderQuery.trim();
  const shownHolders = employees.filter((e) => !hq || e.name.includes(hq) || e.roleLabel.includes(hq));

  return (
    <>
      <Sheet
        title={isNew ? "مجموعة جديدة" : name || bundle.name}
        subtitle={
          isNew
            ? "اجمع صلاحياتٍ وخدماتٍ تُمنح معاً."
            : `${bundle.employeeIds.length} حامل · ${bundle.roleIds.length} مسمى مرتبط`
        }
        leading={
          <IconTile>
            <Layers className="size-4" />
          </IconTile>
        }
        busy={isPending}
        onClose={onClose}
        onSubmit={save}
        tabs={
          <Tabs
            inset
            label="أقسام المجموعة"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "details", label: "التفاصيل" },
              { id: "permissions", label: "الصلاحيات", count: effective.length },
              { id: "services", label: "الخدمات", count: services.length },
              { id: "holders", label: "الحاملون", count: holderIds.length },
            ]}
          />
        }
        footer={
          <>
            <FooterStatus error={error}>
              <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{effective.length}</span> صلاحية ·{" "}
              <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{services.length}</span> خدمة ·{" "}
              <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{holderIds.length}</span> حامل
            </FooterStatus>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onClose} disabled={isPending} className={btn.secondary}>
                إلغاء
              </button>
              <button type="submit" disabled={isPending} className={btn.primary}>
                {isPending && !confirmDelete && <LoaderCircle className="size-4 animate-spin" />}
                {isNew ? "إنشاء المجموعة" : "حفظ التغييرات"}
              </button>
            </div>
          </>
        }
      >
        {tab === "details" && (
          <div className="space-y-8">
            <section className="space-y-4">
              <SectionHeader title="التعريف" description="اسمٌ يصف القدرة لا الوظيفة: «مسؤول التحضير» لا «مساعد إداري»." />
              <Field id="bundle-name" label="اسم المجموعة">
                <input
                  id="bundle-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مسؤول التحضير"
                  maxLength={60}
                  autoFocus={isNew}
                  className={field}
                />
              </Field>
              <Field id="bundle-description" label="الوصف" hint="اختياري — لماذا توجد هذه المجموعة؟">
                <textarea
                  id="bundle-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                  className={cx(field, "h-auto py-2 leading-6")}
                />
              </Field>
            </section>

            <section className="space-y-3">
              <SectionHeader
                title="المسميات المرتبطة"
                description="كل من يحمل هذه المسميات يحمل المجموعة تلقائياً. الربط يُدار من صفحة المسميات الوظيفية."
                action={
                  <Link href="/main/employees/roles" className={btn.link}>
                    المسميات الوظيفية
                  </Link>
                }
              />
              {linkedRoles.length === 0 ? (
                <p className="text-[13px] text-slate-500">غير مرتبطة بأي مسمى.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {linkedRoles.map((r) => (
                    <Badge key={r.id} tone="gold">
                      {r.displayName} · {r.memberCount}
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {!isNew && (
              <section className="space-y-3">
                <SectionHeader title="منطقة الخطر" />
                <div className="flex flex-col gap-3 rounded-lg border border-red-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/25">
                  <div className="space-y-0.5">
                    <p className="text-[13.5px] font-medium">حذف المجموعة</p>
                    <p className="text-[12.5px] text-slate-500">
                      تُسحب عن حامليها ومسمياتها. ما مُنح للموظفين مباشرةً لا يُمسّ.
                    </p>
                  </div>
                  <button type="button" onClick={() => setConfirmDelete(true)} disabled={isPending} className={btn.danger}>
                    <Trash2 className="size-4" />
                    حذف
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "permissions" && (
          <div className="space-y-4">
            <SearchField value={permQuery} onChange={setPermQuery} placeholder="ابحث في الصلاحيات" label="بحث في الصلاحيات" />
            {groups.length === 0 && <p className="py-6 text-center text-[13px] text-slate-500">لا صلاحية تطابق «{q}»</p>}
            {groups.map((g) => {
              const free = g.items.filter((p) => permissions.includes(p.id) || !impliedBy(p.id)).map((p) => p.id);
              const allOn = free.length > 0 && free.every((id) => permissions.includes(id));
              const onCount = g.items.filter((p) => effective.includes(p.id)).length;
              return (
                <div key={g.title} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
                    <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">{g.title}</span>
                    <SelectAll
                      count={onCount}
                      total={g.items.length}
                      allOn={allOn}
                      onClick={() =>
                        setPermissions(
                          allOn ? permissions.filter((id) => !free.includes(id)) : [...new Set([...permissions, ...free])]
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-x-2 p-1.5 sm:grid-cols-2">
                    {g.items.map((p) => {
                      const chosen = permissions.includes(p.id);
                      const by = chosen ? undefined : impliedBy(p.id);
                      return (
                        <OptionRow
                          key={p.id}
                          label={p.label}
                          checked={chosen || !!by}
                          locked={!!by}
                          note={by ? `تلقائياً مع «${LABEL.get(by) ?? by}»` : undefined}
                          onToggle={() => setPermissions(toggleIn(permissions, p.id))}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "services" && (
          <div className="space-y-3">
            <SectionHeader
              title="الخدمات التي تفتحها"
              description="تُفتح لحامل المجموعة في «عرض الخدمات» داخل جمعياته المسندة وحدها. اتركها فارغةً إن لم تكن المجموعة معنيّةً بالخدمات."
              action={
                serviceNames.length > 0 ? (
                  <SelectAll
                    count={services.length}
                    total={serviceNames.length}
                    allOn={services.length === serviceNames.length}
                    onClick={() => setServices(services.length === serviceNames.length ? [] : [...serviceNames])}
                  />
                ) : undefined
              }
            />
            {serviceNames.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-[13px] text-slate-500 dark:border-slate-700">
                لا توجد خدمات بعد.
              </p>
            ) : (
              <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
                {serviceNames.map((s) => (
                  <OptionRow key={s} label={s} checked={services.includes(s)} onToggle={() => setServices(toggleIn(services, s))} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "holders" && (
          <div className="space-y-3">
            <SectionHeader
              title="الحاملون"
              description="يحملها هؤلاء مباشرةً، إضافةً إلى كل من يحمل مسمى مرتبطاً بها."
              action={
                employees.length > 0 ? (
                  <SelectAll
                    count={holderIds.length}
                    total={employees.length}
                    allOn={holderIds.length === employees.length}
                    onClick={() => setHolderIds(holderIds.length === employees.length ? [] : employees.map((e) => e.id))}
                  />
                ) : undefined
              }
            />
            <SearchField value={holderQuery} onChange={setHolderQuery} placeholder="ابحث بالاسم أو المسمى" label="بحث في الموظفين" />
            {shownHolders.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-slate-500">لا موظف يطابق «{hq}»</p>
            ) : (
              <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
                {shownHolders.map((e) => (
                  <OptionRow
                    key={e.id}
                    label={e.name}
                    note={e.isAdmin ? `${e.roleLabel} · يملك كل شيء أصلاً` : e.roleLabel}
                    checked={holderIds.includes(e.id)}
                    onToggle={() => setHolderIds(toggleIn(holderIds, e.id))}
                  />
                ))}
              </div>
            )}
            {linkedRoles.length > 0 && (
              <Note tone="brand">
                ويحملها عبر المسمى: {linkedRoles.map((r) => `${r.displayName} (${r.memberCount})`).join("، ")}.
              </Note>
            )}
          </div>
        )}
      </Sheet>

      {confirmDelete && bundle && (
        <ConfirmDialog
          title={`حذف «${bundle.name}»؟`}
          body={`تُسحب صلاحياتها وخدماتها عن ${bundle.employeeIds.length} موظف${
            bundle.roleIds.length ? ` و${bundle.roleIds.length} مسمى` : ""
          }. ما مُنح لكل موظف مباشرةً لا يُمسّ، ولا يمكن التراجع.`}
          confirmLabel="حذف المجموعة"
          busy={isPending}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
