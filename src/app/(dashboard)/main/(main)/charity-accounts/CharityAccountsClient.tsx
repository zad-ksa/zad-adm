"use client";

import { useState, useTransition } from "react";
import { PageHeader, theadRowClass, thClass, tbodyClass, tdClass, tableFrameClass } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { addCharityClientAccount, deleteCharityClientAccount } from "@/app/actions/charityAccounts";
import {
  CHARITY_PERMISSION_GROUPS,
  ALL_CHARITY_PERMISSION_IDS,
} from "@/lib/charityPermissions";
import { Dialog } from "@/components/console/Dialog";
import { btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";

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
    // Optional: leave both blank and the account signs in by phone + OTP.
    // Its owner can set them later themselves from the portal.
    email: "",
    password: "",
    title: "FULL_TIME",
    charityIds: [] as string[],
    isAdmin: false,
    permissions: [] as string[],
  });



  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!form.name || !form.phone || !form.title || form.charityIds.length === 0) {
      setErrorMsg("الاسم والجوال والمسمى والجمعية مطلوبة");
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
      
      {/* Only while no dialog is covering it. A refusal rendered here with the
          modal open lands behind it, so the form appears to do nothing — the
          same message is repeated inside the modal instead. */}
      {errorMsg && !showModal && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center font-bold text-sm">
          <AlertCircle className="w-5 h-5 ml-2" />
          {errorMsg}
        </div>
      )}

      <div className="mb-6">
        <div>
          <PageHeader
            crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "حسابات الجمعيات" }]}
            icon={<ShieldAlert className="w-6 h-6" />}
            title="حسابات الجمعيات"
            description="إدارة حسابات مستخدمي الجمعيات المتعاقدة والصلاحيات الخاصة بهم في النظام."
          />
        </div>
      </div>

      {showModal && (
        <Dialog
title="إضافة حساب جمعية"
onClose={() => setShowModal(false)}
onSubmit={handleAddAccount}
footer={
<>
<button type="button" onClick={() => setShowModal(false)} disabled={isPending} className={btn.secondary}>
                  إلغاء
                </button>
<button type="submit" disabled={isPending || form.charityIds.length === 0} className={btn.primary}>
                  {isPending ? "جاري الحفظ..." : "حفظ الحساب"}
                </button>
</>
}
>
<div className="space-y-4">
{errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-start gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    البريد الإلكتروني <span className="text-slate-400 font-medium">(اختياري)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    كلمة المرور <span className="text-slate-400 font-medium">(مع البريد فقط)</span>
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="٨ أحرف على الأقل"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-left"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    اتركهما فارغين ليدخل الحساب برقم الجوال ورمز التحقق، ويضبطهما صاحبه لاحقًا بنفسه.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي</label>
                  <Select
                    variant="soft"
                    value={form.title}
                    onSelect={(v) => setForm({ ...form, title: v })}
                    placeholder="اختر المسمى"
                    options={titles.map(t => ({ value: t.value, label: t.label }))}
                    className="w-full [&>button]:w-full [&>button]:justify-between"
                  />
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

                {/* What the account may do. An administrator is not shown a list
                    to tick: the flag already carries every permission, and
                    drawing checkboxes beside it would suggest the two could
                    disagree. */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    الصلاحيات داخل الجمعية
                  </label>

                  {form.isAdmin ? (
                    <p className="text-xs text-primary dark:text-teal-400 bg-primary/[0.06] dark:bg-teal-400/[0.06] rounded-xl p-3 leading-relaxed font-bold">
                      مدير الجمعية يملك جميع الصلاحيات تلقائياً — بما يُضاف منها لاحقاً.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {CHARITY_PERMISSION_GROUPS.map((group) => (
                        <div key={group.title}>
                          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">
                            {group.title}
                          </p>
                          <div className="grid sm:grid-cols-2 gap-1.5">
                            {group.permissions.map((permission) => {
                              const checked = form.permissions.includes(permission.id);
                              return (
                                <label
                                  key={permission.id}
                                  className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-xs font-bold ${
                                    checked
                                      ? "border-primary/40 bg-primary/[0.06] text-primary dark:text-teal-400"
                                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setForm({
                                        ...form,
                                        permissions: checked
                                          ? form.permissions.filter((x) => x !== permission.id)
                                          : [...form.permissions, permission.id],
                                      })
                                    }
                                    className="w-3.5 h-3.5 mt-0.5 rounded text-primary focus:ring-primary focus:ring-offset-0 border-slate-300"
                                  />
                                  <span>{permission.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            permissions:
                              form.permissions.length === ALL_CHARITY_PERMISSION_IDS.length
                                ? []
                                : [...ALL_CHARITY_PERMISSION_IDS],
                          })
                        }
                        className="text-[11px] font-bold text-primary dark:text-teal-400 hover:underline"
                      >
                        {form.permissions.length === ALL_CHARITY_PERMISSION_IDS.length
                          ? "إلغاء تحديد الكل"
                          : "تحديد الكل"}
                      </button>
                    </div>
                  )}
                </div>

              </div>
</div>
</Dialog>
      )}

      <div className={cx(tableFrameClass, "mb-20")}>
        <div className="overflow-x-auto">
          <table className="w-full text-right whitespace-nowrap">
            <thead >
              <tr className={theadRowClass}>
                <th className={thClass}>الجمعيات</th>
                <th className={thClass}>الممثل</th>
                <th className={thClass}>المسمى الوظيفي</th>
                <th className={cx(thClass, "text-left")} dir="ltr">رقم الجوال</th>
                <th className={thClass}>تاريخ الإنشاء</th>
                <th className={cx(thClass, "w-16")}></th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <td className={cx(tdClass, "font-bold text-primary whitespace-normal min-w-[200px]")}>
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-primary/60 mt-1 shrink-0" />
                      <span>{account.charityNames?.join("، ") || "غير محدد"}</span>
                    </div>
                  </td>
                  <td className={cx(tdClass, "text-sm font-bold text-slate-800 dark:text-slate-200")}>{account.name}</td>
                  <td className={cx(tdClass, "text-sm font-bold text-slate-600 dark:text-slate-400")}>
                    {titles.find(t => t.value === account.title)?.label || account.title}
                  </td>
                  <td className={cx(tdClass, "text-sm font-bold text-slate-600 dark:text-slate-400 text-left")} dir="ltr">{account.phone}</td>
                  <td className={cx(tdClass, "text-xs font-bold text-slate-500 dark:text-slate-500")}>{new Date(account.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className={tdClass}>
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
                  <td colSpan={6} className={cx(tdClass, "text-center text-slate-500 dark:text-slate-400 font-medium")}>لا توجد حسابات جمعيات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Delete Confirmation Modal */}
      {accountToDelete && (
        <ConfirmDialog
          title={`حذف حساب «${accountToDelete.name}»؟`}
          message="يُحذف الحساب نهائياً، ولا يمكن التراجع عن هذا الإجراء."
          confirmLabel="نعم، احذف الحساب"
          isPending={isPending}
          onConfirm={confirmDelete}
          onCancel={() => setAccountToDelete(null)}
        />
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
