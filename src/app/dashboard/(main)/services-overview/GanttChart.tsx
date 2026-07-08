"use client";

import { useMemo, useState, useTransition } from "react";
import { X, Edit, Printer, Check, Plus, Info, Edit2, Trash2 } from "lucide-react";
import { assignGanttDates, toggleGanttItemCompletion, addServiceStage, updateServiceStage, deleteServiceStage, broadcastGanttWeek } from "@/app/actions/services";
import { addServiceStageStep, updateServiceStageStep, deleteServiceStageStep } from "@/app/actions/stageSteps";
import { useRouter } from "next/navigation";

type Step = {
  id: string;
  name: string;
  isDone: boolean;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  order: number;
};

type Stage = {
  id: string;
  charityId: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  duration?: string | null;
  order: number;
  isCurrent: boolean;
  isDone?: boolean;
  steps?: Step[];
};

type ServiceWithStages = {
  id: string;
  charityId: string;
  name: string;
  stages: Stage[];
};

type Charity = {
  id: string;
  name: string;
};

type Props = {
  charities: Charity[];
  stagesData: Record<string, Stage[]>;
  allServices?: ServiceWithStages[];
  activeTab: string;
  activeLabel: string;
  isGenericTab?: boolean;
  genericSvcName?: string | null;
  deptColors: Record<string, string>;
  onClose: () => void;
  canEdit: boolean;
};

