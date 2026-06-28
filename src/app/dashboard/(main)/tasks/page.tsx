import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TasksClient from "./TasksClient";
import { getCategories } from "@/app/actions/categories";
import { hasPermission, AUTO_ADMIN_ROLES } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getSession();

  // Reject access if user doesn't have manage_tasks permission
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_tasks")) {
    redirect("/dashboard");
  }

  // Fetch all active employees for selection (for Executive Director / Admin)
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      avatarUrl: true,
    },
    orderBy: { name: "asc" },
  });

  // Fetch all charities for task linking
  const charities = await prisma.charity.findMany({
    orderBy: { name: "asc" },
  });

  const isDirectorOrAdmin = AUTO_ADMIN_ROLES.includes(session.role);

  // Fetch initial tasks and achievements
  let initialTasks = [];
  let initialAchievements = [];

  if (isDirectorOrAdmin) {
    initialTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: { updates: { orderBy: { createdAt: "asc" } } },
    });
    initialAchievements = await prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
    });
  } else {
    initialTasks = await prisma.task.findMany({
      where: { assignedToId: session.id },
      orderBy: { createdAt: "desc" },
      include: { updates: { orderBy: { createdAt: "asc" } } },
    });
    initialAchievements = await prisma.achievement.findMany({
      where: { employeeId: session.id },
      orderBy: { createdAt: "desc" },
    });
  }

  const categories = await getCategories();

  return (
    <TasksClient
      session={session}
      employees={employees}
      charities={charities}
      initialTasks={initialTasks}
      initialAchievements={initialAchievements}
      categories={categories}
    />
  );
}
