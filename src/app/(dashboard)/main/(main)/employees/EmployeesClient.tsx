"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Mail, Pencil, Plus, Power, ShieldCheck, Smartphone, Trash2, Users, X } from "lucide-react";
import { toggleEmployeeStatus, deleteEmployee } from "./actions";
import { isAdmin } from "@/lib/permissions";
import { EmployeeSheet } from "./EmployeeSheet";
import type { BundleOption, CharityOption, EmployeeRow, RoleOption } from "./types";
import { Avatar, Badge, Count, Dot, MONO, btn, cx } from "@/components/console/ui";
import Select from "@/components/console/Select";
import {
  EmptyState,
  PageHeader,
  SearchField,
  Segmented,
  StatStrip,
  TableShell,
  Th,
  tbodyClass,
  theadRowClass,
} from "@/components/console/layout";
import { MenuItem, MenuSeparator, RowMenu, RowMenuTrigger, Toast, useRowMenu, useToast } from "@/components/console/overlays";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";

type StatusFilter = "all" | "active" | "inactive";
type SheetState = { mode: "add" } | { mode: "edit"; employee: EmployeeRow } | null;
type ConfirmState = { kind: "toggle" | "delete"; employee: EmployeeRow } | null;

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشط" },
  { id: "inactive", label: "موقوف" },
];

