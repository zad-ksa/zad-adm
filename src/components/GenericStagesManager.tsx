"use client";

import { useState, useTransition, useEffect } from "react";
import { Sparkles, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import CharityClientTimeline from "@/components/CharityClientTimeline";
import { addServiceStage, updateServiceStage, deleteServiceStage, setCurrentServiceStage, reorderServiceStages, updateService, deleteService } from "@/app/actions/services";

type ServiceStage = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
  isCurrent: boolean;
};

type Service = {
  id: string;
  name: string;
  department: string | null;
  stages: ServiceStage[];
};

export default function GenericStagesManager({ 
  service
}: { 
  service: Service
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
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configName, setConfigName] = useState(service.name);
  const [configDept, setConfigDept] = useState(service.department || "NONE");

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
        isCurrent: false 
      };
      setStages([...stages, optimisticStage]);
      setIsAdding(false);
      setNewName("");
      setNewDescription("");
      setNewStartDate("");
      setNewEndDate("");
      
      await addServiceStage(service.id, newName, newDescription || null, newStartDate ? new Date(newStartDate) : null, newEndDate ? new Date(newEndDate) : null);
      router.refresh();
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      setStages(stages.map(s => s.id === id ? { 
        ...s, 
        name: editName, 
        description: editDescription || null,
        startDate: editStartDate ? new Date(editStartDate) : null,
        endDate: editEndDate ? new Date(editEndDate) : null
      } : s));
      setEditingId(null);
      await updateServiceStage(id, editName, editDescription || null, editStartDate ? new Date(editStartDate) : null, editEndDate ? new Date(editEndDate) : null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      setStages(stages.filter(s => s.id !== id));
      await deleteServiceStage(id);
    });
  };

  const handleSetCurrent = (id: string) => {
    startTransition(async () => {
      setStages(stages.map(s => ({ ...s, isCurrent: s.id === id })));
      await setCurrentServiceStage(service.id, id);
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedStages.length - 1) return;

    const newStages = [...sortedStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    const reordered = newStages.map((s, i) => ({ ...s, order: i }));
    setStages(reordered);

    startTransition(async () => {
      await reorderServiceStages(reordered.map(s => s.id));
    });
  };

  const handleConfigUpdate = () => {
    if (!configName.trim()) return;
    startTransition(async () => {
      await updateService(service.id, configName, configDept === "NONE" ? null : configDept);
      setIsEditingConfig(false);
    });
  };

  const handleDeleteService = () => {
    if (!confirm(`هل أنت متأكد من حذف المخطط الزمني "${configName}" وجميع مراحله؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    startTransition(async () => {
      try {
        await deleteService(service.id);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الحذف");
      }
    });
  };

  const startEdit = (stage: ServiceStage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description || "");
    setEditStartDate(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
    setEditEndDate(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
  };

  return (
    <div className="max-w-5xl mx-auto w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8 transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            إدارة: {configName}
          </h3>
          <button 
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            className="p-1.5 text-slate-400 hover:text-primary bg-slate-50 hover:bg-primary/10 rounded-lg transition-colors"
            title="إعدادات المخطط"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          disabled={isPending}
        >
          <Plus className="w-4 h-4" />
          إضافة مرحلة
        </button>
      </div>

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
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">القسم التابع له</label>
              <select 
                value={configDept} 
                onChange={e => setConfigDept(e.target.value)} 
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value="PROGRAMS">البرامج والمشاريع</option>
                <option value="HR">الموارد البشرية</option>
                <option value="ADMINISTRATIVE_SECRETARIAT">السكرتارية الإدارية</option>
                <option value="GENERAL_MANAGER">الإدارة العامة</option>
                <option value="NONE">لا ينتمي لقسم محدد (يظهر للكل)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2">
              <button onClick={handleConfigUpdate} className="flex items-center gap-1.5 px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold" disabled={isPending}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} حفظ الإعدادات
              </button>
              <button onClick={() => { setIsEditingConfig(false); setConfigName(service.name); setConfigDept(service.department || "NONE"); }} className="flex items-center gap-1.5 px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold" disabled={isPending}>
                إلغاء
              </button>
            </div>
            <button onClick={handleDeleteService} className="flex items-center gap-1.5 px-4 py-2 text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-sm font-bold transition-colors" disabled={isPending}>
              <Trash2 className="w-4 h-4" /> حذف المخطط
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {sortedStages.map((stage, index) => {
          const isCurrent = stage.isCurrent;
          const isCompleted = stages.findIndex(s => s.isCurrent) > index;
          
          return (
            <div 
              key={stage.id} 
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button 
                  onClick={() => handleMove(index, 'up')} 
                  disabled={index === 0 || isPending}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                  isCurrent ? "bg-primary text-white border-primary" :
                  isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800/50" :
                  "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}>
                  {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                <button 
                  onClick={() => handleMove(index, 'down')} 
                  disabled={index === sortedStages.length - 1 || isPending}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-0.5"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1">
                {editingId === stage.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        placeholder="اسم المرحلة"
                        className="flex-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        autoFocus
                      />
                      <input 
                        type="date" 
                        value={editStartDate} 
                        onChange={e => setEditStartDate(e.target.value)} 
                        className="w-full sm:w-32 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                        title="تاريخ البداية"
                      />
                      <input 
                        type="date" 
                        value={editEndDate} 
                        onChange={e => setEditEndDate(e.target.value)} 
                        className="w-full sm:w-32 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                        title="تاريخ النهاية"
                      />
                    </div>
                    <textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      placeholder="وصف مختصر للمرحلة (اختياري)"
                      rows={1}
                      className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(stage.id)} className="flex items-center gap-1 px-3 py-1 text-white bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold" disabled={isPending}>
                        <Check className="w-3 h-3" /> حفظ
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold" disabled={isPending}>
                        <X className="w-3 h-3" /> إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col mt-0.5">
                     <span className={`font-semibold ${isCurrent ? "text-primary text-sm" : "text-slate-700 dark:text-slate-200 text-sm"}`}>
                       {stage.name}
                     </span>
                     {stage.description && (
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stage.description}</p>
                     )}
                     <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                       {stage.startDate && (
                         <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full" dir="ltr">
                           {new Date(stage.startDate).toLocaleDateString('en-CA')}
                         </span>
                       )}
                       {stage.startDate && stage.endDate && (
                         <span className="text-[11px] text-slate-400 px-1">إلى</span>
                       )}
                       {stage.endDate && (
                         <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-full" dir="ltr">
                           {new Date(stage.endDate).toLocaleDateString('en-CA')}
                         </span>
                       )}
                       {isCurrent && <span className="text-[11px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">المرحلة الحالية</span>}
                     </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                {!isCurrent && (
                  <button 
                    onClick={() => handleSetCurrent(stage.id)} 
                    disabled={isPending}
                    className="hidden sm:block px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    تعيين كحالية
                  </button>
                )}
                
                <button 
                  onClick={() => startEdit(stage)} 
                  disabled={isPending}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                
                <button 
                  onClick={() => handleDelete(stage.id)} 
                  disabled={isPending}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {stages.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">لا توجد مراحل مسجلة.</div>
        )}

        {isAdding && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-primary border-dashed bg-primary/5">
            <div className="w-6 h-6 shrink-0 flex items-center justify-center">
               <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-dashed" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="اسم المرحلة الجديدة..."
                  className="flex-1 border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  autoFocus
                />
                <input 
                  type="date" 
                  value={newStartDate} 
                  onChange={e => setNewStartDate(e.target.value)} 
                  className="w-full sm:w-32 border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  title="تاريخ البداية"
                />
                <input 
                  type="date" 
                  value={newEndDate} 
                  onChange={e => setNewEndDate(e.target.value)} 
                  className="w-full sm:w-32 border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  title="تاريخ النهاية"
                />
              </div>
              <textarea 
                value={newDescription} 
                onChange={e => setNewDescription(e.target.value)} 
                placeholder="وصف مختصر للمرحلة (اختياري)"
                rows={1}
                className="w-full border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
              />
              <div className="flex gap-2 mt-1">
                <button onClick={handleAdd} className="flex items-center gap-1 px-4 py-1.5 text-white bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-colors" disabled={isPending}>
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} إضافة
                </button>
                <button onClick={() => setIsAdding(false)} className="px-4 py-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold" disabled={isPending}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-slate-100 dark:border-slate-700 pt-6 px-6 pb-6 bg-slate-50 dark:bg-slate-900/20">
        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 text-center">معاينة المخطط الزمني</h4>
        <CharityClientTimeline title={configName} stages={sortedStages} />
      </div>
    </div>
  );
}
