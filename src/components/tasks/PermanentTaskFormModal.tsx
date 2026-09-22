"use client";

import { useState, useEffect } from "react";
import Select from "@/components/console/Select";
import { CheckSquare, AlignLeft, Repeat, User } from "lucide-react";
import { Employee } from "@/types";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

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
    // كان المتصفّح يمنع الإرسال بلا مكلَّف عبر required على القائمة الأصلية.
    if (!assignedToId) return;
    onSubmit({ title, description, recurrenceRate, assignedToId });
  };

  return (
    <Dialog
title={<>{initialData ? "تعديل المهمة الوظيفية" : "إضافة مهمة وظيفية"}</>}
onClose={onClose}
busy={isPending}
>
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
                placeholder="أدخل اسم المهمة الوظيفية..."
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
              <Select
                variant="soft"
                value={assignedToId}
                onSelect={setAssignedToId}
                disabled={isPending}
                placeholder="اختر الموظف…"
                options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
                className="w-full [&>button]:w-full [&>button]:justify-between [&>button]:py-3 [&>button]:h-auto"
              />
              <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700/50 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={btn.ghost}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending || !title || !recurrenceRate || !assignedToId}
              className={btn.primary}
            >
              {isPending ? "جاري الحفظ..." : "حفظ المهمة الوظيفية"}
            </button>
          </div>
        </form>
</Dialog>
  );
}