export function EmployeesClient({
  employees,
  roles,
  bundles,
  allCharities,
  allServiceNames,
  sessionId,
  sessionRole,
  canDelete,
  canManagePermissions,
}: {
  employees: EmployeeRow[];
  roles: RoleOption[];
  bundles: BundleOption[];
  allCharities: CharityOption[];
  allServiceNames: string[];
  sessionId: string;
  sessionRole: string;
  canDelete: boolean;
  canManagePermissions: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [toast, setToast] = useToast();
  const menu = useRowMenu();

  const roleByKey = useMemo(() => new Map(roles.map((r) => [r.key, r])), [roles]);

  const stats = useMemo(() => {
    const active = employees.filter((e) => e.isActive).length;
    return {
      total: employees.length,
      active,
      inactive: employees.length - active,
      otpOnly: employees.filter((e) => !e.email).length,
    };
  }, [employees]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (status !== "all" && e.isActive !== (status === "active")) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.phone.includes(q) || (e.email ?? "").toLowerCase().includes(q);
    });
  }, [employees, query, status, roleFilter]);

  const filtered = query.trim() !== "" || status !== "all" || roleFilter !== "all";
  const menuEmployee = employees.find((e) => e.id === menu.anchor?.id) ?? null;

  // لا يعدّل مديرَ النظام إلا مديرُ نظام، ولا يوقف أحدٌ نفسه أو مدير النظام.
  const canEdit = (emp: EmployeeRow) => !(isAdmin(emp.role) && !isAdmin(sessionRole));
  const canToggle = (emp: EmployeeRow) => emp.id !== sessionId && !isAdmin(emp.role);
  const canRemove = (emp: EmployeeRow) => canDelete && canToggle(emp);

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setRoleFilter("all");
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { kind, employee } = confirm;
    startTransition(async () => {
      const res =
        kind === "toggle"
          ? await toggleEmployeeStatus(employee.id, employee.isActive)
          : await deleteEmployee(employee.id);
      setConfirm(null);
      if (res.error) {
        setToast({ tone: "error", text: res.error });
        return;
      }
      setToast({
        tone: "ok",
        text:
          kind === "delete"
            ? `تم حذف ${employee.name}`
            : employee.isActive
              ? `تم إيقاف حساب ${employee.name}`
              : `تم تفعيل حساب ${employee.name}`,
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 pb-10 text-slate-900 dark:text-slate-100">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "الموظفون" }]}
        title="الموظفون"
        description="أضف أعضاء الفريق وحدّد ما يصل إليه كلٌّ منهم: الصلاحيات ومجموعاتها، والجمعيات، والخدمات."
        actions={
          <>
            {canManagePermissions && (
              <Link href="/main/admin/permissions" className={btn.secondary}>
                <Layers className="size-4" />
                الصلاحيات
              </Link>
            )}
            <Link href="/main/employees/roles" className={btn.secondary}>
              <ShieldCheck className="size-4" />
              المسميات الوظيفية
            </Link>
            <button type="button" onClick={() => setSheet({ mode: "add" })} className={btn.primary}>
              <Plus className="size-4" />
              إضافة موظف
            </button>
          </>
        }
      />

      <StatStrip
        items={[
          { label: "إجمالي الموظفين", value: stats.total, hint: `${roles.length} مسمى وظيفي`, onClick: () => setStatus("all") },
          { label: "نشط", value: stats.active, hint: "يستطيعون الدخول", dot: "active", onClick: () => setStatus("active"), selected: status === "active" },
          { label: "موقوف", value: stats.inactive, hint: "الدخول معطّل", dot: "muted", onClick: () => setStatus("inactive"), selected: status === "inactive" },
          { label: "بلا بريد", value: stats.otpOnly, hint: "يدخلون برمز الجوال فقط" },
        ]}
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <SearchField
          className="md:w-80"
          value={query}
          onChange={setQuery}
          placeholder="ابحث بالاسم أو الجوال أو البريد"
          label="بحث في الموظفين"
        />
        <div className="flex items-center gap-2">
          <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} label="الحالة" />
          <Select
            value={roleFilter}
            onSelect={setRoleFilter}
            placeholder="كل المسميات"
            options={[
              { value: "all", label: "كل المسميات" },
              ...roles.map((r) => ({ value: r.key, label: r.displayName })),
            ]}
            className="min-w-40"
          />
        </div>
        {filtered && (
          <button type="button" onClick={clearFilters} className={cx(btn.ghost, "md:ms-auto")}>
            <X className="size-3.5" />
            مسح التصفية
          </button>
        )}
      </div>

      <TableShell
        empty={
          visible.length === 0 ? (
            <EmptyState
              icon={<Users className="size-5" />}
              title={employees.length === 0 ? "لا يوجد موظفون بعد" : "لا نتائج مطابقة"}
              description={employees.length === 0 ? "ابدأ بإضافة أول عضو في الفريق." : "جرّب كلمة بحث أخرى أو امسح التصفية."}
              action={
                employees.length === 0 ? (
                  <button type="button" onClick={() => setSheet({ mode: "add" })} className={btn.primary}>
                    <Plus className="size-4" />
                    إضافة موظف
                  </button>
                ) : (
                  <button type="button" onClick={clearFilters} className={btn.secondary}>
                    مسح التصفية
                  </button>
                )
              }
            />
          ) : undefined
        }
        footer={
          visible.length > 0 ? (
            <>
              عرض <span className={MONO}>{visible.length}</span> من <span className={MONO}>{employees.length}</span>
            </>
          ) : undefined
        }
      >
        <thead>
          <tr className={theadRowClass}>
            <Th>الموظف</Th>
            <Th className="hidden sm:table-cell">المسمى الوظيفي</Th>
            <Th className="hidden md:table-cell">الوصول</Th>
            <Th className="hidden lg:table-cell">الجمعيات</Th>
            <Th className="hidden xl:table-cell">الدخول</Th>
            <Th>الحالة</Th>
            <th className="w-12" aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody className={tbodyClass}>
          {visible.map((emp) => {
            const role = roleByKey.get(emp.role);
            const admin = isAdmin(emp.role);
            const bundleCount = new Set([...emp.bundleIds, ...(role?.bundleIds ?? [])]).size;
            const nothing = !admin && emp.permissions.length === 0 && bundleCount === 0 && emp.serviceNames.length === 0;
            const editable = canEdit(emp);
            return (
              <tr
                key={emp.id}
                onClick={() => editable && setSheet({ mode: "edit", employee: emp })}
                className={cx(
                  "transition-colors",
                  editable && "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                  !emp.isActive && "text-slate-500"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editable) setSheet({ mode: "edit", employee: emp });
                        }}
                        disabled={!editable}
                        className="block max-w-[16rem] truncate text-right text-[14px] font-medium text-slate-900 outline-none hover:underline focus-visible:underline disabled:no-underline dark:text-slate-100"
                      >
                        {emp.name}
                        {emp.id === sessionId && <span className="ms-1.5 text-[12px] font-normal text-slate-400">(أنت)</span>}
                      </button>
                      <span className={cx(MONO, "block text-[12.5px] text-slate-500 dark:text-slate-400")} dir="ltr">
                        {emp.phone}
                      </span>
                      <span className="block text-[12px] text-slate-500 sm:hidden">{role?.displayName ?? emp.role}</span>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <Badge tone={admin ? "brand" : "neutral"}>{role?.displayName ?? emp.role}</Badge>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {admin ? (
                    <span className="text-[13px] text-slate-600 dark:text-slate-300">وصول كامل</span>
                  ) : nothing ? (
                    <Badge tone="warn">بلا صلاحيات</Badge>
                  ) : (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-600 dark:text-slate-300">
                      <Count n={emp.permissions.length} unit="صلاحية" />
                      {bundleCount > 0 && (
                        <>
                          <Dot />
                          <Count n={bundleCount} unit="مجموعة" />
                        </>
                      )}
                      {emp.serviceNames.length > 0 && (
                        <>
                          <Dot />
                          <Count n={emp.serviceNames.length} unit="خدمة" />
                        </>
                      )}
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  {admin ? (
                    <span className="text-[13px] text-slate-600 dark:text-slate-300">الكل</span>
                  ) : emp.charityIds.length === 0 ? (
                    <span className="text-[13px] text-amber-600 dark:text-amber-400">لا شيء</span>
                  ) : (
                    <span className={cx(MONO, "text-[13px] text-slate-600 dark:text-slate-300")}>
                      {emp.charityIds.length}
                      <span className="text-slate-400"> / {allCharities.length}</span>
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 xl:table-cell">
                  {emp.email ? (
                    <span className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300" title={emp.email}>
                      <Mail className="size-3.5 shrink-0 text-slate-400" />
                      <span className="max-w-[12rem] truncate" dir="ltr">
                        {emp.email}
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[13px] text-slate-500">
                      <Smartphone className="size-3.5 shrink-0 text-slate-400" />
                      رمز الجوال
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-[13px]">
                    <span
                      aria-hidden
                      className={cx(
                        "size-2 rounded-full",
                        emp.isActive ? "bg-emerald-500 shadow-[0_0_0_3px_rgb(16_185_129/0.15)]" : "bg-slate-400"
                      )}
                    />
                    <span className={emp.isActive ? "text-slate-700 dark:text-slate-200" : "text-slate-500"}>
                      {emp.isActive ? "نشط" : "موقوف"}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-3">
                  <RowMenuTrigger
                    label={`إجراءات ${emp.name}`}
                    expanded={menu.anchor?.id === emp.id}
                    onToggle={(e) => menu.toggle(e, emp.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableShell>

      <RowMenu anchor={menu.anchor}>
        {menuEmployee && (
          <>
            <MenuItem
              icon={<Pencil className="size-4" />}
              disabled={!canEdit(menuEmployee)}
              onClick={() => {
                setSheet({ mode: "edit", employee: menuEmployee });
                menu.close();
              }}
            >
              تعديل الموظف
            </MenuItem>
            <MenuItem
              icon={<Power className="size-4" />}
              disabled={!canToggle(menuEmployee)}
              onClick={() => {
                setConfirm({ kind: "toggle", employee: menuEmployee });
                menu.close();
              }}
            >
              {menuEmployee.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
            </MenuItem>
            {canDelete && (
              <>
                <MenuSeparator />
                <MenuItem
                  icon={<Trash2 className="size-4" />}
                  tone="danger"
                  disabled={!canRemove(menuEmployee)}
                  onClick={() => {
                    setConfirm({ kind: "delete", employee: menuEmployee });
                    menu.close();
                  }}
                >
                  حذف الموظف
                </MenuItem>
              </>
            )}
          </>
        )}
      </RowMenu>

      {confirm && (
        <ConfirmDialog
          variant="console"
          title={
            confirm.kind === "delete"
              ? `حذف ${confirm.employee.name} نهائياً؟`
              : confirm.employee.isActive
                ? `إيقاف حساب ${confirm.employee.name}؟`
                : `تفعيل حساب ${confirm.employee.name}؟`
          }
          message={
            confirm.kind === "delete"
              ? "يُحذف الحساب وإسناداته ولا يمكن التراجع. إن كان مرتبطاً بمهام أو سجلات فقد يُرفض الحذف، وإيقاف الحساب هو البديل الآمن."
              : confirm.employee.isActive
                ? "لن يتمكن من تسجيل الدخول حتى تعيد تفعيله. تبقى بياناته وصلاحياته كما هي."
                : "سيتمكن من تسجيل الدخول بصلاحياته الحالية."
          }
          confirmLabel={confirm.kind === "delete" ? "حذف الموظف" : confirm.employee.isActive ? "إيقاف الحساب" : "تفعيل الحساب"}
          tone={confirm.kind === "delete" || confirm.employee.isActive ? "danger" : "primary"}
          isPending={isPending}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {sheet && (
        <EmployeeSheet
          key={sheet.mode === "edit" ? sheet.employee.id : "new"}
          employee={sheet.mode === "edit" ? sheet.employee : null}
          roles={roles}
          bundles={bundles}
          allCharities={allCharities}
          allServiceNames={allServiceNames}
          canManagePermissions={canManagePermissions}
          onClose={() => setSheet(null)}
          onSaved={(text) => {
            setSheet(null);
            setToast({ tone: "ok", text });
            router.refresh();
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
