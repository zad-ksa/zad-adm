"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Layers,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  X,
  Loader2,
  Pencil,
  Trash2,
  Info,
  Briefcase,
} from "lucide-react";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  IMPLIES,
  effectivePermissions,
} from "@/lib/permissions";
import {
  createBundle,
  updateBundle,
  deleteBundle,
  setBundleEmployees,
  setEmployeeBundles,
} from "@/app/actions/permissionBundles";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  /** أسماء الخدمات التي تفتحها المجموعة في «عرض الخدمات». */
  services: string[];
  employeeIds: string[];
  roleIds: string[];
};

type ServiceRow = { name: string; holders: string[]; bundles: string[] };

type Emp = {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  bundleIds: string[];
  directCount: number;
};

type Role = { id: string; displayName: string; memberCount: number };

const label = (id: string) => ALL_PERMISSIONS.find((p) => p.id === id)?.label ?? id;
const carries = (id: string) => IMPLIES[id] ?? [];
const carriedBy = (id: string) =>
  Object.entries(IMPLIES)
    .filter(([, implied]) => implied.includes(id))
    .map(([holder]) => holder);

/**
 * إدارة الصلاحيات: الكتالوج، والمجموعات، ومن يحملها.
 *
 * المجموعة ليست مسمّى وظيفياً بلفظٍ آخر: الموظف يحمل مسمّىً واحداً وعدّة
 * مجموعات، والمجموعة تُقرأ حيّةً في كل جلسة فتعديلها يسري في اللحظة — بخلاف
 * «مزامنة» المسمى التي تنسخ صلاحياته إلى عمود الموظف فتدهس ما كان له.
 *
 * وربط المجموعات بالمسميات موضعه صفحة المسميات الوظيفية، لا هذه: هناك يُقرأ
 * السؤال «ماذا يستطيع صاحب هذا المسمى؟» في سياقه. وهنا تُقرأ المجموعة نفسها.
 */
