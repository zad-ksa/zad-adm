"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { addGovernanceStage, updateGovernanceStage, deleteGovernanceStage, setCurrentGovernanceStage, reorderGovernanceStages } from "@/app/actions/governance";

type Stage = {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
  isCurrent: boolean;
  duration?: string | null;
};

export default function GovernanceStagesManager({ charityId, initialStages }: { charityId: string, initialStages: Stage[] }) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
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

  // Sort locally by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

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
        isCurrent: false 
      };
      setStages([...stages, optimisticStage]);
      setIsAdding(false);
      setNewName("");
      setNewDescription("");
      setNewStartDate("");
      setNewEndDate("");
      
      await addGovernanceStage(charityId, newName, "", newDescription, newStartDate, newEndDate);
      window.location.reload();
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      setStages(stages.map(s => s.id === id ? { 
        ...s, 
        name: editName, 
        description: editDescription,
        startDate: editStartDate ? new Date(editStartDate) : null,
        endDate: editEndDate ? new Date(editEndDate) : null
      } : s));
      setEditingId(null);
      await updateGovernanceStage(id, editName, "", editDescription, editStartDate, editEndDate);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      setStages(stages.filter(s => s.id !== id));
      await deleteGovernanceStage(id);
    });
  };

  const handleSetCurrent = (id: string) => {
    startTransition(async () => {
      setStages(stages.map(s => ({ ...s, isCurrent: s.id === id })));
      await setCurrentGovernanceStage(charityId, id);
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
      await reorderGovernanceStages(charityId, reordered.map(s => s.id));
    });
  };

  const startEdit = (stage: Stage) => {
    setEditingId(stage.id);
    setEditName(stage.name);
    setEditDescription(stage.description || "");
    setEditStartDate(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
    setEditEndDate(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8 transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          إدارة مراحل الحوكمة
        </h3>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          disabled={isPending}
        >
          <Plus className="w-4 h-4" />
          إضافة مرحلة
        </button>
      </div>

      <div className="p-6 space-y-3">
        {sortedStages.map((stage, index) => {
          const isCurrent = stage.isCurrent;
          const isCompleted = stages.findIndex(s => s.isCurrent) > index;
          
          return (
            <div 
              key={stage.id} 
              className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
                <button 
                  onClick={() => handleMove(index, 'up')} 
                  disabled={index === 0 || isPending}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-1"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                  isCurrent ? "bg-primary text-white border-primary" :
                  isCompleted ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 border-emerald-200 dark:border-emerald-800/50" :
                  "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}>
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <button 
                  onClick={() => handleMove(index, 'down')} 
                  disabled={index === sortedStages.length - 1 || isPending}
                  className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-1"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1">
                {editingId === stage.id ? (
                  <div className="flex flex-col gap-3">
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      placeholder="اسم المرحلة"
                      className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      autoFocus
                    />
                    <textarea 
                      value={editDescription} 
                      onChange={e => setEditDescription(e.target.value)} 
                      placeholder="وصف مختصر للمرحلة (اختياري)"
                      rows={2}
                      className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
                    />
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                      <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ البداية (اختياري)</label>
                        <input 
                          type="date" 
                          value={editStartDate} 
                          onChange={e => setEditStartDate(e.target.value)} 
                          className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                      <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ النهاية (اختياري)</label>
                        <input 
                          type="date" 
                          value={editEndDate} 
                          onChange={e => setEditEndDate(e.target.value)} 
                          className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleUpdate(stage.id)} className="flex items-center gap-1.5 px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg font-bold" disabled={isPending}>
                        <Check className="w-4 h-4" /> حفظ
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-bold" disabled={isPending}>
                        <X className="w-4 h-4" /> إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col mt-2">
                     <span className={`font-semibold ${isCurrent ? "text-primary text-base" : "text-slate-700 dark:text-slate-200 text-sm sm:text-base"}`}>
                       {stage.name}
                     </span>
                     {stage.description && (
                       <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stage.description}</p>
                     )}
                     <div className="flex flex-wrap items-center gap-2 mt-2">
                       {stage.startDate && (
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full" dir="ltr">
                           {new Date(stage.startDate).toLocaleDateString('en-CA')}
                         </span>
                       )}
                       {stage.startDate && stage.endDate && (
                         <span className="text-xs text-slate-400 px-1">إلى</span>
                       )}
                       {stage.endDate && (
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full" dir="ltr">
                           {new Date(stage.endDate).toLocaleDateString('en-CA')}
                         </span>
                       )}
                       {isCurrent && <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">المرحلة الحالية</span>}
                     </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0 mt-1">
                {!isCurrent && (
                  <button 
                    onClick={() => handleSetCurrent(stage.id)} 
                    disabled={isPending}
                    className="hidden sm:block px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    تعيين كحالية
                  </button>
                )}
                
                <button 
                  onClick={() => startEdit(stage)} 
                  disabled={isPending}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={() => handleDelete(stage.id)} 
                  disabled={isPending}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {stages.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">لا توجد مراحل مسجلة.</div>
        )}

        {isAdding && (
          <div className="flex items-start gap-4 p-4 rounded-xl border border-primary border-dashed bg-primary/5">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-1">
               <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-dashed" />
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="اسم المرحلة الجديدة..."
                className="w-full border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                autoFocus
              />
              <textarea 
                value={newDescription} 
                onChange={e => setNewDescription(e.target.value)} 
                placeholder="وصف مختصر للمرحلة (اختياري)"
                rows={2}
                className="w-full border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
              />
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-3">
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ البداية (اختياري)</label>
                  <input 
                    type="date" 
                    value={newStartDate} 
                    onChange={e => setNewStartDate(e.target.value)} 
                    className="w-full border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ النهاية (اختياري)</label>
                  <input 
                    type="date" 
                    value={newEndDate} 
                    onChange={e => setNewEndDate(e.target.value)} 
                    className="w-full border border-primary/30 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleAdd} className="flex-1 flex justify-center items-center gap-2 px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg font-bold transition-colors" disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> إضافة</>}
                </button>
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-bold" disabled={isPending}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
