"use client";

import { useState, useEffect } from "react";
import { getCharityGlobalNavSettings, updateCharityGlobalNavSettings, NavTabSetting } from "@/app/actions/globalSettings";
import { Loader2, Check, AlertCircle, GripVertical, Settings2, Save } from "lucide-react";
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
      className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-2"
    >
      <div {...attributes} {...listeners} className="p-1.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none self-start sm:self-center">
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{item.id}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0 pr-2 pb-1 sm:pb-0 sm:pr-0">
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
    loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await getCharityGlobalNavSettings();
      setSettings(data);
    } catch (err) {
      setError("حدث خطأ أثناء جلب الإعدادات المركزية");
    } finally {
      setIsLoading(false);
    }
  }

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
      const res = await updateCharityGlobalNavSettings(settings);
      if (res.success) {
        setSuccess("تم حفظ الإعدادات المركزية وتطبيقها على جميع الجمعيات بنجاح");
      } else {
        setError(res.error || "حدث خطأ غير معروف");
      }
    } catch (err) {
      setError("حدث خطأ أثناء الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            التكوين المركزي لتبويبات الجمعيات
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            سيتم تطبيق هذه الإعدادات (الترتيب وحالة التبويب) على جميع حسابات الجمعيات.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>حفظ التعديلات للجميع</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400 font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400 font-bold">{success}</p>
        </div>
      )}

      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <span className="text-sm font-bold">جاري تحميل الإعدادات...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* التبويبات الرئيسية */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">التبويبات الرئيسية (القسم العلوي)</h3>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={settings.filter(s => s.section === "main").map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {settings.filter(s => s.section === "main").map((item) => (
                      <SortableTabRow key={item.id} item={item} onChange={handleItemChange} />
                    ))}
                    {settings.filter(s => s.section === "main").length === 0 && (
                      <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        لا يوجد تبويبات رئيسية
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* التبويبات الفرعية */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-1.5 h-4 bg-slate-400 rounded-full"></div>
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm">التبويبات الفرعية (القسم السفلي)</h3>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={settings.filter(s => s.section === "sub").map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {settings.filter(s => s.section === "sub").map((item) => (
                      <SortableTabRow key={item.id} item={item} onChange={handleItemChange} />
                    ))}
                    {settings.filter(s => s.section === "sub").length === 0 && (
                      <div className="text-center py-8 text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        لا يوجد تبويبات فرعية
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
