"use client";

import { useState, useEffect } from "react";
import { X, CheckSquare, AlignLeft, Repeat, User } from "lucide-react";
import { Employee } from "@/types";

interface PermanentTaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; recurrenceRate: string; assignedToId: string }) => void;
  employees: Employee[];
  isPending: boolean;
  initialData?: { id: string; title: string; description: string | null; recurrenceRate: string; assignedToId: string } | null;
}

export default function PermanentTaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  employees,
  isPending,
  initialData,
}: PermanentTaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceRate, setRecurrenceRate] = useState("");
  const [assignedToId, setAssignedToId] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description || "");
        setRecurrenceRate(initialData.recurrenceRate);
        setAssignedToId(initialData.assignedToId);
      } else {
        setTitle("");
        setDescription("");
        setRecurrenceRate("");
        setAssignedToId("");
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description, recurrenceRate, assignedToId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 w-full max-w-lg overflow-hidden relative z-10 shadow-2xl p-6" dir="rtl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-700/50 pb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            {initialData ? "تعديل المهمة الدائمة" : "إضافة مهمة دائمة"}
          </h2>
          <button onClick={onClose} disabled={isPending} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">اسم المهمة</label>
            <div className="relative">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                placeholder="أدخل اسم المهمة الدائمة..."
              />
              <CheckSquare className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">الوصف</label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-100 resize-none"
                placeholder="أضف وصفاً تفصيلياً للمهمة (اختياري)..."
              />
              <AlignLeft className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">معدل التكرار</label>
            <div className="relative">
              <input
                type="text"
                required
                value={recurrenceRate}
                onChange={(e) => setRecurrenceRate(e.target.value)}
                disabled={isPending}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-100"
                placeholder="مثال: يومياً، أسبوعياً، كل يوم أحد..."
              />
              <Repeat className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">الموظف المسؤول</label>
            <div className="relative">
              <select
                required
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                disabled={isPending}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-slate-100 appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-slate-800 [&>option]:dark:bg-slate-800 [&>option]:dark:text-slate-200"
              >
                <option value="" disabled>اختر الموظف...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700/50 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending || !title || !recurrenceRate || !assignedToId}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 text-sm cursor-pointer"
            >
              {isPending ? "جاري الحفظ..." : "حفظ المهمة الدائمة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
