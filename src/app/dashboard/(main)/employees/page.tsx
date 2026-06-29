import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddEmployeeForm } from "@/components/AddEmployeeForm";
import { EmployeesClient } from "./EmployeesClient";
import { Users } from "lucide-react";
import { hasPermission } from "@/lib/permissions";

export default async function EmployeesPage() {
  const session = await getSession();

  // Protect route: only users with manage_employees permission
  if (!session || !hasPermission(session.role, session.permissions || [], "manage_employees")) {
    redirect("/dashboard");
  }

  const [employees, allCharities] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: { assignedCharities: { select: { charityId: true } } },
    }),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div dir="rtl">
      <EmployeesClient employees={employees as any} session={session} allCharities={allCharities} />
    </div>
  );
}
