"use client";

import { useState, useTransition, useEffect } from "react";
import { Coins, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2, Settings, ChevronDown, ChevronUp, Eye, EyeOff, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import InteractiveTimelineEditor from "@/components/InteractiveTimelineEditor";
import { addFinanceStage, updateFinanceStage, deleteFinanceStage, setCurrentFinanceStage, reorderFinanceStages, toggleActiveFinanceStage } from "@/app/actions/finance";
import { addFinanceStageStep, updateFinanceStageStep, deleteFinanceStageStep } from "@/app/actions/stageSteps";
import { updateTimelineConfig } from "@/app/actions/charity";

type StageStep = { id: string; name: string; isDone: boolean; order: number };

type Stage = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
  isCurrent: boolean;
  duration?: string | null;
  isContinuous: boolean;
  isActive: boolean;
  steps?: StageStep[];
};

export default function FinanceStagesManager({ 
  charityId, 
  initialStages,
  timelineName = "المخطط الزمني للمالية",
  timelineDept = "FINANCE"
}: { 
  charityId: string, 
  initialStages: Stage[],
  timelineName?: string,
  timelineDept?: string
}) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const router = useRouter();

  useEffect(() => {
    setStages(initialStages);
  }, [initialStages]);

  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsContinuous, setNewIsContinuous] = useState(false);
  const [editIsContinuous, setEditIsContinuous] = useState(false);

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configName, setConfigName] = useState(timelineName);
  const [configDept, setConfigDept] = useState(timelineDept);

  // Sort locally by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const handleConfigUpdate = () => {
    if (!configName.trim() || !configDept.trim()) return;
    startTransition(async () => {
      await updateTimelineConfig(charityId, "FINANCE", configName, configDept);
      setIsEditingConfig(false);
    });
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      // Optimistic locally
      const optimisticStage = { 
        id: Math.random().toString(), 
        name: newName, 
        description: newDescription,
        startDate: newStartDate ? new Date(newStartDate) : null,
        endDate: newEndDate ? new Date(newEndDate) : null,
        duration: "", 
        order: stages.length, 
        isCurrent: false,
        isContinuous: newIsContinuous,
        isActive: true
      };
      setStages([...stages, optimisticStage]);
      setIsAdding(false);
      setNewName("");
      setNewDescription("");
      setNewStartDate("");
      setNewEndDate("");
      setNewIsContinuous(false);
      
      await addFinanceStage(charityId, newName, "", newDescription, newStartDate, newEndDate, newIsContinuous, true);
      router.refresh();
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    const stageToUpdate = stages.find(s => s.id === id);
    if (!stageToUpdate) return;
    startTransition(async () => {
      setStages(stages.map(s => s.id === id ? { 
        ...s, 
        name: editName, 
        description: editDescription,
        startDate: editStartDate ? new Date(editStartDate) : null,
        endDate: editEndDate ? new Date(editEndDate) : null,
        isContinuous: editIsContinuous
      } : s));
      setEditingId(null);
      await updateFinanceStage(id, editName, "", editDescription, editStartDate, editEndDate, editIsContinuous, stageToUpdate.isActive);
    });
  };

  const handleDelete = (id: string) => {
    setStageToDelete(id);
  };

  const handleDeleteConfirm = () => {
    if (!stageToDelete) return;
    const stageId = stageToDelete;
    setStages(stages.filter(s => s.id !== stageId));
    setStageToDelete(null);
    startTransition(async () => {
      await deleteFinanceStage(stageId);
    });
  };

  const handleSetCurrent = (id: string) => {
    setStages(stages.map(s => ({ ...s, isCurrent: s.id === id })));
    startTransition(async () => {
      await setCurrentFinanceStage(charityId, id);
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    setStages(stages.map(s => s.id === id ? { ...s, isActive: !currentActive } : s));
    startTransition(async () => {
      await toggleActiveFinanceStage(id, !currentActive);
    });
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const stageToMove = stages.find(s => s.id === id);
    if (!stageToMove) return;

    const isCont = stageToMove.isContinuous;
    const sameTypeStages = sortedStages.filter(s => !!s.isContinuous === !!isCont);
    const currentIndex = sameTypeStages.findIndex(s => s.id === id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sameTypeStages.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetStage = sameTypeStages[targetIndex];

    const newStages = [...stages];
    const stage1 = newStages.find(s => s.id === stageToMove.id)!;
    const stage2 = newStages.find(s => s.id === targetStage.id)!;

    const tempOrder = stage1.order;
    stage1.order = stage2.order;
    stage2.order = tempOrder;

    setStages(newStages);

    startTransition(async () => {
      const reorderedIds = [...newStages].sort((a,b) => a.order - b.order).map(s => s.id);
      await reorderFinanceStages(charityId, reorderedIds);
    });
  };

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description || "");
    setEditStartDate(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
    setEditEndDate(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
    setEditIsContinuous(stage.isContinuous);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mt-4 transition-colors">
      <div
        className="p-3 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-500" />
            إدارة: {timelineName}
          </h3>
          {isExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditingConfig(!isEditingConfig); }}
              className="p-1 text-slate-400 hover:text-primary bg-white dark:bg-slate-800 hover:bg-primary/10 rounded transition-colors border border-slate-200 dark:border-slate-700"
              title="إعدادات المخطط"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(true); setIsExpanded(true); }}
          className="flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          disabled={isPending}
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة مرحلة
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col">
          {isEditingConfig && (
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <h4 className="font-bold text-sm mb-4 text-slate-700 dark:text-slate-300">إعدادات المخطط الزمني</h4>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم المخطط</label>
              <input 
                type="text" 
                value={configName} 
                onChange={e => setConfigName(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">القسم التابع له</label>
              <select 
                value={configDept} 
                onChange={e => setConfigDept(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
              >
                <option value="STRATEGY">التخطيط الاستراتيجي</option>
                <option value="GOVERNANCE">الحوكمة</option>
                <option value="FINANCE">المالية</option>
                <option value="ADMINISTRATIVE_SECRETARIAT">السكرتارية الإدارية</option>
                <option value="GENERAL_MANAGER">الإدارة العامة</option>
                <option value="NONE">لا ينتمي لقسم محدد (يظهر للكل)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleConfigUpdate} className="flex items-center gap-1.5 px-4 py-2 text-white bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-bold" disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ الإعدادات
            </button>
            <button onClick={() => setIsEditingConfig(false)} className="flex items-center gap-1.5 px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold" disabled={isPending}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2 px-2 sm:px-3 pb-3">
        <InteractiveTimelineEditor
          title={configName}
          stages={sortedStages as any}
          isPending={isPending}
          onAdd={(stage) => {
            const optimisticStage: Stage = { 
              id: Math.random().toString(), 
              name: stage.name,
              description: stage.description,
              startDate: stage.startDate,
              endDate: stage.endDate,
              duration: "",
              order: stages.length, 
              isCurrent: false,
              isContinuous: stage.isContinuous,
              isActive: true
            };
            setStages([...stages, optimisticStage]);
            startTransition(async () => {
              await addFinanceStage(charityId, stage.name, stage.duration || "", stage.description || "", stage.startDate ? stage.startDate.toISOString() : "", stage.endDate ? stage.endDate.toISOString() : "", stage.isContinuous, true);
            });
          }}
          onUpdate={(id, updates) => {
            const stage = stages.find(s => s.id === id);
            if (!stage) return;
            setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
            startTransition(async () => {
              await updateFinanceStage(
                id, 
                updates.name !== undefined ? updates.name : stage.name, 
                updates.duration !== undefined ? (updates.duration || "") : (stage.duration || ""), 
                updates.description !== undefined ? (updates.description || "") : (stage.description || ""), 
                updates.startDate !== undefined ? (updates.startDate ? updates.startDate.toISOString() : "") : (stage.startDate ? new Date(stage.startDate).toISOString() : ""), 
                updates.endDate !== undefined ? (updates.endDate ? updates.endDate.toISOString() : "") : (stage.endDate ? new Date(stage.endDate).toISOString() : ""), 
                updates.isContinuous !== undefined ? updates.isContinuous : stage.isContinuous, 
                updates.isActive !== undefined ? updates.isActive : stage.isActive
              );
            });
          }}
          onDelete={(id) => {
            handleDelete(id);
          }}
          onMove={(id, direction) => handleMove(id, direction)}
          onToggleActive={(id, currentActive) => handleToggleActive(id, currentActive)}
          onSetCurrent={(id) => handleSetCurrent(id)}
          stepCallbacks={{
            onAddStep: (stageId, name) => addFinanceStageStep(stageId, name),
            onToggleStep: (stageId, stepId, isDone) => updateFinanceStageStep(stepId, { isDone }),
            onRenameStep: (stageId, stepId, name) => updateFinanceStageStep(stepId, { name }),
            onDeleteStep: (stageId, stepId) => deleteFinanceStageStep(stepId),
          }}
        />
      </div>
      </div>
      )}

      {stageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">تأكيد الحذف</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                هل أنت متأكد من رغبتك في حذف هذه المرحلة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={handleDeleteConfirm}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
                >
                  {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "نعم، احذفها"}
                </button>
                <button 
                  onClick={() => setStageToDelete(null)}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
