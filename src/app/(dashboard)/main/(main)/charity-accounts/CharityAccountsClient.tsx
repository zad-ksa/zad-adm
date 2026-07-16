"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, Building2, ArrowRight } from "lucide-react";
import { addCharityClientAccount, deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import Link from "next/link";

const titles = [
  { value: "CHAIRMAN", label: "رئيس مجلس إدارة" },
  { value: "CEO", label: "مدير تنفيذي" },
  { value: "FULL_TIME", label: "موظف بدوام كامل" },
  { value: "PART_TIME", label: "موظف بداوم جزئي" },
  { value: "VOLUNTEER", label: "متطوع" },
];

export default function CharityAccountsClient({ charities, accounts: initialAccounts }: { charities: any[], accounts: any[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    title: "FULL_TIME",
    charityIds: [] as string[]
  });



  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.name || !form.phone || !form.title || form.charityIds.length === 0) {
      setErrorMsg("جميع الحقول مطلوبة");
      return;
    }

    startTransition(async () => {
      const res = await addCharityClientAccount(form);
      if (res.success) {
        setSuccessMsg("تم إضافة الحساب بنجاح");
        setShowModal(false);
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

  const toggleCharity = (id: string) => {
    setForm(prev => {
      if (prev.charityIds.includes(id)) {
        return { ...prev, charityIds: prev.charityIds.filter(c => c !== id) };
      } else {
        return { ...prev, charityIds: [...prev.charityIds, id] };
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">رقم الجوال (للدخول)</label>
                  <input 
                    required 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي</label>
                  <select 
                    required 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  >
                    {titles.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">الجمعيات المرتبطة (يمكن اختيار أكثر من واحدة)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                    {charities.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.charityIds.includes(c.id)}
                          onChange={() => toggleCharity(c.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary focus:ring-offset-0 border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {form.charityIds.length === 0 && (
                    <p className="text-xs text-red-500 mt-1 font-bold">يجب اختيار جمعية واحدة على الأقل</p>
                  )}
                </div>

              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isPending || form.charityIds.length === 0} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow hover:bg-primary/90 transition-colors disabled:opacity-50">
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
                <th className="px-6 py-4">الجمعيات</th>
                <th className="px-6 py-4">الممثل</th>
                <th className="px-6 py-4">المسمى الوظيفي</th>
                <th className="px-6 py-4 text-left" dir="ltr">رقم الجوال</th>
                <th className="px-6 py-4">تاريخ الإنشاء</th>
                <th className="px-6 py-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 whitespace-normal min-w-[200px]">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                      <span>{account.charityNames?.join("، ") || "غير محدد"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-300">{account.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                    {titles.find(t => t.value === account.title)?.label || account.title}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-left" dir="ltr">{account.phone}</td>

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
