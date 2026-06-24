"use client";

import { CheckCircle2, Sparkles, Building2, User, Calendar, Link as LinkIcon, Undo, Trash2 } from "lucide-react";
import { Achievement, Employee, Session } from "@/types";

interface AchievementCardProps {
  item: Achievement & { type?: "task" | "direct" };
  assignedEmp?: Employee;
  session: Session;
  isDirectorOrAdmin: boolean;
  onToggleCompletion: (id: string, completed: boolean) => void;
  onDeleteAchievement: (id: string) => void;
}

export default function AchievementCard({
  item,
  assignedEmp,
  session,
  isDirectorOrAdmin,
  onToggleCompletion,
  onDeleteAchievement,
}: AchievementCardProps) {
  const isTask = item.type === "task";
  const canDeleteDirect = !isTask && (isDirectorOrAdmin || item.createdById === session.id);
  const canUndoTask = isTask && (session.role === "ADMIN" || item.employeeId === session.id);

  return (
    <div 
      className={`border rounded-2xl p-4 shadow-xs transition-all duration-300 relative flex flex-col justify-between gap-3 ${
        isTask 
          ? "border-emerald-100/70 bg-emerald-50/30 hover:border-emerald-300 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:hover:border-emerald-800/60 hover:shadow-emerald-500/5" 
          : "border-teal-100/70 bg-teal-50/25 hover:border-teal-300 dark:border-teal-900/30 dark:bg-teal-950/20 dark:hover:border-teal-800/60 hover:shadow-teal-500/5"
      }`}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
        
        <div className="space-y-1.5 flex-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-relaxed">
            {item.title}
          </h4>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
              isTask ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20"
            }`}>
              {isTask ? "مهمة منجزة" : "منجز مباشر"}
            </span>

            {!isTask && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-transparent dark:border-slate-700/50">
                <Sparkles className="w-3.5 h-3.5" />
                إنجاز مباشر
              </span>
            )}

            {item.charityName && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary dark:text-teal-400 bg-primary/5 dark:bg-teal-950/30 px-2 py-0.5 rounded border border-transparent dark:border-teal-900/20">
                <Building2 className="w-3 h-3" />
                {item.charityName}
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

      {/* Achievement Footer & Undo/Delete Buttons */}
      <div className={`flex items-center justify-between border-t pt-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold ${
        isTask ? "border-emerald-100/50 dark:border-emerald-900/20" : "border-teal-100/50 dark:border-teal-900/20"
      }`}>
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(item.date).toLocaleDateString("ar-SA")}
        </div>

        <div className="flex items-center gap-2">
          {/* View Proof URL */}
          {item.proofUrl && (
            <a
              href={item.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="مشاهدة الشاهد"
              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LinkIcon className="w-4 h-4" />
            </a>
          )}

          {/* Undo Task (Restore back to Active Tasks) */}
          {canUndoTask && (
            <button
              onClick={() => onToggleCompletion(item.id, false)}
              title="إعادة المهمة لقائمة المهام الجارية"
              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Undo className="w-4 h-4" />
            </button>
          )}

          {/* Delete Direct Achievement */}
          {canDeleteDirect && (
            <button
              onClick={() => onDeleteAchievement(item.id)}
              title="حذف المنجز"
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