// --- Date Helpers ---
function getSunday(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday is 0
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function addDays(d: Date, days: number) {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}
function formatDate(d: Date) {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
function isOverlap(s1: Date, e1: Date, s2: Date, e2: Date) {
  return s1 <= e2 && s2 <= e1;
}

export default function GanttChart({
  charities, stagesData, allServices, activeTab, activeLabel,
  isGenericTab, genericSvcName, deptColors, onClose, canEdit
}: Props) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<'dots' | 'text'>('dots');
  const [isPending, startTransition] = useTransition();

  // --- Calculate Weeks ---
  const weeks = useMemo(() => {
    const today = new Date();
    // Week 0 is last week
    const lastSunday = addDays(getSunday(today), -7);
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const start = addDays(lastSunday, i * 7);
      const end = addDays(start, 4); // Thursday
      end.setHours(23, 59, 59, 999);
      let label = i === 0 ? "الأسبوع الماضي" : i === 1 ? "الأسبوع الحالي" : `الأسبوع ${i}`;
      arr.push({ start, end, label, isCurrent: i === 1 });
    }
    return arr;
  }, []);

  // --- Process Data ---
  const rows = useMemo(() => {
    return charities.map(c => {
      let serviceId = "";
      let stages: Stage[] = [];
      if (!isGenericTab) {
        stages = (stagesData[activeTab] || []).filter(s => s.charityId === c.id);
        if (stages.length > 0 && (stages[0] as any).serviceId) {
          serviceId = (stages[0] as any).serviceId;
        }
      } else {
        const svc = (allServices || []).find(s => s.name === genericSvcName && s.charityId === c.id);
        if (svc) {
          stages = svc.stages;
          serviceId = svc.id;
        }
      }
      return { charity: c, stages, serviceId };
    }).filter(r => r.stages.length > 0 || r.serviceId !== "");
  }, [charities, stagesData, allServices, activeTab, isGenericTab, genericSvcName]);

  const deptKey = ["STRATEGY","GOVERNANCE","FINANCE"].includes(activeTab) ? activeTab : "PROGRAMS";
  const dotColorClass = deptColors[deptKey] ? deptColors[deptKey].replace("text-", "bg-") : "bg-primary";

  // --- Interaction States ---
  const [hoverData, setHoverData] = useState<{ x: number, y: number, position: 'top' | 'bottom', items: any[] } | null>(null);
  
  // Edit Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    charityId: string;
    charityName: string;
    serviceId: string;
    weekStart: Date;
    weekEnd: Date;
    stages: Stage[];
    selectedStageIds: string[];
    selectedStepIds: string[];
  } | null>(null);

  const [unifyTargetIds, setUnifyTargetIds] = useState<string[]>([]);

  // View Modal State
  const [viewModalData, setViewModalData] = useState<{
    charityName: string;
    weekStart: Date;
    weekEnd: Date;
    items: any[];
  } | null>(null);

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<'stage'|'step'|null>(null);
  const [editingName, setEditingName] = useState("");
  
  const [addingToStageId, setAddingToStageId] = useState<string | null>(null);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newName, setNewName] = useState("");

  const openModal = (row: any, week: typeof weeks[0], overlappingItems?: any[]) => {
    if (!isEditMode) {
      if (overlappingItems && overlappingItems.length > 0) {
        setViewModalData({
          charityName: row.charity.name,
          weekStart: week.start,
          weekEnd: week.end,
          items: overlappingItems
        });
      }
      return;
    }
    
    // Find what overlaps this week
    const overlapsStg = new Set<string>();
    const overlapsStp = new Set<string>();

    row.stages.forEach((stg: Stage) => {
      const stgStart = stg.startDate ? new Date(stg.startDate) : null;
      const stgEnd = stg.endDate ? new Date(stg.endDate) : null;
      if (stgStart && stgEnd && isOverlap(stgStart, stgEnd, week.start, week.end)) {
        overlapsStg.add(stg.id);
      }
      if (stg.steps) {
        stg.steps.forEach(stp => {
          const stpStart = stp.startDate ? new Date(stp.startDate) : null;
          const stpEnd = stp.endDate ? new Date(stp.endDate) : null;
          if (stpStart && stpEnd && isOverlap(stpStart, stpEnd, week.start, week.end)) {
            overlapsStp.add(stp.id);
          }
        });
      }
    });

    setModalState({
      isOpen: true,
      charityId: row.charity.id,
      charityName: row.charity.name,
      serviceId: row.serviceId,
      weekStart: week.start,
      weekEnd: week.end,
      stages: row.stages,
      selectedStageIds: Array.from(overlapsStg),
      selectedStepIds: Array.from(overlapsStp)
    });
    setUnifyTargetIds([]);
  };

  const handleSaveModal = () => {
    if (!modalState) return;
    startTransition(async () => {
      try {
        await assignGanttDates(
          modalState.serviceId,
          modalState.weekStart,
          modalState.weekEnd,
          modalState.selectedStageIds,
          modalState.selectedStepIds
        );
        
        if (unifyTargetIds.length > 0) {
          const timelineType = isGenericTab ? 'CUSTOM' : activeTab;
          await broadcastGanttWeek(
            modalState.charityId, 
            timelineType, 
            modalState.serviceId, 
            unifyTargetIds,
            modalState.weekStart,
            modalState.weekEnd,
            modalState.selectedStageIds,
            modalState.selectedStepIds
          );
        }
        
        setModalState(null);
        setUnifyTargetIds([]);
        router.refresh();
      } catch(e) {
        console.error(e);
        alert("حدث خطأ أثناء الحفظ");
      }
    });
  };

  const toggleItemCompletion = (type: 'stage'|'step', id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!canEdit) return;
    const isDone = e.target.checked;
    
    // Optimistic UI update
    if (modalState) {
      setModalState({
        ...modalState,
        stages: modalState.stages.map(stg => {
          if (type === 'stage' && stg.id === id) return { ...stg, isDone };
          if (type === 'step' && stg.steps) {
            return {
              ...stg,
              steps: stg.steps.map(stp => stp.id === id ? { ...stp, isDone } : stp)
            };
          }
          return stg;
        })
      });
    }

    startTransition(async () => {
      await toggleGanttItemCompletion(type, id, isDone);
      router.refresh();
    });
  };

  // CRUD actions
  const handleAddStage = async () => {
    if (!newName.trim() || !modalState) return;
    const name = newName.trim();
    setNewName("");
    setIsAddingStage(false);
    startTransition(async () => {
      const stage = await addServiceStage(modalState.serviceId, name);
      if (modalState) setModalState({ ...modalState, stages: [...modalState.stages, { ...stage, steps: [] }] as any });
      router.refresh();
    });
  };

  const handleEditItem = async (id: string, type: 'stage'|'step') => {
    if (!editingName.trim() || !modalState) return;
    const name = editingName.trim();
    setEditingItemId(null);
    startTransition(async () => {
      if (type === 'stage') {
        await updateServiceStage(id, name, null, null, null);
        if (modalState) setModalState({ ...modalState, stages: modalState.stages.map(s => s.id === id ? { ...s, name } : s) });
      } else {
        await updateServiceStageStep(id, { name });
        if (modalState) setModalState({ ...modalState, stages: modalState.stages.map(s => ({ ...s, steps: s.steps?.map(stp => stp.id === id ? { ...stp, name } : stp) })) });
      }
      router.refresh();
    });
  };

  const handleDeleteItem = async (id: string, type: 'stage'|'step') => {
    if (!confirm("هل أنت متأكد من الحذف؟") || !modalState) return;
    startTransition(async () => {
      if (type === 'stage') {
        await deleteServiceStage(id);
        if (modalState) setModalState({ ...modalState, stages: modalState.stages.filter(s => s.id !== id), selectedStageIds: modalState.selectedStageIds.filter(sid => sid !== id) });
      } else {
        await deleteServiceStageStep(id);
        if (modalState) setModalState({ ...modalState, stages: modalState.stages.map(s => ({ ...s, steps: s.steps?.filter(stp => stp.id !== id) })), selectedStepIds: modalState.selectedStepIds.filter(sid => sid !== id) });
      }
      router.refresh();
    });
  };

  const handleAddStep = async (stageId: string) => {
    if (!newName.trim() || !modalState) return;
    const name = newName.trim();
    setNewName("");
    setAddingToStageId(null);
    startTransition(async () => {
      const step = await addServiceStageStep(stageId, name);
      if (modalState) setModalState({ ...modalState, stages: modalState.stages.map(s => s.id === stageId ? { ...s, steps: [...(s.steps||[]), step] } : s) as any });
      router.refresh();
    });
  };

  // --- Print View ---
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 md:p-4 bg-slate-950/80 backdrop-blur-sm print:p-0 print:bg-white print:block" dir="rtl">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-title { display: block !important; }
          @page { size: A4 landscape; margin: 1cm; }
        }
        .print-title { display: none; }
      `}} />
      
      <div className="print-container bg-white dark:bg-slate-900 md:rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full h-full md:h-auto md:max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 no-print">
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">مخطط غانت — {activeLabel}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              يتم العرض بنظام الأسابيع. انقر على التعديل لإضافة نقاط إلى أي أسبوع.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl ml-2">
              <button 
                onClick={() => setDisplayMode('dots')} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${displayMode === 'dots' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                النقاط
              </button>
              <button 
                onClick={() => setDisplayMode('text')} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${displayMode === 'text' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                النص
              </button>
            </div>
            {canEdit && (
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isEditMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                <Edit className="w-4 h-4" />
                {isEditMode ? "إغلاق التعديل" : "تعديل الخطة"}
              </button>
            )}
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors">
              <Printer className="w-4 h-4" />
              طباعة
            </button>
            <button onClick={onClose} className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="print-title px-5 py-4 font-black text-2xl text-center border-b">
          مخطط تنفيذ {activeLabel}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-2 md:p-6 print:p-0">
          <div className="min-w-max border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden print:border-none print:w-full">
            <table className="w-full text-right text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="p-3 border-b border-l border-slate-200 dark:border-slate-700 w-48 sticky right-0 bg-slate-50 dark:bg-slate-900 z-10 print:static print:bg-white text-slate-700 dark:text-slate-300">
                    الجمعية
                  </th>
                  {weeks.map((w, i) => (
                    <th key={i} className={`p-3 border-b border-l border-slate-200 dark:border-slate-700 min-w-[100px] text-center ${w.isCurrent ? 'bg-primary/5 text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                      <div className="font-bold text-xs">{w.label}</div>
                      <div className="text-[10px] font-normal mt-1 opacity-70">
                        {formatDate(w.start)} - {formatDate(w.end)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.charity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200 border-b border-l border-slate-200 dark:border-slate-700 sticky right-0 bg-white dark:bg-slate-900 z-10 print:static">
                      {row.charity.name}
                    </td>
                    {weeks.map((w, i) => {
                      // Find items in this week
                      const overlappingItems: any[] = [];
                      let allDone = true;

                      row.stages.forEach(stg => {
                        const stgStart = stg.startDate ? new Date(stg.startDate) : null;
                        const stgEnd = stg.endDate ? new Date(stg.endDate) : null;
                        let stgOverlaps = false;
                        if (stgStart && stgEnd && isOverlap(stgStart, stgEnd, w.start, w.end)) {
                          stgOverlaps = true;
                          overlappingItems.push({ type: 'stage', ...stg });
                          if (!stg.isDone) allDone = false;
                        }

                        if (stg.steps) {
                          stg.steps.forEach(stp => {
                            const stpStart = stp.startDate ? new Date(stp.startDate) : null;
                            const stpEnd = stp.endDate ? new Date(stp.endDate) : null;
                            if (stpStart && stpEnd && isOverlap(stpStart, stpEnd, w.start, w.end)) {
                              overlappingItems.push({ type: 'step', stageName: stg.name, ...stp });
                              if (!stp.isDone) allDone = false;
                            }
                          });
                        }
                      });

                      const hasItems = overlappingItems.length > 0;
                      if (!hasItems) allDone = false;

                      return (
                        <td 
                          key={i} 
                          className={`p-3 border-b border-l border-slate-200 dark:border-slate-700 text-center relative ${w.isCurrent ? 'bg-primary/5' : ''} ${isEditMode || hasItems ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}`}
                          onClick={() => openModal(row, w, overlappingItems)}
                          onMouseEnter={(e) => {
                            if (hasItems && !isEditMode) {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const position = rect.top < window.innerHeight / 2 ? 'bottom' : 'top';
                              setHoverData({ 
                                x: rect.left + rect.width/2, 
                                y: position === 'top' ? rect.top : rect.bottom, 
                                position,
                                items: overlappingItems 
                              });
                            }
                          }}
                          onMouseLeave={() => setHoverData(null)}
                        >
                          <div className={`${displayMode === 'dots' ? 'flex' : 'hidden'} print:hidden justify-center items-center h-full min-h-[30px]`}>
                            {hasItems ? (
                              <div className={`w-5 h-5 rounded-full shadow-sm flex items-center justify-center text-[10px] text-white font-bold transition-all transform hover:scale-110 ${allDone ? 'bg-emerald-500' : dotColorClass}`}>
                                {allDone && <Check className="w-3 h-3" />}
                              </div>
                            ) : (
                              isEditMode && <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-slate-400"><Plus className="w-3 h-3" /></div>
                            )}
                          </div>
                          
                          <div className={`${displayMode === 'text' ? 'block' : 'hidden'} print:!block text-[9px] text-right`}>
                            {overlappingItems.map((item, idx) => (
                              <div key={idx} className="mb-1 pb-1 border-b border-slate-100 last:border-0 flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isDone ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span>{item.type === 'step' ? `${item.name} (${item.stageName})` : item.name}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoverData && (
        <div 
          className={`fixed z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 p-4 w-64 pointer-events-none transform -translate-x-1/2 animate-in fade-in zoom-in-95 duration-200 flex flex-col ${hoverData.position === 'top' ? '-translate-y-full mt-[-10px]' : 'mt-[10px]'}`}
          style={{ left: hoverData.x, top: hoverData.y }}
        >
          <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2 shrink-0">
            <Info className="w-4 h-4 text-primary" />
            محتوى النقطة
          </h4>
          <div className="space-y-4 pr-1 flex-1">
            {Object.entries(hoverData.items.reduce((acc, item) => {
              const stageName = item.type === 'stage' ? item.name : item.stageName;
              if (!acc[stageName]) acc[stageName] = { stage: null, steps: [] };
              if (item.type === 'stage') acc[stageName].stage = item;
              else acc[stageName].steps.push(item);
              return acc;
            }, {} as Record<string, { stage: any, steps: any[] }>)).slice(0, 3).map(([stageName, group]: [string, any], idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${group.stage?.isDone ? 'bg-emerald-500' : 'bg-primary'}`} />
                  {stageName}
                </div>
                {group.steps.length > 0 && (
                  <div className="pl-4 border-r-2 border-slate-200 dark:border-slate-600 mr-1 mt-1.5 space-y-1.5 pr-2">
                    {group.steps.map((stp: any, sIdx: number) => (
                      <div key={sIdx} className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${stp.isDone ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        {stp.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(hoverData.items.reduce((acc, item) => {
              const stageName = item.type === 'stage' ? item.name : item.stageName;
              if (!acc[stageName]) acc[stageName] = true;
              return acc;
            }, {} as Record<string, boolean>)).length > 3 && (
              <div className="mt-2 text-center text-[10px] font-bold text-primary bg-primary/5 rounded-lg py-2 border border-primary/10">
                انقر لعرض التفاصيل الكاملة ...
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewModalData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewModalData(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 relative">
              <button onClick={() => setViewModalData(null)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                إنجازات الأسبوع
              </h3>
              <p className="text-xs font-bold text-primary mt-1">{formatDate(viewModalData.weekStart)} - {formatDate(viewModalData.weekEnd)}</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-bold bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                جمعية: {viewModalData.charityName}
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-6 relative before:absolute before:inset-0 before:mr-3.5 md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                {Object.entries(viewModalData.items.reduce((acc, item) => {
                  const stageName = item.type === 'stage' ? item.name : item.stageName;
                  if (!acc[stageName]) acc[stageName] = { stage: null, steps: [] };
                  if (item.type === 'stage') acc[stageName].stage = item;
                  else acc[stageName].steps.push(item);
                  return acc;
                }, {} as Record<string, { stage: any, steps: any[] }>)).map(([stageName, group]: [string, any], idx) => (
                  <div key={idx} className="relative flex flex-col md:even:items-end group is-active z-10 pr-10 md:pr-0">
                    {/* Timeline dot */}
                    <div className="absolute right-0 top-3 md:top-3 md:left-1/2 md:right-auto md:-translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full border-4 border-white dark:border-slate-800 shadow-sm bg-white dark:bg-slate-800">
                      <div className={`w-3 h-3 rounded-full ${group.stage?.isDone ? 'bg-emerald-500' : 'bg-primary'}`} />
                    </div>
                    
                    <div className="w-full md:w-[calc(50%-2rem)] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">مرحلة</span>
                           <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{stageName}</h4>
                         </div>
                         {group.stage?.isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1">مكتملة <Check className="w-3 h-3"/></span>}
                      </div>
                      
                      {group.steps.length > 0 ? (
                        <div className="space-y-2.5">
                          {group.steps.map((stp: any, sIdx: number) => (
                            <div key={sIdx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <div className={`w-1.5 h-1.5 rounded-full ${stp.isDone ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                {stp.name}
                              </div>
                              {stp.isDone && <Check className="w-3 h-3 text-emerald-500" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">لا توجد خطوات مخصصة لهذه المرحلة في هذا الأسبوع.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
               <button onClick={() => setViewModalData(null)} className="w-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                 إغلاق
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modalState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                تعديل نقاط الأسبوع ({formatDate(modalState.weekStart)} - {formatDate(modalState.weekEnd)})
              </h3>
              <p className="text-sm text-slate-500 mt-1">جمعية: {modalState.charityName}</p>
            </div>
            
            <div className="flex-1 overflow-auto p-5 bg-slate-50 dark:bg-slate-900">
              {modalState.stages.length === 0 && !isAddingStage ? (
                <div className="text-center text-slate-500 py-8">لا توجد مراحل مسجلة لهذه الجمعية في هذا المسار.</div>
              ) : (
                <div className="space-y-4">
                  {modalState.stages.map((stg) => {
                    const isStgSelected = modalState.selectedStageIds.includes(stg.id);
                    const isEditingThisStage = editingItemId === stg.id && editingItemType === 'stage';
                    
                    return (
                      <div key={stg.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {isEditingThisStage ? (
                          <div className="flex items-center gap-2">
                            <input autoFocus type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white" placeholder="اسم المرحلة" />
                            <button onClick={() => handleEditItem(stg.id, 'stage')} className="p-1 bg-emerald-500 text-white rounded"><Check className="w-4 h-4"/></button>
                            <button onClick={() => setEditingItemId(null)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-4 h-4"/></button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between group">
                            <label className="flex items-start gap-3 cursor-pointer flex-1">
                              <div className="relative flex items-center justify-center mt-0.5">
                                <input 
                                  type="checkbox"
                                  checked={isStgSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const stepIds = stg.steps ? stg.steps.map(s => s.id) : [];
                                    if (checked) {
                                      setModalState({
                                        ...modalState, 
                                        selectedStageIds: [...modalState.selectedStageIds, stg.id],
                                        selectedStepIds: [...new Set([...modalState.selectedStepIds, ...stepIds])]
                                      });
                                    } else {
                                      setModalState({
                                        ...modalState, 
                                        selectedStageIds: modalState.selectedStageIds.filter(id => id !== stg.id),
                                        selectedStepIds: modalState.selectedStepIds.filter(id => !stepIds.includes(id))
                                      });
                                    }
                                  }}
                                  className="peer w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                />
                                <Check className="w-3.5 h-3.5 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{stg.name} (مرحلة كاملة)</div>
                                <div className="flex items-center gap-2 mt-2">
                                   <input type="checkbox" checked={!!stg.isDone} onChange={(e) => toggleItemCompletion('stage', stg.id, e)} className="cursor-pointer" />
                                   <span className="text-[10px] text-slate-500">تم إنجاز المرحلة</span>
                                </div>
                              </div>
                            </label>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItemId(stg.id); setEditingItemType('stage'); setEditingName(stg.name); }} className="p-1 text-slate-400 hover:text-primary"><Edit2 className="w-3.5 h-3.5"/></button>
                              <button onClick={() => handleDeleteItem(stg.id, 'stage')} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </div>
                        )}
                        
                        {/* Steps rendering */}
                        <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4 pl-4 space-y-3">
                          {stg.steps && stg.steps.map(stp => {
                            const isStpSelected = modalState.selectedStepIds.includes(stp.id);
                            const isEditingThisStep = editingItemId === stp.id && editingItemType === 'step';
                            return (
                              <div key={stp.id}>
                                {isEditingThisStep ? (
                                  <div className="flex items-center gap-2 mr-8">
                                    <input autoFocus type="text" value={editingName} onChange={e => setEditingName(e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs bg-white" placeholder="اسم الخطوة" />
                                    <button onClick={() => handleEditItem(stp.id, 'step')} className="p-1 bg-emerald-500 text-white rounded"><Check className="w-3 h-3"/></button>
                                    <button onClick={() => setEditingItemId(null)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3"/></button>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between group pr-8">
                                    <label className="flex items-start gap-3 cursor-pointer flex-1">
                                      <div className="relative flex items-center justify-center mt-0.5">
                                        <input 
                                          type="checkbox"
                                          checked={isStpSelected}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            if (checked) {
                                              const newStepIds = [...modalState.selectedStepIds, stp.id];
                                              const allStepsInStage = stg.steps ? stg.steps.map(s => s.id) : [];
                                              const allChecked = allStepsInStage.length > 0 && allStepsInStage.every(id => newStepIds.includes(id));
                                              setModalState({
                                                ...modalState, 
                                                selectedStepIds: newStepIds,
                                                selectedStageIds: allChecked ? [...new Set([...modalState.selectedStageIds, stg.id])] : modalState.selectedStageIds
                                              });
                                            } else {
                                              setModalState({
                                                ...modalState, 
                                                selectedStepIds: modalState.selectedStepIds.filter(id => id !== stp.id),
                                                selectedStageIds: modalState.selectedStageIds.filter(id => id !== stg.id)
                                              });
                                            }
                                          }}
                                          className="peer w-4 h-4 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded bg-transparent checked:bg-amber-500 checked:border-amber-500 transition-all cursor-pointer"
                                        />
                                        <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs">{stp.name}</div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                          <input type="checkbox" checked={!!stp.isDone} onChange={(e) => toggleItemCompletion('step', stp.id, e)} className="cursor-pointer" />
                                          <span className="text-[10px] text-slate-500">تم إنجاز الخطوة</span>
                                        </div>
                                      </div>
                                    </label>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setEditingItemId(stp.id); setEditingItemType('step'); setEditingName(stp.name); }} className="p-1 text-slate-400 hover:text-primary"><Edit2 className="w-3 h-3"/></button>
                                      <button onClick={() => handleDeleteItem(stp.id, 'step')} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {addingToStageId === stg.id ? (
                            <div className="flex items-center gap-2 mr-8 mt-2">
                              <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-1 text-xs bg-white" placeholder="اسم الخطوة الجديدة" />
                              <button onClick={() => handleAddStep(stg.id)} className="p-1 bg-amber-500 text-white rounded"><Check className="w-3 h-3"/></button>
                              <button onClick={() => setAddingToStageId(null)} className="p-1 bg-slate-200 text-slate-600 rounded"><X className="w-3 h-3"/></button>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingToStageId(stg.id); setNewName(""); }} className="text-[10px] text-slate-400 hover:text-amber-500 flex items-center gap-1 mr-8 mt-2 font-bold"><Plus className="w-3 h-3"/> إضافة خطوة</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {isAddingStage ? (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                      <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 border border-slate-300 rounded px-2 py-2 text-sm bg-white" placeholder="اسم المرحلة الجديدة" />
                      <button onClick={handleAddStage} className="p-2 bg-primary text-white rounded"><Check className="w-4 h-4"/></button>
                      <button onClick={() => setIsAddingStage(false)} className="p-2 bg-slate-200 text-slate-600 rounded"><X className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <button onClick={() => { setIsAddingStage(true); setNewName(""); }} className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-100 hover:text-primary transition-colors flex items-center justify-center gap-2"><Plus className="w-4 h-4"/> إضافة مرحلة جديدة</button>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col gap-3 shrink-0">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 cursor-pointer w-fit">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={unifyTargetIds.length > 0} 
                      onChange={e => setUnifyTargetIds(e.target.checked ? charities.filter(c => c.id !== modalState.charityId).map(c => c.id) : [])} 
                      className="peer w-5 h-5 appearance-none border-2 border-slate-300 dark:border-slate-600 rounded bg-transparent checked:bg-primary checked:border-primary transition-all cursor-pointer"
                    />
                    <Check className="w-3 h-3 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  تعميم هذه التواريخ والتعديلات على الجمعيات الأخرى
                </label>
                
                {unifyTargetIds.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 max-h-32 overflow-y-auto pr-2">
                    {charities.filter(c => c.id !== modalState.charityId).map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-primary transition-colors">
                        <input 
                          type="checkbox" 
                          checked={unifyTargetIds.includes(c.id)} 
                          onChange={e => {
                            if (e.target.checked) setUnifyTargetIds([...unifyTargetIds, c.id]);
                            else setUnifyTargetIds(unifyTargetIds.filter(id => id !== c.id));
                          }} 
                          className="rounded text-primary border-slate-300 cursor-pointer"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveModal}
                  disabled={isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isPending ? "جاري الحفظ..." : "حفظ التواريخ واعتمادها"}
                </button>
                <button 
                  onClick={() => setModalState(null)}
                  className="flex-[0.5] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 py-3 rounded-xl font-bold transition-all"
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
