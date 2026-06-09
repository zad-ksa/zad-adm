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
  updateTaskTitleAction
} from "@/app/actions/tasks";

interface Task {
  id: string;
  title: string;
  assignedToId: string;
  createdById: string;
  charityId: string | null;
  charityName: string | null;
  isInternal: boolean;
  isCompleted: boolean;
  completedAt: Date | string | null;
  proofUrl?: string | null;
  proofPublicId?: string | null;
  createdAt: Date | string;
}

interface Achievement {
  id: string;
  title: string;
  employeeId: string;
  createdById: string;
  charityId?: string | null;
  charityName?: string | null;
  isInternal: boolean;
  proofUrl?: string | null;
  proofPublicId?: string | null;
  createdAt: Date | string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatarUrl: string | null;
}

interface Charity {
  id: string;
  name: string;
}

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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(session.id); // Default to current user
  
  const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState(session.id);
  const [taskCharityId, setTaskCharityId] = useState("internal"); // Default to internal task
  
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

  // Proof upload state
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      });

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.task) {
        setTasks((prev) => [res.task as Task, ...prev]);
        setTaskTitle("");
        setTaskCharityId("internal");
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
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذه المهمة؟")) return;

    startTransition(async () => {
      const res = await deleteTaskAction(taskId);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        showNotification("success", "تم حذف المهمة بنجاح");
      }
    });
  };

  // Handle deleting a direct achievement
  const handleDeleteAchievement = async (achievementId: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المنجز؟")) return;

    startTransition(async () => {
      const res = await deleteAchievementAction(achievementId);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setAchievements((prev) => prev.filter((a) => a.id !== achievementId));
        showNotification("success", "تم حذف المنجز بنجاح");
      }
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
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Page Header & Employee Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-primary" />
            المهام والمنجزات
          </h1>
          <p className="text-slate-600 mt-1 font-medium">
            متابعة المهام اليومية وتسجيل المنجزات المباشرة
          </p>
        </div>

        {/* Filter Dropdown for Executive Director */}
        {isDirectorOrAdmin && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-100 rounded-2xl shadow-sm shrink-0">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              عرض مهام:
            </span>
            <select
              value={selectedEmployeeId}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setTaskAssigneeId(e.target.value === "all" ? session.id : e.target.value);
              }}
              className="text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-1 pl-6"
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
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span className="w-2.5 h-5 bg-amber-500 rounded-full"></span>
                المهام الحالية ({filteredActiveTasks.length})
              </h3>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {filteredActiveTasks.map((task) => {
                const assignedEmp = employees.find((e) => e.id === task.assignedToId);
                const canDelete = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
                const canEdit = isDirectorOrAdmin || (task.createdById === session.id && task.assignedToId === session.id);
                
                return (
                  <div 
                    key={task.id} 
                    className="border border-slate-100 hover:border-primary/20 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 group relative flex flex-col justify-between gap-3 bg-slate-50/30"
                  >
                    <div className="flex items-start gap-3">
                      {/* Completion Checkbox */}
                      <button
                        onClick={() => handleToggleCompletion(task.id, true)}
                        title="تعليم كمنجز"
                        className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-emerald-500 flex items-center justify-center shrink-0 cursor-pointer mt-0.5 hover:bg-emerald-50 transition-colors"
                      >
                        <span className="opacity-0 hover:opacity-100 text-emerald-500 text-xs font-bold">✓</span>
                      </button>

                      <div className="space-y-1.5 flex-1">
                        {editingTaskId === task.id ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingTaskTitle}
                              onChange={(e) => setEditingTaskTitle(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 font-bold"
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
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer shrink-0"
                              title="حفظ"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <h4 className="font-bold text-slate-800 text-sm leading-relaxed">
                            {task.title}
                          </h4>
                        )}
                        
                        {/* Task badges / metadata */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {task.isInternal ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              <User className="w-3 h-3" />
                              {assignedEmp.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center justify-between border-t border-slate-100/60 pt-3 text-[10px] text-slate-400 font-bold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.createdAt).toLocaleDateString("ar-SA")}
                      </div>

                      <div className="flex items-center gap-2">
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
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
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
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-100 rounded-2xl">
                  <p className="text-xs font-semibold">لا توجد مهام حالية جارية.</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements Column */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <span className="w-2.5 h-5 bg-emerald-500 rounded-full"></span>
                سجل المنجزات ({combinedAchievements.length})
              </h3>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {combinedAchievements.map((item) => {
                const assignedEmp = employees.find((e) => e.id === item.assignedToId);
                const isTask = item.type === "task";
                const canDeleteDirect = !isTask && (isDirectorOrAdmin || item.createdById === session.id);
                const canUndoTask = isTask && (isDirectorOrAdmin || item.assignedToId === session.id);

                return (
                  <div 
                    key={item.id} 
                    className={`border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col justify-between gap-3 ${
                      isTask ? "bg-emerald-50/10 hover:border-emerald-500/20" : "bg-teal-50/10 hover:border-teal-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      
                      <div className="space-y-1.5 flex-1">
                        <h4 className="font-bold text-slate-800 text-sm leading-relaxed">
                          {item.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                            isTask ? "text-emerald-700 bg-emerald-50" : "text-teal-700 bg-teal-50"
                          }`}>
                            {isTask ? "مهمة منجزة" : "منجز مباشر"}
                          </span>

                          {!isTask && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              <User className="w-3 h-3" />
                              {assignedEmp.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Achievement Footer & Undo/Delete Buttons */}
                    <div className="flex items-center justify-between border-t border-slate-100/60 pt-3 text-[10px] text-slate-400 font-bold">
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
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                        )}

                        {/* Undo Task (Restore back to Active Tasks) */}
                        {canUndoTask && (
                          <button
                            onClick={() => handleToggleCompletion(item.id, false)}
                            title="إعادة المهمة لقائمة المهام الجارية"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Undo className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Direct Achievement */}
                        {canDeleteDirect && (
                          <button
                            onClick={() => handleDeleteAchievement(item.id)}
                            title="حذف المنجز"
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                <div className="text-center py-16 text-slate-400 border border-dashed border-slate-100 rounded-2xl">
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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 space-y-6" dir="rtl">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" />
                رفع شاهد المهمة
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                يجب إرفاق شاهد (صورة) كإثبات على إنجاز المهمة. سيتم حفظ هذا الشاهد للتوثيق والتدقيق.
              </p>
            </div>

            <form onSubmit={handleProofSubmit} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 relative hover:border-primary/50 transition-colors">
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
                  <p className="text-sm font-bold text-slate-800">{proofFile.name}</p>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-600">انقر أو اسحب الصورة هنا</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG حتى 5MB</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCompletingTaskId(null);
                    setProofFile(null);
                  }}
                  disabled={isUploadingProof}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all text-xs cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 space-y-6" dir="rtl">
            <div>
              <h3 className="text-lg font-bold text-slate-800">إعادة إسناد المهمة</h3>
              <p className="text-xs text-slate-500 mt-1">اختر الموظف الجديد الذي ترغب بنقل هذه المهمة إليه:</p>
            </div>

            <form onSubmit={handleReassignTask} className="space-y-4">
              <select
                value={reassignToEmployeeId}
                onChange={(e) => setReassignToEmployeeId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold cursor-pointer"
              >
                <option value="" disabled>اختر الموظف...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassigningTaskId(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all text-xs cursor-pointer"
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
      <div className="fixed bottom-8 left-8 z-40 flex flex-col gap-4">
        <button
          onClick={() => setShowDirectAchievementForm(true)}
          title="تسجيل إنجاز مباشر"
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-12 h-12 rounded-full shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowTaskForm(true)}
          title="إضافة مهمة جديدة"
          className="bg-primary hover:bg-primary/95 text-white w-14 h-14 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modal: Add Task */}
      {showTaskForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowTaskForm(false)}
          />
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 md:p-8 space-y-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-primary rounded-full"></span>
                  إضافة مهمة جديدة
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5">
                  قم بإنشاء مهمة جديدة وحدد الجهة المرتبطة بها لإضافتها لقائمة المهام الجارية.
                </p>
              </div>
              <button
                onClick={() => setShowTaskForm(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              handleCreateTask(e);
              setShowTaskForm(false);
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عنوان المهمة</label>
                <textarea
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="اكتب تفاصيل المهمة هنا..."
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 transition-all font-medium resize-none"
                />
              </div>

              {/* Assignment Dropdown (Executive Director / Admin only) */}
              {isDirectorOrAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                    إسناد المهمة إلى الموظف
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 transition-all font-bold cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Charity / Internal Link Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                  الجهة التابعة لها المهمة
                </label>
                <select
                  value={taskCharityId}
                  onChange={(e) => setTaskCharityId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 transition-all font-bold cursor-pointer"
                >
                  <option value="internal">مهام داخلية في شركة زاد</option>
                  {charities.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaskForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending || !taskTitle.trim()}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  <Plus className="w-4 h-4" />
                  حفظ المهمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Direct Achievement */}
      {showDirectAchievementForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowDirectAchievementForm(false)}
          />
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-10 transform transition-all duration-300 scale-100 p-6 md:p-8 space-y-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-500" />
                  تسجيل إنجاز مباشر
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5">
                  سجل منجزاً عملياً مباشراً ليظهر فوراً في ملفك المهني.
                </p>
              </div>
              <button
                onClick={() => setShowDirectAchievementForm(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAchievement} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">ماذا أنجزت؟</label>
                <input
                  type="text"
                  required
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  placeholder="مثال: تقديم ورشة الحوكمة أو صياغة عقد..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 transition-all font-medium"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                  الجهة التابعة لها الإنجاز
                </label>
                <select
                  value={achievementCharityId}
                  onChange={(e) => setAchievementCharityId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 transition-all font-bold cursor-pointer"
                >
                  <option value="internal">إنجاز داخلي لشركة زاد</option>
                  {charities.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              {isDirectorOrAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-slate-400" />
                    القسم المعني
                  </label>
                  <select
                    value={achievementCategory}
                    onChange={(e) => setAchievementCategory(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 transition-all font-bold cursor-pointer"
                  >
                    <option value="الاستراتيجية">الاستراتيجية</option>
                    <option value="التقنية">التقنية</option>
                    <option value="تنمية الموارد">تنمية الموارد</option>
                    <option value="الإعلامية">الإعلامية</option>
                    <option value="تكليف">تكليف</option>
                    <option value="استقطاب">استقطاب</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  تاريخ الإنجاز (اختياري)
                </label>
                <input
                  type="date"
                  value={achievementDate}
                  onChange={(e) => setAchievementDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 transition-all font-medium cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 font-bold">في حال تركه فارغاً، سيتم اعتماد تاريخ اليوم كافتراضي.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                  شاهد الإنجاز (صورة)
                </label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 relative hover:border-emerald-500/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setAchievementProofFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploadingAchievementProof}
                  />
                  <div className="flex items-center justify-center gap-2">
                    <FileImage className={`w-5 h-5 ${achievementProofFile ? 'text-emerald-500' : 'text-slate-400'}`} />
                    {achievementProofFile ? (
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        {achievementProofFile.name}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-slate-600">ارفع صورة كشاهد للإنجاز</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDirectAchievementForm(false)}
                  disabled={isUploadingAchievementProof}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploadingAchievementProof || !achievementTitle.trim() || !achievementProofFile}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isUploadingAchievementProof ? "جاري الرفع والحفظ..." : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      حفظ الإنجاز
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
