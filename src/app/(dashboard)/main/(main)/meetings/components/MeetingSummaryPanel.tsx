"use client";

import { useState, useTransition } from "react";
import {
  ChevronDown, ChevronRight, RefreshCw, AlertCircle, Loader2, BookOpen,
  ClipboardList, Edit2, Check, X, User, Clock, UserPlus, Plus
} from "lucide-react";
import {
  updateMeeting, upsertMeetingTasks, insertAiTasksIfEmpty,
  getTasksForMeeting, toggleMeetingTask
} from "@/app/actions/meetings";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { Meeting, MeetingTask, Employee } from "../MeetingsClient";

type Props = {
  meeting: Meeting;
  isTier1: boolean;
  employees: Employee[];
};

export default function MeetingSummaryPanel({
  meeting, isTier1, employees,
}: Props) {
  const roleLabels = useRoleLabels();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localTasks, setLocalTasks] = useState<MeetingTask[]>(meeting.meetingTasks);
  const [editing, setEditing] = useState(false);
  const [editTasks, setEditTasks] = useState<(Omit<MeetingTask, "assignedTo"> & { assignedTo: { id: string; name: string } | null })[]>([]);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  const [summary, setSummary] = useState(meeting.summary || "");
  const alreadyExtracted = meeting.summary !== null || meeting.meetingTasks.length > 0;
  const [extracted, setExtracted] = useState(alreadyExtracted);

  const unassigned = localTasks.filter(t => !t.assignedToId).length;
  const done = localTasks.filter(t => t.isDone).length;
  const total = localTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function loadSummary(force = false) {
    if (loading) return;
    if (extracted && !force) return;
    if (force && !confirm("سيتم إعادة تحليل المحضر بالذكاء الاصطناعي وتحديث الملخص. هل تريد المتابعة؟")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/meetings/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formattedContent: meeting.formattedContent }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
      
      await updateMeeting(meeting.id, { summary: data.summary || "" });
      
      if (data.tasks?.length > 0) {
        if (force) {
          const toSave = (data.tasks as { title: string }[]).map(t => ({
            id: undefined as string | undefined,
            title: t.title,
            assignedToId: null as string | null,
            dueDays: null as number | null,
            isDone: false,
          }));
          await upsertMeetingTasks(meeting.id, toSave);
        } else {
          await insertAiTasksIfEmpty(meeting.id, data.tasks as { title: string }[]);
        }
        
        const saved = await getTasksForMeeting(meeting.id);
        setLocalTasks(saved as MeetingTask[]);
      }
      setExtracted(true);
    } catch { setExtracted(true); }
    finally { setLoading(false); }
  }

  function openEdit() {
    setEditTasks(localTasks.map(t => ({ ...t })));
    setEditing(true);
  }

  function updateEditTask(i: number, field: string, val: any) {
    setEditTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const toSave = editTasks.map(t => ({
        id: t.id.startsWith("tmp_") ? undefined : t.id,
        title: t.title,
        assignedToId: t.assignedToId || null,
        dueDays: t.dueDays || null,
        isDone: t.isDone,
      }));
      await upsertMeetingTasks(meeting.id, toSave);
      
      const updated = editTasks.map(t => ({
        ...t,
        assignedTo: t.assignedToId
          ? (employees.find(e => e.id === t.assignedToId) ? { id: t.assignedToId, name: employees.find(e => e.id === t.assignedToId)!.name } : null)
          : null,
      }));
      setLocalTasks(updated);
      setEditing(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  function addEditRow() {
    setEditTasks(prev => [...prev, { id: `tmp_${Date.now()}`, title: "", assignedToId: null, assignedTo: null, dueDays: null, isDone: false }]);
  }

  async function handleToggle(task: MeetingTask) {
    if (task.id.startsWith("tmp_")) return; 
    const updated = localTasks.map(t => t.id === task.id ? { ...t, isDone: !t.isDone } : t);
    setLocalTasks(updated);
    startTransition(async () => {
      try { await toggleMeetingTask(task.id, !task.isDone); } catch {}
    });
  }

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && !extracted && !loading) loadSummary(false);
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-700/50 mt-1">
      <div className="flex items-center gap-2 pt-1 px-1">
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-primary transition-colors"
        >
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span>الملخص والمهام</span>
        </button>
        {extracted && !loading && (
          <button
            onClick={() => loadSummary(true)}
            title="إعادة تحليل المحضر بالذكاء الاصطناعي"
            className="p-0.5 text-slate-300 hover:text-primary transition-colors rounded"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}

        <div className="flex items-center gap-2 flex-1">
          {total > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 font-bold">{pct}%</span>
              </div>
              <span className="text-[10px] text-slate-400">{done}/{total}</span>
            </>
          )}
          {unassigned > 0 && !open && (
            <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
              <AlertCircle className="w-3 h-3" /> {unassigned} غير مكلفة
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-3 pb-1">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري تحليل المحضر بالذكاء الاصطناعي...</span>
            </div>
          )}

          {summary && (
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-primary dark:text-primary-foreground/80">
                <BookOpen className="w-3.5 h-3.5" /> الملخص التنفيذي
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{summary}</p>
            </div>
          )}

          {!editing ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> المهام والتوصيات
                </span>
                {isTier1 && (
                  <button onClick={openEdit} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> تعديل التكليفات
                  </button>
                )}
              </div>

              {localTasks.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic py-1">
                  {extracted ? "لا توجد مهام مسجلة" : "اضغط لتحليل المحضر"}
                </p>
              ) : (
                <div className="space-y-1">
                  {localTasks.map(task => (
                    <div key={task.id} className={`flex items-start gap-2 p-2 rounded-lg text-xs border ${task.isDone ? "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/20" : task.assignedToId ? "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700" : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20"}`}>
                      <button
                        onClick={() => isTier1 && handleToggle(task)}
                        className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${task.isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600"} ${isTier1 ? "cursor-pointer" : "cursor-default"}`}
                      >
                        {task.isDone && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold leading-snug ${task.isDone ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {task.assignedTo ? (
                            <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                              <User className="w-3 h-3" /> {task.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> غير مكلف
                            </span>
                          )}
                          {task.dueDays && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-3 h-3" /> {task.dueDays} يوم
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-primary" /> تعديل التكليفات
                </span>
                <button onClick={() => setEditing(false)} className="text-[10px] text-slate-400 hover:text-slate-600">إلغاء</button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {editTasks.map((t, i) => (
                  <div key={t.id} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2 border border-slate-100 dark:border-slate-700">
                    <div className="flex-1 space-y-1.5">
                      <input
                        value={t.title}
                        onChange={e => updateEditTask(i, "title", e.target.value)}
                        placeholder="عنوان المهمة"
                        className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <div className="flex gap-1.5">
                        <select
                           value={t.assignedToId || ""}
                           onChange={e => updateEditTask(i, "assignedToId", e.target.value || null)}
                           className="flex-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          <option value="">— المكلف —</option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({roleLabels[e.role] || e.role})</option>
                          ))}
                        </select>
                        <input
                          type="number" min="1" max="365"
                          value={t.dueDays || ""}
                          onChange={e => updateEditTask(i, "dueDays", e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="أيام"
                          className="w-20 text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                          title="عدد أيام الإنجاز"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                        <input type="checkbox" checked={t.isDone} onChange={e => updateEditTask(i, "isDone", e.target.checked)} className="accent-emerald-500" />
                        مكتملة
                      </label>
                    </div>
                    <button onClick={() => setEditTasks(prev => prev.filter((_, idx) => idx !== i))} className="mt-1 p-1 text-slate-300 hover:text-red-500 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={addEditRow} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-bold">
                <Plus className="w-3.5 h-3.5" /> إضافة مهمة
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className="w-full bg-primary hover:bg-primary/95 text-white py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                حفظ التكليفات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
