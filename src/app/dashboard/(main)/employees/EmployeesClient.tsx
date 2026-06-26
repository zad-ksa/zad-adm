"use client";

import { useState, useTransition } from "react";
import { toggleEmployeeStatus, updateEmployee, updateEmployeeCharities } from "./actions";
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
import { Edit, ShieldCheck, Building2 } from "lucide-react";

const ADMIN_ROLES = ["ADMIN", "EXECUTIVE_DIRECTOR", "GENERAL_MANAGER", "ADMINISTRATIVE_SECRETARIAT"];

const roleTranslations: Record<string, string> = {
  ADMIN: "مدير النظام",
  EXECUTIVE_DIRECTOR: "إدارة تنفيذية",
  GENERAL_MANAGER: "مدير عام",
  ADMINISTRATIVE_SECRETARIAT: "إدارة تنفيذية",
  STRATEGY: "الاستراتيجية",
  FINANCE: "المالية",
};

const roleBadgeStyles: Record<string, string> = {
  ADMIN: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  EXECUTIVE_DIRECTOR: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  GENERAL_MANAGER: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  ADMINISTRATIVE_SECRETARIAT: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  STRATEGY: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300",
  FINANCE: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
};

const permissionsList = [
  { id: "manage_governance", label: "إدارة الحوكمة" },
  { id: "manage_hr", label: "إدارة الموارد البشرية" },
];

interface Charity {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date | string;
  assignedCharities?: { charityId: string }[];
}

export function EmployeesClient({
  employees: initialEmployees,
  session,
  allCharities = [],
}: {
  employees: Employee[];
  session: any;
  allCharities?: Charity[];
}) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isPending, startTransition] = useTransition();

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editCharityIds, setEditCharityIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

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

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone);
    setEditRole(emp.role);
    setEditPermissions(emp.permissions);
    setEditPassword("");
    setEditCharityIds(emp.assignedCharities?.map((c) => c.charityId) ?? []);
    setModalError(null);
    setModalSuccess(null);
  };

  const handleCharityToggle = (charityId: string) => {
    setEditCharityIds((prev) =>
      prev.includes(charityId) ? prev.filter((id) => id !== charityId) : [...prev, charityId]
    );
  };

  const handlePermissionToggle = (permId: string) => {
    setEditPermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(id => id !== permId) 
        : [...prev, permId]
    );
  };

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
        return;
      }

      // Save charity assignments for restricted roles
      if (!ADMIN_ROLES.includes(editRole) && editRole !== "CHARITY_CLIENT") {
        await updateEmployeeCharities(editingEmployee.id, editCharityIds);
      }

      setModalSuccess(res.success || "تم تحديث البيانات بنجاح");
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? {
                ...emp,
                name: editName,
                phone: editPhone,
                role: editRole,
                permissions: editPermissions,
                assignedCharities: editCharityIds.map((id) => ({ charityId: id })),
              }
            : emp
        )
      );
      setTimeout(() => {
        setEditingEmployee(null);
      }, 1000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Employees Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الموظف</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">رقم الجوال</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">نوع الحساب</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الحالة</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الصلاحيات</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <UserCircle className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">{emp.name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          تاريخ الإضافة: {new Date(emp.createdAt).toLocaleDateString("ar-SA")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 font-bold" dir="ltr">
                    {emp.phone}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      roleBadgeStyles[emp.role] || "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}>
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {roleTranslations[emp.role] || emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      emp.isActive 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
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
                            <span key={permId} className="inline-block text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                              {label}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">لا توجد صلاحيات مخصصة</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        disabled={isPending || emp.role === "ADMIN" && session.role !== "ADMIN"}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="تعديل الموظف وصلاحياته"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(emp.id, emp.isActive)}
                        disabled={isPending || emp.id === session.id || emp.role === "ADMIN"}
                        className={`px-2 py-1 text-xs font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          emp.isActive 
                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" 
                            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
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
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 font-medium text-sm">
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
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => { if (!isPending) setEditingEmployee(null); }}
          />
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col" dir="rtl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">تعديل بيانات وصلاحيات الموظف</h3>
              <button 
                onClick={() => setEditingEmployee(null)} 
                disabled={isPending}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Error Alert */}
              {modalError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl flex items-start text-sm text-red-700 dark:text-red-400 font-bold gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Success Alert */}
              {modalSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-xl flex items-start text-sm text-emerald-700 dark:text-emerald-300 font-bold gap-2">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{modalSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">اسم الموظف</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isPending}
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/50 transition-colors" 
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">رقم الجوال</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      disabled={isPending}
                      dir="ltr"
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/50 text-right transition-colors" 
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نوع الحساب</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <select 
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      disabled={isPending || editingEmployee.role === "ADMIN"}
                      className="appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/50 cursor-pointer transition-colors"
                    >
                      <option value="EXECUTIVE_DIRECTOR">إدارة تنفيذية</option>
                      <option value="GENERAL_MANAGER">مدير عام</option>
                      <option value="STRATEGY">الاستراتيجية</option>
                      <option value="FINANCE">المالية</option>
                      {editingEmployee.role === "ADMIN" && <option value="ADMIN">مدير النظام</option>}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">كلمة المرور الجديدة (اختياري)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Key className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input 
                      type="text" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      disabled={isPending}
                      placeholder="اتركها فارغة لعدم التغيير"
                      className="placeholder:text-slate-300 dark:placeholder:text-slate-600 appearance-none block w-full pr-10 pl-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900/50 text-right transition-colors" 
                    />
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">الصلاحيات المخصصة</h4>
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
                            ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary" 
                            : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked 
                            ? "bg-primary border-primary text-white" 
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}>
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-bold">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Charity Assignment Section — shown only for restricted roles */}
              {!ADMIN_ROLES.includes(editRole) && editRole !== "CHARITY_CLIENT" && allCharities.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">الجمعيات المخصصة</h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mr-auto">
                      {editCharityIds.length} / {allCharities.length} محددة
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {allCharities.map((charity) => {
                      const isChecked = editCharityIds.includes(charity.id);
                      return (
                        <button
                          key={charity.id}
                          type="button"
                          onClick={() => handleCharityToggle(charity.id)}
                          disabled={isPending}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-right transition-colors cursor-pointer ${
                            isChecked
                              ? "bg-primary/5 dark:bg-primary/10 text-primary dark:text-primary"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/40 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-primary border-primary"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold">{charity.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  {editCharityIds.length === 0 && (
                    <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      بدون تخصيص، لن يتمكن الموظف من الوصول إلى أي جمعية
                    </p>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-all text-xs cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold transition-all text-xs flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
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
