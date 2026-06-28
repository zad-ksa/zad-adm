"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Trash2,
  ArrowLeftRight,
  CheckCircle2,
  Undo,
  Building2,
  Briefcase,
  User,
  Sparkles,
  FolderPlus,
  UserPlus,
  Calendar,
  AlertCircle,
  Pencil,
  Check,
  X,
  UploadCloud,
  FileImage,
  Link as LinkIcon,
  Folder,
  Camera,
  Printer,
  ChevronDown,
  MessageSquarePlus,
  Send,
} from "lucide-react";
import {
  createTaskAction,
  deleteTaskAction,
  reassignTaskAction,
  toggleTaskCompletionAction,
  createAchievementAction,
  deleteAchievementAction,
  updateTaskTitleAction,
  updateTaskPriorityAction,
  updateTaskStatusAction,
  updateTaskCharityAction,
  addTaskUpdateAction,
  deleteTaskUpdateAction,
} from "@/app/actions/tasks";
import { Charity, Employee, Session, Task, TaskUpdate, Achievement } from "@/types";
import { ADMIN_ROLES } from "@/lib/constants";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import AchievementFormModal from "@/components/tasks/AchievementFormModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useImagePaste } from "@/hooks/useImagePaste";

export default function TasksClient({
  session,
  employees,
  charities,
  initialTasks,
  initialAchievements,
  categories: initialCategories,
}: {
  session: any;
  employees: Employee[];
  charities: Charity[];
  initialTasks: any[];
  initialAchievements: any[];
  categories: string[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const isDirectorOrAdmin = ADMIN_ROLES.includes(session.role);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(session.id);


  const [showTaskForm, setShowTaskForm] = useState(false);
  
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [tasksSortBy, setTasksSortBy] = useState<"priority" | "date">("priority");
  const [achievementsSortBy, setAchievementsSortBy] = useState<"date">("date");
  
  const [showDirectAchievementForm, setShowDirectAchievementForm] = useState(false);
  const defaultCategory = isDirectorOrAdmin ? "الاستراتيجية" : 
      (session.role === "STRATEGY" ? "الاستراتيجية" : 
       session.role === "FINANCE" ? "تنمية الموارد" : 
       session.role === "ADMINISTRATIVE_SECRETARIAT" ? "تكليف" : "الاستراتيجية");

  const [isUploadingAchievementProof, setIsUploadingAchievementProof] = useState(false);
  


  // Reassignment state
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassignToEmployeeId, setReassignToEmployeeId] = useState<string>("");

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingPriorityTaskId, setEditingPriorityTaskId] = useState<string | null>(null);
  const [editingAssigneeTaskId, setEditingAssigneeTaskId] = useState<string | null>(null);
  const [editingCharityTaskId, setEditingCharityTaskId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.inline-dropdown-container')) {
        setEditingPriorityTaskId(null);
        setEditingAssigneeTaskId(null);
        setEditingCharityTaskId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Proof upload state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const handlePastedProof = useCallback((file: File) => setProofFile(file), []);
  useImagePaste(handlePastedProof, !!completingTaskId);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'task' | 'achievement' } | null>(null);

  // Task updates state
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newUpdateText, setNewUpdateText] = useState<Record<string, string>>({});
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(message);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleAddUpdate = async (taskId: string) => {
    const content = newUpdateText[taskId]?.trim();
    if (!content) return;
    setIsSubmittingUpdate(true);
    const res = await addTaskUpdateAction(taskId, content);
    if (res.error) {
      showNotification("error", res.error);
    } else if (res.update) {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, updates: [...(t.updates || []), res.update as TaskUpdate] }
          : t
      ));
      setNewUpdateText(prev => ({ ...prev, [taskId]: "" }));
    }
    setIsSubmittingUpdate(false);
  };

  const handleDeleteUpdate = async (taskId: string, updateId: string) => {
    const res = await deleteTaskUpdateAction(updateId);
    if (res.error) {
      showNotification("error", res.error);
    } else {
      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, updates: (t.updates || []).filter(u => u.id !== updateId) }
          : t
      ));
    }
  };

  const handlePrint = () => {
    const filterLabel = visibleEmployeeId === "all"
      ? "كل الموظفين"
      : employees.find(e => e.id === visibleEmployeeId)?.name || "";

    const priorityLabel = (p: number) =>
      p === 1 ? "أولوية قصوى" : p === 2 ? "أولوية متوسطة" : "أولوية منخفضة";

    const tasksRows = filteredActiveTasks.map(t => {
      const emp = employees.find(e => e.id === t.assignedToId);
      return `<tr>
        <td>${t.title}</td>
        <td>${priorityLabel(t.priority ?? 3)}</td>
        <td>${t.isInternal ? "داخلية" : (t.charityName || "—")}</td>
        <td>${emp?.name || "—"}</td>
        <td>${t.status === "IN_PROGRESS" ? "جاري" : "لم يبدأ"}</td>
        <td>${new Date(t.createdAt).toLocaleDateString("ar-SA")}</td>
      </tr>`;
    }).join("");

    const achRows = combinedAchievements.map(a => {
      const emp = employees.find(e => e.id === a.assignedToId);
      return `<tr>
        <td>${a.title}</td>
        <td>${a.type === "task" ? "مهمة منجزة" : "منجز مباشر"}</td>
        <td>${a.charityName || "—"}</td>
        <td>${emp?.name || "—"}</td>
        <td>${a.date.toLocaleDateString("ar-SA")}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>تقرير المهام والمنجزات</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 24px; }
  h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
  h2 { font-size: 14px; font-weight: bold; margin: 20px 0 8px; border-right: 4px solid #0f766e; padding-right: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f1f5f9; text-align: right; padding: 6px 10px; font-size: 11px; border: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary { display: flex; gap: 24px; margin-bottom: 20px; }
  .box { background: #f1f5f9; border-radius: 8px; padding: 10px 16px; min-width: 120px; }
  .box .num { font-size: 22px; font-weight: bold; color: #0f766e; }
  .box .lbl { font-size: 10px; color: #64748b; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>تقرير المهام والمنجزات</h1>
<div class="meta">التصفية: ${filterLabel} &nbsp;|&nbsp; تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}</div>
<div class="summary">
  <div class="box"><div class="num">${filteredActiveTasks.length}</div><div class="lbl">مهام حالية</div></div>
  <div class="box"><div class="num">${combinedAchievements.length}</div><div class="lbl">منجزات</div></div>
  <div class="box"><div class="num">${filteredActiveTasks.filter(t => t.priority === 1).length}</div><div class="lbl">أولوية قصوى</div></div>
  <div class="box"><div class="num">${filteredActiveTasks.filter(t => t.status === "IN_PROGRESS").length}</div><div class="lbl">جارية التنفيذ</div></div>
</div>

${filteredActiveTasks.length > 0 ? `
<h2>المهام الحالية (${filteredActiveTasks.length})</h2>
<table>
  <thead><tr><th>المهمة</th><th>الأولوية</th><th>الجمعية</th><th>المسؤول</th><th>الحالة</th><th>التاريخ</th></tr></thead>
  <tbody>${tasksRows}</tbody>
</table>` : ""}

${combinedAchievements.length > 0 ? `
<h2>سجل المنجزات (${combinedAchievements.length})</h2>
<table>
  <thead><tr><th>المنجز</th><th>النوع</th><th>الجمعية</th><th>المسؤول</th><th>التاريخ</th></tr></thead>
  <tbody>${achRows}</tbody>
</table>` : ""}

</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  };

  // Filter tasks & achievements based on role and selector
  const visibleEmployeeId = isDirectorOrAdmin ? selectedEmployeeId : session.id;
  
  const filteredActiveTasks = tasks.filter((t) => {
    if (visibleEmployeeId === "all") return !t.isCompleted;
    return t.assignedToId === visibleEmployeeId && !t.isCompleted;
  }).sort((a, b) => {
    if (tasksSortBy === "priority") {
      const pA = a.priority ?? 3;
      const pB = b.priority ?? 3;
      if (pA !== pB) return pA - pB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const filteredCompletedTasks = tasks.filter((t) => {
    if (visibleEmployeeId === "all") return t.isCompleted;
    return t.assignedToId === visibleEmployeeId && t.isCompleted;
  });

  const filteredDirectAchievements = achievements.filter((a) => {
    if (visibleEmployeeId === "all") return true;
    return a.employeeId === visibleEmployeeId;
  });

  // Combine completed tasks and direct achievements for the Achievements list
  const combinedAchievements = [
    ...filteredCompletedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: "task" as const,
      charityName: t.charityName,
      isInternal: t.isInternal,
      date: t.completedAt ? new Date(t.completedAt) : new Date(t.createdAt),
      proofUrl: t.proofUrl,
      createdById: t.createdById,
      assignedToId: t.assignedToId,
    })),
    ...filteredDirectAchievements.map((a) => ({
      id: a.id,
      title: a.title,
      type: "direct" as const,
      charityName: a.charityName,
      isInternal: a.isInternal,
      date: new Date(a.createdAt),
      proofUrl: a.proofUrl,
      createdById: a.createdById,
      assignedToId: a.employeeId,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Handle task title update
  const handleUpdateTaskTitle = async (taskId: string) => {
    if (!editingTaskTitle.trim()) return;

    startTransition(async () => {
      const res = await updateTaskTitleAction(taskId, editingTaskTitle.trim());
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, title: editingTaskTitle.trim() } : t))
        );
        setEditingTaskId(null);
        setEditingTaskTitle("");
        showNotification("success", "تم تعديل مسمى المهمة بنجاح");
      }
    });
  };

  const handleUpdateTaskPriority = async (taskId: string, newPriority: number) => {
    startTransition(async () => {
      const res = await updateTaskPriorityAction(taskId, newPriority);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t))
        );
        setEditingPriorityTaskId(null);
        showNotification("success", "تم تعديل الأولوية بنجاح");
      }
    });
  };

  const handleUpdateTaskCharity = async (taskId: string, charityId: string) => {
    const isInternal = charityId === "internal";
    const charityName = isInternal ? null : charities.find((c) => c.id === charityId)?.name || null;
    
    startTransition(async () => {
      const res = await updateTaskCharityAction(taskId, isInternal ? undefined : charityId, charityName, isInternal);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, charityId: isInternal ? null : charityId, charityName, isInternal } : t))
        );
        setEditingCharityTaskId(null);
        showNotification("success", "تم تعديل ارتباط المهمة بنجاح");
      }
    });
  };

  const handleUpdateTaskAssigneeInline = async (taskId: string, newAssigneeId: string) => {
    startTransition(async () => {
      const res = await reassignTaskAction(taskId, newAssigneeId);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, assignedToId: newAssigneeId } : t))
        );
        setEditingAssigneeTaskId(null);
        showNotification("success", "تم تحويل المهمة بنجاح");
      }
    });
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    // 1. Save original tasks for rollback
    const originalTasks = [...tasks];
    
    // 2. Optimistic update (instant UI change)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    // 3. Background server request
    startTransition(async () => {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (res.error) {
        setTasks(originalTasks); // Rollback on error
        showNotification("error", res.error);
      } else {
        // We don't need a success message for every click to avoid annoying the user with popups, or we can keep it subtle.
        // Let's omit the success notification since the UI update is instant and feels natural.
      }
    });
  };

  // Handle task creation
  const handleCreateTask = async (data: { title: string; assigneeId: string; charityId: string; priority: number }) => {
    if (!data.title.trim()) return;

    startTransition(async () => {
      const isInternal = data.charityId === "internal";
      const res = await createTaskAction({
        title: data.title.trim(),
        assignedToId: isDirectorOrAdmin ? data.assigneeId : session.id,
        charityId: isInternal ? undefined : data.charityId,
        isInternal,
        priority: data.priority,
      });

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.task) {
        setTasks((prev) => [res.task as Task, ...prev]);
        setShowTaskForm(false);
        showNotification("success", "تمت إضافة المهمة بنجاح");
      }
    });
  };

  // Handle direct achievement creation
  const handleCreateAchievement = async (data: { title: string; charityId: string; category: string; date: string; proofFile: File }) => {
    if (!data.title.trim()) return;

    setIsUploadingAchievementProof(true);
    try {
      let uploadedUrl = null;
      let uploadedPublicId = null;

      // Upload proof if provided
      if (data.proofFile) {
        const formData = new FormData();
        formData.append("file", data.proofFile);

        const uploadRes = await fetch("/api/tasks/upload-proof", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({}));
          throw new Error(errorData.error || "فشل رفع الشاهد");
        }

        const uploadData = await uploadRes.json();
        uploadedUrl = uploadData.url;
        uploadedPublicId = uploadData.public_id;
      }

      startTransition(async () => {
        const isInternal = data.charityId === "internal";
        const res = await createAchievementAction({
          title: data.title.trim(),
          charityId: isInternal ? undefined : data.charityId,
          isInternal,
          proofUrl: uploadedUrl || undefined,
          proofPublicId: uploadedPublicId || undefined,
          date: data.date || undefined,
          category: data.category,
        });

        if (res.error) {
          showNotification("error", res.error);
        } else if (res.success && res.achievement) {
          setAchievements((prev) => [res.achievement as Achievement, ...prev]);
          setShowDirectAchievementForm(false);
          showNotification("success", "تم تسجيل الإنجاز بنجاح");
        }
        setIsUploadingAchievementProof(false);
      });
    } catch (err: any) {
      console.error(err);
      showNotification("error", `فشل تسجيل الإنجاز: ${err.message || "حدث خطأ غير متوقع أثناء رفع الشاهد"}`);
      setIsUploadingAchievementProof(false);
    }
  };



  // Handle task completion toggle
  const handleToggleCompletion = async (taskId: string, isCompleted: boolean) => {
    if (isCompleted) {
      setCompletingTaskId(taskId);
      return;
    }

    startTransition(async () => {
      const res = await toggleTaskCompletionAction(taskId, false);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, isCompleted: false, completedAt: null, proofUrl: null, proofPublicId: null }
              : t
          )
        );
        showNotification("success", "تمت إعادة المهمة لقائمة المهام");
      }
    });
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTaskId || !proofFile) return;

    setIsUploadingProof(true);
    setProofUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", proofFile);

      const uploadRes = await fetch("/api/tasks/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || "فشل رفع الشاهد");
      }

      const { url, public_id } = await uploadRes.json();

      startTransition(async () => {
        const res = await toggleTaskCompletionAction(completingTaskId, true, url, public_id);
        if (res.error) {
          setProofUploadError(res.error);
          showNotification("error", res.error);
        } else {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === completingTaskId
                ? { ...t, isCompleted: true, completedAt: new Date().toISOString(), proofUrl: url, proofPublicId: public_id }
                : t
            )
          );
          showNotification("success", "تم نقل المهمة إلى المنجزات مع الشاهد");
          setCompletingTaskId(null);
          setProofFile(null);
          setProofUploadError(null);
        }
        setIsUploadingProof(false);
      });
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "حدث خطأ غير متوقع أثناء رفع الشاهد";
      setProofUploadError(msg);
      showNotification("error", `فشل رفع الشاهد: ${msg}`);
      setIsUploadingProof(false);
    }
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: string) => {
    setItemToDelete({ id: taskId, type: 'task' });
  };

  // Handle deleting a direct achievement
  const handleDeleteAchievement = (achievementId: string) => {
    setItemToDelete({ id: achievementId, type: 'achievement' });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    startTransition(async () => {
      if (itemToDelete.type === 'task') {
        const res = await deleteTaskAction(itemToDelete.id);
        if (res.error) {
          showNotification("error", res.error);
        } else {
          setTasks((prev) => prev.filter((t) => t.id !== itemToDelete.id));
          showNotification("success", "تم حذف المهمة بنجاح");
        }
      } else {
        const res = await deleteAchievementAction(itemToDelete.id);
        if (res.error) {
          showNotification("error", res.error);
        } else {
          setAchievements((prev) => prev.filter((a) => a.id !== itemToDelete.id));
          showNotification("success", "تم حذف المنجز بنجاح");
        }
      }
      setItemToDelete(null);
    });
  };

  // Handle reassigning a task
  const handleReassignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningTaskId || !reassignToEmployeeId) return;

    startTransition(async () => {
      const res = await reassignTaskAction(reassigningTaskId, reassignToEmployeeId);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === reassigningTaskId ? { ...t, assignedToId: reassignToEmployeeId } : t
          )
        );
        setReassigningTaskId(null);
        setReassignToEmployeeId("");
        showNotification("success", "تم إعادة إسناد المهمة بنجاح");
      }
    });
  };

  return (
    <main className="flex-1 min-w-0 py-5 relative" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-5 left-5 z-[150] bg-emerald-500 dark:bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold text-xs">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 left-5 z-[150] bg-red-500 dark:bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold text-xs">
          <AlertCircle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      <ConfirmModal
        isOpen={itemToDelete !== null}
        title={itemToDelete?.type === 'task' ? "حذف المهمة" : "حذف المنجز"}
        message={itemToDelete?.type === 'task' ? "هل أنت متأكد من رغبتك في حذف هذه المهمة نهائياً؟ لا يمكن التراجع عن هذا الإجراء." : "هل أنت متأكد من رغبتك في حذف هذا المنجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء."}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
        isPending={isPending}
      />

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary shrink-0" />
          {isDirectorOrAdmin ? "المهام والمنجزات" : "مهامي"}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Print */}
          <button
            onClick={handlePrint}
            title="طباعة"
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/30 transition-all font-bold text-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </button>

          {/* Employee Filter */}
          {isDirectorOrAdmin && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role === "ADMIN" ? "مدير النظام" :
                               emp.role === "EXECUTIVE_DIRECTOR" ? "إدارة تنفيذية" :
                               emp.role === "GENERAL_MANAGER" ? "مدير عام" :
                               emp.role === "ADMINISTRATIVE_SECRETARIAT" ? "إدارة تنفيذية" :
                               emp.role === "STRATEGY" ? "الاستراتيجية" :
                               emp.role === "FINANCE" ? "المالية" : "موظف"})
                  </option>
                ))}
                <option value="all">— كل الموظفين —</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 2/3 Tasks + 1/3 Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Active Tasks Column — takes 2 cols */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/40">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <span className="w-2 h-4 bg-amber-400 dark:bg-amber-500 rounded-full"></span>
              المهام الحالية
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{filteredActiveTasks.length}</span>
            </h3>
            <select
              value={tasksSortBy}
              onChange={(e) => setTasksSortBy(e.target.value as "priority" | "date")}
              className="text-[10px] font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-500 dark:text-slate-400 outline-none cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800"
            >
              <option value="priority">الأولوية</option>
              <option value="date">التاريخ</option>
            </select>
          </div>

          <div className="max-h-[76vh] overflow-y-auto">
            {filteredActiveTasks.map((task, index) => {
              const assignedEmp = employees.find((e) => e.id === task.assignedToId);
              const canDelete = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
              const canEdit = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
              const canAddUpdate = isDirectorOrAdmin || task.assignedToId === session.id;
              const isInProgress = task.status === "IN_PROGRESS";
              const updates = task.updates || [];

              return (
                <div
                  key={task.id}
                  className={`group transition-colors ${index > 0 ? "border-t border-slate-100 dark:border-slate-700/40" : ""} ${
                    isInProgress
                      ? "bg-amber-50/50 dark:bg-amber-900/10"
                      : ""
                  }`}
                >
                  {/* Main task row */}
                  <div className={`px-4 py-3 flex items-start gap-3 ${isInProgress ? "hover:bg-amber-50 dark:hover:bg-amber-900/20" : "hover:bg-slate-50/80 dark:hover:bg-slate-700/20"} transition-colors`}>
                    {/* Checkbox */}
                    {(session.role === "ADMIN" || task.assignedToId === session.id) && (
                      <button
                        onClick={() => handleToggleCompletion(task.id, true)}
                        title="تعليم كمنجز"
                        className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer mt-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <span className="opacity-0 group-hover:opacity-60 text-emerald-500 text-[9px] font-bold leading-none">✓</span>
                      </button>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTaskTitle}
                            onChange={(e) => setEditingTaskTitle(e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-100 font-bold"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTaskTitle(task.id);
                              if (e.key === "Escape") setEditingTaskId(null);
                            }}
                            autoFocus
                          />
                          <button type="button" onClick={() => handleUpdateTaskTitle(task.id)} disabled={isPending} className="p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded cursor-pointer"><Check className="w-3 h-3" /></button>
                          <button type="button" onClick={() => setEditingTaskId(null)} className="p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{task.title}</p>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {/* Priority */}
                        <div className="relative inline-dropdown-container">
                          <button
                            type="button"
                            onClick={() => canEdit && setEditingPriorityTaskId(editingPriorityTaskId === task.id ? null : task.id)}
                            disabled={!canEdit}
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                              task.priority === 1 ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' :
                              task.priority === 2 ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400' :
                              'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-400'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 1 ? 'bg-red-500' : task.priority === 2 ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                            {task.priority === 1 ? 'قصوى' : task.priority === 2 ? 'متوسطة' : 'منخفضة'}
                          </button>
                          {editingPriorityTaskId === task.id && (
                            <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg p-1.5 flex flex-col gap-0.5 z-50 w-28">
                              <button onClick={() => handleUpdateTaskPriority(task.id, 1)} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-red-600 flex items-center gap-1.5 cursor-pointer"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>قصوى</button>
                              <button onClick={() => handleUpdateTaskPriority(task.id, 2)} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-amber-600 flex items-center gap-1.5 cursor-pointer"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>متوسطة</button>
                              <button onClick={() => handleUpdateTaskPriority(task.id, 3)} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-slate-500 flex items-center gap-1.5 cursor-pointer"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>منخفضة</button>
                            </div>
                          )}
                        </div>

                        {/* Charity */}
                        <div className="relative inline-dropdown-container">
                          <button
                            type="button"
                            onClick={() => isDirectorOrAdmin && setEditingCharityTaskId(editingCharityTaskId === task.id ? null : task.id)}
                            disabled={!isDirectorOrAdmin}
                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                              task.isInternal ? 'text-slate-400 bg-slate-100 dark:bg-slate-700/50' : 'text-primary bg-primary/5 hover:bg-primary/10'
                            }`}
                          >
                            {task.isInternal ? <Briefcase className="w-2.5 h-2.5" /> : <Building2 className="w-2.5 h-2.5" />}
                            {task.isInternal ? "داخلية" : (task.charityName || "متعاقدة")}
                          </button>
                          {editingCharityTaskId === task.id && (
                            <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg p-1.5 flex flex-col gap-0.5 z-50 w-44 max-h-44 overflow-y-auto">
                              <button onClick={() => handleUpdateTaskCharity(task.id, "internal")} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"><Briefcase className="w-3 h-3" />داخلية</button>
                              {charities.map(c => (
                                <button key={c.id} onClick={() => handleUpdateTaskCharity(task.id, c.id)} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-primary flex items-center gap-1.5 cursor-pointer"><Building2 className="w-3 h-3" />{c.name}</button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Assignee */}
                        {isDirectorOrAdmin && assignedEmp && (
                          <div className="relative inline-dropdown-container">
                            <button
                              type="button"
                              onClick={() => setEditingAssigneeTaskId(editingAssigneeTaskId === task.id ? null : task.id)}
                              className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              <User className="w-2.5 h-2.5" />
                              {assignedEmp.name}
                            </button>
                            {editingAssigneeTaskId === task.id && (
                              <div className="absolute top-full mt-1 right-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg shadow-lg p-1.5 flex flex-col gap-0.5 z-50 w-44 max-h-44 overflow-y-auto">
                                {employees.map(e => (
                                  <button key={e.id} onClick={() => handleUpdateTaskAssigneeInline(task.id, e.id)} className="text-[10px] font-bold px-2 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5 cursor-pointer"><User className="w-3 h-3" />{e.name}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Updates count badge — click to toggle */}
                        {updates.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            <MessageSquarePlus className="w-2.5 h-2.5" />
                            {updates.length} تحديث
                          </button>
                        )}

                        {/* Date */}
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5 mr-auto">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(task.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {canAddUpdate && (
                        <button
                          type="button"
                          onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                          title="تحديثات المهمة"
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${expandedTaskId === task.id ? "text-blue-600 bg-blue-100 dark:bg-blue-900/30" : "text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleUpdateTaskStatus(task.id, task.status === "IN_PROGRESS" ? "NOT_STARTED" : "IN_PROGRESS")}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${task.status === "IN_PROGRESS" ? "text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400" : "text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"}`}
                        >
                          {task.status === "IN_PROGRESS" ? "جاري" : "ابدأ"}
                        </button>
                      )}
                      {canEdit && (
                        <button type="button" onClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.title); }} title="تعديل" className="p-1.5 text-slate-400 hover:text-primary dark:text-slate-500 dark:hover:text-primary rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {isDirectorOrAdmin && (
                        <button type="button" onClick={() => { setReassigningTaskId(task.id); setReassignToEmployeeId(task.assignedToId); }} title="نقل" className="p-1.5 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" onClick={() => handleDeleteTask(task.id)} title="حذف" className="p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Updates section — toggled by icon button */}
                  {(updates.length > 0 || canAddUpdate) && expandedTaskId === task.id && (
                    <div className="px-4 pb-3 bg-slate-50/80 dark:bg-slate-900/30 border-t border-dashed border-slate-200 dark:border-slate-700/40">
                      {/* Existing updates */}
                      {updates.length > 0 && (
                        <div className="pt-2 space-y-1.5 mb-2">
                          {updates.map((u) => {
                            const author = employees.find(e => e.id === u.authorId);
                            const canDeleteU = isDirectorOrAdmin || u.authorId === session.id;
                            return (
                              <div key={u.id} className="flex items-start gap-2 group/update">
                                <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0"></span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed">{u.content}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {author?.name || "—"} · {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                                  </p>
                                </div>
                                {canDeleteU && (
                                  <button onClick={() => handleDeleteUpdate(task.id, u.id)} className="opacity-0 group-hover/update:opacity-100 p-0.5 text-slate-300 hover:text-red-400 transition-all cursor-pointer shrink-0">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add new update */}
                      {canAddUpdate && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="أضف تحديثاً على سير المهمة..."
                            value={newUpdateText[task.id] || ""}
                            onChange={(e) => setNewUpdateText(prev => ({ ...prev, [task.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddUpdate(task.id); }}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                          />
                          <button
                            onClick={() => handleAddUpdate(task.id)}
                            disabled={isSubmittingUpdate || !newUpdateText[task.id]?.trim()}
                            className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredActiveTasks.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-xs font-medium">لا توجد مهام حالية.</p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Column — 1 col, muted style */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-slate-700/30">
            <h3 className="font-bold text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              المنجزات
              <span className="text-[9px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{combinedAchievements.length}</span>
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/20 max-h-[76vh] overflow-y-auto">
            {combinedAchievements.map((item) => {
              const assignedEmp = employees.find((e) => e.id === item.assignedToId);
              const isTask = item.type === "task";
              const canDeleteDirect = !isTask && (isDirectorOrAdmin || item.createdById === session.id);
              const canUndoTask = isTask && (session.role === "ADMIN" || item.assignedToId === session.id);

              return (
                <div key={item.id} className="px-3 py-2.5 flex items-start gap-2 group hover:bg-slate-100/60 dark:hover:bg-slate-700/20 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-500 shrink-0 mt-0.5" />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug truncate">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      {item.charityName && (
                        <span className="text-[9px] text-primary/70 dark:text-teal-500 font-medium">{item.charityName}</span>
                      )}
                      {isDirectorOrAdmin && assignedEmp && (
                        <span className="text-[9px] text-slate-400 font-medium">{assignedEmp.name}</span>
                      )}
                      <span className="text-[9px] text-slate-400 mr-auto flex items-center gap-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {item.date.toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {item.proofUrl && (
                      <a href={item.proofUrl} target="_blank" rel="noopener noreferrer" title="الشاهد" className="p-0.5 text-slate-300 hover:text-emerald-500 rounded cursor-pointer transition-colors">
                        <LinkIcon className="w-3 h-3" />
                      </a>
                    )}
                    {canUndoTask && (
                      <button onClick={() => handleToggleCompletion(item.id, false)} title="إعادة للمهام" className="p-0.5 text-slate-300 hover:text-amber-500 rounded cursor-pointer transition-colors">
                        <Undo className="w-3 h-3" />
                      </button>
                    )}
                    {canDeleteDirect && (
                      <button onClick={() => handleDeleteAchievement(item.id)} title="حذف" className="p-0.5 text-slate-300 hover:text-red-500 rounded cursor-pointer transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {combinedAchievements.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <p className="text-[10px] font-medium">لا توجد منجزات.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Task Proof Upload Modal */}
      {completingTaskId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
            onClick={() => {
              if (!isUploadingProof) {
                setCompletingTaskId(null);
                setProofFile(null);
                setProofUploadError(null);
              }
            }}
          />
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 space-y-6" dir="rtl">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                رفع شاهد المهمة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                يجب إرفاق شاهد (صورة) كإثبات على إنجاز المهمة. سيتم حفظ هذا الشاهد للتوثيق والتدقيق.
              </p>
            </div>

            <form onSubmit={handleProofSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-900/50 relative hover:border-primary/50 transition-colors">
                {proofFile ? (
                  <div className="flex flex-col items-center">
                    <FileImage className="w-8 h-8 text-primary mb-3" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{proofFile.name}</p>
                    <button 
                      type="button" 
                      onClick={() => setProofFile(null)} 
                      className="text-xs text-red-500 hover:text-red-600 mt-2 font-bold cursor-pointer"
                    >
                      إلغاء وتغيير الملف
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileImage className="w-8 h-8 mx-auto text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300">ارفع شاهد الإنجاز</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG حتى 5MB</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/95 transition-all shadow-sm">
                        <Camera className="w-4 h-4" />
                        التقاط صورة بالكاميرا
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          className="hidden"
                          disabled={isUploadingProof}
                        />
                      </label>
                      <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                        <UploadCloud className="w-4 h-4" />
                        اختر صورة من المعرض
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          className="hidden"
                          disabled={isUploadingProof}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                      <span>أو الصق صورة منسوخة</span>
                      <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-mono border border-slate-200 dark:border-slate-600">Ctrl+V</kbd>
                    </p>
                  </div>
                )}
              </div>

              {proofUploadError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{proofUploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingTaskId(null);
                    setProofFile(null);
                    setProofUploadError(null);
                  }}
                  disabled={isUploadingProof}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploadingProof || !proofFile}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isUploadingProof ? "جاري الرفع..." : "رفع وإنجاز"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Reassignment Dialog/Modal */}
      {reassigningTaskId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setReassigningTaskId(null)}
          />
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 space-y-6" dir="rtl">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">إعادة إسناد المهمة</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">اختر الموظف الجديد الذي ترغب بنقل هذه المهمة إليه:</p>
            </div>

            <form onSubmit={handleReassignTask} className="space-y-4">
              <select
                value={reassignToEmployeeId}
                onChange={(e) => setReassignToEmployeeId(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-bold cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
              >
                <option value="" disabled>اختر الموظف...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setReassigningTaskId(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending || !reassignToEmployeeId}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  حفظ ونقل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 left-8 z-40">
        <div className="relative">
          {/* Pop-up options */}
          <div 
            className={`absolute bottom-[70px] left-0 flex flex-col gap-3 transition-all duration-300 origin-bottom-left ${
              isFabOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
            }`}
          >
            <button
              onClick={() => { setShowDirectAchievementForm(true); setIsFabOpen(false); }}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 px-4 py-3 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-start gap-3 whitespace-nowrap border border-slate-100 dark:border-slate-700 font-bold w-max"
            >
              <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span>إضافة إنجاز</span>
            </button>

            <button
              onClick={() => { setShowTaskForm(true); setIsFabOpen(false); }}
              className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary px-4 py-3 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-start gap-3 whitespace-nowrap border border-slate-100 dark:border-slate-700 font-bold w-max"
            >
              <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-xl text-primary">
                <CheckSquare className="w-5 h-5" />
              </div>
              <span>إضافة مهمة</span>
            </button>
          </div>

          {/* Main FAB */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            title={isFabOpen ? "إغلاق" : "إضافة"}
            className={`bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer relative z-10 ${isFabOpen ? 'rotate-45' : ''}`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <TaskFormModal
        isOpen={showTaskForm}
        onClose={() => setShowTaskForm(false)}
        onSubmit={(data) => {
          handleCreateTask(data);
        }}
        isDirectorOrAdmin={isDirectorOrAdmin}
        employees={employees}
        charities={charities}
        currentUserId={session.id}
        isPending={isPending}
      />

      <AchievementFormModal
        isOpen={showDirectAchievementForm}
        onClose={() => setShowDirectAchievementForm(false)}
        onSubmit={(data) => {
          handleCreateAchievement(data);
        }}
        isDirectorOrAdmin={isDirectorOrAdmin}
        charities={charities}
        isUploading={isUploadingAchievementProof}
        categories={categories}
        onCategoriesChange={setCategories}
      />
    </main>
  );
}
