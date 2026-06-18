"use client";

import { useActionState, useEffect, useRef } from "react";
import { addEmployee } from "@/app/dashboard/(main)/employees/actions";
import { 
  User, 
  Phone, 
  Key, 
  ShieldAlert, 
  ChevronDownIcon, 
  AlertTriangle, 
  Check, 
  Loader2 
} from "@/components/Icons";

export function AddEmployeeForm() {
  const [state, formAction, isPending] = useActionState(addEmployee, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  const permissionsList = [
    { id: "manage_governance", label: "إدارة الحوكمة" },
    { id: "manage_hr", label: "إدارة الموارد البشرية" },
  ];

  return (
    <form ref={formRef} action={formAction} className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
      {state?.error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{state.error}</p>
        </div>
      )}
      
      {state?.success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{state.success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">اسم الموظف</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input name="name" type="text" required className="appearance-none block w-full pr-10 pl-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">رقم الجوال (للدخول)</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input name="phone" type="text" required dir="ltr" placeholder="05XXXXXXXX" className="appearance-none block w-full pr-10 pl-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm text-right transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">كلمة المرور الافتراضية</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input name="password" type="text" required dir="ltr" className="appearance-none block w-full pr-10 pl-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm text-right transition-colors" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">نوع الحساب</label>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ShieldAlert className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <select name="role" className="appearance-none block w-full pr-10 pl-3 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 sm:text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer transition-colors">
              <option value="EXECUTIVE_DIRECTOR">مدير تنفيذي</option>
              <option value="GENERAL_MANAGER">مدير عام</option>
              <option value="ADMINISTRATIVE_SECRETARIAT">مساعد مدير</option>
              <option value="STRATEGY">الاستراتيجية</option>
              <option value="FINANCE">المالية</option>
            </select>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-4">الصلاحيات المخصصة</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {permissionsList.map((perm) => (
            <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
              <input type="checkbox" name={`permission_${perm.id}`} className="w-4 h-4 text-primary rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 focus:ring-primary/50" />
              <span className="text-sm text-slate-700 dark:text-slate-200">{perm.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed gap-2"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <User className="w-5 h-5" />}
          إضافة موظف
        </button>
      </div>
    </form>
  );
}
