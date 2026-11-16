"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/console/layout";
import { confirmAction } from "@/components/console/confirmBus";
import Select from "@/components/console/Select";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Check, X, GitBranch,
  ChevronDown, ChevronUp, Loader2, AlertCircle, Power, PowerOff, Edit2, Save,
  Layers,
} from "lucide-react";
import {
  createChain, deleteChain, setActiveChain, deactivateChain,
  addStep, removeStep, reorderSteps, updateChainName, setChainCategories,
} from "@/app/actions/workflow";
import {
  chainForCategory,
  defaultChains,
  FINANCIAL_CATEGORY,
  REQUEST_CATEGORIES,
  requestCategory,
  unroutedCategories,
} from "@/lib/requestCategories";

import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { btn, cx, Note } from "@/components/console/ui";

type Employee = { id: string; name: string; role: string };
type Step = { id: string; order: number; label: string | null; approver: Employee };
type Chain = { id: string; name: string; isActive: boolean; categories: string[]; steps: Step[] };

export default function WorkflowSettingsClient({
  chains: initial, employees,
}: { chains: Chain[]; employees: Employee[] }) {
  const roleLabels = useRoleLabels();
  const [chains] = useState<Chain[]>(initial);
  const [newChainName, setNewChainName] = useState("");
  const [expandedChain, setExpandedChain] = useState<string | null>(initial[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Per-chain state for adding steps
  const [addingStep, setAddingStep] = useState<Record<string, { approverId: string; label: string }>>({});
  // Editing chain name
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  // مسوَّدةُ الأقسام لكل سلسلة: تُحفظ بزرٍّ لا بكلِّ نقرة — فالحفظُ هنا
  // يُعيد تحميل الصفحة، واختيارُ ستّة أقسامٍ كان ستّ إعادات تحميل.
  const [draftCategories, setDraftCategories] = useState<Record<string, string[]>>({});

  function refresh() { window.location.reload(); }

  function run(fn: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try { await fn(); refresh(); } catch (e: any) { setError(e.message); }
    });
  }

  function renderChain(chain: Chain) {
    const picked = draftCategories[chain.id] ?? chain.categories;
    const dirty = picked.length !== chain.categories.length || picked.some((c) => !chain.categories.includes(c));
    // أيُّ سلسلةٍ تحجز كلَّ خدمةٍ من خدمات غيرها — يُقرأ في تلميح الشارة.
    const owners: Record<string, string> = {};
    for (const other of chains) {
      if (other.id === chain.id) continue;
      for (const c of other.categories) owners[c] = other.name;
    }
    const summary =
      chain.categories.length > 0
        ? `${chain.categories.length} خدمة`
        : chain.isActive
          ? "الخدمات غير المسندة"
          : "بلا خدمات";

    return (
      <div key={chain.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* رأس السلسلة */}
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}
            className="flex-1 flex items-center gap-3 text-right">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${chain.isActive ? "bg-primary/10 dark:bg-primary/20" : "bg-slate-100 dark:bg-slate-700"}`}>
              <GitBranch className={`w-4 h-4 ${chain.isActive ? "text-primary" : "text-slate-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              {editingName[chain.id] !== undefined ? (
                <input
                  value={editingName[chain.id]}
                  onChange={e => setEditingName(prev => ({ ...prev, [chain.id]: e.target.value }))}
                  onClick={e => e.stopPropagation()}
                  className="text-caption font-semibold bg-transparent border-b border-primary/50 outline-none text-slate-800 dark:text-slate-100 w-48"
                />
              ) : (
                <p className="text-caption font-semibold text-slate-800 dark:text-slate-100 truncate">{chain.name}</p>
              )}
              <p className="text-caption text-slate-500 dark:text-slate-400">
                {chain.steps.length} مستوى · {summary}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* تعديل الاسم */}
            {editingName[chain.id] !== undefined ? (
              <>
                <button onClick={() => run(() => updateChainName(chain.id, editingName[chain.id]))}
                  className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 transition-colors">
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingName(prev => { const n = {...prev}; delete n[chain.id]; return n; })}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => setEditingName(prev => ({ ...prev, [chain.id]: chain.name }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* تفعيل وتعطيل: سلاسلُ تعمل معاً، ولكلٍّ مفتاحُها */}
            {chain.isActive ? (
              <>
                <span className="flex items-center gap-1 text-caption font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" /> تعمل
                </span>
                <button onClick={async () => { if (await confirmAction({ title: `تعطيل ${chain.name}؟`, message: "خدماتها تبقى مسندة اليها، وتمر طلباتها بالسلسلة المفعلة بلا خدمات حتى تعيد تفعيلها.", confirmLabel: "تعطيل" })) run(() => deactivateChain(chain.id)); }}
                  disabled={isPending} title="تعطيل السلسلة"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <PowerOff className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => run(() => setActiveChain(chain.id))} disabled={isPending}
                className="flex items-center gap-1 text-caption font-semibold text-slate-500 hover:text-primary border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full hover:border-primary/50 transition-colors">
                <Power className="w-3 h-3" /> تفعيل
              </button>
            )}

            {/* حذف */}
            {!chain.isActive && (
              <button onClick={async () => { if (await confirmAction({ title: "حذف هذه السلسلة؟", confirmLabel: "حذف" })) run(() => deleteChain(chain.id)); }}
                disabled={isPending}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
              {expandedChain === chain.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* تفاصيل السلسلة */}
        {expandedChain === chain.id && (
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-3">
            {/* خط سير بصري */}
            {chain.steps.length > 0 && (
              <div className="relative">
                <div className="absolute right-[18px] top-6 bottom-6 w-px bg-primary/20 dark:bg-primary/20" />
                <div className="space-y-2">
                  {chain.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-3">
                      {/* رقم المستوى */}
                      <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 border-2 border-primary/20 dark:border-primary/30 flex items-center justify-center shrink-0 z-10">
                        <span className="text-caption font-semibold text-primary">{step.order}</span>
                      </div>
                      {/* بيانات الشخص */}
                      <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-caption font-semibold text-slate-800 dark:text-slate-100 truncate">{step.approver.name}</p>
                          <p className="text-caption text-slate-500 dark:text-slate-400">
                            {roleLabels[step.approver.role] || step.approver.role}
                            {step.label && <span className="text-primary/70"> · {step.label}</span>}
                          </p>
                        </div>
                        {/* أزرار الترتيب */}
                        <div className="flex items-center gap-1 shrink-0">
                          {idx > 0 && (
                            <button onClick={() => run(() => reorderSteps(step.id, "up"))} disabled={isPending}
                              className="p-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < chain.steps.length - 1 && (
                            <button onClick={() => run(() => reorderSteps(step.id, "down"))} disabled={isPending}
                              className="p-1 rounded hover:bg-primary/10 dark:hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={async () => { if (await confirmAction({ title: "حذف هذه الخطوة؟", confirmLabel: "حذف" })) run(() => removeStep(step.id)); }}
                            disabled={isPending}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chain.steps.length === 0 && (
              <p className="text-caption text-slate-400 dark:text-slate-500 text-center py-4">لا توجد خطوات — أضف المستوى الأول</p>
            )}

            {/* الخدمات التي تمر بهذه السلسلة */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-caption font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  الخدمات التي تمر بهذه السلسلة
                </p>
                {dirty && (
                  <button onClick={() => run(() => setChainCategories(chain.id, picked))} disabled={isPending}
                    className={cx(btn.primary, "shrink-0")}>
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    حفظ الخدمات
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REQUEST_CATEGORIES.map((cat) => {
                  const on = picked.includes(cat.key);
                  const elsewhere = owners[cat.key];
                  return (
                    <button key={cat.key} type="button"
                      onClick={() => setDraftCategories((prev) => ({
                        ...prev,
                        [chain.id]: on ? picked.filter((c) => c !== cat.key) : [...picked, cat.key],
                      }))}
                      title={
                        cat.key === FINANCIAL_CATEGORY
                          ? `${!on && elsewhere ? `مسند حاليا الى: ${elsewhere} — ` : ""}وبها يمر اعتماد الطلبات المالية`
                          : !on && elsewhere
                            ? `مسند حاليا الى: ${elsewhere}`
                            : undefined
                      }
                      className={cx(
                        "px-2.5 py-1 rounded-full text-caption font-semibold border transition-all",
                        on
                          ? `${cat.bg} ${cat.border} ${cat.color} ring-1 ring-current`
                          : elsewhere
                            ? "border-dashed border-slate-300 dark:border-slate-600 text-slate-400"
                            : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                      )}>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-slate-400 dark:text-slate-500 mt-2 leading-5">
                الخدمة المسندة هنا تنزع من بقية السلاسل، فلكل خدمة مسار واحد ولا تشترك سلسلتان في خدمة. والمتقطع اطاره مسند الى سلسلة اخرى.
                {!chain.isActive
                  ? " وهذه السلسلة معطلة، فلا يمر بها شيء حتى تفعل."
                  : chain.categories.length === 0
                    ? " وهي تعمل بلا خدمات، فتمر بها كل خدمة لم تسند الى سلسلة."
                    : ""}
              </p>
            </div>

            {/* إضافة خطوة */}
            <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 border border-primary/10 dark:border-primary/20">
              <p className="text-caption font-semibold text-primary mb-2 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> إضافة مستوى جديد
              </p>
              <div className="flex gap-2">
                <Select
                  value={addingStep[chain.id]?.approverId || ""}
                  onSelect={(v) => setAddingStep(prev => ({ ...prev, [chain.id]: { ...prev[chain.id], approverId: v } }))}
                  placeholder="اختر الشخص…"
                  options={employees.map(e => ({ value: e.id, label: e.name, hint: roleLabels[e.role] || e.role }))}
                  className="flex-1 [&>button]:w-full [&>button]:justify-between"
                />
                <input
                  value={addingStep[chain.id]?.label || ""}
                  onChange={e => setAddingStep(prev => ({ ...prev, [chain.id]: { ...prev[chain.id], label: e.target.value } }))}
                  placeholder="تسمية (اختياري)"
                  className="w-32 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-caption bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                <button
                  disabled={!addingStep[chain.id]?.approverId || isPending}
                  onClick={() => run(() => addStep({ chainId: chain.id, approverId: addingStep[chain.id].approverId, label: addingStep[chain.id]?.label }))}
                  className={cx(btn.primary, "shrink-0")}>
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  إضافة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ما يُقرأ عن البركة كلِّها: ما بقي بلا مسار، ومن هي الافتراضيّة، ومسارُ
  // الطلب المالي — وهذه ثلاثةُ أخبارٍ لا تُعرف من سلسلةٍ وحدَها.
  const routable = chains.map((c) => ({
    id: c.id,
    name: c.name,
    categories: c.categories,
    isActive: c.isActive,
    stepCount: c.steps.length,
  }));
  const defaults = defaultChains(routable);
  const unrouted = unroutedCategories(routable);
  const financial = chainForCategory(FINANCIAL_CATEGORY, routable);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <PageHeader
        icon={<GitBranch className="w-6 h-6" />}
        title="سلاسل اعتماد الطلبات"
        description="اسند الخدمات الى سلاسلها فيعرف كل طلب مساره، وتعمل السلاسل معا بلا اشتراك"
      />

      {error && (
        <div className="flex items-start gap-2 text-caption text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 leading-5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      {/* الطلبُ المالي تابعٌ لخدمة المالية، فيُقال مسارُه هنا صريحاً */}
      <Note tone={financial ? "brand" : "warn"}>
        اعتماد الطلبات المالية يتبع خدمة «المالية»:{" "}
        {financial
          ? `يمر الان على «${financial.name}»، وهي ${financial.categories.includes(FINANCIAL_CATEGORY) ? "السلسلة المسندة اليها المالية" : "السلسلة التي تعمل بلا خدمات"}.`
          : "لا مسار لها الان — اسند «المالية» الى سلسلة لها مستويات، او فعل سلسلة بلا خدمات."}
      </Note>

      {defaults.length > 1 && (
        <Note tone="warn">
          اكثر من سلسلة تعمل بلا خدمات ({defaults.map((c) => c.name).join("، ")}) — الخدمات غير المسندة تمر باقدمها.
          اسند خدمات الى الزائدة او عطلها، فلكل خدمة مسار واحد.
        </Note>
      )}

      {defaults.length === 0 && unrouted.length > 0 && (
        <Note tone="warn">
          {unrouted.length} من الخدمات بلا مسار (منها{" "}
          {unrouted.slice(0, 3).map((c) => requestCategory(c)?.label ?? c).join("، ")}
          {unrouted.length > 3 ? " وغيرها" : ""}) — لن ترفع طلباتها حتى تسند الى سلسلة تعمل ولها مستويات، او تفعل سلسلة بلا خدمات تمر بها.
        </Note>
      )}

      <div className="space-y-3">
        {chains.map(renderChain)}
        {chains.length === 0 && (
          <p className="text-caption text-slate-400 dark:text-slate-500 text-center py-3">لا سلاسل بعد</p>
        )}
      </div>

      {/* إنشاء سلسلة جديدة */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-4">
        <p className="text-caption font-semibold text-slate-500 dark:text-slate-400 mb-2">إنشاء سلسلة</p>
        <div className="flex gap-2">
          <input value={newChainName} onChange={e => setNewChainName(e.target.value)}
            placeholder="اسم السلسلة... مثال: مسار المشتريات"
            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-caption bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button disabled={!newChainName.trim() || isPending}
            onClick={() => run(async () => { await createChain(newChainName); setNewChainName(""); })}
            className={cx(btn.primary, "shrink-0")}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إنشاء
          </button>
        </div>
        <p className="text-caption text-slate-400 dark:text-slate-500 mt-2">تنشأ معطلة: ابن مستوياتها واسند خدماتها ثم فعلها.</p>
      </div>
    </div>
  );
}
