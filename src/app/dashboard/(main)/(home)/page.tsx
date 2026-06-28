import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { getSession } from "@/lib/auth";

const getDashboardStats = async (session: any) => {
  const now = new Date();
  
  // بداية اليوم
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // آخر 7 أيام (أسبوع)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const isLimitedRole = session?.role === "STRATEGY" || session?.role === "FINANCE";
  const employeeFilter = isLimitedRole ? { assignedToId: session.id } : {};
  const achievementFilter = isLimitedRole ? { employeeId: session.id } : {};

  const [
    charitiesCount,
    totalTasks,
    completedTasks,
    tasksCompletedToday,
    tasksCompletedThisWeek,
    urgentTasks,
    recentAchievements,
    recentCompletedTasks,
    inProgressTasks
  ] = await Promise.all([
    prisma.charity.count(),
    prisma.task.count({ where: { ...employeeFilter } }),
    prisma.task.count({ where: { isCompleted: true, ...employeeFilter } }),
    prisma.task.count({ 
      where: { 
        isCompleted: true, 
        completedAt: { gte: startOfDay },
        ...employeeFilter
      } 
    }),
    prisma.task.count({ 
      where: { 
        isCompleted: true, 
        completedAt: { gte: last7Days },
        ...employeeFilter
      } 
    }),
    prisma.task.findMany({ 
      where: { priority: 1, isCompleted: false, ...employeeFilter }, 
      take: 5, 
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: true } 
    }),
    prisma.achievement.findMany({ 
      where: { ...achievementFilter },
      take: 5, 
      orderBy: { date: 'desc' }, 
      include: { employee: true } 
    }),
    prisma.task.findMany({
      where: { isCompleted: true, ...employeeFilter },
      take: 5,
      orderBy: { completedAt: 'desc' },
      include: { assignedTo: true }
    }),
    prisma.task.findMany({
      where: { status: "IN_PROGRESS", isCompleted: false, ...employeeFilter },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { assignedTo: true }
    })
  ]);

  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const combinedActivities = [
    ...recentAchievements.map(ach => ({
      id: `ach-${ach.id}`,
      type: 'achievement' as const,
      title: ach.title,
      charityName: ach.charityName,
      date: ach.date,
      person: ach.employee,
      originalId: ach.id
    })),
    ...recentCompletedTasks.map(task => ({
      id: `task-${task.id}`,
      type: 'task' as const,
      title: task.title,
      charityName: task.charityName,
      date: task.completedAt || task.updatedAt,
      person: task.assignedTo,
      originalId: task.id
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return {
    charitiesCount,
    totalTasks,
    completedTasks,
    tasksCompletedToday,
    tasksCompletedThisWeek,
    completionPercentage,
    urgentTasks,
    combinedActivities,
    inProgressTasks
  };
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الرئيسية | زاد التنموية",
  description: "لوحة التحكم الرئيسية لزاد التنموية",
};

export default async function MainDashboard() {
  const session = await getSession();
  const stats = await getDashboardStats(session);

  return (
    <main className="flex-1 min-w-0 py-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">نظرة عامة</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">ملخص سريع لبيانات وإنجازات الشركة</p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {/* Card 1: الجمعيات المتعاقد معها */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:border-primary/20 dark:hover:border-primary/40 hover:shadow-md transition-all duration-300">
          <div className="w-9 h-9 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center text-primary shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">الجمعيات المتعاقد معها</p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{stats.charitiesCount}</h3>
          </div>
        </div>

        {/* Card 2: الجمعيات المستهدفة */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:border-emerald-500/20 dark:hover:border-emerald-500/40 hover:shadow-md transition-all duration-300 opacity-75">
          <div className="w-9 h-9 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">الجمعيات المستهدفة</p>
            <h3 className="text-base font-bold text-slate-400 dark:text-slate-500">-</h3>
          </div>
        </div>

        {/* Card 3: المهام المنجزة خلال الأسبوع */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:border-violet-500/20 dark:hover:border-violet-500/40 hover:shadow-md transition-all duration-300">
          <div className="w-9 h-9 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">منجز هذا الأسبوع</p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{stats.tasksCompletedThisWeek}</h3>
          </div>
        </div>

        {/* Card 4: المهام المنجزة اليوم */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:border-indigo-500/20 dark:hover:border-indigo-500/40 hover:shadow-md transition-all duration-300">
          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">منجز اليوم</p>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{stats.tasksCompletedToday}</h3>
          </div>
        </div>
      </div>

      {/* نسبة الإنجاز الشاملة */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2 h-4 bg-emerald-500 rounded-full"></span>
            نسبة إنجاز المهام الإجمالية
          </h2>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.completionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.completionPercentage}%` }}></div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          تم إنجاز {stats.completedTasks} مهمة من أصل {stats.totalTasks} مهام مسجلة.
        </p>
      </div>

      {/* Three Column Section: Tasks & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Urgent Tasks Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-4 bg-rose-500 rounded-full"></span>
              أبرز المهام العاجلة
            </h2>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-bold text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1 shrink-0"
            >
              عرض الكل
              <svg className="w-3.5 h-3.5 transition-transform duration-300 transform hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            {stats.urgentTasks.map((task, idx) => (
              <div key={task.id} className={`group ${idx > 0 ? "pt-3" : ""} ${idx < stats.urgentTasks.length - 1 ? "pb-3" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="inline-block text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md">
                    عاجلة
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(task.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-300">
                  {task.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  {task.assignedTo?.avatarUrl ? (
                    <Image src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                      {task.assignedTo?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{task.assignedTo?.name || "غير محدد"}</span>
                </div>
              </div>
            ))}

            {stats.urgentTasks.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <p className="text-xs font-semibold">لا توجد مهام عاجلة حالياً.</p>
              </div>
            )}
          </div>
        </div>

        {/* In Progress Tasks Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-4 bg-amber-400 dark:bg-amber-500 rounded-full"></span>
              المهام الجاري تنفيذها
            </h2>
            <Link
              href="/dashboard/tasks"
              className="text-xs font-bold text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all duration-300 flex items-center gap-1 shrink-0"
            >
              عرض الكل
              <svg className="w-3.5 h-3.5 transition-transform duration-300 transform hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            {stats.inProgressTasks.map((task, idx) => (
              <div key={task.id} className={`group ${idx > 0 ? "pt-3" : ""} ${idx < stats.inProgressTasks.length - 1 ? "pb-3" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50">
                    جاري التنفيذ
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(task.updatedAt).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-300">
                  {task.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  {task.assignedTo?.avatarUrl ? (
                    <Image src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">
                      {task.assignedTo?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{task.assignedTo?.name || "غير محدد"}</span>
                </div>
              </div>
            ))}

            {stats.inProgressTasks.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <p className="text-xs font-semibold">لا توجد مهام جاري تنفيذها حالياً.</p>
              </div>
            )}
          </div>
        </div>

        {/* Achievements Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-4 bg-emerald-400 dark:bg-emerald-500 rounded-full"></span>
              أبرز ما تم إنجازه
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
            {stats.combinedActivities.map((activity, idx) => (
              <div key={activity.id} className={`group ${idx > 0 ? "pt-3" : ""} ${idx < stats.combinedActivities.length - 1 ? "pb-3" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {activity.type === 'achievement' ? (
                      <span className="inline-block text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-700/50">
                        إنجاز
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-700/50">
                        مهمة منجزة
                      </span>
                    )}
                    {activity.charityName && (
                      <span className="inline-block text-[10px] font-bold text-primary dark:text-primary bg-primary/5 dark:bg-primary/10 px-2 py-0.5 rounded-md">
                        {activity.charityName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(activity.date).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1.5 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-300">
                  {activity.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  {activity.person?.avatarUrl ? (
                    <Image src={activity.person.avatarUrl} alt={activity.person.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${activity.type === 'achievement' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/50' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50'}`}>
                      {activity.person?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">بواسطة: {activity.person?.name || "غير محدد"}</span>
                </div>
              </div>
            ))}

            {stats.combinedActivities.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <p className="text-xs font-semibold">لا توجد إنجازات أو مهام منجزة مسجلة مؤخراً.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
