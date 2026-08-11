import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TasksClient from "./TasksClient";
import { getCategories } from "@/app/actions/categories";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getSession();

  // Reject access if user doesn't have manage_tasks permission
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_tasks")) {
    redirect("/main");
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

  const hasViewAllTasks = hasPermission(session.role, session.permissions || [], "view_all_tasks");

  // Fetch initial tasks and achievements
  let initialTasks = [];
  let initialAchievements = [];
  let initialPermanentTasks = [];

  if (hasViewAllTasks) {
    initialTasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: { updates: { orderBy: { createdAt: "asc" } } },
    });
    initialAchievements = await prisma.achievement.findMany({
      orderBy: { createdAt: "desc" },
    });
    initialPermanentTasks = await prisma.permanentTask.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } }
      }
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
    initialPermanentTasks = await prisma.permanentTask.findMany({
      where: { assignedToId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } }
      }
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
      initialPermanentTasks={initialPermanentTasks as any}
      categories={categories}
    />
  );
}
