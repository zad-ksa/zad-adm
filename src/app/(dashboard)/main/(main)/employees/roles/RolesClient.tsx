"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Shield, Loader2, Edit, Trash2, ShieldAlert, Check, X, ShieldCheck, RefreshCw } from "lucide-react";
import { createRole, updateRole, deleteRole, syncRolePermissions } from "@/app/actions/roles";
import { PERMISSION_GROUPS } from "@/lib/permissions";

interface RoleDefinition {
  id: string;
  key: string;
  displayName: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: Date | string;
  employeeCount?: number;
}

export default function RolesClient({ roles: initialRoles }: { roles: RoleDefinition[] }) {
  const [roles, setRoles] = useState<RoleDefinition[]>(initialRoles);
  const [isPending, startTransition] = useTransition();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);

  // Form State
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setKey("");
    setDisplayName("");
    setPermissions([]);
    setError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (role: RoleDefinition) => {
    setEditingRole(role);
    setKey(role.key);
    setDisplayName(role.displayName);
    setPermissions(role.permissions || []);
    setError(null);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingRole(null);
  };

  const handlePermissionToggle = (permId: string) => {
    setPermissions(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSelectAllGroup = (groupPermissions: { id: string }[]) => {
    const ids = groupPermissions.map(p => p.id);
    const allSelected = ids.every(id => permissions.includes(id));
    if (allSelected) {
      setPermissions(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setPermissions(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (editingRole) {
      startTransition(async () => {
        const res = await updateRole(editingRole.id, { displayName, permissions });
        if (res.error) {
          setError(res.error);
        } else {
          setRoles(prev => prev.map(r => r.id === editingRole.id ? { ...r, displayName, permissions } : r));
          closeModal();
        }
      });
    } else {
      startTransition(async () => {
        const res = await createRole({ key, displayName, permissions });
        if (res.error) {
          setError(res.error);
        } else {
          // Temporarily add to UI, waiting for revalidatePath to refresh
          setRoles(prev => [...prev, {
            id: Date.now().toString(),
            key: key.toUpperCase().replace(/\s+/g, '_'),
            displayName,
            permissions,
            isSystem: false,
            createdAt: new Date()
          }]);
          closeModal();
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المسمى؟ لا يمكن التراجع عن هذه الخطوة.")) return;

    startTransition(async () => {
      const res = await deleteRole(id);
      if (res.error) {
        alert(res.error);
      } else {
        setRoles(prev => prev.filter(r => r.id !== id));
      }
    });
  };

  const handleSync = (role: RoleDefinition) => {
    const count = role.employeeCount ?? 0;
    if (count === 0) {
      alert("لا يوجد موظفون يحملون هذا المسمى حالياً");
      return;
    }
    if (!confirm(`سيتم استبدال صلاحيات ${count} موظف يحملون مسمى "${role.displayName}" بالصلاحيات الافتراضية الحالية لهذا المسمى، ويُلغى أي تخصيص يدوي سابق لصلاحياتهم. هل تريد المتابعة؟`)) return;

    startTransition(async () => {
      const res = await syncRolePermissions(role.id);
      if (res.error) {
        alert(res.error);
      } else {
        alert(res.success);
      }
    });
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-start gap-4">
          <Link href="/main/employees" className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary rounded-xl transition-colors mt-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Shield className="w-7 h-7 text-primary" />
              <span>إدارة المسميات الوظيفية</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
              إضافة وتعديل مسميات الموظفين وصلاحياتهم الافتراضية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-primary hover:bg-primary/95 text-white rounded-xl shadow-md hover:shadow-lg font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مسمى جديد</span>
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
          <div key={role.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${role.isSystem ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  {role.isSystem ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{role.displayName}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5" dir="ltr">{role.key}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {role.key !== "ADMIN" && (
                  <button
                    onClick={() => handleSync(role)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-primary bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    title="مزامنة الصلاحيات الحالية مع الموظفين الحاملين لهذا المسمى"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => openEditModal(role)}
                  className="p-1.5 text-slate-400 hover:text-primary bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                  title="تعديل المسمى"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                    title="حذف المسمى"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className={`px-2 py-1 rounded-md font-bold ${role.isSystem ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {role.isSystem ? 'دور أساسي' : 'دور مخصص'}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {role.key === "ADMIN" ? 'كامل الصلاحيات' : `${role.permissions?.length || 0} صلاحية افتراضية`}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              {role.employeeCount ?? 0} موظف يحمل هذا المسمى
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !isPending && closeModal()} />
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {editingRole ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                <span>{editingRole ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي جديد'}</span>
              </h3>
              <button onClick={closeModal} disabled={isPending} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 p-2 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">المعرّف (باللغة الإنجليزية)</label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    disabled={isPending || !!editingRole}
                    dir="ltr"
                    placeholder="مثال: HR_MANAGER"
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold text-left bg-white dark:bg-slate-900 disabled:opacity-50"
                  />
                  {!editingRole && <p className="text-[10px] text-slate-400 mt-1">يجب أن يكون فريداً وبالأحرف الإنجليزية ولا يمكن تعديله لاحقاً.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">الاسم المعروض (باللغة العربية)</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    disabled={isPending}
                    placeholder="مثال: مدير الموارد البشرية"
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold bg-white dark:bg-slate-900 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">الصلاحيات الافتراضية للمسمى</h4>
                {editingRole?.key === "ADMIN" ? (
                  <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl text-sm font-bold">هذا الدور لديه جميع الصلاحيات تلقائياً.</div>
                ) : (
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => {
                      const allGroupSelected = group.permissions.every(p => permissions.includes(p.id));
                      return (
                        <div key={group.title}>
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-bold text-slate-500">{group.title}</h5>
                            <button
                              type="button"
                              onClick={() => handleSelectAllGroup(group.permissions)}
                              className="text-[10px] font-bold text-primary hover:text-primary/80"
                            >
                              {allGroupSelected ? "إلغاء الكل" : "تحديد الكل"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.permissions.map((perm) => {
                              const isChecked = permissions.includes(perm.id);
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => handlePermissionToggle(perm.id)}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                                    isChecked ? "border-primary bg-primary/5 text-primary" : "border-slate-200 hover:bg-slate-50 text-slate-600"
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-primary border-primary text-white" : "border-slate-300"}`}>
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="text-xs font-bold">{perm.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 pt-4">
                <button type="button" onClick={closeModal} disabled={isPending} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">إلغاء</button>
                <button type="submit" disabled={isPending} className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-75">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
