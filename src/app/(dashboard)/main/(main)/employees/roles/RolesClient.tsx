"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { deleteRole, syncRolePermissions } from "@/app/actions/roles";
import { AvatarStack, Badge, Count, IconTile, MONO, btn, cx } from "@/components/console/ui";
import {
  EmptyState,
  PageHeader,
  SearchField,
  Segmented,
  StatStrip,
  TableShell,
  Th,
  rowClass,
  tbodyClass,
  theadRowClass,
} from "@/components/console/layout";
import { MenuItem, MenuSeparator, RowMenu, RowMenuTrigger, useRowMenu } from "@/components/console/overlays";
import { Toast, useToast } from "@/components/console/Toast";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { RoleSheet } from "./RoleSheet";
import type { RoleBundle, RoleRow } from "./types";

type KindFilter = "all" | "system" | "custom";
type ConfirmState = { kind: "sync" | "delete"; role: RoleRow } | null;

const isAdminRole = (role: RoleRow) => role.key === "ADMIN";

/**
 * المسميات الوظيفية: ما يصف وظيفة الموظف، وما يصل حامليه عبرها.
 *
 * يصل المسمى إلى صلاحيات حامليه بطريقين يُعرضان منفصلين عمداً:
 *   • المجموعات — حيّةٌ، تسري في الجلسة التالية بلا مسّ صفّ أحد.
 *   • القالب الافتراضي — نسخةٌ تُكتب على صلاحيات الموظفين المباشرة عند المزامنة
 *     وحدها، وتستبدلها.
 */
