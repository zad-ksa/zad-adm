"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { addStrategicStage, updateStrategicStage, deleteStrategicStage, setCurrentStrategicStage, reorderStrategicStages } from "@/app/actions/strategy";

type Stage = {
  id: string;
  name: string;
  order: number;
  isCurrent: boolean;
  duration?: string | null;
};

export default function StrategicStagesManager({ charityId, initialStages }: { charityId: string, initialStages: Stage[] }) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [editDuration, setEditDuration] = useState("");

  // Sort locally by order
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      // Optimistic locally
      const optimisticStage = { id: Math.random().toString(), name: newName, duration: newDuration, order: stages.length, isCurrent: false };
      setStages([...stages, optimisticStage]);
      setIsAdding(false);
      setNewName("");
      setNewDuration("");
      
      await addStrategicStage(charityId, newName, newDuration);
      // Full refresh to get the real IDs from DB
      window.location.reload();
    });
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      setStages(stages.map(s => s.id === id ? { ...s, name: editName, duration: editDuration } : s));
      setEditingId(null);
      await updateStrategicStage(id, editName, editDuration);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      setStages(stages.filter(s => s.id !== id));
      await deleteStrategicStage(id);
    });
  };

  const handleSetCurrent = (id: string) => {
    startTransition(async () => {
      setStages(stages.map(s => ({ ...s, isCurrent: s.id === id })));
      await setCurrentStrategicStage(charityId, id);
    });
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedStages.length - 1) return;

    const newStages = [...sortedStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // Reassign orders
    const reordered = newStages.map((s, i) => ({ ...s, order: i }));
    setStages(reordered);

    startTransition(async () => {
      await reorderStrategicStages(charityId, reordered.map(s => s.id));
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8 transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          إدارة مراحل التخطيط الاستراتيجي
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
          const isCompleted = stages.findIndex(s => s.isCurrent) > index; // Completed if before current
          
          return (
            <div 
              key={stage.id} 
              className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-200 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0">
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      placeholder="اسم المرحلة"
                      className="flex-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      autoFocus
                    />
                    <input 
                      type="text" 
                      value={editDuration} 
                      onChange={e => setEditDuration(e.target.value)} 
                      placeholder="المدة (مثال: أسبوعين)"
                      className="w-full sm:w-32 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(stage.id)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(stage.id)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" disabled={isPending}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg" disabled={isPending}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                     <span className={`font-semibold ${isCurrent ? "text-primary text-base" : "text-slate-700 dark:text-slate-200 text-sm sm:text-base"}`}>
                       {stage.name}
                     </span>
                     <div className="flex items-center gap-2 mt-1">
                       {stage.duration && (
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">المدة: {stage.duration}</span>
                       )}
                       {isCurrent && <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">المرحلة الحالية</span>}
                     </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
                  onClick={() => { setEditingId(stage.id); setEditName(stage.name); setEditDuration(stage.duration || ""); }} 
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
          <div className="text-center py-8 text-slate-500">لا توجد مراحل مسجلة.</div>
        )}

        {isAdding && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-primary border-dashed bg-primary/5">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
               <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-dashed" />
            </div>
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="اسم المرحلة الجديدة..."
                className="flex-1 border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                autoFocus
              />
              <input 
                type="text" 
                value={newDuration} 
                onChange={e => setNewDuration(e.target.value)} 
                placeholder="المدة (مثال: شهر)..."
                className="w-full sm:w-32 border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="p-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg" disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsAdding(false)} className="p-2 text-slate-500 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg" disabled={isPending}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
