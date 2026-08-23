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
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    title: "FULL_TIME",
    charityIds: [] as string[],
    isAdmin: false
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
        if (res.account) {
          setAccounts(prev => [res.account, ...prev]);
        }
        setShowModal(false);
      } else {
        setErrorMsg(res.error || "حدث خطأ");
      }
    });
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    
    startTransition(async () => {
      const res = await deleteCharityClientAccount(accountToDelete.id);
      if (res.success) {
        setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
        setAccountToDelete(null);
      } else {
        setErrorMsg(res.error || "حدث خطأ أثناء الحذف");
        setAccountToDelete(null);
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

      {/* Header section */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-3xl mb-6 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/main/admin" className="flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xs mb-4 transition-colors w-fit bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg">
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للوحة التحكم
            </Link>
            <h1 className="text-[clamp(1.25rem,2vw,1.75rem)] font-black text-primary tracking-tight mb-1 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 opacity-90" />
              حسابات الجمعيات
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[clamp(0.75rem,1vw,0.875rem)] tracking-tight max-w-2xl leading-relaxed">
              إدارة حسابات مستخدمي الجمعيات المتعاقدة والصلاحيات الخاصة بهم في النظام.
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900">
              <h3 className="text-lg font-bold text-primary">إضافة حساب جمعية</h3>
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

                <div>
                  <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isAdmin}
                      onChange={e => setForm({...form, isAdmin: e.target.checked})}
                      className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary focus:ring-offset-0 border-slate-300"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">مدير للجمعيات المختارة</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        يملك كل الصلاحيات داخلها ويستطيع إدارة حساباتها. لكل جمعية مديرها؛ لا بد من مدير واحد على الأقل لكل جمعية.
                      </span>
                    </span>
                  </label>
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

      <div className="bg-white dark:bg-black rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">الجمعيات</th>
                <th className="px-6 py-4">الممثل</th>
                <th className="px-6 py-4">المسمى الوظيفي</th>
                <th className="px-6 py-4 text-left" dir="ltr">رقم الجوال</th>
                <th className="px-6 py-4">تاريخ الإنشاء</th>
                <th className="px-6 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 font-bold text-primary whitespace-normal min-w-[200px]">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-primary/60 mt-1 shrink-0" />
                      <span>{account.charityNames?.join("، ") || "غير محدد"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">{account.name}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                    {titles.find(t => t.value === account.title)?.label || account.title}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-600 dark:text-slate-400 text-left" dir="ltr">{account.phone}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-500">{new Date(account.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setAccountToDelete(account)}
                      disabled={isPending}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400 font-medium">لا توجد حسابات جمعيات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => !isPending && setAccountToDelete(null)} />
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-[0_0_40px_rgba(239,68,68,0.1)] dark:shadow-[0_0_40px_rgba(239,68,68,0.15)] w-full max-w-md overflow-hidden relative z-10 flex flex-col p-8 text-center animate-fade-in-up">
            
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-red-500/10 dark:bg-red-500/5 blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative">
              <Trash2 className="w-8 h-8 text-red-500 dark:text-red-400" />
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl animate-ping opacity-20 pointer-events-none"></div>
            </div>

            <h3 className="text-[clamp(1.25rem,2vw,1.5rem)] font-black text-slate-800 dark:text-slate-100 mb-2">تأكيد حذف الحساب</h3>
            <p className="text-[clamp(0.875rem,1.5vw,1rem)] text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف حساب <span className="font-bold text-slate-700 dark:text-slate-200">{accountToDelete.name}</span> بشكل نهائي؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>

            <div className="flex gap-4">
              <button 
                onClick={confirmDelete}
                disabled={isPending}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                {isPending ? "جاري الحذف..." : "نعم، احذف الحساب"}
              </button>
              <button 
                onClick={() => setAccountToDelete(null)}
                disabled={isPending}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Adding Account */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 left-8 z-50 bg-primary text-white p-4 rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        title="إضافة حساب جمعية جديد"
      >
        <Plus className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap font-bold text-sm group-hover:max-w-xs group-hover:mr-3 transition-all duration-300 ease-out">
          إضافة حساب جديد
        </span>
      </button>
    </div>
  );
}
