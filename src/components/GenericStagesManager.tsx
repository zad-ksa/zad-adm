"use client";

import { useState, useTransition, useEffect } from "react";
import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import { Sparkles, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2, Settings, ChevronDown, ChevronUp, Eye, EyeOff, Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import InteractiveTimelineEditor from "@/components/InteractiveTimelineEditor";
import { addServiceStage, updateServiceStage, deleteServiceStage, setCurrentServiceStage, reorderServiceStages, renameServiceGlobally, deleteService, toggleActiveServiceStage } from "@/app/actions/services";
import { addServiceStageStep, updateServiceStageStep, deleteServiceStageStep } from "@/app/actions/stageSteps";
import { useServiceAccordion } from "@/components/ServiceAccordionContext";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import { btn } from "@/components/console/ui";

type StageStep = { id: string; name: string; isDone: boolean; order: number };

type ServiceStage = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
  isCurrent: boolean;
  isContinuous: boolean;
  isActive: boolean;
  isComingSoon?: boolean;
  duration: string | null;
  steps?: StageStep[];
};

type Service = {
  id: string;
  name: string;
  department: string | null;
  stages: ServiceStage[];
};

export default function GenericStagesManager({
  service,
  canManageService = false,
}: {
  service: Service;
  /**
   * «إدارة الخدمات»: زرّ الإعدادات — تعديل اسم الخدمة وحذفها من هذه الجمعية.
   * كان مرئياً لكل من يرى مُدير المراحل، أي لكل من مُنح الخدمة.
   */
  canManageService?: boolean;
}) {
  const [stages, setStages] = useState<ServiceStage[]>(service.stages);
  const router = useRouter();

  useEffect(() => {
    setStages(service.stages);
  }, [service.stages]);

  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);
  const { isExpanded, toggle: toggleExpanded, expand: expandPanel } = useServiceAccordion(service.id);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsContinuous, setNewIsContinuous] = useState(false);
  const [editIsContinuous, setEditIsContinuous] = useState(false);

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configName, setConfigName] = useState(service.name);
  /** رفض الخادم للاسم («توجد خدمة بهذا الاسم»). القسم أُزيل كما أُزيل من بقية الصفحات. */
  const [configError, setConfigError] = useState<string | null>(null);

  // Sort locally by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      // Optimistic locally
      const optimisticStage: ServiceStage = { 
        id: Math.random().toString(), 
        name: newName, 
        description: newDescription || null,
        startDate: newStartDate ? new Date(newStartDate) : null,
        endDate: newEndDate ? new Date(newEndDate) : null,
        order: stages.length, 
        isCurrent: false,
        isContinuous: newIsContinuous,
        isActive: true,
        duration: null
      };
      setStages([...stages, optimisticStage]);
      setIsAdding(false);
      setNewName("");
      setNewDescription("");
      setNewStartDate("");
      setNewEndDate("");
      setNewIsContinuous(false);
      
      await addServiceStage(service.id, newName, newDescription || null, newStartDate ? new Date(newStartDate) : null, newEndDate ? new Date(newEndDate) : null, newIsContinuous, true, null);
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
        description: editDescription || null,
        startDate: editStartDate ? new Date(editStartDate) : null,
        endDate: editEndDate ? new Date(editEndDate) : null,
        isContinuous: editIsContinuous
      } : s));
      setEditingId(null);
      await updateServiceStage(id, editName, editDescription || null, editStartDate ? new Date(editStartDate) : null, editEndDate ? new Date(editEndDate) : null, editIsContinuous, stageToUpdate.isActive, stageToUpdate.duration);
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
      await deleteServiceStage(stageId);
    });
  };

  const handleSetCurrent = (id: string) => {
    setStages(stages.map(s => ({ ...s, isCurrent: s.id === id })));
    startTransition(async () => {
      await setCurrentServiceStage(service.id, id);
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    setStages(stages.map(s => s.id === id ? { ...s, isActive: !currentActive } : s));
    startTransition(async () => {
      await toggleActiveServiceStage(id, !currentActive);
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
      await reorderServiceStages(reorderedIds);
    });
  };

  // كانت updateService على صفّ هذه الجمعية وحده، فتقسم الخدمة إلى اسمين وتسقط
  // منوحاتها. الآن تسمّي الخدمة في كل الجمعيات، والخادم يرفض الاسم المأخوذ.
  const handleConfigUpdate = () => {
    const name = configName.trim();
    if (!name) return;
    if (name === service.name) {
      setIsEditingConfig(false);
      return;
    }
    setConfigError(null);
    startTransition(async () => {
      const res = await renameServiceGlobally(service.name, name, service.department ?? null);
      if (res?.error) {
        setConfigError(res.error);
        return;
      }
      setIsEditingConfig(false);
      router.refresh();
    });
  };

  const handleDeleteService = async () => {
    if (!(await confirmAction({ title: `هل أنت متأكد من حذف خدمة "${configName}" وجميع مراحلها من هذه الجمعية؟ تبقى الخدمة في الجمعيات الأخرى. لا يمكن التراجع عن هذا الإجراء.` }))) return;
    startTransition(async () => {
      try {
        await deleteService(service.id);
        router.refresh();
      } catch (error) {
        console.error(error);
        notify("error", "حدث خطأ أثناء الحذف");
      }
    });
  };

  const startEdit = (stage: ServiceStage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description || "");
    setEditStartDate(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
    setEditEndDate(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
    setEditIsContinuous(stage.isContinuous);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div
        className="p-2 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          <div className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            خدمة: {configName}
          </h3>
          {isExpanded && canManageService && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditingConfig(!isEditingConfig); }}
              className="p-1 text-slate-400 hover:text-primary bg-white dark:bg-slate-800 hover:bg-primary/10 rounded transition-colors border border-slate-200 dark:border-slate-700"
              title="إعدادات الخدمة"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsAdding(true); expandPanel(); }}
          className="flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
          disabled={isPending}
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة مرحلة
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-col">
          {isEditingConfig && canManageService && (
        <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
          <h4 className="font-bold text-xs mb-3 text-slate-700 dark:text-slate-300">إعدادات الخدمة</h4>
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم الخدمة</label>
            <input
              type="text"
              value={configName}
              onChange={e => { setConfigName(e.target.value); setConfigError(null); }}
              aria-invalid={!!configError}
              className={`w-full border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
                configError ? "border-red-400 focus:ring-red-200" : "border-slate-200 dark:border-slate-600 focus:ring-primary/50"
              }`}
            />
            {configError ? (
              <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{configError}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">تعديل الاسم يسري على الخدمة في كل الجمعيات.</p>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2">
              <button onClick={handleConfigUpdate} className={btn.primary} disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ
              </button>
              <button onClick={() => { setIsEditingConfig(false); setConfigName(service.name); setConfigError(null); }} className="flex items-center gap-1.5 px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold" disabled={isPending}>
                إلغاء
              </button>
            </div>
            <button onClick={handleDeleteService} className="flex items-center gap-1.5 px-4 py-2 text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-sm font-bold transition-colors" disabled={isPending}>
              <Trash2 className="w-4 h-4" /> حذف من هذه الجمعية
            </button>
          </div>
        </div>
      )}

      <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-2 px-2 sm:px-3 pb-3">
        <InteractiveTimelineEditor
          title={configName}
          stages={sortedStages}
          isPending={isPending}
          onAdd={(stage) => {
            const optimisticStage: ServiceStage = { 
              id: Math.random().toString(), 
              name: stage.name,
              description: stage.description,
              startDate: stage.startDate,
              endDate: stage.endDate,
              order: stages.length, 
              isCurrent: false,
              isContinuous: stage.isContinuous,
              isActive: true,
              duration: stage.duration || null
            };
            setStages([...stages, optimisticStage]);
            startTransition(async () => {
              await addServiceStage(service.id, stage.name, stage.description, stage.startDate, stage.endDate, stage.isContinuous, true, stage.duration || null);
            });
          }}
          onUpdate={(id, updates) => {
            const stage = stages.find(s => s.id === id);
            if (!stage) return;
            setStages(stages.map(s => s.id === id ? { ...s, ...updates } : s));
            startTransition(async () => {
              await updateServiceStage(
                id, 
                updates.name !== undefined ? updates.name : stage.name, 
                updates.description !== undefined ? updates.description : stage.description, 
                updates.startDate !== undefined ? updates.startDate : stage.startDate, 
                updates.endDate !== undefined ? updates.endDate : stage.endDate, 
                updates.isContinuous !== undefined ? updates.isContinuous : stage.isContinuous, 
                updates.isActive !== undefined ? updates.isActive : stage.isActive,
                updates.duration !== undefined ? updates.duration : stage.duration,
                updates.isComingSoon !== undefined ? updates.isComingSoon : (stage.isComingSoon || false)
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
            onAddStep: (stageId, name) => addServiceStageStep(stageId, name),
            onToggleStep: (stageId, stepId, isDone) => updateServiceStageStep(stepId, { isDone }),
            onRenameStep: (stageId, stepId, name) => updateServiceStageStep(stepId, { name }),
            onDeleteStep: (stageId, stepId) => deleteServiceStageStep(stepId),
          }}
        />
      </div>
      </div>
      )}

      {stageToDelete && (
        <ConfirmDialog
          title="حذف هذه المرحلة؟"
          message="لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="نعم، احذفها"
          isPending={isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setStageToDelete(null)}
        />
      )}
    </div>
  );
}
