"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import {
  Check, Calendar, Printer, ChevronDown, ChevronRight,
  Briefcase, LayoutGrid, ChevronLeft, Edit2, X, Plus,
  Trash2, ArrowUp, ArrowDown, Loader2, Save, Layers,
  AlertTriangle, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  setCurrentStrategicStage, addStrategicStage, updateStrategicStage,
  deleteStrategicStage, reorderStrategicStages
} from "@/app/actions/strategy";
import {
  setCurrentGovernanceStage, addGovernanceStage, updateGovernanceStage,
  deleteGovernanceStage, reorderGovernanceStages
} from "@/app/actions/governance";
import {
  setCurrentFinanceStage, addFinanceStage, updateFinanceStage,
  deleteFinanceStage, reorderFinanceStages
} from "@/app/actions/finance";
import {
  setCurrentServiceStage, addServiceStage, updateServiceStage,
  deleteServiceStage, reorderServiceStages, unifyCharityStagesAction
} from "@/app/actions/services";

const PAGE_SIZE = 5;

type Charity = {
  id: string;
  name: string;
  strategyTimelineName?: string | null;
  governanceTimelineName?: string | null;
  financeTimelineName?: string | null;
};

type Stage = {
  id: string;
  charityId: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
  isCurrent: boolean;
  isContinuous?: boolean;
};

type ServiceWithStages = {
  id: string;
  charityId: string;
  name: string;
  department?: string | null;
  stages: Stage[];
};

const DEPT_COLORS: Record<string, string> = {
  STRATEGY: "bg-blue-500", GOVERNANCE: "bg-purple-500",
  FINANCE: "bg-emerald-500", PROGRAMS: "bg-amber-500",
};
const DEPT_LIGHT: Record<string, string> = {
  STRATEGY: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  GOVERNANCE: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  FINANCE: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  PROGRAMS: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-SA");
}

// ── Actions router by dept ──────────────────────────────────────────
type DeptKey = "STRATEGY" | "GOVERNANCE" | "FINANCE" | "SERVICE";

