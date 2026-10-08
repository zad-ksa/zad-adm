"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmAction } from "@/components/console/confirmBus";
import { notify } from "@/components/console/toastBus";
import Select from "@/components/console/Select";
import {
  ChevronDown, ChevronRight, AlertCircle, User, Clock, Edit2, Trash2, Save, ListChecks, FileText,
} from "lucide-react";
import { toggleMeetingTask, updateMeetingTaskFields, deleteMeetingTask } from "@/app/actions/meetings";
import { useRoleLabels } from "@/components/RoleLabelsProvider";
import { Meeting, MeetingTask, Employee } from "../MeetingsClient";
import { btn, cx } from "@/components/console/ui";

type FlatTask = MeetingTask & { meetingId: string; meetingTitle: string; meetingDate: string | Date };

/**
 * كل مهام المحاضر غير المنجزة في المجموعة المختارة، دفعة واحدة — بدل فتح كل
 * محضر على حدة لرؤية ما تبقّى من توصياته. مهمّة هنا = نفس صفّ MeetingTask
 * الذي يراه محضرها (لا نسخة منفصلة)، فأي تعديل أو حذف هنا يظهر فوراً في ملخّص
 * ذلك المحضر، وفي قائمة "المهام" إن كانت مكلَّفة لأحد — الرابط قائم أصلاً عبر
 * Task.meetingTaskId، لا شيء يُزامَن يدوياً.
 */
export default function PendingMeetingTasksPanel({
  meetings,
  meetingNumberMap,
  employees,
  onOpenMeeting,
}: {
  meetings: Meeting[];
  meetingNumberMap: Map<string, number>;
  employees: Employee[];
  onOpenMeeting: (meeting: Meeting) => void;
}) {
  const router = useRouter();
  const roleLabels = useRoleLabels();
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; assignedToId: string; dueDays: string }>({
    title: "",
    assignedToId: "",
    dueDays: "",
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending: FlatTask[] = useMemo(() => {
    const rows: FlatTask[] = [];
    for (const m of meetings) {
      for (const t of m.meetingTasks) {
        if (t.isDone) continue;
        rows.push({ ...t, meetingId: m.id, meetingTitle: m.title, meetingDate: m.date });
      }
    }
    return rows.sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime());
  }, [meetings]);

  if (pending.length === 0) return null; // لا لوحة فارغة — لا شيء معلّق يستحق المساحة

  const unassigned = pending.filter((t) => !t.assignedToId).length;

  async function handleToggle(task: FlatTask) {
    setBusyId(task.id);
    try {
      await toggleMeetingTask(task.id, true);
      notify("ok", "أُنجزت المهمة.");
      router.refresh();
    } catch (e: any) {
      notify("error", e.message || "تعذّر التحديث");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(task: FlatTask) {
    setEditingId(task.id);
    setEditDraft({
      title: task.title,
      assignedToId: task.assignedToId || "",
      dueDays: task.dueDays ? String(task.dueDays) : "",
    });
  }

  async function saveEdit(task: FlatTask) {
    setSavingId(task.id);
    try {
      await updateMeetingTaskFields(task.id, {
        title: editDraft.title.trim() || task.title,
        assignedToId: editDraft.assignedToId || null,
        dueDays: editDraft.dueDays ? parseInt(editDraft.dueDays, 10) : null,
      });
      notify("ok", "حُفظ التعديل.");
      setEditingId(null);
      router.refresh();
    } catch (e: any) {
      notify("error", e.message || "تعذّر الحفظ");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(task: FlatTask) {
    if (
      !(await confirmAction({
        title: `حذف مهمة "${task.title}"؟`,
        message: "تُحذف من المحضر ومن قائمة المهام معاً — لا يمكن التراجع.",
        tone: "danger",
      }))
    )
      return;
    setBusyId(task.id);
    try {
      await deleteMeetingTask(task.id);
      notify("ok", "حُذفت المهمة.");
      router.refresh();
    } catch (e: any) {
      notify("error", e.message || "تعذّر الحذف");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-50/60 dark:bg-amber-900/10 text-right"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
        <ListChecks className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-caption font-semibold text-amber-800 dark:text-amber-300">توصيات سابقة لم تُنجَز بعد</span>
        <span className="text-caption font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
          {pending.length}
        </span>
        {unassigned > 0 && (
          <span className="flex items-center gap-1 text-caption text-amber-600 dark:text-amber-400 font-semibold mr-auto">
            <AlertCircle className="w-3 h-3" /> {unassigned} غير مكلّفة
          </span>
        )}
      </button>

      {open && (
        <div className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
          {pending.map((task) => (
            <div
              key={task.id}
              className={cx(
                "rounded-lg border p-2 text-caption",
                task.assignedToId
                  ? "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
                  : "bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20"
              )}
            >
              {editingId === task.id ? (
                <div className="space-y-1.5">
                  <input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="عنوان المهمة"
                    className="w-full text-caption border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <div className="flex gap-1.5">
                    <Select
                      variant="soft"
                      value={editDraft.assignedToId}
                      onSelect={(v) => setEditDraft((d) => ({ ...d, assignedToId: v }))}
                      placeholder="— المكلف —"
                      options={[
                        { value: "", label: "— بلا مكلَّف —" },
                        ...employees.map((e) => ({ value: e.id, label: e.name, hint: roleLabels[e.role] || e.role })),
                      ]}
                      className="flex-1 [&>button]:w-full [&>button]:justify-between"
                    />
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={editDraft.dueDays}
                      onChange={(e) => setEditDraft((d) => ({ ...d, dueDays: e.target.value }))}
                      placeholder="أيام"
                      title="عدد أيام الإنجاز"
                      className="w-20 text-caption border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(task)}
                      disabled={savingId === task.id || !editDraft.title.trim()}
                      className={cx(btn.primary, "h-7 px-2 text-caption")}
                    >
                      <Save className="w-3 h-3" /> حفظ
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-caption text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => handleToggle(task)}
                    disabled={busyId === task.id}
                    title="إنجاز المهمة"
                    className="mt-0.5 w-4 h-4 rounded border shrink-0 border-slate-300 dark:border-slate-600 cursor-pointer transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug text-slate-700 dark:text-slate-200">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {task.assignedTo ? (
                        <span className="flex items-center gap-1 text-caption text-primary font-semibold">
                          <User className="w-3 h-3" /> {task.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-caption text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> غير مكلف
                        </span>
                      )}
                      {task.dueDays && (
                        <span className="flex items-center gap-1 text-caption text-slate-400">
                          <Clock className="w-3 h-3" /> {task.dueDays} يوم
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const source = meetings.find((m) => m.id === task.meetingId);
                          if (source) onOpenMeeting(source);
                        }}
                        className="flex items-center gap-1 text-caption text-slate-400 hover:text-primary transition-colors truncate"
                        title="فتح المحضر الذي ورَدت فيه"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {`ZAD_M_${String(meetingNumberMap.get(task.meetingId) ?? 0).padStart(3, "0")}`} — {task.meetingTitle}
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-300 hover:text-primary transition-colors"
                      title="تعديل أو تحديد المكلَّف"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      disabled={busyId === task.id}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
