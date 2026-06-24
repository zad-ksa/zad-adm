"use client";

import { useState } from "react";
import { formatDurationArabic } from "@/lib/dateUtils";
import { Activity, Check, Plus, ArrowRight, ArrowLeft, Trash2, Settings, Eye, EyeOff, X, Calendar, Edit2, Infinity } from "lucide-react";

// Types
export type TimelineStage = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  order: number;
  isCurrent: boolean;
  isContinuous: boolean;
  isActive: boolean;
  duration?: string | null;
};

interface InteractiveTimelineEditorProps {
  title: string;
  stages: TimelineStage[];
  isPending: boolean;
  onAdd: (stage: Omit<TimelineStage, 'id' | 'order' | 'isCurrent' | 'isActive'>) => void;
  onUpdate: (id: string, stage: Partial<TimelineStage>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onToggleActive: (id: string, currentActive: boolean) => void;
  onSetCurrent: (id: string) => void;
}

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default function InteractiveTimelineEditor({
  title,
  stages,
  isPending,
  onAdd,
  onUpdate,
  onDelete,
  onMove,
  onToggleActive,
  onSetCurrent
}: InteractiveTimelineEditorProps) {
  const sequentialStages = stages?.filter(s => !s.isContinuous) || [];
  const continuousStages = stages?.filter(s => s.isContinuous) || [];

  const [editingField, setEditingField] = useState<{ id: string, field: 'name' | 'description' | 'dates' | 'duration' } | null>(null);
  
  // Inline edit states
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editDuration, setEditDuration] = useState("");

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [modalEditName, setModalEditName] = useState("");
  const selectedStage = stages.find(s => s.id === selectedStageId);

  // New stage states
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const [isAddingContinuous, setIsAddingContinuous] = useState(false);
  const [newContinuousName, setNewContinuousName] = useState("");

