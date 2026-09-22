import { unstable_cache } from "next/cache";
import { StatStrip, PageHeader } from "@/components/console/layout";
import { MONO } from "@/components/console/ui";
import ActivityList from "./ActivityList";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

import { getSession } from "@/lib/auth";

const getCachedStats = unstable_cache(
  async (hasViewAllTasks: boolean, employeeId: string) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const employeeFilter = hasViewAllTasks ? {} : { assignedToId: employeeId };
    const achievementFilter = hasViewAllTasks ? {} : { employeeId };

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
  },
  ['dashboard-stats'],
  { revalidate: 60, tags: ['dashboard'] }
);

import { hasPermission } from "@/lib/permissions";

const getDashboardStats = async (session: any) => {
  const hasViewAllTasks = hasPermission(session?.role || '', session?.permissions || [], "view_all_tasks");
  return getCachedStats(hasViewAllTasks, session?.id || '');
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
        <PageHeader title="نظرة عامة" description="ملخص سريع لبيانات وإنجازات الشركة" />
      </div>

      <div className="mb-4">
        <StatStrip
          items={[
            { label: "الجمعيات المتعاقد معها", value: stats.charitiesCount, href: "/main/charities" },
            { label: "الجمعيات المستهدفة", value: "—", hint: "لم تُحدَّد بعد" },
            { label: "منجز هذا الأسبوع", value: stats.tasksCompletedThisWeek, dot: "active" },
            { label: "منجز اليوم", value: stats.tasksCompletedToday, dot: "active" },
          ]}
        />
      </div>

      {/* نسبة الإنجاز الشاملة */}
      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">نسبة إنجاز المهام الإجمالية</h2>
          <span className={`${MONO} text-[14px] font-semibold text-emerald-700 dark:text-emerald-400`}>
            {stats.completionPercentage}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={stats.completionPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="نسبة إنجاز المهام"
          className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.completionPercentage}%` }} />
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">
          تم إنجاز {stats.completedTasks} مهمة من أصل {stats.totalTasks} مهام مسجلة.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityList
          title="أبرز المهام العاجلة"
          moreHref="/main/tasks"
          empty="لا توجد مهام عاجلة حالياً."
          items={stats.urgentTasks.map((task) => ({
            id: task.id,
            title: task.title,
            date: task.createdAt,
            badge: { tone: "danger", label: "عاجلة" },
            person: task.assignedTo,
          }))}
        />

        <ActivityList
          title="المهام الجاري تنفيذها"
          moreHref="/main/tasks"
          empty="لا توجد مهام جاري تنفيذها حالياً."
          items={stats.inProgressTasks.map((task) => ({
            id: task.id,
            title: task.title,
            date: task.updatedAt,
            badge: { tone: "warn", label: "جاري التنفيذ" },
            person: task.assignedTo,
          }))}
        />

        <ActivityList
          title="أبرز ما تم إنجازه"
          empty="لا توجد إنجازات أو مهام منجزة مسجلة مؤخراً."
          items={stats.combinedActivities.map((activity) => ({
            id: activity.id,
            title: activity.title,
            date: activity.date,
            badge:
              activity.type === "achievement"
                ? { tone: "gold", label: "إنجاز" }
                : { tone: "good", label: "مهمة منجزة" },
            tag: activity.charityName || undefined,
            person: activity.person,
            personPrefix: "بواسطة: ",
          }))}
        />
      </div>
    </main>
  );
}
