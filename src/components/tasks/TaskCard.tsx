"use client";

import { useState } from "react";
import { Check, X, Briefcase, Building2, User, Calendar, AlertCircle, Pencil, ArrowLeftRight, Trash2 } from "lucide-react";
import { Task, Employee, Session } from "@/types";
import { TASK_STATUS, TASK_PRIORITIES } from "@/lib/constants";

interface TaskCardProps {
  task: Task;
  assignedEmp?: Employee;
  session: Session;
  isDirectorOrAdmin: boolean;
  onToggleCompletion: (id: string, completed: boolean) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onUpdatePriority: (id: string, priority: number) => void;
  onInitiateReassign: (taskId: string, currentAssigneeId: string) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export default function TaskCard({
  task,
  assignedEmp,
  session,
  isDirectorOrAdmin,
  onToggleCompletion,
  onUpdateTitle,
  onUpdateStatus,
  onUpdatePriority,
  onInitiateReassign,
  onDelete,
  isPending,
}: TaskCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(task.title);
  const [isEditingPriority, setIsEditingPriority] = useState(false);

  const canDelete = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
  const canEdit = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
  const isInProgress = task.status === TASK_STATUS.IN_PROGRESS;

  const handleSaveTitle = () => {
    if (editTitleValue.trim() && editTitleValue !== task.title) {
      onUpdateTitle(task.id, editTitleValue);
    }
    setIsEditingTitle(false);
  };

  return (
    <div 
      className={`border ${isInProgress ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-md shadow-amber-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm shadow-slate-500/10'} hover:border-primary/20 rounded-2xl p-4 transition-all duration-300 group relative flex flex-col justify-between gap-3`}
    >
      <div className="flex items-start gap-3">
        {(session.role === "ADMIN" || task.assignedToId === session.id) && (
          <button
            onClick={() => onToggleCompletion(task.id, true)}
            title="تعليم كمنجز"
            className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer mt-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <span className="opacity-0 hover:opacity-100 text-emerald-500 text-xs font-bold">✓</span>
          </button>
        )}

        <div className="space-y-1.5 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 w-full">
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 dark:text-slate-100 font-bold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                    setEditTitleValue(task.title);
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={isPending}
                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors cursor-pointer shrink-0"
                title="حفظ"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditTitleValue(task.title);
                }}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer shrink-0"
                title="إلغاء"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-relaxed">
              {task.title}
            </h4>
          )}
          
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
              task.priority === 1 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
              task.priority === 2 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 
              'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 1 ? 'bg-red-500' : task.priority === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              {task.priority === 1 ? 'أولوية عالية' : task.priority === 2 ? 'أولوية متوسطة' : 'أولوية منخفضة'}
            </span>

            {task.isInternal ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                <Briefcase className="w-3 h-3" />
                مهمة داخلية
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary dark:text-teal-400 bg-primary/5 dark:bg-teal-950/30 px-2 py-0.5 rounded border border-transparent dark:border-teal-900/20">
                <Building2 className="w-3 h-3" />
                {task.charityName || "جمعية متعاقدة"}
              </span>
            )}

            {isDirectorOrAdmin && assignedEmp && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">
                <User className="w-3 h-3" />
                {assignedEmp.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/40 pt-3 text-[10px] text-slate-400 font-bold">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {(() => {
            const days = Math.floor((Date.now() - new Date(task.createdAt).getTime()) / 86400000);
            return days === 0 ? "اليوم" : `منذ ${days} يوم`;
          })()}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, task.status === TASK_STATUS.IN_PROGRESS ? TASK_STATUS.NOT_STARTED : TASK_STATUS.IN_PROGRESS)}
              title={task.status === TASK_STATUS.IN_PROGRESS ? "تغيير إلى: لم يتم التنفيذ" : "تغيير إلى: جاري التنفيذ"}
              className={`p-1 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold ${task.status === TASK_STATUS.IN_PROGRESS ? "text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400" : "text-slate-500 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"}`}
            >
              {task.status === TASK_STATUS.IN_PROGRESS ? "جاري التنفيذ" : "لم يتم التنفيذ"}
            </button>
          )}

          {canEdit && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEditingPriority(!isEditingPriority)}
                title="تعديل الأولوية"
                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
              
              {isEditingPriority && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 w-32">
                  <button onClick={() => { onUpdatePriority(task.id, 1); setIsEditingPriority(false); }} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-red-600 flex items-center gap-2 cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> عالية
                  </button>
                  <button onClick={() => { onUpdatePriority(task.id, 2); setIsEditingPriority(false); }} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-amber-600 flex items-center gap-2 cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> متوسطة
                  </button>
                  <button onClick={() => { onUpdatePriority(task.id, 3); setIsEditingPriority(false); }} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-emerald-600 flex items-center gap-2 cursor-pointer">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> منخفضة
                  </button>
                </div>
              )}
            </div>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              title="تعديل مسمى المهمة"
              className="p-1 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {isDirectorOrAdmin && (
            <button
              type="button"
              onClick={() => onInitiateReassign(task.id, task.assignedToId)}
              title="نقل المهمة لموظف آخر"
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          )}

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              title="حذف المهمة"
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
