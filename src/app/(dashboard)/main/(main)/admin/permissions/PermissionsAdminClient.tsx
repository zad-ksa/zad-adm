"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, KeyRound, Layers, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { ALL_PERMISSIONS, IMPLIES, PERMISSION_GROUPS, SERVICE_LINKED_PERMISSION_IDS } from "@/lib/permissions";
import { deleteBundle } from "@/app/actions/permissionBundles";
import { Avatar, AvatarStack, Badge, Count, Dot, IconTile, MONO, NameList, Note, SectionHeader, btn, cx } from "@/components/console/ui";
import {
  EmptyState,
  PageHeader,
  SearchField,
  Segmented,
  StatStrip,
  TableShell,
  Tabs,
  Th,
  rowClass,
  tbodyClass,
  theadRowClass,
} from "@/components/console/layout";
import { MenuItem, MenuSeparator, RowMenu, RowMenuTrigger, Sheet, useRowMenu } from "@/components/console/overlays";
import { Toast, useToast } from "@/components/console/Toast";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { BundleSheet } from "./BundleSheet";
import { PermissionSheet } from "./PermissionSheet";
import { EmployeeBundlesSheet } from "./EmployeeBundlesSheet";
import type { BundleRow, PermEmployee, PermissionsTab, RoleRow, ServiceRow } from "./types";

const LABEL = new Map(ALL_PERMISSIONS.map((p) => [p.id, p.label]));
const labelOf = (id: string) => LABEL.get(id) ?? id;
const carriedBy = (id: string) =>
  Object.entries(IMPLIES)
    .filter(([, implied]) => implied.includes(id))
    .map(([holder]) => holder);

type Detail = { kind: "permission"; id: string } | { kind: "service"; name: string } | null;
type MemberFilter = "all" | "with" | "without";
type CatalogFilter = "all" | "unheld";

/**
 * الصلاحيات، مرتّبةً كما ترتّبها لوحات إدارة الهوية والوصول:
 *   • المجموعات — الكائن الذي يُدار: يُنشأ ويُعدَّل ويُمنح.
 *   • الأعضاء — من يحمل ماذا، وتعديل مجموعات كل موظف.
 *   • الصلاحيات — كتالوج مرجعي: كل صلاحية، ومن يملكها فعلاً، ومن أين.
 *   • الخدمات — منحٌ باسم الخدمة، ومن تُفتح له.
 * كل صفٍّ يفتح لوحةً جانبية، والتبويب يُحفظ في الرابط.
 */
