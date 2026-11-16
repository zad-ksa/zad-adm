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

  const steps = {
    select: {
      id: true,
      order: true,
      label: true,
      approver: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
    orderBy: { order: "asc" as const },
  };

  // الأقسامُ تُقرأ محروسةً: عمودُها قد لا يكون أُنشئ بعد
  // (`prisma/sql/workflow-chain-categories.sql`)، فتُقرأ السلاسلُ بلا أقسامٍ
  // وتعمل الصفحةُ كما كانت — ولا تسقط إعداداتُ السلاسل كلُّها على هجرةٍ
  // لم تُطبَّق. وأوّلُ حفظٍ للأقسام يقول السببَ باسم الملف.
  const chains = await prisma.workflowChain
    .findMany({
      select: { id: true, name: true, isActive: true, categories: true, steps },
      orderBy: { createdAt: "asc" },
    })
    .catch(async (error) => {
      console.error("workflow-settings chains", error);
      const rows = await prisma.workflowChain.findMany({
        select: { id: true, name: true, isActive: true, steps },
        orderBy: { createdAt: "asc" },
      });
      return rows.map((c) => ({ ...c, categories: [] as string[] }));
    });

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return <WorkflowSettingsClient chains={chains as any} employees={employees as any} />;
}
