"use client";

import { useState } from "react";
import { X, Plus, UserPlus, FolderPlus } from "lucide-react";
import { Employee, Charity } from "@/types";

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; assigneeId: string; charityId: string; priority: number }) => void;
  isDirectorOrAdmin: boolean;
  employees: Employee[];
  charities: Charity[];
  currentUserId: string;
  isPending: boolean;
}

export default function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  isDirectorOrAdmin,
  employees,
  charities,
  currentUserId,
  isPending,
}: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [charityId, setCharityId] = useState("internal");
  const [priority, setPriority] = useState<number>(3);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, assigneeId, charityId, priority });
    // Don't reset state here, let the parent close the modal on success
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 md:p-8 space-y-6" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-6 bg-primary rounded-full"></span>
              إضافة مهمة جديدة
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">
              قم بإنشاء مهمة جديدة وحدد الجهة المرتبطة بها لإضافتها لقائمة المهام الجارية.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">عنوان المهمة</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="اكتب تفاصيل المهمة هنا..."
              rows={3}
              required
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 dark:text-slate-100 transition-all font-medium resize-none"
            />
          </div>

          {isDirectorOrAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                إسناد المهمة إلى الموظف
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
              <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
              الجهة التابعة لها المهمة
            </label>
            <select
              value={charityId}
              onChange={(e) => setCharityId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
            >
              <option value="internal">مهام داخلية في شركة زاد</option>
              {charities.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الأولوية</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border ${priority === 1 ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'} cursor-pointer transition-all`}>
                <input type="radio" name="priority" checked={priority === 1} onChange={() => setPriority(1)} className="hidden" />
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-sm font-bold">قصوى</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border ${priority === 2 ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'} cursor-pointer transition-all`}>
                <input type="radio" name="priority" checked={priority === 2} onChange={() => setPriority(2)} className="hidden" />
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-sm font-bold">متوسطة</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border ${priority === 3 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'} cursor-pointer transition-all`}>
                <input type="radio" name="priority" checked={priority === 3} onChange={() => setPriority(3)} className="hidden" />
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-sm font-bold">منخفضة</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              حفظ المهمة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