async function actionSetCurrent(dept: DeptKey, serviceId: string, charityId: string, stageId: string) {
  if (dept === "STRATEGY") return setCurrentStrategicStage(charityId, stageId);
  if (dept === "GOVERNANCE") return setCurrentGovernanceStage(charityId, stageId);
  if (dept === "FINANCE") return setCurrentFinanceStage(charityId, stageId);
  return setCurrentServiceStage(serviceId, stageId);
}
async function actionAdd(dept: DeptKey, serviceId: string, charityId: string, name: string, desc: string | null, start: Date | null, end: Date | null) {
  if (dept === "STRATEGY") return addStrategicStage(charityId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  if (dept === "GOVERNANCE") return addGovernanceStage(charityId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  if (dept === "FINANCE") return addFinanceStage(charityId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  return addServiceStage(serviceId, name, desc, start, end);
}
async function actionUpdate(dept: DeptKey, stageId: string, name: string, desc: string | null, start: Date | null, end: Date | null) {
  if (dept === "STRATEGY") return updateStrategicStage(stageId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  if (dept === "GOVERNANCE") return updateGovernanceStage(stageId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  if (dept === "FINANCE") return updateFinanceStage(stageId, name, undefined, desc || undefined, start?.toISOString().split("T")[0], end?.toISOString().split("T")[0]);
  return updateServiceStage(stageId, name, desc, start, end);
}
async function actionDelete(dept: DeptKey, stageId: string) {
  if (dept === "STRATEGY") return deleteStrategicStage(stageId);
  if (dept === "GOVERNANCE") return deleteGovernanceStage(stageId);
  if (dept === "FINANCE") return deleteFinanceStage(stageId);
  return deleteServiceStage(stageId);
}
async function actionReorder(dept: DeptKey, serviceId: string, charityId: string, ids: string[]) {
  if (dept === "STRATEGY") return reorderStrategicStages(charityId, ids);
  if (dept === "GOVERNANCE") return reorderGovernanceStages(charityId, ids);
  if (dept === "FINANCE") return reorderFinanceStages(charityId, ids);
  return reorderServiceStages(ids);
}

// ── Inline Timeline Editor ──────────────────────────────────────────
function InlineTimeline({
  stages: initialStages,
  charityId,
  serviceId,
  dept,
  canEdit,
  onUnifyClick,
}: {
  stages: Stage[];
  charityId: string;
  serviceId: string;
  dept: DeptKey;
  canEdit: boolean;
  onUnifyClick?: () => void;
}) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Pagination
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex(s => s.isCurrent);
  // Center window on current stage
  const total = sorted.length;
  const computeOffset = () => {
    if (total <= PAGE_SIZE) return 0;
    const center = currentIdx === -1 ? 0 : currentIdx;
    const half = Math.floor(PAGE_SIZE / 2);
    return Math.max(0, Math.min(center - half, total - PAGE_SIZE));
  };
  const [pageOffset, setPageOffset] = useState(computeOffset);
  const visible = sorted.slice(pageOffset, pageOffset + PAGE_SIZE);
  const canPrev = pageOffset > 0;
  const canNext = pageOffset + PAGE_SIZE < total;

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const openEdit = (s: Stage) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditDesc(s.description || "");
    setEditStart(s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "");
    setEditEnd(s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "");
  };

  const handleSetCurrent = (stageId: string) => {
    startTransition(async () => {
      setStages(prev => prev.map(s => ({ ...s, isCurrent: s.id === stageId })));
      await actionSetCurrent(dept, serviceId, charityId, stageId);
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      const start = editStart ? new Date(editStart) : null;
      const end = editEnd ? new Date(editEnd) : null;
      setStages(prev => prev.map(s => s.id === id
        ? { ...s, name: editName, description: editDesc || null, startDate: start, endDate: end }
        : s));
      setEditingId(null);
      await actionUpdate(dept, id, editName, editDesc || null, start, end);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      setStages(prev => prev.filter(s => s.id !== id));
      await actionDelete(dept, id);
    });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const start = newStart ? new Date(newStart) : null;
      const end = newEnd ? new Date(newEnd) : null;
      await actionAdd(dept, serviceId, charityId, newName, newDesc || null, start, end);
      // Optimistic: add at end
      const newStage: Stage = {
        id: Math.random().toString(),
        charityId,
        name: newName,
        description: newDesc || null,
        startDate: start,
        endDate: end,
        order: stages.length,
        isCurrent: false,
      };
      setStages(prev => [...prev, newStage]);
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd("");
      setIsAdding(false);
    });
  };

  const handleMove = (idx: number, dir: "up" | "down") => {
    const newSorted = [...sorted];
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= newSorted.length) return;
    [newSorted[idx], newSorted[target]] = [newSorted[target], newSorted[idx]];
    const reordered = newSorted.map((s, i) => ({ ...s, order: i }));
    setStages(reordered);
    startTransition(() => actionReorder(dept, serviceId, charityId, reordered.map(s => s.id)));
  };

  const listRef = useRef<HTMLDivElement>(null);

  // Scroll pagination via wheel on the list
  const handleWheel = (e: React.WheelEvent) => {
    if (total <= PAGE_SIZE) return;
    e.preventDefault();
    if (e.deltaY > 0) setPageOffset(o => Math.min(total - PAGE_SIZE, o + 1));
    else setPageOffset(o => Math.max(0, o - 1));
  };

  // VIEW MODE
  if (!isEditing) {
    return (
      <div className="mt-2">
        {total === 0 && <p className="text-xs text-slate-400 italic py-2">لا توجد مراحل مسجلة</p>}

        {total > 0 && (
          <div ref={listRef} onWheel={handleWheel} className="space-y-1 select-none">
            {visible.map((stage, i) => {
              const globalIdx = pageOffset + i;
              const isCompleted = currentIdx !== -1 && globalIdx < currentIdx;
              const isCurrent = stage.isCurrent;
              return (
                <div key={stage.id} className={`flex items-start gap-2.5 p-2 rounded-lg text-xs group ${isCurrent ? "bg-primary/8 dark:bg-primary/15" : "hover:bg-slate-50 dark:hover:bg-slate-700/30"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 border ${
                    isCurrent ? "border-primary bg-white dark:bg-slate-800 text-primary" :
                    isCompleted ? "border-emerald-500 bg-emerald-500 text-white" :
                    "border-slate-300 dark:border-slate-600 text-slate-400"
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3" /> : globalIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold leading-tight ${isCurrent ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}>
                      {stage.name}
                      {isCurrent && <span className="mr-1.5 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-bold">الحالية</span>}
                    </div>
                    {stage.description && <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px]">{stage.description}</p>}
                    {(stage.startDate || stage.endDate) && (
                      <div className="flex items-center gap-1 mt-0.5 text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span dir="ltr">{fmtDate(stage.startDate)}{stage.startDate && stage.endDate ? " — " : ""}{fmtDate(stage.endDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Scroll hint */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 select-none">
            <button onClick={() => setPageOffset(o => Math.max(0, o - 1))} disabled={!canPrev}
              className="flex items-center gap-0.5 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ArrowUp className="w-3 h-3" /> السابقة
            </button>
            <span>{pageOffset + 1}–{Math.min(pageOffset + PAGE_SIZE, total)} من {total}</span>
            <button onClick={() => setPageOffset(o => Math.min(total - PAGE_SIZE, o + 1))} disabled={!canNext}
              className="flex items-center gap-0.5 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              التالية <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}

        {canEdit && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-dashed border-slate-200 dark:border-slate-700"
            >
              <Edit2 className="w-3 h-3" /> تعديل المراحل
            </button>
            {onUnifyClick && (
              <button
                type="button"
                onClick={onUnifyClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-500 hover:bg-amber-500/5 rounded-lg transition-colors border border-dashed border-slate-200 dark:border-slate-700"
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" /> توحيد المراحل
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // EDIT MODE
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تعديل المراحل</span>
        <button onClick={() => { setIsEditing(false); setEditingId(null); setIsAdding(false); }}
          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <X className="w-3 h-3" /> إغلاق
        </button>
      </div>

      {sorted.map((stage, idx) => (
        <div key={stage.id} className={`rounded-lg border p-2 ${stage.isCurrent ? "border-primary/30 bg-primary/5" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"}`}>
          {editingId === stage.id ? (
            <div className="space-y-2">
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="اسم المرحلة" autoFocus
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 text-slate-800 dark:text-slate-100" />
              <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="وصف (اختياري)"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 text-slate-800 dark:text-slate-100" />
              <div className="flex gap-2">
                <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleUpdate(stage.id)} disabled={isPending || !editName.trim()}
                  className="flex-1 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} حفظ
                </button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">إلغاء</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => handleMove(idx, "up")} disabled={idx === 0 || isPending}
                  className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                <button onClick={() => handleMove(idx, "down")} disabled={idx === sorted.length - 1 || isPending}
                  className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
              </div>
              {/* Badge */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                stage.isCurrent ? "border-primary bg-primary text-white" : "border-slate-300 dark:border-slate-600 text-slate-400"
              }`}>{idx + 1}</div>
              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold truncate ${stage.isCurrent ? "text-primary" : "text-slate-700 dark:text-slate-300"}`}>{stage.name}</div>
                {(stage.startDate || stage.endDate) && (
                  <div className="text-[10px] text-slate-400" dir="ltr">{fmtDate(stage.startDate)}{stage.startDate && stage.endDate ? "—" : ""}{fmtDate(stage.endDate)}</div>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {!stage.isCurrent && (
                  <button onClick={() => handleSetCurrent(stage.id)} disabled={isPending}
                    className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-slate-500 hover:text-primary hover:border-primary/30 transition-colors">
                    تعيين حالية
                  </button>
                )}
                <button onClick={() => openEdit(stage)} disabled={isPending}
                  className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => handleDelete(stage.id)} disabled={isPending}
                  className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add stage */}
      {isAdding ? (
        <div className="rounded-lg border-2 border-primary border-dashed p-2 space-y-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المرحلة الجديدة" autoFocus
            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 text-slate-800 dark:text-slate-100" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="وصف (اختياري)"
            className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 text-slate-800 dark:text-slate-100" />
          <div className="flex gap-2">
            <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)}
              className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
            <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)}
              className="flex-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 outline-none [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={isPending || !newName.trim()}
              className="flex-1 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center gap-1 disabled:opacity-60">
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} إضافة
            </button>
            <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">إلغاء</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors">
          <Plus className="w-3 h-3" /> إضافة مرحلة
        </button>
      )}
    </div>
  );
}

// ── Charity Card ────────────────────────────────────────────────────
function CharityCard({
  charity, stages, dept, serviceId, canEdit, onUnifyClick,
}: {
  charity: Charity;
  stages: Stage[];
  dept: DeptKey;
  serviceId: string;
  canEdit: boolean;
  onUnifyClick?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const currentIdx = sorted.findIndex(s => s.isCurrent);
  const currentStage = sorted[currentIdx];
  const completedCount = currentIdx > 0 ? currentIdx : 0;
  const pct = sorted.length > 0 ? Math.round(((completedCount + (currentStage ? 0.5 : 0)) / sorted.length) * 100) : 0;
  const deptColor = DEPT_COLORS[dept] || "bg-slate-400";
  const deptLight = DEPT_LIGHT[dept] || "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";

  return (
    <div className={`rounded-xl border ${deptLight} overflow-hidden`}>
      <button className="w-full flex items-center justify-between gap-3 p-3 text-right" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${deptColor}`} />
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{charity.name}</span>
          {currentStage && <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">— {currentStage.name}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 w-7">{pct}%</span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-slate-200/50 dark:border-slate-700/50">
          <InlineTimeline
            stages={stages}
            charityId={charity.id}
            serviceId={serviceId}
            dept={dept}
            canEdit={canEdit}
            onUnifyClick={onUnifyClick}
          />
        </div>
      )}
    </div>
  );
}

// ── Print helper ────────────────────────────────────────────────────
function handlePrint(deptKey: string, deptLabel: string, charities: Charity[], stagesData: Record<string, any[]>) {
  const isGeneric = deptKey.startsWith("SVC:");
  const svcId = isGeneric ? deptKey.replace("SVC:", "") : null;

  let html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>خطة ${deptLabel}</title>
<style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;font-size:11pt;color:#1e293b;direction:rtl}
h1{font-size:18pt;font-weight:bold;border-bottom:3px solid #0ea5e9;padding-bottom:8px;margin-bottom:20px}
.cb{margin-bottom:28px;page-break-inside:avoid}.cn{font-size:14pt;font-weight:bold;margin-bottom:10px;background:#f1f5f9;padding:6px 10px;border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:9.5pt}th{background:#0ea5e9;color:#fff;padding:6px 8px;text-align:right}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr:nth-child(even) td{background:#f8fafc}
.cb1{background:#0ea5e9;color:#fff;font-size:8pt;padding:1px 6px;border-radius:10px}.cb2{background:#10b981;color:#fff;font-size:8pt;padding:1px 6px;border-radius:10px}
</style></head><body><h1>${deptLabel}</h1><p style="font-size:9pt;color:#64748b;margin-bottom:16px">تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")}</p>`;

  for (const charity of charities) {
    let stgs: Stage[] = [];
    if (!isGeneric) {
      stgs = ((stagesData[deptKey] || []) as Stage[]).filter(s => s.charityId === charity.id).sort((a, b) => a.order - b.order);
    } else {
      const svc = ((stagesData["SERVICES"] || []) as ServiceWithStages[]).find(s => s.id === svcId && s.charityId === charity.id);
      stgs = svc?.stages || [];
    }
    if (!stgs.length) continue;
    const ci = stgs.findIndex(s => s.isCurrent);
    html += `<div class="cb"><div class="cn">${charity.name}</div><table><thead><tr><th>#</th><th>المرحلة</th><th>الوصف</th><th>الفترة</th><th>الحالة</th></tr></thead><tbody>`;
    stgs.forEach((s, i) => {
      const done = ci !== -1 && i < ci;
      const cur = s.isCurrent;
      const dates = [s.startDate ? fmtDate(s.startDate) : "", s.endDate ? fmtDate(s.endDate) : ""].filter(Boolean).join(" — ");
      const badge = cur ? `<span class="cb1">الحالية</span>` : done ? `<span class="cb2">مكتملة</span>` : "—";
      html += `<tr><td style="text-align:center;font-weight:bold">${i+1}</td><td style="font-weight:${cur?"bold":"normal"}">${s.name}</td><td style="color:#475569">${s.description||"—"}</td><td dir="ltr" style="font-size:9pt;color:#475569">${dates||"—"}</td><td>${badge}</td></tr>`;
    });
    html += `</tbody></table></div>`;
  }
  html += `</body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 400);
}

// ── Main Export ─────────────────────────────────────────────────────
export default function ServicesOverviewClient({
  charities, stagesData, isAdmin, canEdit, role, deptLabels,
}: {
  charities: Charity[];
  stagesData: Record<string, any[]>;
  isAdmin: boolean;
  canEdit: boolean;
  role: string;
  deptLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [unifyCharity, setUnifyCharity] = useState<{
    id: string;
    name: string;
    sourceTimelineType: string;
    sourceServiceId?: string;
    departmentLabel: string;
  } | null>(null);
  const [isUnifyPending, startUnifyTransition] = useTransition();

  const handleUnifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unifyCharity) return;

    startUnifyTransition(async () => {
      try {
        await unifyCharityStagesAction(unifyCharity.id, unifyCharity.sourceTimelineType, unifyCharity.sourceServiceId);
        setUnifyCharity(null);
        router.refresh();
      } catch (error: any) {
        console.error("Error unifying stages", error);
        alert(error.message || "حدث خطأ أثناء تعميم المراحل");
      }
    });
  };

  const builtinDepts = ["STRATEGY", "GOVERNANCE", "FINANCE"].filter(d => d in stagesData);
  const allServices: ServiceWithStages[] = stagesData["SERVICES"] || [];

  const uniqueServiceKeys = useMemo(() => {
    const seen = new Map<string, { name: string; dept: string | null; id: string }>();
    for (const svc of allServices) {
      const key = `${svc.name}__${svc.department || ""}`;
      if (!seen.has(key)) seen.set(key, { name: svc.name, dept: svc.department ?? null, id: svc.id });
    }
    return Array.from(seen.values());
  }, [allServices]);

  const tabs = [
    ...builtinDepts.map(d => ({ key: d, label: deptLabels[d] || d })),
    ...uniqueServiceKeys.map(s => ({ key: `SVC:${s.id}`, label: s.name })),
  ];

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || "");
  const isGenericTab = activeTab.startsWith("SVC:");
  const genericSvcId = isGenericTab ? activeTab.replace("SVC:", "") : null;
  const genericSvcInfo = genericSvcId ? uniqueServiceKeys.find(s => s.id === genericSvcId) : null;
  const activeLabel = tabs.find(t => t.key === activeTab)?.label || "";

  const handleOpenUnify = (charity: Charity) => {
    let sourceTimelineType = activeTab;
    let sourceServiceId: string | undefined = undefined;

    if (activeTab.startsWith("SVC:")) {
      sourceTimelineType = "CUSTOM";
      sourceServiceId = activeTab.replace("SVC:", "");
    }

    setUnifyCharity({
      id: charity.id,
      name: charity.name,
      sourceTimelineType,
      sourceServiceId,
      departmentLabel: activeLabel
    });
  };

  // Extra charities picker (جمعيات غير موجودة في القائمة الحالية)
  const [showAddCharity, setShowAddCharity] = useState(false);

  const charitiesWithData = useMemo(() => {
    if (!isGenericTab) {
      return charities.filter(c => (stagesData[activeTab] || []).some((s: Stage) => s.charityId === c.id));
    }
    return charities.filter(c => allServices.some(svc => svc.name === genericSvcInfo?.name && svc.charityId === c.id));
  }, [activeTab, charities, stagesData, allServices, isGenericTab, genericSvcInfo]);

  // Charities that have NO data in this tab yet
  const charitiesWithoutData = useMemo(() => {
    const withIds = new Set(charitiesWithData.map(c => c.id));
    return charities.filter(c => !withIds.has(c.id));
  }, [charities, charitiesWithData]);

  // Extra charities manually added to view (empty timeline)
  const [extraCharityIds, setExtraCharityIds] = useState<string[]>([]);
  const extraCharities = charities.filter(c => extraCharityIds.includes(c.id));

  const allStages: Stage[] = !isGenericTab ? (stagesData[activeTab] || []) : [];
  const totalCharities = charitiesWithData.length;
  const doneCharities = charitiesWithData.filter(c => {
    if (isGenericTab) return allServices.some(svc => svc.name === genericSvcInfo?.name && svc.charityId === c.id && svc.stages.some(s => s.isCurrent));
    return allStages.filter((s: Stage) => s.charityId === c.id).some((s: Stage) => s.isCurrent);
  }).length;

  function getDept(): DeptKey {
    if (activeTab === "STRATEGY") return "STRATEGY";
    if (activeTab === "GOVERNANCE") return "GOVERNANCE";
    if (activeTab === "FINANCE") return "FINANCE";
    return "SERVICE";
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">عرض الخدمات عبر الجمعيات</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">اختر قسماً لمشاهدة حالته في جميع الجمعيات دفعة واحدة</p>
          </div>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-none">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setExtraCharityIds([]); }}
                className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 dark:text-slate-400">الجمعيات: <strong className="text-slate-800 dark:text-slate-200">{totalCharities}</strong></span>
              <span className="text-slate-500 dark:text-slate-400">نشطة: <strong className="text-emerald-600 dark:text-emerald-400">{doneCharities}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && charitiesWithoutData.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddCharity(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> فتح خطة جمعية
                  </button>
                  {showAddCharity && (
                    <div className="absolute left-0 top-full mt-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl min-w-[180px] py-1 max-h-60 overflow-y-auto">
                      {charitiesWithoutData.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setExtraCharityIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                            setShowAddCharity(false);
                          }}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => handlePrint(activeTab, activeLabel, charities, stagesData)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors">
                <Printer className="w-3.5 h-3.5" /> طباعة
              </button>
            </div>
          </div>

          {/* Cards grid */}
          <div className="p-4">
            {charitiesWithData.length === 0 && extraCharities.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                <Briefcase className="w-9 h-9 mx-auto mb-2 opacity-40" />
                <p className="text-sm">لا توجد جمعيات لديها بيانات في هذا القسم</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {charitiesWithData.map(charity => {
                  if (isGenericTab) {
                    const svcs = allServices.filter(svc => svc.name === genericSvcInfo?.name && svc.charityId === charity.id);
                    return svcs.map(svc => (
                      <CharityCard
                        key={svc.id}
                        charity={charity}
                        stages={svc.stages}
                        dept="SERVICE"
                        serviceId={svc.id}
                        canEdit={canEdit}
                        onUnifyClick={() => handleOpenUnify(charity)}
                      />
                    ));
                  }
                  const stages = allStages.filter((s: Stage) => s.charityId === charity.id);
                  return (
                    <CharityCard
                      key={charity.id}
                      charity={charity}
                      stages={stages}
                      dept={getDept()}
                      serviceId=""
                      canEdit={canEdit}
                      onUnifyClick={() => handleOpenUnify(charity)}
                    />
                  );
                })}
                {/* Extra charities (empty timelines, canEdit only) */}
                {extraCharities.map(charity => {
                  return (
                    <CharityCard
                      key={charity.id}
                      charity={charity}
                      stages={[]}
                      dept={getDept()}
                      serviceId=""
                      canEdit={canEdit}
                      onUnifyClick={() => handleOpenUnify(charity)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tabs.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 dark:text-slate-500">
          لا توجد خدمات متاحة لحسابك حالياً
        </div>
      )}

      {/* Unify Stages Modal */}
      {unifyCharity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setUnifyCharity(null)}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700" dir="rtl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  تعميم مراحل {unifyCharity.departmentLabel}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  نسخ مراحل قسم "{unifyCharity.departmentLabel}" من جمعية {unifyCharity.name} وتعميمها على كافة الجمعيات الأخرى
                </p>
              </div>
            </div>
            <form onSubmit={handleUnifySubmit} className="p-6 space-y-6">
              {/* Warning box */}
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-800 dark:text-red-400">تنبيه هام جداً وإجراء غير قابل للتراجع</h4>
                  <p className="text-xs text-red-700/90 dark:text-red-300/80 leading-relaxed">
                    عند إتمام هذه العملية، سيتم <strong>حذف كافة المراحل الحالية</strong> لقسم <strong>{unifyCharity.departmentLabel}</strong> في جميع الجمعيات الأخرى نهائياً، وسيتم <strong>إنشاء نسخ متطابقة</strong> من مراحل هذا القسم الموجودة في جمعية <strong>{unifyCharity.name}</strong> لها جميعاً.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={isUnifyPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUnifyPending ? "جاري تعميم المراحل..." : "تأكيد التعميم وتطبيق المراحل"}
                </button>
                <button
                  type="button"
                  onClick={() => setUnifyCharity(null)}
                  disabled={isUnifyPending}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backdrop for dropdown */}
      {showAddCharity && <div className="fixed inset-0 z-20" onClick={() => setShowAddCharity(false)} />}
    </div>
  );
}
