"use client";

import { useState, useTransition } from "react";
import { Sparkles, Check, X, Edit2, Trash2, Plus, ArrowUp, ArrowDown, Loader2, Calendar, LayoutList, Clock, Briefcase } from "lucide-react";
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

export default function ServiceTimeline({
  charityId,
  initialService,
  isAdmin,
  onDeleteService
}: {
  charityId: string;
  initialService: Service;
  isAdmin: boolean;
  onDeleteService?: (id: string) => void;
}) {
  const [service, setService] = useState<Service>(initialService);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Service Edit
  const [isEditingService, setIsEditingService] = useState(false);
  const [serviceNameEdit, setServiceNameEdit] = useState(service.name);

  // Stage Edit
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameEdit, setStageNameEdit] = useState("");
  const [stageDescEdit, setStageDescEdit] = useState("");
  const [stageStartDateEdit, setStageStartDateEdit] = useState("");
  const [stageEndDateEdit, setStageEndDateEdit] = useState("");

  // Stage Add
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDesc, setNewStageDesc] = useState("");
  const [newStageStartDate, setNewStageStartDate] = useState("");
  const [newStageEndDate, setNewStageEndDate] = useState("");

  const sortedStages = [...service.stages].sort((a, b) => a.order - b.order);
  const currentIndex = sortedStages.findIndex(s => s.isCurrent);
  const calcIndex = currentIndex === -1 ? sortedStages.length - 1 : currentIndex;
  const progressWidth = sortedStages.length > 0 ? `${((calcIndex + 0.5) / sortedStages.length) * 100}%` : '0%';

  const handleUpdateService = () => {
    if (!serviceNameEdit.trim()) return;
    startTransition(async () => {
      setService({ ...service, name: serviceNameEdit });
      setIsEditingService(false);
      await updateService(service.id, serviceNameEdit, service.department);
    });
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    const start = newStageStartDate ? new Date(newStageStartDate) : null;
    const end = newStageEndDate ? new Date(newStageEndDate) : null;

    startTransition(async () => {
      const created = await addServiceStage(service.id, newStageName, newStageDesc || null, start, end);
      setService({ ...service, stages: [...service.stages, created] });
      setIsAddingStage(false);
      setNewStageName("");
      setNewStageDesc("");
      setNewStageStartDate("");
      setNewStageEndDate("");
    });
  };

  const handleUpdateStage = (id: string) => {
    if (!stageNameEdit.trim()) return;
    const start = stageStartDateEdit ? new Date(stageStartDateEdit) : null;
    const end = stageEndDateEdit ? new Date(stageEndDateEdit) : null;

    startTransition(async () => {
      const updated = await updateServiceStage(id, stageNameEdit, stageDescEdit || null, start, end);
      setService({ ...service, stages: service.stages.map(s => s.id === id ? updated : s) });
      setEditingStageId(null);
    });
  };

  const handleDeleteStage = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المرحلة؟")) return;
    startTransition(async () => {
      setService({ ...service, stages: service.stages.filter(s => s.id !== id) });
      await deleteServiceStage(id);
    });
  };

  const handleSetCurrent = (id: string) => {
    startTransition(async () => {
      setService({
        ...service,
        stages: service.stages.map(s => ({ ...s, isCurrent: s.id === id }))
      });
      await setCurrentServiceStage(service.id, id);
    });
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedStages.length - 1) return;

    const newStages = [...sortedStages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    const reordered = newStages.map((s, i) => ({ ...s, order: i }));
    setService({ ...service, stages: reordered });

    startTransition(async () => {
      await reorderServiceStages(reordered.map(s => s.id));
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      
      {/* Header */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex flex-1 items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          
          {isEditingService ? (
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
               <input 
                 type="text" 
                 value={serviceNameEdit} 
                 onChange={e => setServiceNameEdit(e.target.value)} 
                 className="flex-1 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/50 outline-none"
                 autoFocus
               />
               <div className="flex gap-2">
                 <button onClick={handleUpdateService} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg shrink-0">
                   <Check className="w-5 h-5" />
                 </button>
                 <button onClick={() => { setIsEditingService(false); setServiceNameEdit(service.name); }} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg shrink-0">
                   <X className="w-5 h-5" />
                 </button>
               </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{service.name}</h3>
              {service.department && (
                 <div className="text-xs text-slate-500 mt-1">القسم: {service.department === 'STRATEGY' ? 'الاستراتيجية' : service.department === 'GOVERNANCE' ? 'الحوكمة' : service.department === 'FINANCE' ? 'المالية' : service.department === 'PROGRAMS' ? 'البرامج والمشاريع' : service.department}</div>
              )}
            </div>
          )}
        </div>

        {isAdmin && !isEditingService && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditingMode(!isEditingMode)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              {isEditingMode ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
              {isEditingMode ? "إنهاء التعديل" : "إدارة المراحل"}
            </button>
            <button
              onClick={() => setIsEditingService(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
              title="تعديل اسم الخدمة"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {onDeleteService && (
              <button
                onClick={() => onDeleteService(service.id)}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-3 py-2 rounded-xl text-sm font-bold transition-colors"
                title="حذف الخدمة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 md:p-8">
        {!isEditingMode ? (
          /* VIEW MODE - Horizontal Progress */
          sortedStages.length === 0 ? (
             <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
               لا توجد مراحل مسجلة لهذه الخدمة بعد.
             </div>
          ) : (
            <div className="relative pt-6 pb-6 overflow-x-auto custom-scrollbar">
              <div className="absolute top-11 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full hidden md:block z-0"></div>
              <div 
                className="absolute top-11 right-0 h-1 bg-primary rounded-full hidden md:block transition-all duration-1000 ease-out z-0"
                style={{ width: progressWidth }}
              ></div>
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-4 relative z-10 min-w-max md:min-w-0 px-2 md:px-0">
                {sortedStages.map((stage, index) => {
                  const isCurrent = stage.isCurrent;
                  const isCompleted = currentIndex !== -1 ? index < currentIndex : true;

                  return (
                    <div key={stage.id} className="flex-1 flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-0 w-full md:w-auto">
                      
                      {/* Circle */}
                      <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg mb-0 md:mb-4 shadow-sm border-2 transition-colors z-10 ${
                        isCurrent ? "bg-white dark:bg-slate-800 text-primary border-primary ring-4 ring-primary/20 scale-110" :
                        isCompleted ? "bg-primary text-white border-primary" :
                        "bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}>
                        {isCompleted ? <Check className="w-6 h-6" /> : (index + 1)}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 w-full p-4 md:p-0 rounded-xl md:bg-transparent md:border-0 border border-slate-100 dark:border-slate-700/50 ${
                        isCurrent ? 'bg-primary/5 md:bg-transparent border-primary/20' : 'bg-slate-50 dark:bg-slate-900/50 md:bg-transparent'
                      }`}>
                        <div className={`text-base font-bold transition-colors ${
                          isCurrent ? "text-primary" : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {stage.name}
                        </div>
                        
                        {(stage.startDate || stage.endDate) && (
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-slate-800 md:bg-slate-100 md:dark:bg-slate-800 border border-slate-200 dark:border-slate-700 md:border-transparent px-2.5 py-1 rounded-full inline-flex flex-wrap items-center justify-start md:justify-center gap-1.5 w-auto">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {stage.startDate && <span dir="ltr">{new Date(stage.startDate).toLocaleDateString('ar-SA')}</span>}
                            {stage.startDate && stage.endDate && <span>-</span>}
                            {stage.endDate && <span dir="ltr">{new Date(stage.endDate).toLocaleDateString('ar-SA')}</span>}
                          </div>
                        )}

                        {stage.description && (
                          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[250px] mx-auto text-right md:text-center line-clamp-3">
                            {stage.description}
                          </p>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          /* EDIT MODE - Vertical List */
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-slate-700 dark:text-slate-300">إدارة مراحل الخط الزمني</h4>
              <button
                onClick={() => setIsAddingStage(true)}
                className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                disabled={isPending}
              >
                <Plus className="w-4 h-4" />
                إضافة مرحلة
              </button>
            </div>

            {sortedStages.map((stage, index) => {
              const isCurrent = stage.isCurrent;
              const isCompleted = currentIndex !== -1 ? index < currentIndex : true;

              return (
                <div 
                  key={stage.id} 
                  className={`flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl border transition-colors ${
                    isCurrent ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                  }`}
                >
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleMoveStage(index, 'up')} 
                      disabled={index === 0 || isPending}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 p-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
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
                      onClick={() => handleMoveStage(index, 'down')} 
                      disabled={index === sortedStages.length - 1 || isPending}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 p-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1">
                    {editingStageId === stage.id ? (
                      <div className="flex flex-col gap-3">
                        <input 
                          type="text" 
                          value={stageNameEdit} 
                          onChange={e => setStageNameEdit(e.target.value)} 
                          placeholder="اسم المرحلة"
                          className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                        />
                        <textarea 
                          value={stageDescEdit} 
                          onChange={e => setStageDescEdit(e.target.value)} 
                          placeholder="الوصف (اختياري)"
                          rows={2}
                          className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input 
                            type="date" 
                            value={stageStartDateEdit} 
                            onChange={e => setStageStartDateEdit(e.target.value)} 
                            className="w-full sm:w-1/2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                          />
                          <input 
                            type="date" 
                            value={stageEndDateEdit} 
                            onChange={e => setStageEndDateEdit(e.target.value)} 
                            className="w-full sm:w-1/2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleUpdateStage(stage.id)} className="flex items-center gap-1.5 px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-lg font-bold" disabled={isPending}>
                            <Check className="w-4 h-4" /> حفظ
                          </button>
                          <button onClick={() => setEditingStageId(null)} className="flex items-center gap-1.5 px-4 py-2 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-lg font-bold" disabled={isPending}>
                            <X className="w-4 h-4" /> إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full justify-center">
                         <div className="flex items-center gap-3 mb-1">
                           <span className={`font-bold ${isCurrent ? "text-primary text-lg" : "text-slate-800 dark:text-slate-200 text-base"}`}>
                             {stage.name}
                           </span>
                           {isCurrent && <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">المرحلة الحالية</span>}
                         </div>
                         
                         {(stage.startDate || stage.endDate) && (
                           <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                             <Calendar className="w-3.5 h-3.5" />
                             {stage.startDate && <span dir="ltr">{new Date(stage.startDate).toLocaleDateString('ar-SA')}</span>}
                             {stage.startDate && stage.endDate && <span>إلى</span>}
                             {stage.endDate && <span dir="ltr">{new Date(stage.endDate).toLocaleDateString('ar-SA')}</span>}
                           </div>
                         )}

                         {stage.description && (
                           <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">{stage.description}</p>
                         )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {!editingStageId && (
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-700 sm:pr-4 sm:ml-2">
                      {!isCurrent && (
                        <button 
                          onClick={() => handleSetCurrent(stage.id)} 
                          disabled={isPending}
                          className="w-full sm:w-auto px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
                        >
                          تعيين كحالية
                        </button>
                      )}
                      
                      <button 
                        onClick={() => { 
                          setEditingStageId(stage.id); 
                          setStageNameEdit(stage.name); 
                          setStageDescEdit(stage.description || ""); 
                          setStageStartDateEdit(stage.startDate ? new Date(stage.startDate).toISOString().split('T')[0] : "");
                          setStageEndDateEdit(stage.endDate ? new Date(stage.endDate).toISOString().split('T')[0] : "");
                        }} 
                        disabled={isPending}
                        className="w-full sm:w-auto flex justify-center p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteStage(stage.id)} 
                        disabled={isPending}
                        className="w-full sm:w-auto flex justify-center p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {sortedStages.length === 0 && !isAddingStage && (
              <div className="text-center py-8 text-slate-500">لا توجد مراحل مسجلة.</div>
            )}

            {isAddingStage && (
              <div className="p-5 rounded-2xl border-2 border-primary border-dashed bg-primary/5">
                <h4 className="font-bold text-primary mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> إضافة مرحلة جديدة
                </h4>
                <div className="flex flex-col gap-3">
                  <input 
                    type="text" 
                    value={newStageName} 
                    onChange={e => setNewStageName(e.target.value)} 
                    placeholder="اسم المرحلة"
                    className="w-full border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    autoFocus
                  />
                  <textarea 
                    value={newStageDesc} 
                    onChange={e => setNewStageDesc(e.target.value)} 
                    placeholder="الوصف (اختياري)"
                    rows={2}
                    className="w-full border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none resize-none custom-scrollbar"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="date" 
                      value={newStageStartDate} 
                      onChange={e => setNewStageStartDate(e.target.value)} 
                      className="w-full sm:w-1/2 border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <input 
                      type="date" 
                      value={newStageEndDate} 
                      onChange={e => setNewStageEndDate(e.target.value)} 
                      className="w-full sm:w-1/2 border border-primary/30 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={handleAddStage} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 text-white bg-primary hover:bg-primary/90 rounded-xl font-bold transition-colors" disabled={isPending}>
                      {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} حفظ المرحلة
                    </button>
                    <button onClick={() => setIsAddingStage(false)} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 text-slate-600 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors" disabled={isPending}>
                      <X className="w-5 h-5" /> إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
