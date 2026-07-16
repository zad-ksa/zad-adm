"use client";

import { useState, useTransition } from "react";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Check, X, GitBranch,
  ChevronDown, ChevronUp, Loader2, AlertCircle, Power, PowerOff, Edit2, Save,
  UserCheck,
} from "lucide-react";
import {
  createChain, deleteChain, setActiveChain, clearActiveChain,
  addStep, removeStep, reorderSteps, updateStepLabel, updateChainName,
} from "@/app/actions/workflow";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "الإدارة التنفيذية",
  GENERAL_MANAGER: "المدير العام",
  ADMINISTRATIVE_SECRETARIAT: "مساعد المدير",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
};

type Employee = { id: string; name: string; role: string };
type Step = { id: string; order: number; label: string | null; approver: Employee };
type Chain = { id: string; name: string; isActive: boolean; steps: Step[] };

export default function WorkflowSettingsClient({
  chains: initial, employees,
}: { chains: Chain[]; employees: Employee[] }) {
  const [chains, setChains] = useState<Chain[]>(initial);
  const [newChainName, setNewChainName] = useState("");
  const [expandedChain, setExpandedChain] = useState<string | null>(initial[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Per-chain state for adding steps
  const [addingStep, setAddingStep] = useState<Record<string, { approverId: string; label: string }>>({});
  // Editing chain name
  const [editingName, setEditingName] = useState<Record<string, string>>({});

  function refresh() { window.location.reload(); }

  function run(fn: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try { await fn(); refresh(); } catch (e: any) { setError(e.message); }
    });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">سلاسل اعتماد الطلبات</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">حدد الترتيب الهرمي الذي تمر به الطلبات قبل اعتمادها</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* بدون workflow */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">بدون سلسلة اعتماد</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">الطلبات تصل لجميع الإدارة التنفيذية مباشرة</p>
          </div>
          {!chains.some(c => c.isActive) ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3" /> مفعّل
            </span>
          ) : (
            <button onClick={() => run(() => clearActiveChain())} disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <PowerOff className="w-3 h-3" /> تفعيل هذا
            </button>
          )}
        </div>
      </div>

      {/* قائمة السلاسل */}
      {chains.map(chain => (
        <div key={chain.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {/* رأس السلسلة */}
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => setExpandedChain(expandedChain === chain.id ? null : chain.id)}
              className="flex-1 flex items-center gap-3 text-right">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${chain.isActive ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-slate-100 dark:bg-slate-700"}`}>
                <GitBranch className={`w-4 h-4 ${chain.isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
              </div>
              <div className="flex-1 min-w-0">
                {editingName[chain.id] !== undefined ? (
                  <input
                    value={editingName[chain.id]}
                    onChange={e => setEditingName(prev => ({ ...prev, [chain.id]: e.target.value }))}
                    onClick={e => e.stopPropagation()}
                    className="text-sm font-bold bg-transparent border-b border-indigo-400 outline-none text-slate-800 dark:text-slate-100 w-48"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{chain.name}</p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">{chain.steps.length} مستوى</p>
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

              {/* تفعيل */}
              {chain.isActive ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" /> مفعّل
                </span>
              ) : (
                <button onClick={() => run(() => setActiveChain(chain.id))} disabled={isPending}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-full hover:border-indigo-300 transition-colors">
                  <Power className="w-3 h-3" /> تفعيل
                </button>
              )}

              {/* حذف */}
              {!chain.isActive && (
                <button onClick={() => { if (confirm("حذف هذه السلسلة؟")) run(() => deleteChain(chain.id)); }}
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
                  <div className="absolute right-[18px] top-6 bottom-6 w-px bg-indigo-200 dark:bg-indigo-800" />
                  <div className="space-y-2">
                    {chain.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-3">
                        {/* رقم المستوى */}
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-200 dark:border-indigo-700 flex items-center justify-center shrink-0 z-10">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{step.order}</span>
                        </div>
                        {/* بيانات الشخص */}
                        <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{step.approver.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {ROLE_LABELS[step.approver.role] || step.approver.role}
                              {step.label && <span className="text-indigo-500"> · {step.label}</span>}
                            </p>
                          </div>
                          {/* أزرار الترتيب */}
                          <div className="flex items-center gap-1 shrink-0">
                            {idx > 0 && (
                              <button onClick={() => run(() => reorderSteps(step.id, "up"))} disabled={isPending}
                                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-600 transition-colors">
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {idx < chain.steps.length - 1 && (
                              <button onClick={() => run(() => reorderSteps(step.id, "down"))} disabled={isPending}
                                className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-600 transition-colors">
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => { if (confirm("حذف هذه الخطوة؟")) run(() => removeStep(step.id)); }}
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
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">لا توجد خطوات — أضف المستوى الأول</p>
              )}

              {/* إضافة خطوة */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 border border-indigo-100 dark:border-indigo-800">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> إضافة مستوى جديد
                </p>
                <div className="flex gap-2">
                  <select
                    value={addingStep[chain.id]?.approverId || ""}
                    onChange={e => setAddingStep(prev => ({ ...prev, [chain.id]: { ...prev[chain.id], approverId: e.target.value } }))}
                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">اختر الشخص...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} — {ROLE_LABELS[e.role] || e.role}</option>
                    ))}
                  </select>
                  <input
                    value={addingStep[chain.id]?.label || ""}
                    onChange={e => setAddingStep(prev => ({ ...prev, [chain.id]: { ...prev[chain.id], label: e.target.value } }))}
                    placeholder="تسمية (اختياري)"
                    className="w-32 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button
                    disabled={!addingStep[chain.id]?.approverId || isPending}
                    onClick={() => run(() => addStep({ chainId: chain.id, approverId: addingStep[chain.id].approverId, label: addingStep[chain.id]?.label }))}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0">
                    {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    إضافة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* إنشاء سلسلة جديدة */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-4">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">إنشاء سلسلة اعتماد جديدة</p>
        <div className="flex gap-2">
          <input value={newChainName} onChange={e => setNewChainName(e.target.value)}
            placeholder="اسم السلسلة... مثال: مسار المشتريات"
            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button disabled={!newChainName.trim() || isPending}
            onClick={() => run(async () => { await createChain(newChainName); setNewChainName(""); })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إنشاء
          </button>
        </div>
      </div>
    </div>
  );
}