export default function PermissionsAdminClient({
  initialTab,
  holders,
  viaBundles,
  adminNames,
  services,
  serviceNames,
  employees,
  roles,
  bundles,
  linkedServices,
  charityPermissions,
  canManageEmployees,
}: {
  initialTab: PermissionsTab;
  holders: Record<string, string[]>;
  viaBundles: Record<string, string[]>;
  adminNames: string[];
  services: ServiceRow[];
  serviceNames: string[];
  employees: PermEmployee[];
  roles: RoleRow[];
  bundles: BundleRow[];
  /** لكل صلاحية: الخدمات التي تمنحها تلقائياً. */
  linkedServices: Record<string, string[]>;
  /** تبويبات بوابة الجمعيات — تُربط بخدمات من هنا، ولا تُمنح يدوياً. */
  charityPermissions: { id: string; label: string }[];
  canManageEmployees: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<PermissionsTab>(initialTab);
  const [bundleQuery, setBundleQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [serviceQuery, setServiceQuery] = useState("");
  const [editor, setEditor] = useState<{ bundle: BundleRow | null } | null>(null);
  const [member, setMember] = useState<PermEmployee | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [removing, setRemoving] = useState<BundleRow | null>(null);
  const { toast, setToast } = useToast();
  const menu = useRowMenu();

  const nameOf = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees]);
  const roleNameOf = useMemo(() => new Map(roles.map((r) => [r.id, r.displayName])), [roles]);
  const bundleNameOf = useMemo(() => new Map(bundles.map((b) => [b.id, b.name])), [bundles]);

  const unheldCount = ALL_PERMISSIONS.filter((p) => (holders[p.id] ?? []).length === 0).length;
  const withBundles = employees.filter((e) => e.bundleIds.length + e.roleBundleIds.length > 0).length;
  const assignments = bundles.reduce((n, b) => n + b.employeeIds.length, 0);

  const changeTab = (next: PermissionsTab) => {
    setTab(next);
    menu.close();
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const openCatalog = (filter: CatalogFilter) => {
    setCatalogFilter(filter);
    changeTab("catalog");
  };

  const afterSave = (text: string) => {
    setEditor(null);
    setMember(null);
    setToast({ tone: "ok", text });
    router.refresh();
  };

  const confirmRemove = () => {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const res = await deleteBundle(target.id);
      setRemoving(null);
      if (!res.success) {
        setToast({ tone: "error", text: res.error });
        return;
      }
      setToast({
        tone: "ok",
        text:
          res.affectedEmployees || res.affectedRoles
            ? `حُذفت «${target.name}» وسُحبت عن ${res.affectedEmployees} موظف و${res.affectedRoles} مسمى`
            : `حُذفت «${target.name}»`,
      });
      router.refresh();
    });
  };

  const bq = bundleQuery.trim();
  const shownBundles = bundles.filter((b) => !bq || b.name.includes(bq) || (b.description ?? "").includes(bq));

  const mq = memberQuery.trim();
  const shownMembers = employees.filter((e) => {
    const has = e.bundleIds.length + e.roleBundleIds.length > 0;
    if (memberFilter === "with" && !has) return false;
    if (memberFilter === "without" && has) return false;
    return !mq || e.name.includes(mq) || e.roleLabel.includes(mq);
  });

  const cq = catalogQuery.trim();
  const catalogGroups = PERMISSION_GROUPS.map((g) => ({
    title: g.title,
    items: g.permissions.filter(
      (p) =>
        (!cq || p.label.includes(cq) || p.id.includes(cq)) &&
        (catalogFilter === "all" || (holders[p.id] ?? []).length === 0)
    ),
  })).filter((g) => g.items.length > 0);
  const catalogCount = catalogGroups.reduce((n, g) => n + g.items.length, 0);

  const sq = serviceQuery.trim();
  const shownServices = services.filter((s) => !sq || s.name.includes(sq));

  const menuBundle = bundles.find((b) => b.id === menu.anchor?.id) ?? null;
  const detailPermission =
    detail?.kind === "permission"
      ? (ALL_PERMISSIONS.find((p) => p.id === detail.id) ??
         charityPermissions.find((p) => p.id === detail.id) ??
         null)
      : null;

  // تبويبات البوابة تتبع التصفية نفسها: بحثٌ بالاسم أو المعرّف، و«بلا حامل».
  const charityRows = charityPermissions.filter(
    (p) =>
      (!cq || p.label.includes(cq) || p.id.includes(cq)) &&
      (catalogFilter === "all" || (holders[p.id] ?? []).length === 0)
  );
  const detailService = detail?.kind === "service" ? (services.find((s) => s.name === detail.name) ?? null) : null;

  const showing = (shown: number, total: number) =>
    shown > 0 ? (
      <>
        عرض <span className={MONO}>{shown}</span> من <span className={MONO}>{total}</span>
      </>
    ) : undefined;

  return (
    <div className="space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "الصلاحيات" }]}
        title="الصلاحيات"
        description={
          <>
            اجمع الصلاحيات والخدمات في مجموعات، وامنحها لموظفين أو اربطها بمسميات وظيفية.
            {adminNames.length > 0 && <> ومدير النظام ({adminNames.join("، ")}) يمرّ بلا شرط.</>}
          </>
        }
        actions={
          <>
            {canManageEmployees && (
              <Link href="/main/employees" className={btn.secondary}>
                <Users className="size-4" />
                الموظفون
              </Link>
            )}
            <Link href="/main/employees/roles" className={btn.secondary}>
              <ShieldCheck className="size-4" />
              المسميات الوظيفية
            </Link>
            <button type="button" onClick={() => setEditor({ bundle: null })} className={btn.primary}>
              <Plus className="size-4" />
              مجموعة جديدة
            </button>
          </>
        }
      />

      <StatStrip
        items={[
          {
            label: "المجموعات",
            value: bundles.length,
            hint: `${assignments} إسناد لموظفين`,
            onClick: () => changeTab("bundles"),
            selected: tab === "bundles",
          },
          {
            label: "أعضاء بمجموعات",
            value: withBundles,
            hint: `من ${employees.length} موظفاً نشطاً`,
            onClick: () => {
              setMemberFilter("with");
              changeTab("members");
            },
            selected: tab === "members" && memberFilter === "with",
          },
          {
            label: "الصلاحيات",
            value: ALL_PERMISSIONS.length,
            hint: `في ${PERMISSION_GROUPS.length} فئات`,
            onClick: () => openCatalog("all"),
            selected: tab === "catalog" && catalogFilter === "all",
          },
          {
            label: "بلا حامل",
            value: unheldCount,
            hint: "صلاحيات لا يملكها أحد",
            dot: unheldCount > 0 ? "warn" : undefined,
            onClick: () => openCatalog("unheld"),
            selected: tab === "catalog" && catalogFilter === "unheld",
          },
        ]}
      />

      <Tabs
        label="أقسام الصلاحيات"
        value={tab}
        onChange={changeTab}
        tabs={[
          { id: "bundles", label: "المجموعات", count: bundles.length },
          { id: "members", label: "الأعضاء", count: employees.length },
          { id: "catalog", label: "الصلاحيات", count: ALL_PERMISSIONS.length },
          { id: "services", label: "الخدمات", count: services.length },
        ]}
      />

      {/* ── المجموعات ─────────────────────────────────────────────── */}
      {tab === "bundles" && (
        <div className="space-y-4">
          <SearchField
            className="sm:w-80"
            value={bundleQuery}
            onChange={setBundleQuery}
            placeholder="ابحث باسم المجموعة أو وصفها"
            label="بحث في المجموعات"
          />
          <TableShell
            footer={showing(shownBundles.length, bundles.length)}
            empty={
              shownBundles.length === 0 ? (
                <EmptyState
                  icon={<Layers className="size-5" />}
                  title={bundles.length === 0 ? "لا توجد مجموعات بعد" : "لا نتائج مطابقة"}
                  description={
                    bundles.length === 0
                      ? "المجموعة اسمٌ لعدّة صلاحيات وخدمات تُمنح معاً — «مسؤول التحضير» مثلاً. امنحها لموظفين، أو اربطها بمسمى وظيفي فتسري على كل من يحمله."
                      : "جرّب كلمة بحث أخرى."
                  }
                  action={
                    bundles.length === 0 ? (
                      <button type="button" onClick={() => setEditor({ bundle: null })} className={btn.primary}>
                        <Plus className="size-4" />
                        مجموعة جديدة
                      </button>
                    ) : undefined
                  }
                />
              ) : undefined
            }
          >
            <thead>
              <tr className={theadRowClass}>
                <Th>المجموعة</Th>
                <Th className="hidden md:table-cell">المحتوى</Th>
                <Th className="hidden sm:table-cell">الحاملون</Th>
                <Th className="hidden lg:table-cell">المسميات</Th>
                <th className="w-12" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {shownBundles.map((b) => (
                <tr key={b.id} onClick={() => setEditor({ bundle: b })} className={rowClass}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        <Layers className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">{b.name}</p>
                        <p className="max-w-[22rem] truncate text-[12.5px] text-slate-500 dark:text-slate-400">
                          {b.description || "بلا وصف"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate-600 dark:text-slate-300">
                      <Count n={b.permissions.length} unit="صلاحية" />
                      {b.services.length > 0 && (
                        <>
                          <Dot />
                          <Count n={b.services.length} unit="خدمة" />
                        </>
                      )}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {b.employeeIds.length === 0 ? (
                      <span className="text-[13px] text-slate-400">لا أحد</span>
                    ) : (
                      <AvatarStack names={b.employeeIds.map((id) => nameOf.get(id) ?? "؟")} />
                    )}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {b.roleIds.length === 0 ? (
                      <span className="text-[13px] text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {b.roleIds.map((id) => (
                          <Badge key={id} tone="gold">
                            {roleNameOf.get(id) ?? id}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <RowMenuTrigger
                      label={`إجراءات ${b.name}`}
                      expanded={menu.anchor?.id === b.id}
                      onToggle={(e) => menu.toggle(e, b.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Note tone="brand">
            تعديل المجموعة يسري على حامليها في جلستهم التالية بلا مزامنة، وحذفها يسحب ما أعطته ولا يمسّ ما مُنح للموظف
            مباشرةً. وتُربط بالمسميات من صفحة «المسميات الوظيفية».
          </Note>
        </div>
      )}

      {/* ── الأعضاء ───────────────────────────────────────────────── */}
      {tab === "members" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              className="sm:w-80"
              value={memberQuery}
              onChange={setMemberQuery}
              placeholder="ابحث بالاسم أو المسمى"
              label="بحث في الأعضاء"
            />
            <Segmented
              label="المجموعات"
              value={memberFilter}
              onChange={setMemberFilter}
              options={[
                { id: "all", label: "الكل" },
                { id: "with", label: "بمجموعات" },
                { id: "without", label: "بلا مجموعات" },
              ]}
            />
          </div>
          <TableShell
            footer={showing(shownMembers.length, employees.length)}
            empty={
              shownMembers.length === 0 ? (
                <EmptyState icon={<Users className="size-5" />} title="لا نتائج مطابقة" description="جرّب كلمة بحث أو تصفية أخرى." />
              ) : undefined
            }
          >
            <thead>
              <tr className={theadRowClass}>
                <Th>العضو</Th>
                <Th className="hidden sm:table-cell">الصلاحيات الفعّالة</Th>
                <Th className="hidden md:table-cell">المجموعات</Th>
                <Th className="hidden lg:table-cell">الخدمات</Th>
                <th className="w-28" aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {shownMembers.map((e) => {
                const all = [
                  ...e.bundleIds.map((id) => ({ id, viaRole: false })),
                  ...e.roleBundleIds.filter((id) => !e.bundleIds.includes(id)).map((id) => ({ id, viaRole: true })),
                ];
                return (
                  <tr
                    key={e.id}
                    onClick={() => !e.isAdmin && setMember(e)}
                    className={e.isAdmin ? undefined : rowClass}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.name} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-slate-900 dark:text-slate-100">{e.name}</p>
                          <p className="truncate text-[12.5px] text-slate-500 dark:text-slate-400">{e.roleLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {e.isAdmin ? (
                        <Badge tone="brand">وصول كامل</Badge>
                      ) : e.effectiveCount === 0 ? (
                        <Badge tone="warn">بلا صلاحيات</Badge>
                      ) : (
                        <span className="text-[13px] text-slate-600 dark:text-slate-300">
                          <Count n={e.effectiveCount} unit="صلاحية" />
                          <span className="text-slate-400"> · {e.directCount} مباشرة</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {all.length === 0 ? (
                        <span className="text-[13px] text-slate-400">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {all.slice(0, 3).map((x) => (
                            <Badge key={x.id} tone={x.viaRole ? "gold" : "brand"}>
                              {bundleNameOf.get(x.id) ?? x.id}
                            </Badge>
                          ))}
                          {all.length > 3 && <Badge>+{all.length - 3}</Badge>}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {e.isAdmin ? (
                        <span className="text-[13px] text-slate-600 dark:text-slate-300">الكل</span>
                      ) : (
                        <span className={cx(MONO, "text-[13px] text-slate-600 dark:text-slate-300")}>{e.serviceCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-left">
                      {!e.isAdmin && (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setMember(e);
                          }}
                          className={btn.ghost}
                        >
                          <Layers className="size-3.5" />
                          المجموعات
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <p className="flex items-center gap-3 text-[12.5px] text-slate-500">
            <Badge tone="brand">مباشرة</Badge>
            <Badge tone="gold">عبر المسمى</Badge>
            <span>الصلاحيات الفعّالة كما تحسبها الجلسة: المباشرة والمجموعات وما يُمنح تلقائياً.</span>
          </p>
        </div>
      )}

      {/* ── الصلاحيات ─────────────────────────────────────────────── */}
      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              className="sm:w-80"
              value={catalogQuery}
              onChange={setCatalogQuery}
              placeholder="ابحث باسم الصلاحية أو معرّفها"
              label="بحث في الصلاحيات"
            />
            <Segmented
              label="الحاملون"
              value={catalogFilter}
              onChange={setCatalogFilter}
              options={[
                { id: "all", label: "الكل" },
                { id: "unheld", label: "بلا حامل" },
              ]}
            />
          </div>
          <TableShell
            footer={showing(catalogCount, ALL_PERMISSIONS.length)}
            empty={
              catalogGroups.length === 0 ? (
                <EmptyState
                  icon={<KeyRound className="size-5" />}
                  title={catalogFilter === "unheld" && !cq ? "لكل صلاحيةٍ حامل" : "لا نتائج مطابقة"}
                />
              ) : undefined
            }
          >
            <thead>
              <tr className={theadRowClass}>
                <Th>الصلاحية</Th>
                <Th className="hidden sm:table-cell">الحاملون</Th>
                <Th className="hidden md:table-cell">عبر المجموعات</Th>
                <Th className="hidden lg:table-cell">تمنح معها</Th>
              </tr>
            </thead>
            {charityRows.length > 0 && (
              <tbody className={tbodyClass}>
                <tr className="bg-slate-50/60 dark:bg-slate-950/30">
                  <td colSpan={4} className="px-4 py-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    تبويبات بوابة الجمعيات <span className={cx(MONO, "text-slate-400")}>{charityRows.length}</span>
                  </td>
                </tr>
                {charityRows.map((p) => {
                  const who = holders[p.id] ?? [];
                  const linked = linkedServices[p.id] ?? [];
                  return (
                    <tr key={p.id} onClick={() => setDetail({ kind: "permission", id: p.id })} className={rowClass}>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-2 text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
                          {p.label}
                          <Badge tone="gold">بوابة الجمعيات</Badge>
                        </p>
                        <p className={cx(MONO, "text-[12px] text-slate-400")} dir="ltr">
                          {p.id}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {who.length === 0 ? (
                          <Badge tone="warn">لا أحد</Badge>
                        ) : (
                          <span className={cx(MONO, "text-[13px] text-slate-600 dark:text-slate-300")}>{who.length}</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {linked.length === 0 ? (
                          <Badge tone="warn">بلا ربط</Badge>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {linked.map((name) => (
                              <Badge key={name} tone="brand">
                                {name}
                              </Badge>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-[13px] text-slate-500 lg:table-cell">—</td>
                    </tr>
                  );
                })}
              </tbody>
            )}

            {catalogGroups.map((g) => (
              <tbody key={g.title} className={tbodyClass}>
                <tr className="bg-slate-50/60 dark:bg-slate-950/30">
                  <td colSpan={4} className="px-4 py-2 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    {g.title} <span className={cx(MONO, "text-slate-400")}>{g.items.length}</span>
                  </td>
                </tr>
                {g.items.map((p) => {
                  const who = holders[p.id] ?? [];
                  const via = viaBundles[p.id] ?? [];
                  const carries = IMPLIES[p.id] ?? [];
                  return (
                    <tr key={p.id} onClick={() => setDetail({ kind: "permission", id: p.id })} className={rowClass}>
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-2 text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
                          {p.label}
                          {SERVICE_LINKED_PERMISSION_IDS.includes(p.id) && <Badge tone="brand">بالخدمة</Badge>}
                        </p>
                        <p className={cx(MONO, "text-[12px] text-slate-400")} dir="ltr">
                          {p.id}
                        </p>
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {who.length === 0 ? <Badge tone="warn">لا أحد</Badge> : <AvatarStack names={who} />}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {via.length === 0 ? (
                          <span className="text-[13px] text-slate-400">—</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {via.slice(0, 2).map((n) => (
                              <Badge key={n} tone="brand">
                                {n}
                              </Badge>
                            ))}
                            {via.length > 2 && <Badge>+{via.length - 2}</Badge>}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-[13px] text-slate-500 lg:table-cell">
                        {carries.length ? carries.map(labelOf).join("، ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </TableShell>
        </div>
      )}

      {/* ── الخدمات ───────────────────────────────────────────────── */}
      {tab === "services" && (
        <div className="space-y-4">
          <SearchField
            className="sm:w-80"
            value={serviceQuery}
            onChange={setServiceQuery}
            placeholder="ابحث باسم الخدمة"
            label="بحث في الخدمات"
          />
          <TableShell
            footer={showing(shownServices.length, services.length)}
            empty={
              shownServices.length === 0 ? (
                <EmptyState
                  icon={<Briefcase className="size-5" />}
                  title={services.length === 0 ? "لا توجد خدمات بعد" : "لا نتائج مطابقة"}
                />
              ) : undefined
            }
          >
            <thead>
              <tr className={theadRowClass}>
                <Th>الخدمة</Th>
                <Th className="hidden sm:table-cell">الممنوحون</Th>
                <Th className="hidden md:table-cell">المجموعات التي تفتحها</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {shownServices.map((s) => (
                <tr key={s.name} onClick={() => setDetail({ kind: "service", name: s.name })} className={rowClass}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        <Briefcase className="size-4" />
                      </span>
                      <span className="text-[14px] font-medium text-slate-900 dark:text-slate-100">{s.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {s.holders.length === 0 ? (
                      <span className="text-[13px] text-slate-400">لا أحد</span>
                    ) : (
                      <AvatarStack names={s.holders} />
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {s.bundles.length === 0 ? (
                      <span className="text-[13px] text-slate-400">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {s.bundles.map((n) => (
                          <Badge key={n} tone="brand">
                            {n}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <Note tone="brand">
            الخدمة تُمنح باسمها: مباشرةً من «الموظفين» أو «إدارة الخدمات»، أو ضمن مجموعة. وتُفتح لحاملها داخل جمعياته المسندة
            وحدها.
          </Note>
        </div>
      )}

      {/* ── الطبقات ───────────────────────────────────────────────── */}
      <RowMenu anchor={menu.anchor}>
        {menuBundle && (
          <>
            <MenuItem
              icon={<Pencil className="size-4" />}
              onClick={() => {
                setEditor({ bundle: menuBundle });
                menu.close();
              }}
            >
              تعديل المجموعة
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 className="size-4" />}
              tone="danger"
              onClick={() => {
                setRemoving(menuBundle);
                menu.close();
              }}
            >
              حذف المجموعة
            </MenuItem>
          </>
        )}
      </RowMenu>

      {removing && (
        <ConfirmDialog
          variant="console"
          title={`حذف «${removing.name}»؟`}
          message={`تُسحب صلاحياتها وخدماتها عن ${removing.employeeIds.length} موظف${
            removing.roleIds.length ? ` و${removing.roleIds.length} مسمى` : ""
          }. ما مُنح لكل موظف مباشرةً لا يُمسّ، ولا يمكن التراجع.`}
          confirmLabel="حذف المجموعة"
          isPending={isPending}
          onConfirm={confirmRemove}
          onCancel={() => setRemoving(null)}
        />
      )}

      {editor && (
        <BundleSheet
          key={editor.bundle?.id ?? "new"}
          bundle={editor.bundle}
          employees={employees}
          roles={roles}
          serviceNames={serviceNames}
          onClose={() => setEditor(null)}
          onSaved={afterSave}
        />
      )}

      {member && (
        <EmployeeBundlesSheet
          key={member.id}
          employee={member}
          bundles={bundles}
          canManageEmployees={canManageEmployees}
          onClose={() => setMember(null)}
          onSaved={afterSave}
        />
      )}

      {detailPermission && (
        <PermissionSheet
          key={detailPermission.id}
          permission={detailPermission}
          holders={holders[detailPermission.id] ?? []}
          viaBundles={viaBundles[detailPermission.id] ?? []}
          adminNames={adminNames}
          serviceNames={serviceNames}
          linked={linkedServices[detailPermission.id] ?? []}
          implies={(IMPLIES[detailPermission.id] ?? []).map(labelOf)}
          carriedBy={carriedBy(detailPermission.id).map(labelOf)}
          onClose={() => setDetail(null)}
          onSaved={(text) => {
            setDetail(null);
            setToast({ tone: "ok", text });
            router.refresh();
          }}
        />
      )}

      {detailService && (
        <DetailSheet title={detailService.name} subtitle="خدمة" icon={<Briefcase className="size-4" />} onClose={() => setDetail(null)}>
          <NameList
            title="الممنوحون"
            description="منحٌ مباشر، أو عبر مجموعاتهم، أو مجموعات مسمّاهم."
            names={detailService.holders}
            empty="لم تُمنح لأحد."
          />
          <ChipList title="المجموعات التي تفتحها" tone="brand" items={detailService.bundles} empty="لا تفتحها أي مجموعة." />
        </DetailSheet>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function DetailSheet({
  title,
  subtitle,
  icon,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Sheet
      title={title}
      subtitle={subtitle}
      leading={<IconTile>{icon}</IconTile>}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={cx(btn.secondary, "ms-auto")}>
          إغلاق
        </button>
      }
    >
      <div className="space-y-8">{children}</div>
    </Sheet>
  );
}

function ChipList({
  title,
  items,
  empty,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  empty: string;
  tone?: "neutral" | "brand";
}) {
  return (
    <section className="space-y-2.5">
      <SectionHeader title={title} />
      {items.length === 0 ? (
        <p className="text-[13px] text-slate-500">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <Badge key={item} tone={tone}>
              {item}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}
