"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";
import { confirmAction } from "@/components/console/confirmBus";
import { Building2, Plus, Trash2, ExternalLink, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { addDonorAccount, deleteDonorAccount } from "@/app/actions/charity";
import { btn, cx } from "@/components/console/ui";

interface DonorAccount {
  id: string;
  donorName: string;
  username: string;
  password: string;
  website: string | null;
}

export default function DonorsClient({
  charityId,
  charityName,
  initialDonorAccounts,
  grantApplications,
}: {
  charityId: string;
  charityName: string;
  initialDonorAccounts: any[];
  grantApplications: any[];
}) {
  const [donorAccounts, setDonorAccounts] = useState<DonorAccount[]>(initialDonorAccounts || []);
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [donorForm, setDonorForm] = useState({ name: "", username: "", password: "", website: "" });

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setErrorMsg(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(message);
      setSuccessMsg(null);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification("success", "تم النسخ بنجاح");
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addDonorAccount(charityId, donorForm.name, donorForm.username, donorForm.password, donorForm.website);
      if (res.success && res.account) {
        setDonorAccounts((prev) => [res.account as unknown as DonorAccount, ...prev]);
        setDonorForm({ name: "", username: "", password: "", website: "" });
        setShowAddDonor(false);
        showNotification("success", "تم إضافة الحساب بنجاح");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in font-semibold text-caption animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in font-semibold text-caption">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

          <PageHeader
            crumbs={charityCrumbs(charityName, { label: "الجهات المانحة" })}
            icon={<Building2 className="w-6 h-6" />}
            title="الجهات المانحة"
            description="إدارة بيانات الدخول للجهات المانحة"
            actions={
              <button onClick={() => setShowAddDonor(!showAddDonor)} className={cx(btn.primary, "whitespace-nowrap")}>
                <Plus className="w-4 h-4" /> إضافة حساب
              </button>
            }
          />

      <div className="space-y-4">
        {showAddDonor && (
          <form onSubmit={handleAddDonor} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-caption font-semibold text-slate-500 dark:text-slate-400 mb-1">اسم الجهة المانحة</label>
              <input required type="text" value={donorForm.name} onChange={e => setDonorForm({...donorForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-caption font-semibold text-slate-500 dark:text-slate-400 mb-1">اسم المستخدم</label>
              <input required type="text" value={donorForm.username} onChange={e => setDonorForm({...donorForm, username: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-caption font-semibold text-slate-500 dark:text-slate-400 mb-1">كلمة المرور</label>
              <input required type="text" value={donorForm.password} onChange={e => setDonorForm({...donorForm, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-caption font-semibold text-slate-500 dark:text-slate-400 mb-1">رابط الموقع (اختياري)</label>
              <input type="url" value={donorForm.website} onChange={e => setDonorForm({...donorForm, website: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold dark:text-slate-100" />
            </div>
            <button type="submit" disabled={isPending} className={cx(btn.primary, "w-full")}>
              حفظ الحساب
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {donorAccounts.map(account => {
            const submittedProjectsCount = grantApplications.filter((g: any) => g.entityName === account.donorName).length;
            return (
            <div key={account.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-shadow relative group hover:border-primary/30">
              <button onClick={async () => {
                if (await confirmAction({ title: "حذف حساب الجهة المانحة؟", confirmLabel: "حذف" })) startTransition(() => {
                  deleteDonorAccount(account.id, charityId);
                  setDonorAccounts(prev => prev.filter(a => a.id !== account.id));
                });
              }} className="absolute top-3 left-3 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-2">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-caption mb-2">{account.donorName}</h4>

              <div className="bg-primary/5 p-2 rounded-lg flex justify-center gap-2 items-center border border-primary/10 mb-2">
                <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">المشاريع المرفوعة:</span>
                <span className="text-caption font-semibold text-primary">{submittedProjectsCount}</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-700 group/item">
                  <div>
                    <span className="block text-caption text-slate-400 dark:text-slate-500 font-semibold mb-0.5">اسم المستخدم</span>
                    <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">{account.username}</span>
                  </div>
                  <button onClick={() => copyToClipboard(account.username)} className="text-slate-400 dark:text-slate-500 hover:text-primary p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 md:opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy className="w-4 h-4"/></button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-700 group/item">
                  <div>
                    <span className="block text-caption text-slate-400 dark:text-slate-500 font-semibold mb-0.5">كلمة المرور</span>
                    <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">{account.password}</span>
                  </div>
                  <button onClick={() => copyToClipboard(account.password)} className="text-slate-400 dark:text-slate-500 hover:text-primary p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 opacity-0 md:opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy className="w-4 h-4"/></button>
                </div>
              </div>
              {account.website && (
                <a href={account.website} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-caption font-semibold transition-colors">
                  فتح الموقع <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )})}
          {donorAccounts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-semibold">لا توجد حسابات مضافة حالياً</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
