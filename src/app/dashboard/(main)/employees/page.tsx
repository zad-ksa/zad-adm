import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AddEmployeeForm } from "@/components/AddEmployeeForm";
import { Users, UserCircle, ShieldAlert, Check, X } from "lucide-react";

export default async function EmployeesPage() {
  const session = await getSession();

  // Protect route for ADMIN only
  if (!session || session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          إدارة الموظفين
        </h1>
        <p className="text-slate-600 mt-1">
          إضافة موظفين جدد وإدارة صلاحياتهم
        </p>
      </div>

      {/* Add Employee Form */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">إضافة موظف جديد</h2>
        <AddEmployeeForm />
      </section>

      {/* Employees List */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">قائمة الموظفين</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الموظف</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">رقم الجوال</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">نوع الحساب</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">الحالة</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-600">تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-10 h-10 text-slate-400" />
                        <div>
                          <div className="font-medium text-slate-900">{emp.name}</div>
                          <div className="text-xs text-slate-500">
                            {emp.permissions.length} صلاحيات مخصصة
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium" dir="ltr">
                      {emp.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.role === "ADMIN" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {emp.role === "ADMIN" ? "مدير نظام" : "موظف"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.isActive 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {emp.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        {emp.isActive ? "نشط" : "موقوف"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(emp.createdAt).toLocaleDateString("ar-SA")}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      لا يوجد موظفين حالياً
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