  const handleStartInlineEdit = (stage: TimelineStage, field: 'name' | 'description' | 'dates' | 'duration') => {
    if (isPending) return;
    setEditingField({ id: stage.id, field });
    if (field === 'name') setEditName(stage.name);
    if (field === 'description') setEditDesc(stage.description || "");
    if (field === 'dates') {
      setEditStart(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
      setEditEnd(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
    }
    if (field === 'duration') {
      setEditDuration(stage.duration || "");
    }
  };

  const handleSaveInline = (stage: TimelineStage) => {
    if (!editingField) return;
    
    if (editingField.field === 'name' && editName.trim() && editName !== stage.name) {
      onUpdate(stage.id, { name: editName });
    } else if (editingField.field === 'description' && editDesc !== (stage.description || "")) {
      onUpdate(stage.id, { description: editDesc || null });
    } else if (editingField.field === 'dates') {
      const newStart = editStart ? new Date(editStart) : null;
      const newEnd = editEnd ? new Date(editEnd) : null;
      onUpdate(stage.id, { startDate: newStart, endDate: newEnd });
    } else if (editingField.field === 'duration') {
      onUpdate(stage.id, { duration: editDuration });
    }
    setEditingField(null);
  };

  const submitNewStage = () => {
    if (!newName.trim()) return;
    onAdd({
      name: newName,
      description: null,
      startDate: null,
      endDate: null,
      isContinuous: false
    });
    setIsAdding(false);
    setNewName("");
  };

  const submitNewContinuousStage = () => {
    if (!newContinuousName.trim()) return;
    onAdd({
      name: newContinuousName,
      description: null,
      startDate: null,
      endDate: null,
      isContinuous: true
    });
    setIsAddingContinuous(false);
    setNewContinuousName("");
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-x-auto custom-scrollbar">
      <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-8 border-b border-slate-100 dark:border-slate-700 pb-4 flex justify-between items-center">
        <span>{title}</span>
        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold flex items-center gap-1">
          <Edit2 className="w-3 h-3" /> وضع التعديل المباشر
        </span>
      </h3>
      
      <div className="relative pb-8 min-w-max">
        <div className="flex flex-row gap-6 relative z-10 items-start pt-6">
          
          {sequentialStages.map((stage, idx) => {
            const isPast = sequentialStages.findIndex(s => s.isCurrent) > idx;
            const isCurrent = stage.isCurrent;
            const displayDuration = formatDurationArabic(stage.startDate, stage.endDate);
            
            return (
              <div key={stage.id} className={`flex flex-col items-center gap-3 group relative w-[220px] transition-all ${!stage.isActive ? "opacity-60 grayscale-[50%]" : ""}`}>
                
                {/* Connecting Line */}
                {idx !== sequentialStages.length - 1 && (
                  <div className={`absolute top-6 right-1/2 w-[calc(100%+1.5rem)] h-1 -z-10 ${isPast ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
                )}
                {/* Connecting Line to Add Button */}
                {idx === sequentialStages.length - 1 && (
                  <div className={`absolute top-6 right-1/2 w-[calc(100%+1.5rem)] h-1 -z-10 bg-slate-200 dark:bg-slate-700 border-dashed border-t-2 border-slate-300 dark:border-slate-600 bg-transparent`}></div>
                )}
                
                {/* Reorder Arrows (Visible on Hover) */}
                <div className="absolute -top-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-700 z-20 shadow-sm">
                   <button 
                     onClick={() => onMove(stage.id, 'up')}
                     disabled={idx === 0 || isPending}
                     className="p-1 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30"
                     title="تحريك يميناً (للخلف)"
                   >
                     <ArrowRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                   </button>
                   <button 
                     onClick={() => onMove(stage.id, 'down')}
                     disabled={idx === sequentialStages.length - 1 || isPending}
                     className="p-1 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30"
                     title="تحريك يساراً (للأمام)"
                   >
                     <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                   </button>
                </div>

                {/* Circle */}
                <button 
                  onClick={() => {
                    setSelectedStageId(stage.id);
                    setModalEditName(stage.name);
                  }}
                  className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-xl bg-white dark:bg-slate-800 shrink-0 transition-all duration-300 relative z-10 cursor-pointer hover:scale-110 hover:shadow-md
                  ${isPast ? 'border-emerald-500 text-emerald-500' : 
                    isCurrent ? 'border-primary text-primary scale-110 shadow-lg shadow-primary/20' : 
                    'border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500'}`}
                  title="انقر لخيارات المرحلة"
                >
                  {isPast ? <CheckCircleIcon /> : (idx + 1)}
                </button>
                
                {/* Info Card */}
                <div className={`flex flex-col items-center w-full p-3 rounded-xl transition-all duration-300 border ${isCurrent ? 'bg-primary/5 dark:bg-primary/10 border-primary/20 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
                  
                  {/* Name */}
                  {editingField?.id === stage.id && editingField.field === 'name' ? (
                    <input 
                      autoFocus
                      className="w-full text-center text-sm font-bold bg-white dark:bg-slate-800 border-2 border-primary/50 rounded-md px-1 py-0.5 outline-none"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleSaveInline(stage)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveInline(stage)}
                    />
                  ) : (
                    <h4 
                      onClick={() => handleStartInlineEdit(stage, 'name')}
                      className={`font-bold text-sm text-center cursor-text hover:text-primary transition-colors ${isCurrent ? 'text-primary' : 'text-slate-700 dark:text-slate-300'} line-clamp-2 w-full`}
                      title="انقر للتعديل"
                    >
                      {stage.name}
                    </h4>
                  )}

                  {/* Description */}
                  {editingField?.id === stage.id && editingField.field === 'description' ? (
                    <textarea 
                      autoFocus
                      className="w-full mt-2 text-xs text-center bg-white dark:bg-slate-800 border-2 border-primary/50 rounded-md px-1 py-0.5 outline-none resize-none"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      onBlur={() => handleSaveInline(stage)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSaveInline(stage)}
                      rows={2}
                    />
                  ) : (
                    <p 
                      onClick={() => handleStartInlineEdit(stage, 'description')}
                      className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed text-center line-clamp-3 cursor-text hover:text-primary transition-colors min-h-[1.5rem] w-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded p-0.5"
                      title="انقر لتعديل الوصف"
                    >
                      {stage.description || <span className="opacity-50 italic">إضافة وصف...</span>}
                    </p>
                  )}

                  {/* Dates / Duration */}
                  {editingField?.id === stage.id && editingField.field === 'dates' ? (
                    <div className="flex flex-col gap-1 mt-2 w-full">
                      <input type="date" className="text-[10px] p-1 border rounded w-full dark:bg-slate-800 dark:border-slate-600 [color-scheme:light] dark:[color-scheme:dark]" value={editStart} onChange={e => setEditStart(e.target.value)} />
                      <input type="date" className="text-[10px] p-1 border rounded w-full dark:bg-slate-800 dark:border-slate-600 [color-scheme:light] dark:[color-scheme:dark]" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                      <button onClick={() => handleSaveInline(stage)} className="text-[10px] bg-primary text-white py-1 rounded">حفظ التواريخ</button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => handleStartInlineEdit(stage, 'dates')}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded-md mt-2 font-medium border border-slate-200 dark:border-slate-700/50 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full justify-center"
                      title="انقر لتعديل التواريخ"
                    >
                      <Calendar className="w-3 h-3" />
                      {displayDuration ? displayDuration : "تحديد التواريخ"}
                    </div>
                  )}

                  {isCurrent && <span className="block mt-2 text-[10px] font-bold bg-primary text-white px-3 py-0.5 rounded-full">المرحلة الحالية</span>}
                </div>
              </div>
            );
          })}

          {/* Add New Stage Button */}
          <div className="flex flex-col items-center gap-3 w-[220px]">
            {isAdding ? (
              <div className="flex flex-col items-center w-full p-3 rounded-xl border-2 border-primary/50 border-dashed bg-primary/5 mt-10">
                <input 
                  autoFocus
                  className="w-full text-center text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 outline-none mb-2"
                  placeholder="اسم المرحلة..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitNewStage()}
                />
                <div className="flex gap-2">
                  <button onClick={submitNewStage} className="bg-primary text-white p-1.5 rounded-md hover:bg-primary/90"><Check className="w-4 h-4" /></button>
                  <button onClick={() => { setIsAdding(false); setNewName(""); }} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-1.5 rounded-md hover:bg-slate-300"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setIsAdding(true)}
                  disabled={isPending}
                  className="w-14 h-14 rounded-full border-4 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-pointer relative z-10 bg-white dark:bg-slate-800"
                  title="إضافة مرحلة جديدة"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <div className="mt-2 text-sm text-slate-400 font-medium">إضافة مرحلة</div>
              </>
            )}
          </div>

        </div>
      </div>

      {/* Continuous Stages Row */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
          <Infinity className="w-4 h-4" /> المراحل والأنشطة المستمرة
          <button 
            onClick={() => setIsAddingContinuous(true)}
            disabled={isPending}
            className="mr-auto text-xs bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 px-2 py-1 rounded-md flex items-center gap-1 transition-colors font-bold"
          >
            <Plus className="w-3 h-3" /> إضافة
          </button>
        </h4>
        <div className="relative pb-8 min-w-max">
          <div className="flex flex-row gap-6 relative z-10 items-start pt-6">
            {continuousStages.map((stage, idx) => {
              const displayDuration = formatDurationArabic(stage.startDate, stage.endDate);
              const isCurrent = stage.isCurrent;
              return (
                <div key={stage.id} className={`flex flex-col items-center gap-3 group relative w-[220px] transition-all ${!stage.isActive ? "opacity-60 grayscale-[50%]" : ""}`}>
                  
                  {/* Reorder Arrows (Visible on Hover) */}
                  <div className="absolute -top-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg border border-slate-200 dark:border-slate-700 z-20 shadow-sm">
                     <button 
                       onClick={() => onMove(stage.id, 'up')}
                       disabled={idx === 0 || isPending}
                       className="p-1 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30"
                       title="تحريك يميناً (للخلف)"
                     >
                       <ArrowRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                     </button>
                     <button 
                       onClick={() => onMove(stage.id, 'down')}
                       disabled={idx === continuousStages.length - 1 || isPending}
                       className="p-1 bg-white dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30"
                       title="تحريك يساراً (للأمام)"
                     >
                       <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                     </button>
                  </div>

                  {/* Circle - GOLD without lines */}
                  <button 
                    onClick={() => {
                      setSelectedStageId(stage.id);
                      setModalEditName(stage.name);
                    }}
                    className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-bold text-xl bg-white dark:bg-slate-800 shrink-0 transition-all duration-300 relative z-10 cursor-pointer hover:scale-110 hover:shadow-md
                    ${isCurrent ? 'border-amber-500 text-amber-500 scale-110 shadow-lg shadow-amber-500/20' : 
                      'border-amber-200 dark:border-amber-700 text-amber-500 dark:text-amber-500'}`}
                    title="انقر لخيارات المرحلة"
                  >
                    <Infinity className="w-6 h-6" />
                  </button>
                  
                  {/* Info Card */}
                  <div className={`flex flex-col items-center w-full p-3 rounded-xl transition-all duration-300 border ${isCurrent ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 shadow-sm' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
                    
                    {/* Name */}
                    {editingField?.id === stage.id && editingField.field === 'name' ? (
                      <input 
                        autoFocus
                        className="w-full text-center text-sm font-bold bg-white dark:bg-slate-800 border-2 border-amber-500/50 rounded-md px-1 py-0.5 outline-none"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => handleSaveInline(stage)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveInline(stage)}
                      />
                    ) : (
                      <h4 
                        onClick={() => handleStartInlineEdit(stage, 'name')}
                        className={`font-bold text-sm text-center cursor-text hover:text-amber-500 transition-colors ${isCurrent ? 'text-amber-600 dark:text-amber-500' : 'text-slate-700 dark:text-slate-300'} line-clamp-2 w-full`}
                        title="انقر للتعديل"
                      >
                        {stage.name}
                      </h4>
                    )}

                    {/* Description */}
                    {editingField?.id === stage.id && editingField.field === 'description' ? (
                      <textarea 
                        autoFocus
                        className="w-full mt-2 text-xs text-center bg-white dark:bg-slate-800 border-2 border-amber-500/50 rounded-md px-1 py-0.5 outline-none resize-none"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        onBlur={() => handleSaveInline(stage)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSaveInline(stage)}
                        rows={2}
                      />
                    ) : (
                      <p 
                        onClick={() => handleStartInlineEdit(stage, 'description')}
                        className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed text-center line-clamp-3 cursor-text hover:text-amber-500 transition-colors min-h-[1.5rem] w-full border border-transparent hover:border-slate-200 dark:hover:border-slate-600 rounded p-0.5"
                        title="انقر لتعديل الوصف"
                      >
                        {stage.description || <span className="opacity-50 italic">إضافة وصف...</span>}
                      </p>
                    )}

                    {/* Duration */}
                    {editingField?.id === stage.id && editingField.field === 'duration' ? (
                      <div className="flex flex-col gap-1 mt-2 w-full">
                        <input type="text" className="text-xs p-1.5 border rounded w-full dark:bg-slate-800 dark:border-slate-600 text-center text-slate-800 dark:text-slate-100" placeholder="مثال: مستمر طوال العام" value={editDuration} onChange={e => setEditDuration(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveInline(stage)} />
                        <button onClick={() => handleSaveInline(stage)} className="text-[10px] bg-amber-500 text-white py-1 rounded">حفظ المدة</button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleStartInlineEdit(stage, 'duration')}
                        className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-1 rounded-md mt-2 font-medium border border-slate-200 dark:border-slate-700/50 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors w-full justify-center"
                        title="انقر لتعديل المدة"
                      >
                        <Calendar className="w-3 h-3" />
                        {stage.duration ? stage.duration : "تحديد المدة النصية"}
                      </div>
                    )}

                    {isCurrent && <span className="block mt-2 text-[10px] font-bold bg-amber-500 text-white px-3 py-0.5 rounded-full">النشاط الحالي</span>}
                  </div>
                </div>
              );
            })}
            
            {/* Add New Continuous Stage Form */}
            {isAddingContinuous && (
              <div className="flex flex-col items-center gap-3 w-[220px]">
                <div className="flex flex-col items-center w-full p-3 rounded-xl border-2 border-amber-500/50 border-dashed bg-amber-500/5 mt-10">
                  <input 
                    autoFocus
                    className="w-full text-center text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md px-2 py-1 outline-none mb-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="اسم النشاط المستمر..."
                    value={newContinuousName}
                    onChange={e => setNewContinuousName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitNewContinuousStage()}
                  />
                  <div className="flex gap-2">
                    <button onClick={submitNewContinuousStage} className="bg-amber-500 text-white p-1.5 rounded-md hover:bg-amber-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => { setIsAddingContinuous(false); setNewContinuousName(""); }} className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-1.5 rounded-md hover:bg-slate-300"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            )}
            
            {continuousStages.length === 0 && !isAddingContinuous && (
              <div className="flex items-center justify-center w-full py-4">
                <p className="text-xs text-slate-400">لا توجد أنشطة مستمرة.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {selectedStageId && selectedStage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                إعدادات: {selectedStage.name}
              </h3>
              <button onClick={() => setSelectedStageId(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تغيير الاسم</label>
                <input 
                  className="w-full border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  value={modalEditName}
                  onChange={e => setModalEditName(e.target.value)}
                  onBlur={() => {
                    if (modalEditName.trim() && modalEditName !== selectedStage.name) {
                      onUpdate(selectedStage.id, { name: modalEditName });
                    }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => onToggleActive(selectedStage.id, selectedStage.isActive)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${selectedStage.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                >
                  {selectedStage.isActive ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  <span className="text-sm font-bold">{selectedStage.isActive ? 'المرحلة مفعلة' : 'المرحلة معطلة'}</span>
                </button>

                {!selectedStage.isContinuous && (
                  <button
                    onClick={() => {
                      onSetCurrent(selectedStage.id);
                      setSelectedStageId(null);
                    }}
                    disabled={selectedStage.isCurrent}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-colors ${selectedStage.isCurrent ? 'bg-primary/10 border-primary/30 text-primary opacity-50 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                  >
                    <CheckCircleIcon />
                    <span className="text-sm font-bold">تعيين كحالية</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30">
                <input 
                  type="checkbox" 
                  id="modal-continuous"
                  checked={selectedStage.isContinuous}
                  onChange={e => onUpdate(selectedStage.id, { isContinuous: e.target.checked })}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="modal-continuous" className="text-sm font-medium text-amber-800 dark:text-amber-500 cursor-pointer">
                  تحويل إلى نشاط مستمر (لا يعتمد على التسلسل)
                </label>
              </div>

              <button 
                onClick={() => {
                  onDelete(selectedStage.id);
                  setSelectedStageId(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 rounded-xl font-bold transition-colors border border-red-100 dark:border-red-900/50"
              >
                <Trash2 className="w-5 h-5" /> حذف المرحلة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
