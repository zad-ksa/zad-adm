"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Info, Layers, LoaderCircle, UserPlus } from "lucide-react";
import { createEmployee, updateEmployee } from "./actions";
import {
  ALL_PERMISSIONS,
  IMPLIES,
  PERMISSION_GROUPS,
  SERVICE_LINKED_PERMISSION_IDS,
  effectivePermissions,
  isAdmin,
  sanitizePermissions,
} from "@/lib/permissions";
import type { BundleOption, CharityOption, EmployeeInput, EmployeeRow, RoleOption } from "./types";
import {
  Avatar,
  Badge,
  CheckMark,
  Field,
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
import Select from "@/components/console/Select";
import { SearchField, Tabs } from "@/components/console/layout";
import { FooterStatus, Sheet } from "@/components/console/overlays";

type Tab = "profile" | "access" | "scope";
type PermissionItem = { id: string; label: string };

const LABEL = new Map(ALL_PERMISSIONS.map((p) => [p.id, p.label]));

// صلاحيات أقسام الجمعية (الاستراتيجية والحوكمة والمالية) لا تُمنح من هنا ولا
// من أي مُنتقٍ: تُربط بخدمةٍ في صفحة «الصلاحيات» فينالها من مُنح تلك الخدمة.
const GRANTABLE_GROUPS = PERMISSION_GROUPS.map((g) => ({
  title: g.title,
  permissions: g.permissions.filter((p) => !SERVICE_LINKED_PERMISSION_IDS.includes(p.id)),
})).filter((g) => g.permissions.length > 0);

/**
 * لوحة جانبية واحدة للإضافة والتعديل.
 *
 * المجموعات تُمنح بطريقتين، وكلتاهما تُحفظان مع بقية الموظف في معاملةٍ واحدة:
 *   • كاملةً: رابطٌ حيّ — تعديل المجموعة لاحقاً يسري على الموظف.
 *   • بعضُها: تُنسخ الصلاحيات والخدمات المختارة إلى الموظف مباشرةً، فلا تتأثر
 *     بتعديل المجموعة بعد ذلك.
 * وإزالة عنصرٍ من مجموعةٍ كاملة تحوّلها إلى الثانية.
 */
export function EmployeeSheet({
  employee,
  roles,
  bundles,
  allCharities,
  allServiceNames,
  canManagePermissions,
  onClose,
  onSaved,
}: {
  employee: EmployeeRow | null;
  roles: RoleOption[];
  bundles: BundleOption[];
  allCharities: CharityOption[];
  allServiceNames: string[];
  canManagePermissions: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isNew = employee === null;
  const initialRole = employee?.role ?? roles.find((r) => !isAdmin(r.key))?.key ?? roles[0]?.key ?? "";

  const [tab, setTab] = useState<Tab>("profile");
  const [name, setName] = useState(employee?.name ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialRole);
  const [leaveDays, setLeaveDays] = useState(String(employee?.annualLeaveDays ?? 21));
  const [permissions, setPermissions] = useState<string[]>(
    () => employee?.permissions ?? sanitizePermissions(roles.find((r) => r.key === initialRole)?.permissions)
  );
  const [bundleIds, setBundleIds] = useState<string[]>(employee?.bundleIds ?? []);
  const [serviceNames, setServiceNames] = useState<string[]>(employee?.serviceNames ?? []);
  const [charityIds, setCharityIds] = useState<string[]>(employee?.charityIds ?? []);
  const [openBundle, setOpenBundle] = useState<string | null>(null);
  const [permQuery, setPermQuery] = useState("");
  const [roleNote, setRoleNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const adminRole = isAdmin(role);
  const currentRole = roles.find((r) => r.key === role);

  // ما تمنحه المجموعات الكاملة (المباشرة ومجموعات المسمى)، مع اسم المجموعة مصدراً.
  const granted = useMemo(() => {
    const roleBundles = roles.find((r) => r.key === role)?.bundleIds ?? [];
    const perms = new Map<string, string>();
    const services = new Map<string, string>();
    // ما تمنحه مجموعات المسمى: لا يُزال من هنا، فيُقفل.
    const rolePerms = new Map<string, string>();
    const roleServices = new Map<string, string>();
    for (const b of bundles) {
      const viaRole = roleBundles.includes(b.id);
      if (!bundleIds.includes(b.id) && !viaRole) continue;
      for (const p of b.permissions) {
        if (!perms.has(p)) perms.set(p, b.name);
        if (viaRole && !rolePerms.has(p)) rolePerms.set(p, b.name);
      }
      for (const s of b.services) {
        if (!services.has(s)) services.set(s, b.name);
        if (viaRole && !roleServices.has(s)) roleServices.set(s, b.name);
      }
    }
    const held = [...new Set([...permissions, ...perms.keys()])];
    return {
      roleBundles,
      perms,
      services,
      rolePerms,
      roleServices,
      held,
      effective: effectivePermissions(held),
      serviceCount: new Set([...serviceNames, ...services.keys()]).size,
    };
  }, [roles, role, bundles, bundleIds, permissions, serviceNames]);

  const changeRole = (key: string) => {
    if (key === role) return;
    setRole(key);
    const def = roles.find((r) => r.key === key);
    if (!def || isAdmin(key)) {
      setRoleNote(null);
      return;
    }
    setPermissions(sanitizePermissions(def.permissions));
    setRoleNote(`طُبّقت صلاحيات «${def.displayName}» الافتراضية على الصلاحيات الفردية. راجعها من تبويب الصلاحيات.`);
  };

  const permOn = (id: string) => permissions.includes(id) || granted.perms.has(id);
  const serviceOn = (value: string) => serviceNames.includes(value) || granted.services.has(value);

  /**
   * إزالة صلاحياتٍ أو خدماتٍ ممنوحة مباشرةً أو عبر مجموعةٍ كاملة.
   *
   * المجموعة الكاملة التي تحوي شيئاً منها تتحوّل إلى اختيارٍ جزئي: يُفكّ ربطها،
   * ويُمنح باقي ما فيها للموظف مباشرةً. كانت عناصرها مقفلة، فلا يُزال منها شيء
   * إلا بإلغاء المجموعة كلها. مجموعات المسمى وحدها لا تُفكّ من هنا.
   */
  const revoke = (kind: "permission" | "service", values: string[]) => {
    const items = (b: BundleOption) => (kind === "permission" ? b.permissions : b.services);
    const broken = bundles.filter((b) => bundleIds.includes(b.id) && items(b).some((v) => values.includes(v)));
    if (broken.length) setBundleIds(bundleIds.filter((id) => !broken.some((b) => b.id === id)));
    const nextPermissions = [...new Set([...permissions, ...broken.flatMap((b) => b.permissions)])];
    const nextServices = [...new Set([...serviceNames, ...broken.flatMap((b) => b.services)])];
    setPermissions(kind === "permission" ? nextPermissions.filter((p) => !values.includes(p)) : nextPermissions);
    setServiceNames(kind === "service" ? nextServices.filter((s) => !values.includes(s)) : nextServices);
  };

  const togglePermission = (id: string) => {
    if (permOn(id)) revoke("permission", [id]);
    else setPermissions([...permissions, id]);
  };

  const toggleService = (value: string) => {
    if (serviceOn(value)) revoke("service", [value]);
    else setServiceNames([...serviceNames, value]);
  };

  const save = () => {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setTab("profile");
      setError("الاسم ورقم الجوال مطلوبان");
      return;
    }
    const days = leaveDays.trim() === "" ? undefined : Number(leaveDays);
    if (days !== undefined && (!Number.isInteger(days) || days < 0 || days > 365)) {
      setTab("profile");
      setError("رصيد الإجازات عددٌ صحيح بين 0 و365");
      return;
    }

    const payload: EmployeeInput = {
      name: name.trim(),
      phone: phone.trim(),
      role,
      permissions,
      email: email.trim() || null,
      password: password || undefined,
      annualLeaveDays: days,
      charityIds: adminRole ? [] : charityIds,
      // مدير النظام يملك كل شيء؛ لا تُمسّ مجموعاته ولا خدماته المخزّنة.
      bundleIds: adminRole ? undefined : bundleIds,
      serviceNames: adminRole ? undefined : serviceNames,
    };

    startTransition(async () => {
      const res = employee ? await updateEmployee(employee.id, payload) : await createEmployee(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved(res.success ?? "تم الحفظ");
    });
  };

  /** حالة «تحديد الكل» لقائمة صلاحيات: ما لا يمنحه المسمى يُحدَّد ويُزال معاً. */
  const groupSelection = (items: PermissionItem[]) => {
    const free = items.filter((p) => !granted.rolePerms.has(p.id)).map((p) => p.id);
    const allOn = free.length > 0 && free.every(permOn);
    return {
      free,
      allOn,
      onCount: items.filter((p) => granted.effective.includes(p.id)).length,
      toggleAll: () => (allOn ? revoke("permission", free) : setPermissions([...new Set([...permissions, ...free])])),
    };
  };

  /** صفوف الصلاحيات، بمصدر كل صلاحية لا تُمنح مباشرةً. */
  const permissionRows = (items: PermissionItem[]) =>
    items.map((p) => {
      const direct = permissions.includes(p.id);
      const fromBundle = granted.perms.get(p.id);
      const fromRole = granted.rolePerms.get(p.id);
      const impliedBy =
        direct || fromBundle ? undefined : granted.held.find((h) => h !== p.id && IMPLIES[h]?.includes(p.id));
      // يُقفل ما لا يُزال من هنا: مجموعة المسمى، أو صلاحيةٌ تستلزمه.
      const locked = !direct && (!!fromRole || !!impliedBy);
      return (
        <OptionRow
          key={p.id}
          label={p.label}
          checked={direct || !!fromBundle || !!impliedBy}
          locked={locked}
          note={
            direct
              ? undefined
              : fromRole
                ? `من مجموعة «${fromRole}» عبر المسمى`
                : fromBundle
                  ? `من مجموعة «${fromBundle}»`
                  : impliedBy
                    ? `تلقائياً مع «${LABEL.get(impliedBy) ?? impliedBy}»`
                    : undefined
          }
          onToggle={() => togglePermission(p.id)}
        />
      );
    });

  const q = permQuery.trim();
  const groups = GRANTABLE_GROUPS.map((g) => ({
    title: g.title,
    items: g.permissions.filter((p) => !q || p.label.includes(q)),
  })).filter((g) => g.items.length > 0);

  const freeServices = allServiceNames.filter((s) => !granted.roleServices.has(s));
  const allServicesOn = freeServices.length > 0 && freeServices.every(serviceOn);
  const accessCount = granted.effective.filter((id) => !SERVICE_LINKED_PERMISSION_IDS.includes(id)).length;

  return (
    <Sheet
      title={isNew ? "إضافة موظف" : name || employee.name}
      subtitle={
        isNew ? "أنشئ الحساب، ثم حدّد ما يصل إليه." : `${currentRole?.displayName ?? role} · أُضيف ${employee.createdLabel}`
      }
      leading={
        isNew ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
            <UserPlus className="size-4" />
          </span>
        ) : (
          <Avatar name={name || employee.name} size="lg" />
        )
      }
      busy={isPending}
      onClose={onClose}
      onSubmit={save}
      tabs={
        <Tabs
          inset
          label="أقسام الموظف"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "profile", label: "الملف" },
            { id: "access", label: "الصلاحيات", count: adminRole ? "الكل" : accessCount },
            { id: "scope", label: "الجمعيات والخدمات", count: adminRole ? "الكل" : charityIds.length },
          ]}
        />
      }
      footer={
        <>
          <FooterStatus error={error}>
            {adminRole ? (
              "وصول كامل"
            ) : (
              <>
                <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{granted.effective.length}</span> صلاحية فعّالة ·{" "}
                <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{charityIds.length}</span> جمعية ·{" "}
                <span className={cx(MONO, "text-slate-900 dark:text-slate-100")}>{granted.serviceCount}</span> خدمة
              </>
            )}
          </FooterStatus>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={onClose} disabled={isPending} className={btn.secondary}>
              إلغاء
            </button>
            <button type="submit" disabled={isPending} className={btn.primary}>
              {isPending && <LoaderCircle className="size-4 animate-spin" />}
              {isNew ? "إضافة الموظف" : "حفظ التغييرات"}
            </button>
          </div>
        </>
      }
    >
      {tab === "profile" && (
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionHeader title="البيانات الأساسية" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="emp-name" label="الاسم">
                <input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus={isNew} className={field} />
              </Field>
              <Field id="emp-phone" label="رقم الجوال" hint="يُستعمل للدخول برمز التحقق.">
                <input
                  id="emp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  inputMode="tel"
                  placeholder="05XXXXXXXX"
                  className={cx(field, MONO, "text-right")}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader title="الوظيفة" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="emp-role" label="المسمى الوظيفي">
                <Select
                  value={role}
                  onSelect={changeRole}
                  disabled={employee?.role === "ADMIN"}
                  placeholder="اختر المسمى"
                  options={roles.map((r) => ({ value: r.key, label: r.displayName }))}
                  className="w-full [&>button]:w-full [&>button]:justify-between"
                />
              </Field>
              <Field id="emp-leave" label="رصيد الإجازات السنوية" hint="بالأيام.">
                <input
                  id="emp-leave"
                  type="number"
                  min={0}
                  max={365}
                  value={leaveDays}
                  onChange={(e) => setLeaveDays(e.target.value)}
                  dir="ltr"
                  className={cx(field, MONO, "text-right")}
                />
              </Field>
            </div>
            {roleNote && <Note tone="brand">{roleNote}</Note>}
          </section>

          <section className="space-y-4">
            <SectionHeader
              title="تسجيل الدخول"
              description="بلا بريد يدخل الموظف برمزٍ يُرسل إلى جواله. أضف بريداً وكلمة مرور ليدخل بهما أيضاً."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="emp-email" label="البريد الإلكتروني">
                <input
                  id="emp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  placeholder="name@example.com"
                  className={cx(field, "text-right")}
                />
              </Field>
              <Field
                id="emp-password"
                label={isNew || !employee?.email ? "كلمة المرور" : "كلمة مرور جديدة"}
                hint={isNew || !employee?.email ? "مطلوبة مع البريد، ٨ أحرف على الأقل." : "اتركها فارغة لإبقاء الحالية."}
              >
                <input
                  id="emp-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  dir="ltr"
                  autoComplete="new-password"
                  className={cx(field, MONO, "text-right")}
                />
              </Field>
            </div>
            {!isNew && employee.email && !email.trim() && (
              <Note tone="warn">إزالة البريد تُلغي الدخول بكلمة المرور لهذا الحساب.</Note>
            )}
          </section>
        </div>
      )}

      {tab === "access" &&
        (adminRole ? (
          <Note tone="brand">مدير النظام يملك كل الصلاحيات تلقائياً، فلا تنطبق عليه المجموعات ولا الصلاحيات الفردية.</Note>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <SectionHeader
                title="مجموعات الصلاحيات"
                description="امنح المجموعة كاملةً فيسري أي تعديلٍ عليها على الموظف تلقائياً، أو افتحها واختر منها ما يلزم فقط."
                action={
                  canManagePermissions ? (
                    <Link href="/main/admin/permissions" className={btn.link}>
                      إدارة المجموعات
                    </Link>
                  ) : undefined
                }
              />

              {bundles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                  <Layers className="mx-auto size-5 text-slate-400" />
                  <p className="mt-2 text-[13.5px] font-medium">لا توجد مجموعات بعد</p>
                  <p className="mt-1 text-[12.5px] text-slate-500">
                    {canManagePermissions
                      ? "أنشئ مجموعات من صفحة إدارة الصلاحيات لتظهر هنا."
                      : "تُنشأ المجموعات من صفحة إدارة الصلاحيات."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {bundles.map((b) => {
                    const viaRole = granted.roleBundles.includes(b.id);
                    const direct = bundleIds.includes(b.id);
                    const full = viaRole || direct;
                    const total = b.permissions.length + b.services.length;
                    const picked = b.permissions.filter(permOn).length + b.services.filter(serviceOn).length;
                    const open = openBundle === b.id;
                    return (
                      <div key={b.id} className={cx(full && "bg-primary/[0.025] dark:bg-teal-400/[0.03]")}>
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (direct) {
                                // إلغاء المجموعة يزيل كل ما فيها، لا ربطها وحده.
                                setBundleIds(bundleIds.filter((id) => id !== b.id));
                                setPermissions(permissions.filter((p) => !b.permissions.includes(p)));
                                setServiceNames(serviceNames.filter((s) => !b.services.includes(s)));
                              } else {
                                setBundleIds([...bundleIds, b.id]);
                              }
                            }}
                            disabled={viaRole}
                            aria-pressed={full}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-right outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default"
                          >
                            <CheckMark state={full ? "on" : picked > 0 ? "mixed" : "off"} locked={viaRole} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[13.5px] font-medium text-slate-900 dark:text-slate-100">{b.name}</span>
                                {viaRole && <Badge tone="gold">من المسمى</Badge>}
                                {!viaRole && direct && <Badge tone="brand">كاملة</Badge>}
                              </span>
                              <span className="block truncate text-[12.5px] text-slate-500 dark:text-slate-400">
                                {b.description || `${b.permissions.length} صلاحية · ${b.services.length} خدمة`}
                              </span>
                            </span>
                          </button>
                          <span className={cx(MONO, "shrink-0 text-[12px] text-slate-500")}>
                            {full ? total : picked}/{total}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenBundle(open ? null : b.id)}
                            aria-expanded={open}
                            aria-label={open ? `إخفاء محتوى ${b.name}` : `اختيار من ${b.name}`}
                            className={cx(btn.ghost, "size-8 px-0")}
                          >
                            <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
                          </button>
                        </div>

                        {open && (
                          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                            <p className="flex items-start gap-1.5 px-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                              <Info className="mt-0.5 size-3.5 shrink-0" />
                              {viaRole
                                ? `مرتبطة بالمسمى «${currentRole?.displayName ?? role}»، وتُدار من صفحة المسميات.`
                                : direct
                                  ? "ممنوحة كاملةً ومرتبطة بالمجموعة. إزالة أي عنصرٍ منها تحوّلها إلى اختيارٍ جزئي يُمنح للموظف مباشرةً."
                                  : "ما تختاره هنا يُمنح للموظف مباشرةً، ولا يتغيّر إن عُدّلت المجموعة لاحقاً."}
                            </p>
                            {b.permissions.length > 0 && (
                              <div>
                                <p className="px-2 pb-1 text-[11.5px] font-medium text-slate-400">الصلاحيات</p>
                                <div className="grid sm:grid-cols-2">
                                  {b.permissions.map((p) => (
                                    <OptionRow
                                      key={p}
                                      label={LABEL.get(p) ?? p}
                                      checked={permOn(p)}
                                      locked={granted.rolePerms.has(p) && !permissions.includes(p)}
                                      onToggle={() => togglePermission(p)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {b.services.length > 0 && (
                              <div>
                                <p className="px-2 pb-1 text-[11.5px] font-medium text-slate-400">الخدمات</p>
                                <div className="grid sm:grid-cols-2">
                                  {b.services.map((s) => (
                                    <OptionRow
                                      key={s}
                                      label={s}
                                      checked={serviceOn(s)}
                                      locked={granted.roleServices.has(s) && !serviceNames.includes(s)}
                                      onToggle={() => toggleService(s)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {total === 0 && <p className="px-2 text-[12.5px] text-slate-500">المجموعة فارغة.</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeader
                title="الصلاحيات الفردية"
                description="تُمنح للموظف مباشرةً. ما تمنحه مجموعةٌ يظهر مع اسمها، وإزالته تحوّل المجموعة إلى اختيارٍ جزئي."
              />
              <SearchField value={permQuery} onChange={setPermQuery} placeholder="ابحث في الصلاحيات" label="بحث في الصلاحيات" />

              {groups.length === 0 && <p className="py-6 text-center text-[13px] text-slate-500">لا صلاحية تطابق «{q}»</p>}

              {groups.map((g) => {
                const sel = groupSelection(g.items);
                return (
                  <div key={g.title} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
                      <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-300">{g.title}</span>
                      {sel.free.length > 0 ? (
                        <SelectAll count={sel.onCount} total={g.items.length} allOn={sel.allOn} onClick={sel.toggleAll} />
                      ) : (
                        <span className={cx(MONO, "text-[12px] text-slate-500")}>
                          {sel.onCount}/{g.items.length}
                        </span>
                      )}
                    </div>
                    <div className="grid gap-x-2 p-1.5 sm:grid-cols-2">{permissionRows(g.items)}</div>
                  </div>
                );
              })}
            </section>
          </div>
        ))}

      {tab === "scope" &&
        (adminRole ? (
          <Note tone="brand">مدير النظام يصل إلى كل الجمعيات والخدمات وأقسامها، فلا يُسنَد إليه شيء.</Note>
        ) : (
          <div className="space-y-8">
            <section className="space-y-3">
              <SectionHeader
                title="الجمعيات المسندة"
                description="يعمل الموظف على هذه الجمعيات وحدها في صفحات المنصة."
                action={
                  allCharities.length > 0 ? (
                    <SelectAll
                      count={charityIds.length}
                      total={allCharities.length}
                      allOn={charityIds.length === allCharities.length}
                      onClick={() => setCharityIds(charityIds.length === allCharities.length ? [] : allCharities.map((c) => c.id))}
                    />
                  ) : undefined
                }
              />
              <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
                {allCharities.map((c) => (
                  <OptionRow
                    key={c.id}
                    label={c.name}
                    checked={charityIds.includes(c.id)}
                    onToggle={() => setCharityIds(toggleIn(charityIds, c.id))}
                  />
                ))}
              </div>
              {charityIds.length === 0 && <Note tone="warn">بلا جمعيات لن يصل الموظف إلى أي جمعية.</Note>}
            </section>

            <section className="space-y-3">
              <SectionHeader
                title="الخدمات"
                description="يرى الخدمات المحددة ويعدّل مراحلها ويجعلها «قريباً» ويعمّمها، في حدود جمعياته."
                action={
                  freeServices.length > 0 ? (
                    <SelectAll
                      count={granted.serviceCount}
                      total={allServiceNames.length}
                      allOn={allServicesOn}
                      onClick={() =>
                        allServicesOn
                          ? revoke("service", freeServices)
                          : setServiceNames([...new Set([...serviceNames, ...freeServices])])
                      }
                    />
                  ) : undefined
                }
              />
              {allServiceNames.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-[13px] text-slate-500 dark:border-slate-700">
                  لا توجد خدمات بعد.
                </p>
              ) : (
                <div className="grid gap-x-2 rounded-lg border border-slate-200 p-1.5 sm:grid-cols-2 dark:border-slate-800">
                  {allServiceNames.map((s) => {
                    const direct = serviceNames.includes(s);
                    const fromBundle = granted.services.get(s);
                    const fromRole = granted.roleServices.get(s);
                    return (
                      <OptionRow
                        key={s}
                        label={s}
                        checked={direct || !!fromBundle}
                        locked={!direct && !!fromRole}
                        note={
                          direct
                            ? undefined
                            : fromRole
                              ? `من مجموعة «${fromRole}» عبر المسمى`
                              : fromBundle
                                ? `من مجموعة «${fromBundle}»`
                                : undefined
                        }
                        onToggle={() => toggleService(s)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        ))}
    </Sheet>
  );
}
