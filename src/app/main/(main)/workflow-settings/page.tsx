import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import WorkflowSettingsClient from "./WorkflowSettingsClient";

export default async function WorkflowSettingsPage() {
  const session = await getSession();
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_workflow")) {
    redirect("/main");
  }

  const chains = await prisma.workflowChain.findMany({
    include: {
      steps: {
        include: {
          approver: { select: { id: true, name: true, role: true, avatarUrl: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return <WorkflowSettingsClient chains={chains as any} employees={employees as any} />;
}
