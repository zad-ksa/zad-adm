import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddEmployeeForm } from "@/components/AddEmployeeForm";
import { EmployeesClient } from "./EmployeesClient";
import { Users } from "lucide-react";

export default async function EmployeesPage() {
  const session = await getSession();

  // Protect route for ADMIN, EXECUTIVE_DIRECTOR, GENERAL_MANAGER, ADMINISTRATIVE_SECRETARIAT
  if (!session || !["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"].includes(session.role)) {
    redirect("/dashboard");
  }

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          إدارة الموظفين
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">
          إضافة موظفين جدد وإدارة صلاحياتهم
        </p>
      </div>

      {/* Add Employee Form */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">إضافة موظف جديد</h2>
        <AddEmployeeForm />
      </section>

      {/* Employees List */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">قائمة الموظفين</h2>
        <EmployeesClient employees={employees as any} session={session} />
      </section>
    </div>
  );
}