export default function PermissionsAdminClient({
  holders,
  viaBundles,
  adminNames,
  services,
  serviceNames,
  unrestrictedCount,
  employees,
  roles,
  bundles,
}: {
  holders: Record<string, string[]>;
  viaBundles: Record<string, string[]>;
  adminNames: string[];
  services: ServiceRow[];
  serviceNames: string[];
  unrestrictedCount: number;
  employees: Emp[];
  roles: Role[];
  bundles: Bundle[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<"catalog" | "bundles" | "people">("catalog");

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    services: [] as string[],
    employeeIds: [] as string[],
  });
  const [removing, setRemoving] = useState<Bundle | null>(null);

  const [person, setPerson] = useState<Emp | null>(null);
  const [personBundles, setPersonBundles] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = query.trim();
  const matches = (id: string) => !q || id.includes(q) || label(id).includes(q);

  const done = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
    startTransition(() => router.refresh());
  };

  // ── المجموعات ─────────────────────────────────────────────────────────────

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setForm({ name: "", description: "", permissions: [], services: [], employeeIds: [] });
    setError(null);
  };

  const startEdit = (b: Bundle) => {
    setCreating(false);
    setEditing(b);
    setForm({
      name: b.name,
      description: b.description ?? "",
      permissions: [...b.permissions],
      services: [...b.services],
      employeeIds: [...b.employeeIds],
    });
    setError(null);
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const togglePermission = (id: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((x) => x !== id)
        : [...f.permissions, id],
    }));

  const toggleService = (name: string) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(name)
        ? f.services.filter((x) => x !== name)
        : [...f.services, name],
    }));

  const toggleHolder = (id: string) =>
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id)
        ? f.employeeIds.filter((x) => x !== id)
        : [...f.employeeIds, id],
    }));

  const saveBundle = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        permissions: form.permissions,
        services: form.services,
      };

      // الحاملون فعلٌ ثانٍ على جدولٍ ثانٍ، ويجري بعد وجود المجموعة: المجموعة
      // الجديدة لا معرّف لها قبل إنشائها، فلا يمكن منحها لأحد قبله.
      //
      // والفرعان مفصولان لا مُوحَّدان في تعبيرٍ واحد: الإنشاء يُرجع معرّفاً
      // والتحديث لا يُرجعه، فجمعُهما يُنتج نوعاً لا يعرف TypeScript أيّهما
      // بين يديه.
      let bundleId: string;
      if (editing) {
        const res = await updateBundle(editing.id, payload);
        if (!res.success) return setError(res.error);
        bundleId = editing.id;
      } else {
        const res = await createBundle(payload);
        if (!res.success) return setError(res.error);
        bundleId = res.id;
      }

      const linked = await setBundleEmployees(bundleId, form.employeeIds);
      if (!linked.success) return setError(linked.error);

      closeForm();
      done(editing ? "تم تحديث المجموعة" : "تم إنشاء المجموعة");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    setBusy(true);
    const res = await deleteBundle(removing.id);
    setBusy(false);
    setRemoving(null);
    if (!res.success) return setError(res.error);
    done(
      res.affectedEmployees || res.affectedRoles
        ? `حُذفت المجموعة، وسُحبت صلاحياتها عن ${res.affectedEmployees} موظف و${res.affectedRoles} مسمّى`
        : "حُذفت المجموعة"
    );
  };

  // ── الموظفون ──────────────────────────────────────────────────────────────

  const startPerson = (e: Emp) => {
    setPerson(e);
    setPersonBundles([...e.bundleIds]);
    setError(null);
  };

  const savePerson = async () => {
    if (!person) return;
    setBusy(true);
    const res = await setEmployeeBundles(person.id, personBundles);
    setBusy(false);
    if (!res.success) return setError(res.error);
    setPerson(null);
    done(`تم تحديث مجموعات ${person.name}`);
  };

  // اشتمال الصلاحيات: ما يُمنح تلقائياً مع المختار، فلا يُظنّ ناقصاً.
  const autoAdded = effectivePermissions(form.permissions).filter(
    (id) => !form.permissions.includes(id)
  );

  const bundleName = (id: string) => bundles.find((b) => b.id === id)?.name ?? id;
  const roleName = (id: string) => roles.find((r) => r.id === id)?.displayName ?? id;

  const formOpen = creating || !!editing;

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <Link
          href="/main/admin"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 hover:text-primary mb-2"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          لوحة التحكم
        </Link>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          إدارة الصلاحيات
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-[13px] leading-relaxed">
          {ALL_PERMISSIONS.length} صلاحية، و{bundles.length} مجموعة، على {employees.length} موظفاً
          نشطاً.
          {adminNames.length > 0 && (
            <> ودور «مدير النظام» ({adminNames.join("، ")}) يمرّ بلا شرط ولا يحتاج أيّاً منها.</>
          )}
        </p>
      </div>

      {notice && (
        <p className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-4 py-3 text-[13px] font-bold">
          {notice}
        </p>
      )}

      {error && !formOpen && !person && (
        <p className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 px-4 py-3 text-[13px] font-bold">
          {error}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: "catalog" as const, label: "الصلاحيات والخدمات", icon: ShieldCheck },
          { id: "bundles" as const, label: "المجموعات", icon: Layers },
          { id: "people" as const, label: "الموظفون", icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`h-9 px-4 rounded-xl text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── الكتالوج: كل صلاحية في الموقع، ومن يحملها فعلاً ──────────────── */}
      {tab === "catalog" && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم الصلاحية أو معرّفها…"
              className="w-full sm:w-96 h-10 pr-11 pl-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {PERMISSION_GROUPS.map((g) => {
            const shown = g.permissions.filter((p) => matches(p.id));
            if (!shown.length) return null;
            return (
              <div key={g.title} className="space-y-2">
                <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/60" />
                  {g.title}
                  <span className="text-slate-400 font-bold tabular-nums">{shown.length}</span>
                </h3>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {shown.map((p) => {
                    const who = holders[p.id] ?? [];
                    const groups = viaBundles[p.id] ?? [];
                    const isOpen = open === p.id;
                    return (
                      <div key={p.id} className="bg-white dark:bg-slate-900">
                        <button
                          onClick={() => setOpen(isOpen ? null : p.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 text-right hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-200">
                              {p.label}
                            </span>
                            <span className="block text-[11px] text-slate-400 font-mono mt-0.5" dir="ltr">
                              {p.id}
                            </span>
                          </span>
                          {groups.length > 0 && (
                            <span className="shrink-0 text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary dark:text-teal-300">
                              {groups.length} مجموعة
                            </span>
                          )}
                          <span
                            className={`shrink-0 text-[11px] font-bold tabular-nums px-2 py-1 rounded-lg ${
                              who.length === 0
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {who.length === 0 ? "لا أحد" : `${who.length} موظف`}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 space-y-2 text-[12px]">
                            {who.length > 0 && (
                              <p className="text-slate-600 dark:text-slate-300">
                                <span className="font-bold">يملكها: </span>
                                {who.join("، ")}
                              </p>
                            )}
                            {groups.length > 0 && (
                              <p className="text-primary dark:text-teal-400">
                                <span className="font-bold">وتمنحها المجموعات: </span>
                                {groups.join("، ")}
                              </p>
                            )}
                            {carries(p.id).length > 0 && (
                              <p className="text-primary dark:text-teal-400">
                                <span className="font-bold">تمنح معها تلقائياً: </span>
                                {carries(p.id).map(label).join("، ")}
                              </p>
                            )}
                            {carriedBy(p.id).length > 0 && (
                              <p className="text-slate-500 dark:text-slate-400">
                                <span className="font-bold">تُمنح تلقائياً مع: </span>
                                {carriedBy(p.id).map(label).join("، ")}
                              </p>
                            )}
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              الشرح التفصيلي لما تسمح به كل صلاحية في
                              <span className="font-mono" dir="ltr">
                                {" "}
                                docs/دليل-الصلاحيات.md
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* الخدمات ديناميكية: تُقرأ من جدول الخدمات لا من قائمة في الكود،
              فما يُنشأ منها اليوم يظهر هنا غداً بلا تعديل شيفرة. */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              الخدمات
              <span className="text-slate-400 font-bold tabular-nums">{services.length}</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              الوصول إلى خدمةٍ ليس صلاحيةً في القائمة أعلاه، بل منحٌ باسم الخدمة. ومن لا منح له
              فليس مقيَّداً: يرى كل خدمات جمعياته — و{unrestrictedCount} من {employees.length}{" "}
              موظفاً على هذه الحال الآن.
            </p>

            {services.length === 0 ? (
              <p className="text-[12px] text-slate-400">لا خدمات في القاعدة.</p>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {services
                  .filter((s) => !q || s.name.includes(q))
                  .map((s) => (
                    <div
                      key={s.name}
                      className="bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap"
                    >
                      <span className="min-w-0 flex-1 text-[13px] font-bold text-slate-800 dark:text-slate-200">
                        {s.name}
                      </span>
                      {s.bundles.length > 0 && (
                        <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary dark:text-teal-300">
                          {s.bundles.join("، ")}
                        </span>
                      )}
                      <span
                        className="text-[11px] font-bold tabular-nums px-2 py-1 rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        title={s.holders.length ? s.holders.join("، ") : undefined}
                      >
                        {s.holders.length === 0 ? "لا منح خاصّ" : `${s.holders.length} مقيَّد بها`}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── المجموعات ─────────────────────────────────────────────────────── */}
      {tab === "bundles" && (
        <>
          {formOpen ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] dark:bg-primary/10 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-900 dark:text-slate-100">
                  {editing ? `تعديل «${editing.name}»` : "مجموعة صلاحيات جديدة"}
                </h3>
                <button
                  onClick={closeForm}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  اسم المجموعة
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: مسؤول التحضير"
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  وصفٌ مختصر <span className="font-normal text-slate-400">— اختياري</span>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="لماذا توجد هذه المجموعة؟"
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </label>
              </div>

              <div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2">
                  الصلاحيات — اختير منها {form.permissions.length}
                </p>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pl-1">
                  {PERMISSION_GROUPS.map((g) => (
                    <div key={g.title}>
                      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 mb-1.5">
                        {g.title}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {g.permissions.map((p) => {
                          const chosen = form.permissions.includes(p.id);
                          const auto = !chosen && autoAdded.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => !auto && togglePermission(p.id)}
                              disabled={auto}
                              title={auto ? "ممنوحة تلقائياً باشتمال" : undefined}
                              className={`flex items-start gap-2 p-2 rounded-xl border text-right transition-colors ${
                                chosen || auto
                                  ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                              } ${auto ? "opacity-70 cursor-default" : ""}`}
                            >
                              <span
                                className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                                  chosen || auto
                                    ? "bg-primary border-primary text-white"
                                    : "border-slate-300 dark:border-slate-600"
                                }`}
                              >
                                {(chosen || auto) && <Check className="w-3 h-3" />}
                              </span>
                              <span className="text-[11px] font-bold leading-snug">
                                {p.label}
                                {auto && (
                                  <span className="block font-normal text-[10px] text-slate-400 mt-0.5">
                                    تلقائياً
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {autoAdded.length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    وتُمنح معها تلقائياً: {autoAdded.map(label).join("، ")}.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  الخدمات التي تفتحها — {form.services.length} من {serviceNames.length}
                </p>
                <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                  تُفتح في «عرض الخدمات» داخل جمعيات الموظف وحدها. واتركها فارغةً إن لم تكن
                  المجموعة معنيّةً بالخدمات — فالفراغ لا يُقيّد أحداً.
                </p>
                {serviceNames.length === 0 ? (
                  <p className="text-[11px] text-slate-400 mb-4">لا خدمات في القاعدة.</p>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-1.5 mb-4">
                    {serviceNames.map((name) => {
                      const on = form.services.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleService(name)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-colors ${
                            on
                              ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              on
                                ? "bg-primary border-primary text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {on && <Check className="w-3 h-3" />}
                          </span>
                          <span className="text-[11px] font-bold truncate">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2">
                  من يحملها — {form.employeeIds.length} من {employees.length}
                </p>
                <div className="grid sm:grid-cols-3 gap-1.5 max-h-[28vh] overflow-y-auto pl-1">
                  {employees.map((e) => {
                    const on = form.employeeIds.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleHolder(e.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-colors ${
                          on
                            ? "border-primary bg-primary/5 text-primary dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            on
                              ? "bg-primary border-primary text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {on && <Check className="w-3 h-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold truncate">{e.name}</span>
                          <span className="block text-[10px] text-slate-400 truncate">
                            {e.roleLabel}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{error}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={saveBundle}
                  disabled={
                    busy ||
                    !form.name.trim() ||
                    (form.permissions.length === 0 && form.services.length === 0)
                  }
                  className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? "حفظ" : "إنشاء"}
                </button>
                <button
                  onClick={closeForm}
                  className="h-10 px-4 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                {form.permissions.length === 0 && form.services.length === 0 && (
                  <span className="text-[11px] text-slate-400">
                    اختر صلاحيةً أو خدمةً واحدة على الأقل
                  </span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={startCreate}
              className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> مجموعة جديدة
            </button>
          )}

          {bundles.length === 0 && !formOpen ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-2">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400">
                لا مجموعات بعد
              </p>
              <p className="text-[12px] text-slate-400 leading-relaxed max-w-md mx-auto">
                المجموعة اسمٌ تختاره لعدّة صلاحيات تُمنح معاً — «مسؤول التحضير» مثلاً. تمنحها
                لموظفين، أو تربطها بمسمّى وظيفي فتسري على كل من يحمله.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {bundles.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">
                        {b.name}
                      </h4>
                      {b.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                          {b.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(b)}
                        title="تعديل"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setRemoving(b)}
                        title="حذف"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {b.permissions.slice(0, 6).map((id) => (
                      <span
                        key={id}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {label(id)}
                      </span>
                    ))}
                    {b.permissions.length > 6 && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                        +{b.permissions.length - 6}
                      </span>
                    )}
                    {b.services.map((name) => (
                      <span
                        key={name}
                        title="خدمة تفتحها هذه المجموعة"
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary dark:text-teal-300 inline-flex items-center gap-1"
                      >
                        <Briefcase className="w-2.5 h-2.5" />
                        {name}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 pt-2">
                      {b.employeeIds.length} موظف
                    </span>
                    <span className="text-slate-300 pt-2">·</span>
                    <span className="text-slate-500 dark:text-slate-400 pt-2">
                      {b.permissions.length} صلاحية
                    </span>
                    {b.services.length > 0 && (
                      <>
                        <span className="text-slate-300 pt-2">·</span>
                        <span className="text-slate-500 dark:text-slate-400 pt-2">
                          {b.services.length} خدمة
                        </span>
                      </>
                    )}
                    {b.roleIds.length > 0 && (
                      <>
                        <span className="text-slate-300 pt-2">·</span>
                        <span className="text-primary dark:text-teal-300 pt-2">
                          مسميات: {b.roleIds.map(roleName).join("، ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              تعديل المجموعة يسري على حامليها في جلستهم التالية بلا مزامنة، ونزعها يسحب ما أعطته
              ولا يمسّ ما مُنح للموظف مباشرةً. وربطها بمسمّى وظيفي من صفحة «المسميات الوظيفية».
            </span>
          </p>
        </>
      )}

      {/* ── الموظفون: عدّة مجموعات للموظف الواحد ──────────────────────────── */}
      {tab === "people" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {employees.map((e) => (
            <div
              key={e.id}
              className="bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                  {e.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {e.roleLabel} · {e.directCount} صلاحية مباشرة
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {e.bundleIds.length === 0 ? (
                  <span className="text-[11px] text-slate-400">لا مجموعات</span>
                ) : (
                  e.bundleIds.map((id) => (
                    <span
                      key={id}
                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary dark:text-teal-300"
                    >
                      {bundleName(id)}
                    </span>
                  ))
                )}
              </div>

              <button
                onClick={() => startPerson(e)}
                disabled={bundles.length === 0}
                title={bundles.length === 0 ? "أنشئ مجموعةً أولاً" : "تعديل مجموعاته"}
                className="h-8 px-3 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                المجموعات
              </button>
            </div>
          ))}
        </div>
      )}

      {/* نافذة مجموعات موظف */}
      {person && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-slate-900 dark:text-slate-100">
                مجموعات {person.name}
              </h3>
              <button
                onClick={() => setPerson(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pl-1">
              {bundles.map((b) => {
                const on = personBundles.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setPersonBundles((prev) =>
                        prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]
                      )
                    }
                    className={`w-full flex items-start gap-2.5 p-3 rounded-xl border text-right transition-colors ${
                      on
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                        on
                          ? "bg-primary border-primary text-white"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {on && <Check className="w-3 h-3" />}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-[12px] font-bold ${
                          on ? "text-primary dark:text-teal-300" : "text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {b.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        {b.permissions.length} صلاحية
                        {b.services.length > 0 ? ` · ${b.services.length} خدمة` : ""}
                        {b.description ? ` · ${b.description}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {error && <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                onClick={savePerson}
                disabled={busy}
                className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                حفظ
              </button>
              <button
                onClick={() => setPerson(null)}
                className="h-10 px-4 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!removing}
        title="حذف المجموعة"
        message={
          removing
            ? `سيُحذف «${removing.name}» وتُسحب صلاحياته عن ${removing.employeeIds.length} موظف${
                removing.roleIds.length ? ` و${removing.roleIds.length} مسمّى` : ""
              }. ما مُنح لكل موظف مباشرةً لا يُمَسّ.`
            : ""
        }
        isPending={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
