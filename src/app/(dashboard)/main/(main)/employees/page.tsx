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
    redirect("/main");
  }

  const [employees, allCharities, roleDefinitions, serviceRows] = await Promise.all([
    prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedCharities: { select: { charityId: true } },
        serviceAccess: { select: { serviceName: true } },
      },
    }),
    prisma.charity.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.roleDefinition.findMany({ orderBy: { createdAt: "asc" } }),
    // Distinct service names, the same identity the grant is keyed on.
    prisma.service.findMany({ select: { name: true }, distinct: ["name"], orderBy: { name: "asc" } }),
  ]);

  return (
    <div dir="rtl">
      <EmployeesClient
        employees={employees as any}
        session={session}
        allCharities={allCharities}
        roles={roleDefinitions}
        allServiceNames={serviceRows.map((r) => r.name).filter((n) => n.trim() !== "")}
      />
    </div>
  );
}
