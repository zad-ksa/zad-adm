"use client";

import { useState, useTransition } from "react";
import { PageHeader, theadRowClass, thClass, tbodyClass, tdClass, tableFrameClass } from "@/components/console/layout";
import Select from "@/components/console/Select";
import { Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, Building2, KeyRound } from "lucide-react";
import {
  addCharityClientAccount,
  deleteCharityClientAccount,
  setCharityAccountAccess,
} from "@/app/actions/charityAccounts";
import { CHARITY_USER_TITLES, charityMemberLabel } from "@/lib/charityPermissions";
import { Dialog } from "@/components/console/Dialog";
import { btn, cx } from "@/components/console/ui";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";
import AccessPicker from "./AccessPicker";

// المسمّياتُ ووسومُها في `lib/charityPermissions` — كانت هنا نسخةٌ ثانيةٌ منها،
// وفيها «بداوم» مكانَ «بدوام».
const titles = CHARITY_USER_TITLES.map((t) => ({ value: t.id, label: t.label }));

/** جمعيةٌ ومعها خدماتُها — ومن الخدمات تُشتقّ الصلاحيّاتُ المعروضة. */
type CharityRow = { id: string; name: string; services: string[] };

/** عضويّةُ حسابٍ في جمعية: وصولُه فيها وحدَها. */
type Membership = {
  charityId: string;
  charityName: string;
  isOfficial: boolean;
  isActive: boolean;
  permissions: string[];
  services: string[];
};

type AccountRow = {
  id: string;
  name: string;
  phone: string;
  title: string;
  charityNames: string[];
  memberships: Membership[];
  createdAt: string;
};

