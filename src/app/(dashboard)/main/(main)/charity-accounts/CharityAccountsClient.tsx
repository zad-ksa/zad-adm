"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, Building2, ArrowRight } from "lucide-react";
import { addCharityClientAccount, deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import Link from "next/link";

export default function CharityAccountsClient({ charities, accounts: initialAccounts }: { charities: any[], accounts: any[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    charityId: "",
    permissions: [] as string[]
  });

  const availablePermissions = [
    { id: "view_charity_strategy", label: "الاستراتيجية" },
    { id: "view_charity_programs", label: "البرامج" },
    { id: "view_charity_governance", label: "الحوكمة" },
    { id: "view_charity_finance", label: "المالية" },
    { id: "view_charity_tasks", label: "المهام" }
  ];

  const handleTogglePermission = (id: string) => {
    setForm(prev => {
      const perms = prev.permissions;
      if (perms.includes(id)) return { ...prev, permissions: perms.filter(p => p !== id) };
      return { ...prev, permissions: [...perms, id] };
    });
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.name || !form.phone || !form.password || !form.charityId) {
      setErrorMsg("جميع الحقول مطلوبة");
      return;
    }

    startTransition(async () => {
      const res = await addCharityClientAccount(form);
      if (res.success) {
        setSuccessMsg("تم إضافة الحساب بنجاح");
        setShowModal(false);
        // We can reload the page to get fresh data or optimally add it to local state:
        window.location.reload();
      } else {
        setErrorMsg(res.error || "حدث خطأ");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف الحساب بشكل نهائي؟")) return;
    
    startTransition(async () => {
      const res = await deleteCharityClientAccount(id);
      if (res.success) {
        setAccounts(prev => prev.filter(a => a.id !== id));
      } else {
        alert(res.error || "حدث خطأ أثناء الحذف");
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center font-bold text-sm">
          <CheckCircle2 className="w-5 h-5 ml-2" />
          {successMsg}
        </div>
      )}
      
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center font-bold text-sm">
          <AlertCircle className="w-5 h-5 ml-2" />
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-start gap-4">
          <Link href="/main/admin" className="p-2 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary rounded-xl transition-colors mt-0.5">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              حسابات الجمعيات
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">إدارة حسابات مستخدمي الجمعيات والصلاحيات.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="w-5 h-5" /> إضافة حساب جديد
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">إضافة حساب جمعية</h3>
            </div>
            
            <form onSubmit={handleAddAccount} className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">الجمعية</label>
                  <select 
                    required 
                    value={form.charityId} 
                    onChange={e => setForm({...form, charityId: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  >
                    <option value="">-- اختر الجمعية --</option>
                    {charities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم الممثل</label>
                  <input 
                    required 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="مثال: عبدالله محمد"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الجمعية (للدخول)</label>
                  <input 
                    required 
                    type="text" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="مثال: 12345"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-left"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">كلمة المرور</label>
                  <input 
                    required 
                    type="text" 
                    value={form.password} 
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="كلمة مرور قوية"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">التبويبات المتاحة (الصلاحيات)</label>
                <div className="grid grid-cols-2 gap-3">
                  {availablePermissions.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${form.permissions.includes(perm.id) ? 'bg-primary border-primary' : 'bg-slate-50 border-slate-300 dark:bg-slate-800 dark:border-slate-600'}`}>
                        {form.permissions.includes(perm.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">{perm.label}</span>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={form.permissions.includes(perm.id)}
                        onChange={() => handleTogglePermission(perm.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isPending} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isPending ? "جاري الحفظ..." : "حفظ الحساب"}
                </button>
                <button type="button" onClick={() => setShowModal(false)} disabled={isPending} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-black uppercase">
              <tr>
                <th className="px-6 py-4">الجمعية</th>
                <th className="px-6 py-4">الممثل</th>
                <th className="px-6 py-4 text-left" dir="ltr">رقم الجمعية</th>
                <th className="px-6 py-4">الصلاحيات</th>
                <th className="px-6 py-4">تاريخ الإنشاء</th>
                <th className="px-6 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {account.charityName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">{account.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-left" dir="ltr">{account.phone}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {account.permissions.filter((p: string) => p.startsWith('view_charity_')).map((p: string) => (
                        <span key={p} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold">
                          {availablePermissions.find(ap => ap.id === p)?.label || p}
                        </span>
                      ))}
                      {account.permissions.length === 0 && <span className="text-xs text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(account.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleDelete(account.id)}
                      disabled={isPending}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">لا توجد حسابات جمعيات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
