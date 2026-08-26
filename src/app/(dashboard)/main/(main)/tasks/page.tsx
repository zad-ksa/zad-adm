import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TasksClient from "./TasksClient";
import { getCategories } from "@/app/actions/categories";
import { getTasksForEmployee } from "@/app/actions/tasks";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getSession();

  // Reject access if user doesn't have manage_tasks permission
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_tasks")) {
    redirect("/main");
  }

  // Four independent queries that used to run one after another, plus two more
  // inside getTasksForEmployee. The database is in ap-southeast-2 and the page
  // streams nothing until the last one lands, so the wait was their sum rather
  // than the slowest of them.
  //
  // The scope is the signed-in employee because that is what the view opens on,
  // even for a director: the employee picker starts at `session.id`. Loading
  // everyone's tasks up front only to filter them away in the browser was the
  // bulk of this page's payload.
  const [employees, charities, initialData, categories] = await Promise.all([
    prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    }),
    // Only the three fields the task forms and cards read. Selecting the whole
    // row cost 9 kB for 9 charities, mostly description and address text that
    // nothing here renders.
    prisma.charity.findMany({
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    }),
    getTasksForEmployee(session.id),
    getCategories(),
  ]);

  return (
    <TasksClient
      session={session}
      employees={employees}
      charities={charities}
      initialTasks={[...initialData.activeTasks, ...initialData.completedTasks]}
      initialAchievements={initialData.achievements}
      initialPermanentTasks={initialData.permanentTasks as any}
      initialArchiveHasMore={initialData.archiveHasMore}
      categories={categories}
    />
  );
}