export default function CharityAccountsClient({
  charities,
  accounts: initialAccounts,
}: {
  charities: CharityRow[];
  accounts: AccountRow[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<AccountRow | null>(null);

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
    services: [] as string[],
  });

  // خدماتُ جمعيةٍ بعينها — تُقرأ من الخادم مع الصفحة، فالمُنتقي يَعرض ما تشمله
  // الجمعيةُ وحدَه.
  // ومسمّى الحساب: حسابُ الجمعية يُكتب «حساب الجمعية» ولو كان عمودُه
  // `FULL_TIME` — فهو ليس موظّفاً بدوامٍ كامل.
  const memberLabelOf = (account: AccountRow) =>
    charityMemberLabel(
      (account.memberships ?? []).some((m) => m.isOfficial),
      account.title
    ) || "—";

  const servicesOf = (charityId: string) =>
    (charities.find((c: CharityRow) => c.id === charityId)?.services as string[] | undefined) ?? [];

  /**
   * لوحُ «الخدمات والصلاحيات» لحسابٍ في جمعيةٍ بعينها.
   *
   * ولمَ بجمعيةٍ بعينها: الحسابُ قد يخدم جمعيتين، ولكلٍّ خدماتُها وصلاحيّاتُها
   * في صفِّ عضويّتها. فلوحٌ يجمعهما يكتب في إحداهما ما قُصد للأخرى.
   */
  const [access, setAccess] = useState<{
    account: AccountRow;
    charityId: string;
    isOfficial: boolean;
    permissions: string[];
    services: string[];
  } | null>(null);

  const openAccess = (account: AccountRow) => {
    const first = (account.memberships ?? [])[0];
    if (!first) return;
    setAccess({
      account,
      charityId: first.charityId,
      isOfficial: first.isOfficial,
      permissions: first.permissions ?? [],
      services: first.services ?? [],
    });
  };

  /** تبديلُ الجمعية داخل اللوح: تُقرأ قيمُ عضويّتها، لا تُنقل قيمُ الأخرى. */
  const switchAccessCharity = (charityId: string) => {
    if (!access) return;
    const row = (access.account.memberships ?? []).find((m: Membership) => m.charityId === charityId);
    setAccess({
      account: access.account,
      charityId,
      isOfficial: row?.isOfficial ?? false,
      permissions: row?.permissions ?? [],
      services: row?.services ?? [],
    });
  };

  const saveAccess = () => {
    if (!access) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await setCharityAccountAccess({
        accountId: access.account.id,
        charityId: access.charityId,
        isOfficial: access.isOfficial,
        permissions: access.permissions,
        services: access.services,
      });
      if (!res.success) {
        setErrorMsg(res.error || "تعذّر حفظ الصلاحيات");
        return;
      }
      // والمعروضُ يُحدَّث من القيم المرسَلة: الخادمُ قَبِلها كما هي، ومن رفضها
      // لم يُحفظ شيءٌ أصلاً.
      setAccounts((prev: AccountRow[]) =>
        prev.map((a) =>
          a.id !== access.account.id
            ? a
            : {
                ...a,
                memberships: (a.memberships ?? []).map((m: Membership) =>
                  m.charityId !== access.charityId
                    ? m
                    : {
                        ...m,
                        isOfficial: access.isOfficial,
                        permissions: access.isOfficial ? [] : access.permissions,
                        services: access.isOfficial ? servicesOf(access.charityId) : access.services,
                      }
                ),
              }
        )
      );
      setSuccessMsg("حُفظت الخدمات والصلاحيات");
      setAccess(null);
    });
  };



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
        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center font-semibold text-caption">
          <CheckCircle2 className="w-5 h-5 ml-2" />
          {successMsg}
        </div>
      )}
      
      {/* Only while no dialog is covering it. A refusal rendered here with the
          modal open lands behind it, so the form appears to do nothing — the
          same message is repeated inside the modal instead. */}
      {errorMsg && !showModal && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center font-semibold text-caption">
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
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-start gap-2 font-semibold text-caption">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
<div className="space-y-4">
                
                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">اسم الممثل</label>
                  <input 
                    required 
                    type="text" 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="مثال: عبدالله محمد"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold"
                  />
                </div>
                
                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">رقم الجوال (للدخول)</label>
                  <input 
                    required 
                    type="tel" 
                    value={form.phone} 
                    onChange={e => setForm({...form, phone: e.target.value})}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    البريد الإلكتروني <span className="text-slate-400 font-medium">(اختياري)</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="name@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    كلمة المرور <span className="text-slate-400 font-medium">(مع البريد فقط)</span>
                  </label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="٨ أحرف على الأقل"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-caption outline-none focus:ring-2 focus:ring-primary font-semibold text-left"
                    dir="ltr"
                  />
                  <p className="text-caption text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    اتركهما فارغين ليدخل الحساب برقم الجوال ورمز التحقق، ويضبطهما صاحبه لاحقًا بنفسه.
                  </p>
                </div>

                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">المسمى الوظيفي</label>
                  {/* ولا مسمّىً وظيفيٌّ لحساب الجمعية: مسمّاه «حساب الجمعية»، وهو
                      ليس موظّفاً بدوامٍ كامل ولا متطوّعاً. */}
                  {form.isAdmin ? (
                    <p className="rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-2.5 text-caption font-semibold text-primary dark:text-teal-400">
                      حساب الجمعية
                    </p>
                  ) : (
                    <Select
                      variant="soft"
                      value={form.title}
                      onSelect={(v) => setForm({ ...form, title: v })}
                      placeholder="اختر المسمى"
                      options={titles.map(t => ({ value: t.value, label: t.label }))}
                      className="w-full [&>button]:w-full [&>button]:justify-between"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">الجمعيات المرتبطة (يمكن اختيار أكثر من واحدة)</label>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                    {charities.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={form.charityIds.includes(c.id)}
                          onChange={() => toggleCharity(c.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary focus:ring-offset-0 border-slate-300"
                        />
                        <span className="text-caption font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                      </label>
                    ))}
                  </div>
                  {form.charityIds.length === 0 && (
                    <p className="text-caption text-red-500 mt-1 font-semibold">يجب اختيار جمعية واحدة على الأقل</p>
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
                      <span className="block text-caption font-semibold text-slate-700 dark:text-slate-300">حساب الجمعية الرسمي</span>
                      <span className="block text-caption text-slate-500 dark:text-slate-400 mt-0.5">
                        الحساب الذي تُنشئه زاد للجمعية: يحمل كل الصلاحيات — بما يُضاف منها لاحقاً — وهو وحده يمنح الصلاحيات والخدمات لبقية حسابات الجمعية. ولكل جمعية حسابها.
                      </span>
                    </span>
                  </label>
                </div>

                {/* ولا مُنتقي صلاحيّاتٍ للحساب الرسميّ: هو يحملها كلَّها محسوبةً،
                    ومربَّعاتٌ بجانبه تُوهم أنّ الاثنين قد يختلفان. */}
                {form.isAdmin ? (
                  <p className="text-caption font-semibold text-primary dark:text-teal-400 bg-primary/[0.06] dark:bg-teal-400/[0.06] rounded-xl p-3 leading-relaxed">
                    حساب الجمعية يملك جميع الصلاحيات ويُفوَّض بكل خدماتها تلقائياً.
                  </p>
                ) : form.charityIds.length !== 1 ? (
                  <p className="text-caption text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 leading-relaxed">
                    اختر جمعية واحدة لتحديد خدماتها وصلاحياتها — فالخدمات تختلف من جمعية إلى أخرى، والصلاحية تتبع خدمتها.
                  </p>
                ) : (
                  <AccessPicker
                    charityServices={servicesOf(form.charityIds[0])}
                    services={form.services}
                    permissions={form.permissions}
                    onServices={(services) => setForm({ ...form, services })}
                    onPermissions={(permissions) => setForm({ ...form, permissions })}
                  />
                )}

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
                  <td className={cx(tdClass, "font-semibold text-primary whitespace-normal min-w-[200px]")}>
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-primary/60 mt-1 shrink-0" />
                      <span>{account.charityNames?.join("، ") || "غير محدد"}</span>
                    </div>
                  </td>
                  <td className={cx(tdClass, "text-caption font-semibold text-slate-800 dark:text-slate-200")}>{account.name}</td>
                  <td className={cx(tdClass, "text-caption font-semibold text-slate-600 dark:text-slate-400")}>
                    {memberLabelOf(account)}
                  </td>
                  <td className={cx(tdClass, "text-caption font-semibold text-slate-600 dark:text-slate-400 text-left")} dir="ltr">{account.phone}</td>
                  <td className={cx(tdClass, "text-caption font-semibold text-slate-500 dark:text-slate-500")}>{new Date(account.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className={tdClass}>
                    <div className="flex items-center gap-1">
                    {(account.memberships ?? []).length > 0 && (
                      <button
                        onClick={() => openAccess(account)}
                        disabled={isPending}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="الخدمات والصلاحيات"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => setAccountToDelete(account)}
                      disabled={isPending}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </div>
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
      {access && (
        <Dialog
          open
          onClose={() => setAccess(null)}
          title={`الخدمات والصلاحيات — ${access.account.name}`}
          size="lg"
          footer={
            <>
              <button onClick={saveAccess} disabled={isPending} className={btn.primary}>
                حفظ
              </button>
              <button onClick={() => setAccess(null)} className={btn.secondary}>
                إلغاء
              </button>
            </>
          }
        >
          <div className="space-y-4">
            {(access.account.memberships ?? []).length > 1 && (
              <div>
                <label className="block text-caption font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  الجمعية
                </label>
                <Select
                  value={access.charityId}
                  onSelect={switchAccessCharity}
                  placeholder="اختر الجمعية…"
                  options={(access.account.memberships ?? []).map((m: Membership) => ({
                    value: m.charityId,
                    label: m.charityName,
                  }))}
                  className="w-full [&>button]:w-full [&>button]:justify-between"
                />
              </div>
            )}

            <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={access.isOfficial}
                onChange={(e) => setAccess({ ...access, isOfficial: e.target.checked })}
                className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary focus:ring-offset-0 border-slate-300"
              />
              <span>
                <span className="block text-caption font-semibold text-slate-700 dark:text-slate-300">
                  حساب الجمعية الرسمي
                </span>
                <span className="block text-caption text-slate-500 dark:text-slate-400 mt-0.5">
                  يحمل كل الصلاحيات — بما يُضاف منها لاحقاً — ويمنحها لبقية حسابات الجمعية.
                </span>
              </span>
            </label>

            {access.isOfficial ? (
              <p className="text-caption font-semibold text-primary dark:text-teal-400 bg-primary/[0.06] dark:bg-teal-400/[0.06] rounded-xl p-3 leading-relaxed">
                حساب الجمعية يملك جميع الصلاحيات ويُفوَّض بكل خدماتها تلقائياً.
              </p>
            ) : (
              <AccessPicker
                charityServices={servicesOf(access.charityId)}
                services={access.services}
                permissions={access.permissions}
                onServices={(services) => setAccess({ ...access, services })}
                onPermissions={(permissions) => setAccess({ ...access, permissions })}
              />
            )}
          </div>
        </Dialog>
      )}

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
        <span className="max-w-0 overflow-hidden whitespace-nowrap font-semibold text-caption group-hover:max-w-xs group-hover:mr-3 transition-all duration-300 ease-out">
          إضافة حساب جديد
        </span>
      </button>
    </div>
  );
}
