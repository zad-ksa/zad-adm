"use client";

import { useState, useTransition } from "react";
import { toggleEmployeeStatus, updateEmployee } from "./actions";
import { 
  UserCircle, 
  ShieldAlert, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle, 
  User, 
  Phone, 
  Key
} from "@/components/Icons";
import { Edit, ShieldCheck } from "lucide-react";

const roleTranslations: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "مدير تنفيذي",
  GENERAL_MANAGER: "مدير عام",
  ADMINISTRATIVE_SECRETARIAT: "مساعد مدير",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
  EMPLOYEE: "موظف",
};

const roleBadgeStyles: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  EXECUTIVE_DIRECTOR: "bg-purple-100 text-purple-700",
  GENERAL_MANAGER: "bg-blue-100 text-blue-700",
  ADMINISTRATIVE_SECRETARIAT: "bg-amber-100 text-amber-700",
  STRATEGY: "bg-indigo-100 text-indigo-700",
  FINANCE: "bg-emerald-100 text-emerald-700",
  EMPLOYEE: "bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-200 dark:text-slate-200",
};

const permissionsList = [
  { id: "view_charities", label: "عرض الجمعيات" },
  { id: "edit_charity", label: "تعديل بيانات الجمعية" },
  { id: "view_surveys", label: "عرض الاستبيانات" },
  { id: "manage_surveys", label: "إدارة الاستبيانات" },
  { id: "view_reports", label: "عرض التقارير" },
];

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date | string;
}

export function EmployeesClient({ 
  employees: initialEmployees,
  session
}: { 
  employees: Employee[];
  session: any;
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit Modal Form States
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Handle status toggle
  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    if (!confirm("هل أنت متأكد من رغبتك في تغيير حالة هذا الموظف؟")) return;

    startTransition(async () => {
      const res = await toggleEmployeeStatus(id, currentStatus);
      if (res.success) {
        setEmployees(prev => 
          prev.map(emp => emp.id === id ? { ...emp, isActive: !currentStatus } : emp)
        );
      } else {
        alert(res.error || "حدث خطأ أثناء تغيير الحالة");
      }
    });
  };

  // Open Edit Modal
  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone);
    setEditRole(emp.role);
    setEditPermissions(emp.permissions);
    setEditPassword("");
    setModalError(null);
    setModalSuccess(null);
  };

  // Toggle permission in modal
  const handlePermissionToggle = (permId: string) => {
    setEditPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(id => id !== permId) 
        : [...prev, permId]
    );
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setModalError(null);
    setModalSuccess(null);

    startTransition(async () => {
      const res = await updateEmployee(editingEmployee.id, {
        name: editName,
        phone: editPhone,
        role: editRole,
        permissions: editPermissions,
        password: editPassword || undefined,
      });

      if (res.error) {
        setModalError(res.error);
      } else {
        setModalSuccess(res.success || "تم تحديث البيانات بنجاح");
        // Update local state
        setEmployees(prev => 
          prev.map(emp => 
            emp.id === editingEmployee.id 
              ? { 
                  ...emp, 
                  name: editName, 
                  phone: editPhone, 
                  role: editRole, 
                  permissions: editPermissions 
                } 
              : emp
          )
        );
        setTimeout(() => {
          setEditingEmployee(null);
        }, 1000);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">الموظف</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">رقم الجوال</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">نوع الحساب</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">الصلاحيات</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-650">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className="w-10 h-10 text-slate-400" />
                      <div>
                        <div className="font-bold text-slate-900">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          تاريخ الإضافة: {new Date(emp.createdAt).toLocaleDateString("ar-SA")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 dark:text-slate-300 font-bold" dir="ltr">
                    {emp.phone}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      roleBadgeStyles[emp.role] || "bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-700 dark:text-slate-200 dark:text-slate-200"
                    }`}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {roleTranslations[emp.role] || emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      emp.isActive 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "bg-red-50 text-red-700"
                    }`}>
                      {emp.isActive ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {emp.isActive ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      {emp.permissions.length > 0 ? (
                        emp.permissions.map(permId => {
                          const label = permissionsList.find(p => p.id === permId)?.label || permId;
                          return (
                            <span key={permId} className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">لا توجد صلاحيات مخصصة</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        disabled={isPending || emp.role === "ADMIN" && session.role !== "ADMIN"}
                        className="p-1.5 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:text-primary hover:bg-slate-150 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="تعديل الموظف وصلاحياته"
                      >
                        <Edit className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp.id, emp.isActive)}
                        disabled={isPending || emp.id === session.id || emp.role === "ADMIN"}
                        className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          emp.isActive 
                            ? "text-red-600 hover:bg-red-50" 
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {emp.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium text-sm">
                    لا يوجد موظفين حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee & Permissions Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => { if (!isPending) setEditingEmployee(null); }}
          />
          
          <div className="bg-white dark:bg-slate-800 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col font-sans" dir="rtl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100">تعديل بيانات وصلاحيات الموظف</h3>
              <button 
                onClick={() => setEditingEmployee(null)} 
                disabled={isPending}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 p-2 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalError && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start text-sm text-red-700 font-bold">
                  <AlertTriangle className="w-5 h-5 ml-2 text-red-500 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start text-sm text-emerald-800 font-bold">
                  <Check className="w-5 h-5 ml-2 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">اسم الموظف</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <User className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isPending}
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">رقم الجوال</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Phone className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={isPending}
                      dir="ltr"
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 text-right" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">نوع الحساب</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <select 
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={isPending || editingEmployee.role === "ADMIN"}
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-bold text-slate-800 dark:text-slate-100 dark:text-slate-100 bg-white dark:bg-slate-800 dark:bg-slate-800 cursor-pointer"
                    >
                      <option value="EXECUTIVE_DIRECTOR">مدير تنفيذي</option>
                      <option value="GENERAL_MANAGER">مدير عام</option>
                      <option value="ADMINISTRATIVE_SECRETARIAT">مساعد مدير</option>
                      <option value="STRATEGY">الاستراتيجية</option>
                      <option value="FINANCE">المالية</option>
                      <option value="EMPLOYEE">موظف</option>
                      {editingEmployee.role === "ADMIN" && <option value="ADMIN">مدير النظام</option>}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-2">كلمة المرور الجديدة (اختياري)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Key className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input 
                      type="text" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      disabled={isPending}
                      placeholder="اتركها فارغة لعدم التغيير"
                      className="placeholder:text-slate-300 appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-700 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-medium text-slate-800 dark:text-slate-100 dark:text-slate-100 text-right" 
                    />
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 dark:text-slate-200 mb-3">الصلاحيات المخصصة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {permissionsList.map((perm) => {
                    const isChecked = editPermissions.includes(perm.id);
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => handlePermissionToggle(perm.id)}
                        disabled={isPending}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          isChecked 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80 hover:bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 dark:text-slate-300"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked ? "bg-primary border-primary text-white" : "border-slate-350 bg-white dark:bg-slate-800 dark:bg-slate-800"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-bold">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 dark:border-slate-800/80 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:border-slate-700 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-900/50 dark:bg-slate-900/50 hover:text-slate-700 dark:text-slate-200 dark:text-slate-200 font-bold transition-all text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