export default function RolesClient({
  roles,
  bundles,
  canManagePermissions,
}: {
  roles: RoleRow[];
  bundles: RoleBundle[];
  canManagePermissions: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sheet, setSheet] = useState<{ role: RoleRow | null } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const { toast, setToast } = useToast();
  const menu = useRowMenu();

  const bundleNameOf = useMemo(() => new Map(bundles.map((b) => [b.id, b.name])), [bundles]);

  const systemCount = roles.filter((r) => r.isSystem).length;
  const assigned = roles.reduce((n, r) => n + r.members.length, 0);
  const linkedCount = roles.filter((r) => r.bundleIds.length > 0).length;
  const emptyCount = roles.filter((r) => r.members.length === 0).length;

  const q = query.trim();
  const visible = roles.filter(
    (r) =>
      (kind === "all" || (kind === "system") === r.isSystem) &&
      (!q || r.displayName.includes(q) || r.key.toLowerCase().includes(q.toLowerCase()))
  );

  const menuRole = roles.find((r) => r.id === menu.anchor?.id) ?? null;
  const canSync = (r: RoleRow) => !isAdminRole(r) && r.members.length > 0;
  const canDelete = (r: RoleRow) => !r.isSystem && r.members.length === 0;

  const runConfirm = () => {
    if (!confirm) return;
    const { kind: action, role } = confirm;
    startTransition(async () => {
      const res = action === "sync" ? await syncRolePermissions(role.id) : await deleteRole(role.id);
      setConfirm(null);
      if (res.error) {
        setToast({ tone: "error", text: res.error });
        return;
      }
      if (action === "delete") setSheet(null);
      setToast({
        tone: "ok",
        text: action === "sync" ? (res.success ?? "تمت المزامنة") : `حُذف «${role.displayName}»`,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      <PageHeader
        crumbs={[
          { label: "لوحة التحكم", href: "/main/admin" },
          { label: "الموظفون", href: "/main/employees" },
          { label: "المسميات الوظيفية" },
        ]}
        title="المسميات الوظيفية"
        description="صِف وظائف الفريق، واربط بكل مسمى مجموعات الصلاحيات التي يحتاجها كل من يحمله."
        actions={
          <>
            <Link href="/main/employees" className={btn.secondary}>
              <Users className="size-4" />
              الموظفون
            </Link>
            {canManagePermissions && (
              <Link href="/main/admin/permissions" className={btn.secondary}>
                <Layers className="size-4" />
                الصلاحيات
              </Link>
            )}
            <button type="button" onClick={() => setSheet({ role: null })} className={btn.primary}>
              <Plus className="size-4" />
              مسمى جديد
            </button>
          </>
        }
      />

      <StatStrip
        items={[
          {
            label: "المسميات",
            value: roles.length,
            hint: `${systemCount} أساسي · ${roles.length - systemCount} مخصص`,
            onClick: () => setKind("all"),
          },
          { label: "موظفون مسندون", value: assigned, hint: "كل موظف يحمل مسمى واحداً" },
          { label: "مرتبطة بمجموعات", value: linkedCount, hint: "تصل حامليها صلاحياتٌ حيّة" },
          { label: "بلا موظفين", value: emptyCount, hint: "مسميات لا يحملها أحد", dot: emptyCount > 0 ? "muted" : undefined },
        ]}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchField
          className="sm:w-80"
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو المعرّف"
          label="بحث في المسميات"
        />
        <Segmented
          label="النوع"
          value={kind}
          onChange={setKind}
          options={[
            { id: "all", label: "الكل" },
            { id: "system", label: "أساسية" },
            { id: "custom", label: "مخصصة" },
          ]}
        />
      </div>

      <TableShell
        footer={
          visible.length > 0 ? (
            <>
              عرض <span className={MONO}>{visible.length}</span> من <span className={MONO}>{roles.length}</span>
            </>
          ) : undefined
        }
        empty={
          visible.length === 0 ? (
            <EmptyState icon={<ShieldCheck className="size-5" />} title="لا نتائج مطابقة" description="جرّب كلمة بحث أو نوعاً آخر." />
          ) : undefined
        }
      >
        <thead>
          <tr className={theadRowClass}>
            <Th>المسمى</Th>
            <Th className="hidden sm:table-cell">النوع</Th>
            <Th className="hidden md:table-cell">الموظفون</Th>
            <Th className="hidden lg:table-cell">المجموعات</Th>
            <Th className="hidden lg:table-cell">القالب الافتراضي</Th>
            <th className="w-12" aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {visible.map((r) => (
            <tr key={r.id} onClick={() => setSheet({ role: r })} className={rowClass}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="hidden sm:block">
                    <IconTile>
                      <ShieldCheck className="size-4" />
                    </IconTile>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-slate-900 dark:text-slate-100">{r.displayName}</p>
                    <p className={cx(MONO, "truncate text-meta text-slate-400")} dir="ltr">
                      {r.key}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
                <Badge tone={r.isSystem ? "gold" : "neutral"}>{r.isSystem ? "أساسي" : "مخصص"}</Badge>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                {r.members.length === 0 ? (
                  <span className="text-body text-slate-400">لا أحد</span>
                ) : (
                  <AvatarStack names={r.members} />
                )}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {isAdminRole(r) ? (
                  <span className="text-body text-slate-400">لا حاجة</span>
                ) : r.bundleIds.length === 0 ? (
                  <span className="text-body text-slate-400">—</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {r.bundleIds.slice(0, 2).map((id) => (
                      <Badge key={id} tone="brand">
                        {bundleNameOf.get(id) ?? id}
                      </Badge>
                    ))}
                    {r.bundleIds.length > 2 && <Badge>+{r.bundleIds.length - 2}</Badge>}
                  </span>
                )}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {isAdminRole(r) ? (
                  <Badge tone="brand">وصول كامل</Badge>
                ) : (
                  <span className="text-body text-slate-600 dark:text-slate-300">
                    <Count n={r.permissions.length} unit="صلاحية" />
                  </span>
                )}
              </td>
              <td className="px-2 py-3">
                <RowMenuTrigger
                  label={`إجراءات ${r.displayName}`}
                  expanded={menu.anchor?.id === r.id}
                  onToggle={(e) => menu.toggle(e, r.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <RowMenu anchor={menu.anchor}>
        {menuRole && (
          <>
            <MenuItem
              icon={<Pencil className="size-4" />}
              onClick={() => {
                setSheet({ role: menuRole });
                menu.close();
              }}
            >
              تعديل المسمى
            </MenuItem>
            <MenuItem
              icon={<RefreshCw className="size-4" />}
              disabled={!canSync(menuRole)}
              onClick={() => {
                setConfirm({ kind: "sync", role: menuRole });
                menu.close();
              }}
            >
              مزامنة القالب
            </MenuItem>
            {!menuRole.isSystem && (
              <>
                <MenuSeparator />
                <MenuItem
                  icon={<Trash2 className="size-4" />}
                  tone="danger"
                  disabled={!canDelete(menuRole)}
                  onClick={() => {
                    setConfirm({ kind: "delete", role: menuRole });
                    menu.close();
                  }}
                >
                  حذف المسمى
                </MenuItem>
              </>
            )}
          </>
        )}
      </RowMenu>

      {sheet && (
        <RoleSheet
          key={sheet.role?.id ?? "new"}
          role={sheet.role}
          bundles={bundles}
          canManagePermissions={canManagePermissions}
          onClose={() => setSheet(null)}
          onSaved={(text) => {
            setSheet(null);
            setToast({ tone: "ok", text });
            router.refresh();
          }}
          onRequestSync={(role) => setConfirm({ kind: "sync", role })}
          onRequestDelete={(role) => setConfirm({ kind: "delete", role })}
        />
      )}

      {confirm && (
        <ConfirmDialog
          variant="console"
          title={
            confirm.kind === "sync"
              ? `مزامنة قالب «${confirm.role.displayName}»؟`
              : `حذف «${confirm.role.displayName}»؟`
          }
          message={
            confirm.kind === "sync"
              ? `تُستبدل الصلاحيات المباشرة لـ${confirm.role.members.length} موظف يحملون هذا المسمى بقالبه المحفوظ (${confirm.role.permissions.length} صلاحية)، ويُلغى أي تخصيصٍ سابق لها. مجموعاتهم وخدماتهم وجمعياتهم لا تُمسّ.`
              : "يُحذف المسمى وروابط مجموعاته، ولا يمكن التراجع."
          }
          confirmLabel={confirm.kind === "sync" ? "مزامنة" : "حذف المسمى"}
          isPending={isPending}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
