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
  X
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
  createdAt: Date | string;
}

interface Achievement {
  id: string;
  title: string;
  employeeId: string;
  createdById: string;
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
  
  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState(session.id);
  const [taskCharityId, setTaskCharityId] = useState("internal"); // Default to internal task
  
  const [achievementTitle, setAchievementTitle] = useState("");
  const [showDirectAchievementForm, setShowDirectAchievementForm] = useState(false);
  


  // Reassignment state
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null);
  const [reassignToEmployeeId, setReassignToEmployeeId] = useState<string>("");

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirectorOrAdmin = ["ADMIN", "EXECUTIVE_DIRECTOR", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role);


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
      createdById: t.createdById,
      assignedToId: t.assignedToId,
    })),
    ...filteredDirectAchievements.map((a) => ({
      id: a.id,
      title: a.title,
      type: "direct" as const,
      charityName: null,
      isInternal: true,
      date: new Date(a.createdAt),
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

    startTransition(async () => {
      const res = await createAchievementAction(achievementTitle.trim());

      if (res.error) {
        showNotification("error", res.error);
      } else if (res.success && res.achievement) {
        setAchievements((prev) => [res.achievement as Achievement, ...prev]);
        setAchievementTitle("");
        setShowDirectAchievementForm(false);
        showNotification("success", "تم تسجيل الإنجاز بنجاح");
      }
    });
  };



  // Handle task completion toggle
  const handleToggleCompletion = async (taskId: string, isCompleted: boolean) => {
    startTransition(async () => {
      const res = await toggleTaskCompletionAction(taskId, isCompleted);
      if (res.error) {
        showNotification("error", res.error);
      } else {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
              : t
          )
        );
        showNotification(
          "success",
          isCompleted ? "تم نقل المهمة إلى المنجزات" : "تمت إعادة المهمة لقائمة المهام"
        );
      }
    });
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

      {/* Main Grid: Add Task & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Right Sidebar: Forms Column (1/3 Width) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Add Task Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="w-2.5 h-5 bg-primary rounded-full"></span>
              إضافة مهمة جديدة
            </h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">عنوان المهمة</label>
                <textarea
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="اكتب تفاصيل المهمة هنا..."
                  rows={3}
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-medium resize-none"
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
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold cursor-pointer"
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
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold cursor-pointer"
                >
                  <option value="internal">مهام داخلية في شركة زاد</option>
                  {charities.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending || !taskTitle.trim()}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                <Plus className="w-5 h-5" />
                <span>إضافة مهمة جديدة</span>
              </button>
            </form>
          </div>

          {/* Add Direct Achievement Card (for normal employees / custom option) */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-3xl border border-emerald-500/10 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              هل أنجزت شيئاً مباشراً اليوم؟
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
              يمكنك تسجيل منجزاتك التنموية مباشرة في السجل دون الحاجة لإنشاء مهمة مسبقة لتظهر في ملفك المهني.
            </p>

            {!showDirectAchievementForm ? (
              <button
                onClick={() => setShowDirectAchievementForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-sm transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل إنجاز مباشر</span>
              </button>
            ) : (
              <form onSubmit={handleCreateAchievement} className="space-y-3">
                <input
                  type="text"
                  required
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  placeholder="مثال: تقديم ورشة الحوكمة أو صياغة عقد..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/30 text-slate-800 transition-all font-medium"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isPending || !achievementTitle.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDirectAchievementForm(false);
                      setAchievementTitle("");
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 px-3 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>


        </div>

        {/* Left Side: Tasks & Achievements Columns (2/3 Width) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
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

                          {isTask && item.charityName && (
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
      </div>

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
    </main>
  );
}
