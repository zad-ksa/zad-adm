"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
  IMPLIES,
  effectivePermissions,
} from "@/lib/permissions";
import { createRole, updateRole, deleteRole, syncRolePermissions } from "@/app/actions/roles";

type Bundle = {
  id: string;
  key: string;
  displayName: string;
  permissions: string[];
  isSystem: boolean;
  memberCount: number;
};

const label = (id: string) => ALL_PERMISSIONS.find((p) => p.id === id)?.label ?? id;

/** What this permission hands over automatically. */
const carries = (id: string) => IMPLIES[id] ?? [];
/** What hands this permission over automatically. */
const carriedBy = (id: string) =>
  Object.entries(IMPLIES)
    .filter(([, v]) => v.includes(id))
    .map(([k]) => k);

export default function PermissionsAdminClient({
  holders,
  employeeCount,
  adminNames,
  bundles,
}: {
  holders: Record<string, string[]>;
  employeeCount: number;
  adminNames: string[];
  bundles: Bundle[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"catalog" | "bundles">("catalog");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ key: "", displayName: "", permissions: [] as string[] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = query.trim();
  const matches = (id: string) => !q || id.includes(q) || label(id).includes(q);

  const startCreate = () => {
    setEditing(null);
    setForm({ key: "", displayName: "", permissions: [] });
    setCreating(true);
    setError(null);
  };

  const startEdit = (b: Bundle) => {
    setCreating(false);
    setEditing(b);
    setForm({ key: b.key, displayName: b.displayName, permissions: [...b.permissions] });
    setError(null);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const toggle = (id: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((x) => x !== id)
        : [...f.permissions, id],
    }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = editing
        ? await updateRole(editing.id, {
            displayName: form.displayName,
            permissions: form.permissions,
          })
        : await createRole({
            key: form.key.trim().toUpperCase().replace(/\s+/g, "_"),
            displayName: form.displayName.trim(),
            permissions: form.permissions,
          });
      if ((res as { error?: string })?.error) {
        setError((res as { error?: string }).error!);
        return;
      }
      setNotice(editing ? "حُفظت المجموعة" : "أُنشئت المجموعة");
      close();
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const effective = effectivePermissions(form.permissions);
  const autoAdded = effective.filter((id) => !form.permissions.includes(id));

  const BundleForm = (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] dark:bg-primary/10 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-900 dark:text-slate-100">
          {editing ? `تعديل «${editing.displayName}»` : "مجموعة صلاحيات جديدة"}
        </h3>
        <button onClick={close} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          اسم المجموعة
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="مثال: منسّق تصاميم"
            className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>
        {!editing && (
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            المعرّف <span className="font-normal text-slate-400">— لا يُعدّل بعد الإنشاء</span>
            <input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              dir="ltr"
              placeholder="DESIGN_COORDINATOR"
              className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[13px] text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </label>
        )}
      </div>

      <div className="space-y-3 max-h-[45vh] overflow-y-auto pl-1">
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
                    onClick={() => !auto && toggle(p.id)}
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
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          وتُمنح معها تلقائياً: {autoAdded.map(label).join("، ")}.
        </p>
      )}

      {error && <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !form.displayName.trim() || (!editing && !form.key.trim())}
          className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {editing ? "حفظ" : "إنشاء"}
        </button>
        <button
          onClick={close}
          className="h-10 px-4 rounded-xl text-[13px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          إلغاء
        </button>
        <span className="text-[11px] text-slate-400 tabular-nums mr-auto">
          {form.permissions.length} مختارة · {effective.length} فعّالة
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <div>
        <Link
          href="/main/admin"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors mb-3"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          لوحة التحكم
        </Link>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          إدارة الصلاحيات
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-[13px] leading-relaxed">
          {ALL_PERMISSIONS.length} صلاحية، و{bundles.length} مجموعة، على {employeeCount} موظفاً نشطاً.
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

      <div className="flex items-center gap-1.5">
        {[
          { id: "catalog" as const, label: "الصلاحيات", icon: ShieldCheck },
          { id: "bundles" as const, label: "المجموعات", icon: Layers },
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

      {tab === "catalog" ? (
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
                            <span
                              className="block text-[11px] text-slate-400 font-mono mt-0.5"
                              dir="ltr"
                            >
                              {p.id}
                            </span>
                          </span>
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
        </>
      ) : (
        <>
          {creating || editing ? (
            BundleForm
          ) : (
            <button
              onClick={startCreate}
              className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold hover:bg-primary/90 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> مجموعة جديدة
            </button>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            {bundles.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {b.displayName}
                      {b.isSystem && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Lock className="w-2.5 h-2.5" /> نظامية
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5" dir="ltr">
                      {b.key}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(b)}
                      title="تعديل"
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 inline-flex items-center justify-center"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {!b.isSystem && b.memberCount === 0 && (
                      <button
                        title="حذف"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 inline-flex items-center justify-center"
                        onClick={() => {
                          if (!window.confirm(`حذف مجموعة «${b.displayName}»؟`)) return;
                          setBusy(true);
                          deleteRole(b.id)
                            .then((r) => {
                              if ((r as { error?: string })?.error)
                                setError((r as { error?: string }).error!);
                              else {
                                setNotice("حُذفت المجموعة");
                                startTransition(() => router.refresh());
                              }
                            })
                            .finally(() => setBusy(false));
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 tabular-nums">
                    <ShieldCheck className="w-3 h-3" />
                    {b.permissions.length === 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        بلا صلاحية واحدة
                      </span>
                    ) : (
                      `${b.permissions.length} صلاحية`
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 tabular-nums">
                    <Users className="w-3 h-3" />
                    {b.memberCount} موظف
                  </span>
                  {b.memberCount > 0 && b.permissions.length > 0 && (
                    <button
                      disabled={busy || pending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `سيُطبَّق صلاحيات «${b.displayName}» على ${b.memberCount} موظفاً، ويُستبدل ما لديهم حالياً. متابعة؟`
                          )
                        )
                          return;
                        setBusy(true);
                        syncRolePermissions(b.id)
                          .then(() => {
                            setNotice("طُبّقت على حامليها");
                            startTransition(() => router.refresh());
                          })
                          .finally(() => setBusy(false));
                      }}
                      className="mr-auto text-primary dark:text-teal-400 font-bold hover:underline disabled:opacity-50"
                    >
                      تطبيق على حامليها
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            المجموعة هي المسمى الوظيفي نفسه — اسم واحد يحمل مجموعة صلاحيات. وتعديلها لا يمسّ
            حامليها حتى تضغط «تطبيق على حامليها».
          </p>
        </>
      )}
    </div>
  );
}
