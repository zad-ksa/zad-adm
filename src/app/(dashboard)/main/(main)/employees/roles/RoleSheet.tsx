"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { createRole, updateRole } from "@/app/actions/roles";
import { setRoleBundles } from "@/app/actions/permissionBundles";
import {
  ALL_PERMISSIONS,
  IMPLIES,
  PERMISSION_GROUPS,
  SERVICE_LINKED_PERMISSION_IDS,
  effectivePermissions,
} from "@/lib/permissions";
import {
  Badge,
  Field,
  IconTile,
  MONO,
  NameList,
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
import { FooterStatus, Sheet } from "@/components/console/overlays";
import type { RoleBundle, RoleRow } from "./types";

type Tab = "details" | "bundles" | "template" | "members";

const LABEL = new Map(ALL_PERMISSIONS.map((p) => [p.id, p.label]));

export function RoleSheet({
  role,
  bundles,
  canManagePermissions,
  onClose,
  onSaved,
  onRequestSync,
  onRequestDelete,
}: {
  role: RoleRow | null;
  bundles: RoleBundle[];
  canManagePermissions: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onRequestSync: (role: RoleRow) => void;
  onRequestDelete: (role: RoleRow) => void;
}) {
  const isNew = role === null;
  const adminRole = role?.key === "ADMIN";

  const [tab, setTab] = useState<Tab>("details");
  const [key, setKey] = useState(role?.key ?? "");
  const [displayName, setDisplayName] = useState(role?.displayName ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [bundleIds, setBundleIds] = useState<string[]>(role?.bundleIds ?? []);
  const [permQuery, setPermQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effective = useMemo(() => effectivePermissions(permissions), [permissions]);
  const impliedBy = (id: string) => permissions.find((held) => held !== id && IMPLIES[held]?.includes(id));

  const save = () => {
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setTab("details");
      setError("الاسم المعروض مطلوب");
      return;
    }
    if (isNew && !key.trim()) {
      setTab("details");
      setError("المعرّف مطلوب");
      return;
    }
    startTransition(async () => {
      if (role) {
        const res = await updateRole(role.id, { displayName: name, permissions });
        if (res.error) {
          setError(res.error);
          return;
        }
        // المجموعات جدولٌ آخر وفعلٌ آخر: updateRole لا يعرفها.
        const linked = await setRoleBundles(role.id, bundleIds);
        if (!linked.success) {
          setError(linked.error);
          return;
        }
        onSaved(`تم حفظ «${name}»`);
      } else {
        const res = await createRole({ key, displayName: name, permissions });
        if (res.error) {
          setError(res.error);
          return;
        }
        // الربط بعد الإنشاء لا قبله: المسمى الجديد لا معرّف له قبل أن يُنشأ.
        if (res.id && bundleIds.length) {
          const linked = await setRoleBundles(res.id, bundleIds);
          if (!linked.success) {
            setError(linked.error);
            return;
          }
        }
        onSaved(`تم إنشاء «${name}»`);
      }
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

  const members = role?.members ?? [];

  return (
    <Sheet
      title={isNew ? "مسمى جديد" : displayName || role.displayName}
      subtitle={isNew ? "صِف وظيفةً، ثم اربط بها ما يحتاجه حاملوها." : `${role.isSystem ? "دور أساسي" : "دور مخصص"} · ${members.length} موظف`}
      leading={
        <IconTile>
          <ShieldCheck className="size-4" />
        </IconTile>
      }
      busy={isPending}
      onClose={onClose}
      onSubmit={save}
      tabs={
        <Tabs
          inset
          label="أقسام المسمى"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "details", label: "التفاصيل" },
            { id: "bundles", label: "المجموعات", count: adminRole ? "—" : bundleIds.length },
            { id: "template", label: "القالب الافتراضي", count: adminRole ? "الكل" : effective.length },
            { id: "members", label: "الموظفون", count: members.length },
          ]}
        />
      }
      footer={
        <>
          <FooterStatus error={error}>
            {adminRole ? (
              "مدير النظام: وصول كامل"
            ) : (
              <>
                <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{bundleIds.length}</span> مجموعة ·{" "}
                <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{effective.length}</span> صلاحية في القالب
              </>
            )}
          </FooterStatus>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={isPending} className={btn.primary}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              {isNew ? "إنشاء المسمى" : "حفظ التغييرات"}
            </button>
          </div>
        </>
      }
    >
      {tab === "details" && (
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeader title="التعريف" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="role-name" label="الاسم المعروض">
                <input
                  id="role-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثال: مدير الموارد البشرية"
                  autoFocus={isNew}
                  className={field}
                />
              </Field>
              <Field
                id="role-key"
                label="المعرّف"
                hint={isNew ? "بالإنجليزية وفريد، ولا يُعدَّل بعد الإنشاء." : "لا يُعدَّل بعد الإنشاء."}
              >
                <input
                  id="role-key"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  disabled={!isNew}
                  dir="ltr"
                  placeholder="HR_MANAGER"
                  className={cx(field, MONO, "text-left")}
                />
              </Field>
            </div>
          </section>

          {!adminRole && (
            <Note tone="brand">
              تصل الصلاحيات حاملي المسمى بطريقين: <b>المجموعات</b> تسري حيّةً في جلستهم التالية، و<b>القالب الافتراضي</b>{" "}
              يُنسخ إلى صلاحياتهم المباشرة عند المزامنة وحدها ويستبدلها.
            </Note>
          )}

          {!isNew && !adminRole && (
            <section className="space-y-3">
              <SectionHeader title="مزامنة القالب" />
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="space-y-0.5">
                  <p className="text-body font-medium">
                    تطبيق القالب على <span className={MONO}>{members.length}</span> موظف
                  </p>
                  <p className="text-meta text-slate-500">تستعمل القالب المحفوظ — احفظ تعديلاتك أولاً.</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestSync(role)}
                  disabled={isPending || members.length === 0}
                  className={btn.secondary}
                >
                  <RefreshCw className="size-4" />
                  مزامنة
                </button>
              </div>
            </section>
          )}

          {!isNew && !role.isSystem && (
            <section className="space-y-3">
              <SectionHeader title="منطقة الخطر" />
              <div className="flex flex-col gap-3 rounded-lg border border-red-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/25">
                <div className="space-y-0.5">
                  <p className="text-body font-medium">حذف المسمى</p>
                  <p className="text-meta text-slate-500">
                    {members.length > 0
                      ? `يحمله ${members.length} موظف — انقلهم إلى مسمى آخر أولاً.`
                      : "يُحذف المسمى وروابط مجموعاته، ولا يمكن التراجع."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestDelete(role)}
                  disabled={isPending || members.length > 0}
                  className={btn.danger}
                >
                  <Trash2 className="size-4" />
                  حذف
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "bundles" &&
        (adminRole ? (
          <Note tone="brand">مدير النظام يملك كل الصلاحيات تلقائياً، فلا حاجة لربط مجموعات به.</Note>
        ) : (
          <div className="space-y-3">
            <SectionHeader
              title="مجموعات الصلاحيات"
              description="تسري على كل من يحمل هذا المسمى بلا مزامنة، ولا تمسّ ما مُنح للموظف مباشرةً."
              action={
                canManagePermissions ? (
                  <Link href="/main/admin/permissions" className={btn.link}>
                    إدارة المجموعات
                  </Link>
                ) : undefined
              }
            />
            {bundles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-body text-slate-500 dark:border-slate-700">
                لا توجد مجموعات بعد — تُنشأ من صفحة الصلاحيات، ثم تُربط بالمسمى من هنا.
              </p>
            ) : (
              <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 dark:border-slate-800">
                {bundles.map((b) => (
                  <OptionRow
                    key={b.id}
                    label={b.name}
                    note={b.description || `${b.permissions.length} صلاحية · ${b.services.length} خدمة`}
                    checked={bundleIds.includes(b.id)}
                    onToggle={() => setBundleIds(toggleIn(bundleIds, b.id))}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

      {tab === "template" &&
        (adminRole ? (
          <Note tone="brand">مدير النظام يملك كل الصلاحيات تلقائياً، فلا قالب له.</Note>
        ) : (
          <div className="space-y-4">
            <Note tone="warn">
              القالب لا يصل أحداً وحده: يُنسخ إلى الموظفين عند «مزامنة القالب» فيستبدل صلاحياتهم المباشرة. للمنح الحيّ استعمل
              المجموعات.
            </Note>
            <SearchField value={permQuery} onChange={setPermQuery} placeholder="ابحث في الصلاحيات" label="بحث في الصلاحيات" />
            {groups.length === 0 && <p className="py-6 text-center text-body text-slate-500">لا صلاحية تطابق «{q}»</p>}
            {groups.map((g) => {
              const free = g.items.filter((p) => permissions.includes(p.id) || !impliedBy(p.id)).map((p) => p.id);
              const allOn = free.length > 0 && free.every((id) => permissions.includes(id));
              const onCount = g.items.filter((p) => effective.includes(p.id)).length;
              return (
                <div key={g.title} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
                    <span className="text-meta font-medium text-slate-700 dark:text-slate-300">{g.title}</span>
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
        ))}

      {tab === "members" && (
        <div className="space-y-4">
          <NameList
            title="من يحمل هذا المسمى"
            description="يشمل الحسابات الموقوفة. يُغيَّر مسمى الموظف من نافذته في «الموظفين»."
            names={members}
            empty="لا يحمله أحد بعد."
            action={
              <Link href="/main/employees" className={btn.link}>
                الموظفون
              </Link>
            }
          />
          {role?.isSystem && (
            <p className="flex items-center gap-2 text-meta text-slate-500">
              <Badge tone="gold">أساسي</Badge>
              مسمى من النظام — يُعدَّل ولا يُحذف.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
