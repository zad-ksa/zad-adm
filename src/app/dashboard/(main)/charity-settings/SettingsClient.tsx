"use client";

import { useState, useEffect } from "react";
import { ROLE_LABELS } from "@/lib/permissions";
import { getEmployeeNavSettings, updateEmployeeNavSettings, getAllEmployees, NavTabSetting, broadcastToCharityClients, broadcastToEmployees } from "@/app/actions/employeeSettings";
import { Loader2, Check, AlertCircle, GripVertical, Settings2, User, Users, Building2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTabRow({ item, onChange }: { item: NavTabSetting, onChange: (updated: NavTabSetting) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2"
    >
      <div {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{item.id}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <select
          value={item.section}
          onChange={(e) => onChange({ ...item, section: e.target.value as "main" | "sub" })}
          className="text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="main">تبويب رئيسي</option>
          <option value="sub">تبويب فرعي</option>
        </select>

        <select
          value={item.status}
          onChange={(e) => onChange({ ...item, status: e.target.value as any })}
          className={`text-sm rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 border ${
            item.status === "OPEN" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400" :
            item.status === "COMING_SOON" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400" :
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          }`}
        >
          <option value="OPEN">مفتوح</option>
          <option value="COMING_SOON">قريباً</option>
          <option value="HIDDEN">مخفي</option>
        </select>
      </div>
    </div>
  );
}

export default function SettingsClient() {
  const [employees, setEmployees] = useState<{id: string, name: string, role: string}[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [settings, setSettings] = useState<NavTabSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function init() {
      const emps = await getAllEmployees();
      setEmployees(emps);
      if (emps.length > 0) {
        setSelectedEmployee(emps[0].id);
      } else {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadSettings(selectedEmployee);
    }
  }, [selectedEmployee]);

  async function loadSettings(empId: string) {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await getEmployeeNavSettings(empId);
      setSettings(data);
    } catch (err) {
      setError("حدث خطأ أثناء جلب الإعدادات");
    } finally {
      setIsLoading(false);
    }
  }

  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<'charities' | 'employees' | null>(null);
  const [broadcastSelectedIds, setBroadcastSelectedIds] = useState<string[]>([]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSettings((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleItemChange = (updated: NavTabSetting) => {
    setSettings(items => items.map(i => i.id === updated.id ? updated : i));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateEmployeeNavSettings(selectedEmployee, settings);
      if (res.success) {
        setSuccess("تم حفظ الإعدادات بنجاح للموظف المحدد");
      } else {
        setError(res.error || "حدث خطأ غير معروف");
      }
    } catch (err) {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const openBroadcastModal = (target: 'charities' | 'employees') => {
    setBroadcastTarget(target);
    const targetEmployees = employees.filter(emp => target === 'charities' ? emp.role === "CHARITY_CLIENT" : emp.role !== "CHARITY_CLIENT");
    setBroadcastSelectedIds(targetEmployees.map(e => e.id));
    setBroadcastModalOpen(true);
  };

  const closeBroadcastModal = () => {
    setBroadcastModalOpen(false);
    setTimeout(() => {
      setBroadcastTarget(null);
      setBroadcastSelectedIds([]);
    }, 200);
  };

  const handleConfirmBroadcast = async () => {
    if (broadcastSelectedIds.length === 0) {
      setError("يرجى تحديد حساب واحد على الأقل للتعميم");
      closeBroadcastModal();
      return;
    }
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    closeBroadcastModal();

    try {
      const res = broadcastTarget === 'charities' 
        ? await broadcastToCharityClients(settings, broadcastSelectedIds)
        : await broadcastToEmployees(settings, broadcastSelectedIds);
        
      if (res.success) {
        setSuccess(`تم تعميم الإعدادات بنجاح لـ ${broadcastSelectedIds.length} حساب(ات)`);
      } else {
        setError(res.error || "حدث خطأ غير معروف");
      }
    } catch (err) {
      setError("حدث خطأ أثناء التعميم");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-full sm:w-72">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اختر حساب الموظف:</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 appearance-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] || emp.role})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving || !selectedEmployee}
            className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            <span>حفظ للموظف المحدد</span>
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => openBroadcastModal('charities')}
              disabled={isLoading || isSaving}
              className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold px-3 py-2 text-xs rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all flex items-center justify-center gap-1.5 flex-1 disabled:opacity-50"
              title="تعميم التبويبات الحالية لتطبيقها على جميع عملاء الجمعيات"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>تعميم للجمعيات</span>
            </button>
            <button
              onClick={() => openBroadcastModal('employees')}
              disabled={isLoading || isSaving}
              className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-2 text-xs rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all flex items-center justify-center gap-1.5 flex-1 disabled:opacity-50"
              title="تعميم التبويبات الحالية لتطبيقها على جميع موظفي زاد"
            >
              <Users className="w-3.5 h-3.5" />
              <span>تعميم للموظفين</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2 text-sm font-bold">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-2 text-sm font-bold">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : settings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
          <AlertCircle className="w-8 h-8" />
          <span>لا يوجد موظفين لعرض الإعدادات</span>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={settings.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {settings.map((item) => (
              <SortableTabRow key={item.id} item={item} onChange={handleItemChange} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Broadcast Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {broadcastTarget === 'charities' ? (
                  <><Building2 className="w-5 h-5 text-amber-500" /> تعميم الإعدادات لعملاء الجمعيات</>
                ) : (
                  <><Users className="w-5 h-5 text-emerald-500" /> تعميم الإعدادات למوظفي زاد</>
                )}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                سيتم استبدال الإعدادات الحالية للحسابات المحددة بالإعدادات الظاهرة في الشاشة.
              </p>
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                المحدد: {broadcastSelectedIds.length} من {employees.filter(emp => broadcastTarget === 'charities' ? emp.role === "CHARITY_CLIENT" : emp.role !== "CHARITY_CLIENT").length}
              </span>
              <button
                onClick={() => {
                  const targetEmployees = employees.filter(emp => broadcastTarget === 'charities' ? emp.role === "CHARITY_CLIENT" : emp.role !== "CHARITY_CLIENT");
                  if (broadcastSelectedIds.length === targetEmployees.length) {
                    setBroadcastSelectedIds([]);
                  } else {
                    setBroadcastSelectedIds(targetEmployees.map(e => e.id));
                  }
                }}
                className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {broadcastSelectedIds.length === employees.filter(emp => broadcastTarget === 'charities' ? emp.role === "CHARITY_CLIENT" : emp.role !== "CHARITY_CLIENT").length 
                  ? "إلغاء تحديد الكل" 
                  : "تحديد الكل"
                }
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {employees
                .filter(emp => broadcastTarget === 'charities' ? emp.role === "CHARITY_CLIENT" : emp.role !== "CHARITY_CLIENT")
                .map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                      checked={broadcastSelectedIds.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBroadcastSelectedIds(prev => [...prev, emp.id]);
                        } else {
                          setBroadcastSelectedIds(prev => prev.filter(id => id !== emp.id));
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{emp.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{ROLE_LABELS[emp.role as keyof typeof ROLE_LABELS] || emp.role}</span>
                    </div>
                  </label>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0 bg-white dark:bg-slate-900">
              <button
                onClick={closeBroadcastModal}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmBroadcast}
                disabled={broadcastSelectedIds.length === 0}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                تأكيد التعميم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
