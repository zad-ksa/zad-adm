"use client";

import { useState, useTransition } from "react";
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
  Folder
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
  updateTaskStatusAction
} from "@/app/actions/tasks";
import { Charity, Employee, Session, Task, Achievement } from "@/types";
import { ADMIN_ROLES } from "@/lib/constants";
import TaskFormModal from "@/components/tasks/TaskFormModal";
import AchievementFormModal from "@/components/tasks/AchievementFormModal";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function TasksClient({
  session,
  employees,
  charities,
  initialTasks,
  initialAchievements,
}: {
  session: any;
  employees: Employee[];
  charities: Charity[];
  initialTasks: any[];
  initialAchievements: any[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const isDirectorOrAdmin = ADMIN_ROLES.includes(session.role);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(isDirectorOrAdmin ? "all" : session.id);


  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState(session.id);
  const [taskCharityId, setTaskCharityId] = useState("internal"); // Default to internal task
  const [taskPriority, setTaskPriority] = useState<number>(3); // 1: High, 2: Medium, 3: Low
  
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [tasksSortBy, setTasksSortBy] = useState<"priority" | "date">("priority");
  const [achievementsSortBy, setAchievementsSortBy] = useState<"date">("date");
  
  const [achievementTitle, setAchievementTitle] = useState("");
  const [showDirectAchievementForm, setShowDirectAchievementForm] = useState(false);
  const defaultCategory = isDirectorOrAdmin ? "الاستراتيجية" : 
      (session.role === "STRATEGY" ? "الاستراتيجية" : 
       session.role === "FINANCE" ? "تنمية الموارد" : 
       session.role === "ADMINISTRATIVE_SECRETARIAT" ? "تكليف" : "الاستراتيجية");

  const [achievementCharityId, setAchievementCharityId] = useState("internal");
  const [achievementDate, setAchievementDate] = useState("");
  const [achievementCategory, setAchievementCategory] = useState(defaultCategory);
  const [achievementProofFile, setAchievementProofFile] = useState<File | null>(null);
  const [isUploadingAchievementProof, setIsUploadingAchievementProof] = useState(false);
  


  // Reassignment state
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassignToEmployeeId, setReassignToEmployeeId] = useState<string>("");

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingPriorityTaskId, setEditingPriorityTaskId] = useState<string | null>(null);

  // Proof upload state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'task' | 'achievement' } | null>(null);

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
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    startTransition(async () => {
      const isInternal = taskCharityId === "internal";
      const res = await createTaskAction({
        title: taskTitle.trim(),
        assignedToId: isDirectorOrAdmin ? taskAssigneeId : session.id,
        charityId: isInternal ? undefined : taskCharityId,
        isInternal,
        priority: taskPriority,
      });

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.task) {
        setTasks((prev) => [res.task as Task, ...prev]);
        setTaskTitle("");
        setTaskCharityId("internal");
        setTaskPriority(3);
        showNotification("success", "تمت إضافة المهمة بنجاح");
      }
    });
  };

  // Handle direct achievement creation
  const handleCreateAchievement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!achievementTitle.trim()) return;

    setIsUploadingAchievementProof(true);
    try {
      let uploadedUrl = null;
      let uploadedPublicId = null;

      // Upload proof if provided
      if (achievementProofFile) {
        const formData = new FormData();
        formData.append("file", achievementProofFile);

        const uploadRes = await fetch("/api/tasks/upload-proof", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("فشل رفع الشاهد");
        }

        const data = await uploadRes.json();
        uploadedUrl = data.url;
        uploadedPublicId = data.public_id;
      }

      startTransition(async () => {
        const isInternal = achievementCharityId === "internal";
        const res = await createAchievementAction({
          title: achievementTitle.trim(),
          charityId: isInternal ? undefined : achievementCharityId,
          isInternal,
          proofUrl: uploadedUrl || undefined,
          proofPublicId: uploadedPublicId || undefined,
          date: achievementDate || undefined,
          category: achievementCategory,
        });

        if (res.error) {
          showNotification("error", res.error);
        } else if (res.success && res.achievement) {
          setAchievements((prev) => [res.achievement as Achievement, ...prev]);
          setAchievementTitle("");
          setAchievementCharityId("internal");
          setAchievementDate("");
          setAchievementCategory(defaultCategory);
          setAchievementProofFile(null);
          setShowDirectAchievementForm(false);
          showNotification("success", "تم تسجيل الإنجاز بنجاح");
        }
        setIsUploadingAchievementProof(false);
      });
    } catch (err) {
      console.error(err);
      showNotification("error", "حدث خطأ أثناء تسجيل الإنجاز");
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
    try {
      const formData = new FormData();
      formData.append("file", proofFile);

      const uploadRes = await fetch("/api/tasks/upload-proof", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("فشل رفع الشاهد");
      }

      const { url, public_id } = await uploadRes.json();

      startTransition(async () => {
        const res = await toggleTaskCompletionAction(completingTaskId, true, url, public_id);
        if (res.error) {
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
        }
        setCompletingTaskId(null);
        setProofFile(null);
        setIsUploadingProof(false);
      });
    } catch (err) {
      console.error(err);
      showNotification("error", "حدث خطأ أثناء رفع الشاهد");
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
    <main className="flex-1 min-w-0 py-8 relative" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 dark:bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 dark:bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
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

      {/* Page Header & Employee Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-primary" />
            {isDirectorOrAdmin ? "المهام والمنجزات" : "مهامي"}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1 font-medium">
            متابعة المهام اليومية وتسجيل المنجزات المباشرة
          </p>
        </div>

        {/* Filter Dropdown for Executive Director */}
        {isDirectorOrAdmin && (
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-2xl shadow-sm shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              عرض مهام:
            </span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setTaskAssigneeId(e.target.value === "all" ? session.id : e.target.value);
              }}
              className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none cursor-pointer pr-1 pl-6 [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
            >
              <option value="all">كل الموظفين</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role === "ADMIN" ? "مدير النظام" : 
                             emp.role === "EXECUTIVE_DIRECTOR" ? "مدير تنفيذي" :
                             emp.role === "GENERAL_MANAGER" ? "مدير عام" :
                             emp.role === "ADMINISTRATIVE_SECRETARIAT" ? "مساعد مدير" :
                             emp.role === "STRATEGY" ? "الاستراتيجية" :
                             emp.role === "FINANCE" ? "المالية" : "موظف"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Grid: Tasks & Achievements Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Active Tasks Column */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 dark:border-slate-800/60 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <span className="w-2.5 h-5 bg-amber-400 dark:bg-amber-500 rounded-full"></span>
                المهام الحالية ({filteredActiveTasks.length})
              </h3>
              <select
                value={tasksSortBy}
                onChange={(e) => setTasksSortBy(e.target.value as "priority" | "date")}
                className="text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
              >
                <option value="priority">حسب الأولوية</option>
                <option value="date">حسب تاريخ الإضافة</option>
              </select>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {filteredActiveTasks.map((task) => {
                const assignedEmp = employees.find((e) => e.id === task.assignedToId);
                const canDelete = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
                const canEdit = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
                const isInProgress = task.status === "IN_PROGRESS";
                
                return (
                  <div 
                    key={task.id} 
                    className={`border ${isInProgress ? 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 shadow-md shadow-amber-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm shadow-slate-500/10'} hover:border-primary/20 rounded-2xl p-4 transition-all duration-300 group relative flex flex-col justify-between gap-3`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Completion Checkbox */}
                      {(session.role === "ADMIN" || task.assignedToId === session.id) && (
                        <button
                          onClick={() => handleToggleCompletion(task.id, true)}
                          title="تعليم كمنجز"
                          className="w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer mt-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                          <span className="opacity-0 hover:opacity-100 text-emerald-500 text-xs font-bold">✓</span>
                        </button>
                      )}

                      <div className="space-y-1.5 flex-1">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingTaskTitle}
                              onChange={(e) => setEditingTaskTitle(e.target.value)}
                              className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 dark:text-slate-100 font-bold"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateTaskTitle(task.id);
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskTitle(task.id)}
                              disabled={isPending}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors cursor-pointer shrink-0"
                              title="حفظ"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
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
                        
                        {/* Task badges / metadata */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                            task.priority === 1 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
                            task.priority === 2 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 
                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 1 ? 'bg-red-500' : task.priority === 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            {task.priority === 1 ? 'أولوية قصوى' : task.priority === 2 ? 'أولوية متوسطة' : 'أولوية منخفضة'}
                          </span>

                          {task.isInternal ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              <Briefcase className="w-3 h-3" />
                              مهمة داخلية
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
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

                    {/* Task Actions */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80/60 pt-3 text-[10px] text-slate-400 font-bold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.createdAt).toLocaleDateString("ar-SA")}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Toggle */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTaskStatus(task.id, task.status === "IN_PROGRESS" ? "NOT_STARTED" : "IN_PROGRESS")}
                            title={task.status === "IN_PROGRESS" ? "تغيير إلى: لم يتم التنفيذ" : "تغيير إلى: جاري التنفيذ"}
                            className={`p-1 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold ${task.status === "IN_PROGRESS" ? "text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400" : "text-slate-500 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"}`}
                          >
                            {task.status === "IN_PROGRESS" ? "جاري التنفيذ" : "لم يتم التنفيذ"}
                          </button>
                        )}

                        {/* Edit Priority */}
                        {canEdit && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setEditingPriorityTaskId(editingPriorityTaskId === task.id ? null : task.id)}
                              title="تعديل الأولوية"
                              className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                            
                            {editingPriorityTaskId === task.id && (
                              <div className="absolute top-full mt-2 left-0 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl p-2 flex flex-col gap-1 z-50 w-32">
                                <button onClick={() => handleUpdateTaskPriority(task.id, 1)} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-red-600 flex items-center gap-2 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> قصوى
                                </button>
                                <button onClick={() => handleUpdateTaskPriority(task.id, 2)} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-amber-600 flex items-center gap-2 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> متوسطة
                                </button>
                                <button onClick={() => handleUpdateTaskPriority(task.id, 3)} className="text-xs font-bold px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-right text-emerald-600 flex items-center gap-2 cursor-pointer">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> منخفضة
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Edit Title */}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditingTaskTitle(task.title);
                            }}
                            title="تعديل مسمى المهمة"
                            className="p-1 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reassign (Director/Admin only) */}
                        {isDirectorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setReassigningTaskId(task.id);
                              setReassignToEmployeeId(task.assignedToId);
                            }}
                            title="نقل المهمة لموظف آخر"
                            className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
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
              })}

              {filteredActiveTasks.length === 0 && (
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-xs font-semibold">لا توجد مهام حالية جارية.</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements Column */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 dark:border-slate-800/60 pb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <span className="w-2.5 h-5 bg-emerald-400 dark:bg-emerald-500 rounded-full"></span>
                سجل المنجزات ({combinedAchievements.length})
              </h3>
              <select
                value={achievementsSortBy}
                onChange={(e) => setAchievementsSortBy(e.target.value as "date")}
                className="text-xs font-bold bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer [&>option]:bg-white [&>option]:dark:bg-slate-800 [&>option]:text-slate-700 [&>option]:dark:text-slate-200"
              >
                <option value="date">حسب تاريخ الإنجاز</option>
              </select>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {combinedAchievements.map((item) => {
                const assignedEmp = employees.find((e) => e.id === item.assignedToId);
                const isTask = item.type === "task";
                const canDeleteDirect = !isTask && (isDirectorOrAdmin || item.createdById === session.id);
                const canUndoTask = isTask && (session.role === "ADMIN" || item.assignedToId === session.id);

                return (
                  <div 
                    key={item.id} 
                    className={`border border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between gap-3 ${
                      isTask ? "bg-emerald-50 dark:bg-emerald-900/20/10 hover:border-emerald-500/20" : "bg-teal-50/10 hover:border-teal-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" />
                              إنجاز مباشر
                            </span>
                          )}

                          {item.charityName && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
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
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80/60 pt-3 text-[10px] text-slate-400 font-bold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.date.toLocaleDateString("ar-SA")}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* View Proof URL */}
                        {item.proofUrl && (
                          <a
                            href={item.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="مشاهدة الشاهد"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                        )}

                        {/* Undo Task (Restore back to Active Tasks) */}
                        {canUndoTask && (
                          <button
                            onClick={() => handleToggleCompletion(item.id, false)}
                            title="إعادة المهمة لقائمة المهام الجارية"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <Undo className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Direct Achievement */}
                        {canDeleteDirect && (
                          <button
                            onClick={() => handleDeleteAchievement(item.id)}
                            title="حذف المنجز"
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {combinedAchievements.length === 0 && (
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-xs font-semibold">لا توجد منجزات مسجلة.</p>
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
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploadingProof}
                />
                <FileImage className={`w-8 h-8 mx-auto mb-3 ${proofFile ? 'text-primary' : 'text-slate-400'}`} />
                {proofFile ? (
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{proofFile.name}</p>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">انقر أو اسحب الصورة هنا</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG حتى 5MB</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700/50 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingTaskId(null);
                    setProofFile(null);
                  }}
                  disabled={isUploadingProof}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
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
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 hover:text-slate-700 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
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
          setTaskTitle(data.title);
          setTaskAssigneeId(data.assigneeId);
          setTaskCharityId(data.charityId);
          setTaskPriority(data.priority);
          // Small delay to allow state to update before submitting
          setTimeout(() => {
            const formEvent = { preventDefault: () => {} } as React.FormEvent;
            handleCreateTask(formEvent);
            setShowTaskForm(false);
          }, 0);
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
          setAchievementTitle(data.title);
          setAchievementCharityId(data.charityId);
          setAchievementCategory(data.category);
          setAchievementDate(data.date);
          setAchievementProofFile(data.proofFile);
          // Small delay to allow state to update before submitting
          setTimeout(() => {
            const formEvent = { preventDefault: () => {} } as React.FormEvent;
            handleCreateAchievement(formEvent);
            setShowDirectAchievementForm(false);
          }, 0);
        }}
        isDirectorOrAdmin={isDirectorOrAdmin}
        charities={charities}
        isUploading={isUploadingAchievementProof}
      />
    </main>
  );
}
