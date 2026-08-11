"use client";

import { useState, useTransition } from "react";
import { X, Loader2, Save, Edit } from "lucide-react";
import { updateRoleLabels } from "@/app/actions/settings";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { useRouter } from "next/navigation";

export function RoleLabelsSettingsModal({ onClose }: { onClose: () => void }) {
  const currentLabels = useRoleLabels();
  const [labels, setLabels] = useState<Record<string, string>>(currentLabels);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateRoleLabels(labels);
        router.refresh();
        onClose();
      } catch (err) {
        alert("حدث خطأ أثناء حفظ المسميات");
      }
    });
  };

  const handleLabelChange = (key: string, value: string) => {
    setLabels(prev => ({ ...prev, [key]: value }));
  };

  const rolesToEdit = [
    { key: "EXECUTIVE_DIRECTOR", defaultLabel: "الإدارة التنفيذية" },
    { key: "GENERAL_MANAGER", defaultLabel: "المدير العام" },
    { key: "ADMINISTRATIVE_SECRETARIAT", defaultLabel: "مساعد إداري" },
    { key: "STRATEGY", defaultLabel: "الاستراتيجية" },
    { key: "FINANCE", defaultLabel: "المالية" },
    { key: "ACCOUNTANT", defaultLabel: "محاسب" },
    { key: "GOVERNANCE", defaultLabel: "الحوكمة" },
    { key: "CHARITY_CLIENT", defaultLabel: "عميل جمعية" },
    { key: "ADMIN", defaultLabel: "مدير النظام" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={() => { if (!isPending) onClose(); }}
      />
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            <span>إعدادات المسميات الوظيفية</span>
          </h3>
          <button 
            onClick={onClose} 
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            يمكنك تخصيص المسميات الوظيفية لتظهر بالشكل المناسب لمنشأتك. ستنعكس هذه التغييرات في جميع صفحات النظام على الفور.
          </p>

          <div className="space-y-3">
            {rolesToEdit.map(({ key, defaultLabel }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {key}
                </label>
                <input
                  type="text"
                  value={labels[key] || ""}
                  onChange={e => handleLabelChange(key, e.target.value)}
                  placeholder={defaultLabel}
                  disabled={isPending}
                  className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/20">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-70"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
}
