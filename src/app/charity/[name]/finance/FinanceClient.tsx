"use client";

import { useState, useTransition } from "react";
import {
  Coins,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Percent,
  CircleDollarSign,
  Calendar,
  Layers,
  ArrowDownRight,
  HandCoins,
  History,
  MessageSquare,
  Building2,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { 
  addFinancialTransactionAction, 
  addDonorAccount, 
  deleteDonorAccount, 
  addGrantApplication, 
  updateGrantApplicationStatus, 
  deleteGrantApplication 
} from "@/app/actions/charity";
import { updateCharityRevenueAndSize } from "@/app/actions/governance";
import { toggleInstallmentPaid } from "@/app/actions/contracts";

interface FinancialLog {
  id: string;
  charityId: string;
  type: string;
  amount: number;
  notes: string | null;
  createdAt: Date | string;
}

interface DonorAccount {
  id: string;
  donorName: string;
  username: string;
  password: string;
  website: string | null;
}

interface GrantApplication {
  id: string;
  initiativeName: string;
  requestedAmount: number;
  status: string;
}

interface ContractInstallment {
  id: string;
  amount: number;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
}

interface Charity {
  id: string;
  name: string;
  logoUrl: string | null;
  contractValue: number;
  paidAmount: number;
  grants: number;
  annualRevenue?: number | null;
}

type ActionType = "CONTRACT_UPDATE" | "PAID_UPDATE" | "ADD_GRANT" | "DISBURSEMENT" | "UPDATE_REVENUE";
type TabType = "STATUS" | "DONORS" | "GRANTS";

export default function FinanceClient({
  charity,
  initialLogs,
  initialDonorAccounts,
  initialGrantApplications,
  initialInstallments,
}: {
  charity: Charity;
  initialLogs: any[];
  initialDonorAccounts: any[];
  initialGrantApplications: any[];
  initialInstallments: any[];
}) {
  const [activeTab, setActiveTab] = useState<TabType>("DONORS");
  
  const [logs, setLogs] = useState<FinancialLog[]>(initialLogs || []);
  const [donorAccounts, setDonorAccounts] = useState<DonorAccount[]>(initialDonorAccounts || []);
  const [grantApplications, setGrantApplications] = useState<GrantApplication[]>(initialGrantApplications || []);
  const [installments, setInstallments] = useState<ContractInstallment[]>(initialInstallments || []);

  const [currentFinance, setCurrentFinance] = useState({
    contractValue: charity.contractValue || 0,
    paidAmount: charity.paidAmount || 0,
    grants: charity.grants || 0,
    annualRevenue: charity.annualRevenue || 0,
  });

  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showAddDonor, setShowAddDonor] = useState(false);
  const [donorForm, setDonorForm] = useState({ name: "", username: "", password: "", website: "" });

  const [showAddGrant, setShowAddGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({ initiative: "", amount: "", entityName: "" });

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

  const remainingAmount = Math.max(0, currentFinance.contractValue - currentFinance.paidAmount);


  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || amount === "") return;

    if (activeAction === "DISBURSEMENT" && Number(amount) + currentFinance.paidAmount > currentFinance.contractValue) {
      if (!confirm("تنبيه: مبلغ الصرف هذا سيجعل إجمالي المدفوع يتجاوز قيمة العقد. هل تريد الاستمرار؟")) {
        return;
      }
    }

    startTransition(async () => {
      if (activeAction === "UPDATE_REVENUE") {
        const res = await updateCharityRevenueAndSize(charity.id, Number(amount));
        if (res.success) {
          setCurrentFinance(prev => ({ ...prev, annualRevenue: res.revenue || 0 }));
          setAmount("");
          setNotes("");
          setActiveAction(null);
          showNotification("success", "تم تحديث الإيراد السنوي بنجاح");
        } else {
          showNotification("error", res.error || "حدث خطأ");
        }
        return;
      }

      const res = await addFinancialTransactionAction(charity.id, activeAction, Number(amount), notes);
      if (res.success && res.charity && res.log) {
        setCurrentFinance(prev => ({
          ...prev,
          contractValue: res.charity.contractValue,
          paidAmount: res.charity.paidAmount,
          grants: res.charity.grants,
        }));
        setLogs((prev) => [res.log as unknown as FinancialLog, ...prev]);
        setAmount("");
        setNotes("");
        setActiveAction(null);
        showNotification("success", "تم تسجيل العملية المالية بنجاح");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addDonorAccount(charity.id, donorForm.name, donorForm.username, donorForm.password, donorForm.website);
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

  const handleAddGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addGrantApplication(charity.id, grantForm.initiative, Number(grantForm.amount), grantForm.entityName);
      if (res.success && res.grant) {
        setGrantApplications((prev) => [res.grant as unknown as GrantApplication, ...prev]);
        setGrantForm({ initiative: "", amount: "", entityName: "" });
        setShowAddGrant(false);
        showNotification("success", "تم رفع المنحة بنجاح");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const handleUpdateGrantStatus = async (id: string, status: "PENDING" | "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await updateGrantApplicationStatus(id, charity.id, status);
      if (res.success) {
        setGrantApplications((prev) => prev.map(g => g.id === id ? { ...g, status } : g));
        showNotification("success", "تم تحديث حالة المنحة");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const handleToggleInstallment = async (id: string, isPaid: boolean) => {
    startTransition(async () => {
      const res = await toggleInstallmentPaid(id, isPaid);
      if (res.success) {
        setInstallments((prev) => prev.map(i => i.id === id ? { ...i, isPaid } : i));
        showNotification("success", "تم تحديث حالة الدفعة");
      } else {
        showNotification("error", (res as any).error || "حدث خطأ");
      }
    });
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "CONTRACT_UPDATE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">تحديث العقد</span>;
      case "PAID_UPDATE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-black border border-purple-100">تحديث المدفوع</span>;
      case "ADD_GRANT": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black border border-emerald-100">إضافة منحة</span>;
      case "DISBURSEMENT": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black border border-amber-100">صرف مالي</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg text-xs font-black border border-slate-100">عملية مالية</span>;
    }
  };

  const renderStatusTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500 group-hover:w-3 transition-all"></div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">الإيراد السنوي</p>
              <h3 className="text-xl font-black text-slate-800">
                {currentFinance.annualRevenue ? currentFinance.annualRevenue.toLocaleString('en-US') : "0"} <span className="text-sm font-bold text-slate-400">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 group-hover:w-3 transition-all"></div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">قيمة العقد</p>
              <h3 className="text-xl font-black text-slate-800">
                {currentFinance.contractValue.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 group-hover:w-3 transition-all"></div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">إجمالي المنح</p>
              <h3 className="text-xl font-black text-slate-800">
                {currentFinance.grants.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-purple-500 group-hover:w-3 transition-all"></div>
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">المبلغ المدفوع</p>
              <h3 className="text-xl font-black text-slate-800">
                {currentFinance.paidAmount.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all"></div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1">المبلغ المتبقي</p>
              <h3 className="text-xl font-black text-slate-800">
                {remainingAmount.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">ريال</span>
              </h3>
            </div>
          </div>
        </div>



        {/* Installments Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
            <Layers className="w-5 h-5 text-primary" />
            دفعات العقد (الأقساط)
          </h3>
          <div className="space-y-4">
            {installments.map((installment) => (
              <div key={installment.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${installment.isPaid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center gap-4">
                  <button 
                    disabled={isPending}
                    onClick={() => handleToggleInstallment(installment.id, !installment.isPaid)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${installment.isPaid ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-300 border-2 border-slate-200 hover:border-emerald-400 hover:text-emerald-500'}`}
                  >
                    <Check className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">
                      {installment.amount.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400">ريال</span>
                    </h4>
                    {installment.dueDate && (
                      <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        تاريخ الاستحقاق: {new Date(installment.dueDate).toLocaleDateString("ar-SA")}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-black ${installment.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {installment.isPaid ? 'تم الدفع' : 'غير مدفوع'}
                  </span>
                </div>
              </div>
            ))}
            {installments.length === 0 && (
              <div className="text-center py-6 text-slate-400">
                <Layers className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="font-bold text-sm">لا توجد دفعات مسجلة حالياً</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
            <History className="w-5 h-5 text-primary" />
            سجل الحركات المالية
          </h3>
          <div className="relative pr-6 border-r-2 border-slate-100 space-y-8 mr-2">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-blue-500 shadow-sm"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getLogTypeBadge(log.type)}
                      <span className="text-base font-black text-slate-800">
                        {log.amount.toLocaleString('en-US')} ريال
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-100 w-fit">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.notes}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(log.createdAt).toLocaleDateString("ar-SA")}</span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm font-bold text-slate-400">لا يوجد سجل حركات</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            إجراءات سريعة
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { type: "UPDATE_REVENUE", label: "تحديث الإيراد السنوي", icon: <TrendingUp className="w-5 h-5"/>, color: "indigo" },
              { type: "ADD_GRANT", label: "إضافة منحة للعقد", icon: <HandCoins className="w-5 h-5"/>, color: "emerald" },
              { type: "DISBURSEMENT", label: "صرف مالي", icon: <ArrowDownRight className="w-5 h-5"/>, color: "amber" },
              { type: "CONTRACT_UPDATE", label: "تحديث العقد", icon: <Coins className="w-5 h-5"/>, color: "blue" },
              { type: "PAID_UPDATE", label: "تحديث المدفوع", icon: <Wallet className="w-5 h-5"/>, color: "purple" }
            ].map(btn => (
              <button
                key={btn.type}
                onClick={() => {
                  setActiveAction(activeAction === btn.type ? null : (btn.type as ActionType));
                  setAmount(""); setNotes("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-between border transition-all ${
                  activeAction === btn.type ? `bg-${btn.color}-600 border-${btn.color}-600 text-white shadow-lg` : `bg-${btn.color}-50/50 text-${btn.color}-700 border-${btn.color}-100 hover:bg-${btn.color}-50`
                }`}
              >
                <span className="flex items-center gap-2">{btn.icon} {btn.label}</span>
              </button>
            ))}
          </div>
          {activeAction && (
            <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4 mt-4">
              <form onSubmit={handleSubmitTransaction} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5">المبلغ (ريال)</label>
                  <input
                    type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value) || "")}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 mb-1.5">ملاحظات</label>
                  <textarea
                    value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-bold resize-none"
                  />
                </div>
                <button type="submit" disabled={isPending || !amount} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow hover:bg-primary/90 disabled:opacity-50">
                  تأكيد العملية
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDonorsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            حسابات الجهات المانحة
          </h3>
          <p className="text-sm text-slate-500 mt-1">تخزين آمن لبيانات الدخول للجهات المانحة.</p>
        </div>
        <button onClick={() => setShowAddDonor(!showAddDonor)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-sm whitespace-nowrap">
          <Plus className="w-5 h-5" /> إضافة حساب
        </button>
      </div>

      {showAddDonor && (
        <form onSubmit={handleAddDonor} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم الجهة المانحة</label>
            <input required type="text" value={donorForm.name} onChange={e => setDonorForm({...donorForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم المستخدم</label>
            <input required type="text" value={donorForm.username} onChange={e => setDonorForm({...donorForm, username: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">كلمة المرور</label>
            <input required type="text" value={donorForm.password} onChange={e => setDonorForm({...donorForm, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">رابط الموقع (اختياري)</label>
            <input type="url" value={donorForm.website} onChange={e => setDonorForm({...donorForm, website: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <button type="submit" disabled={isPending} className="w-full bg-primary text-white py-2.5 rounded-xl font-bold shadow hover:bg-primary/90 disabled:opacity-50 h-[42px]">
            حفظ الحساب
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {donorAccounts.map(account => (
          <div key={account.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
            <button onClick={() => {
              if (confirm("هل أنت متأكد من الحذف؟")) startTransition(() => {
                deleteDonorAccount(account.id, charity.id);
                setDonorAccounts(prev => prev.filter(a => a.id !== account.id));
              });
            }} className="absolute top-4 left-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="font-black text-slate-800 text-lg mb-4">{account.donorName}</h4>
            <div className="space-y-3 mb-6">
              <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100 group/item">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">اسم المستخدم</span>
                  <span className="text-sm font-bold text-slate-700">{account.username}</span>
                </div>
                <button onClick={() => copyToClipboard(account.username)} className="text-slate-400 hover:text-primary p-1.5 bg-white rounded-lg border border-slate-200 opacity-0 md:opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy className="w-4 h-4"/></button>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100 group/item">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-0.5">كلمة المرور</span>
                  <span className="text-sm font-bold text-slate-700">{account.password}</span>
                </div>
                <button onClick={() => copyToClipboard(account.password)} className="text-slate-400 hover:text-primary p-1.5 bg-white rounded-lg border border-slate-200 opacity-0 md:opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity"><Copy className="w-4 h-4"/></button>
              </div>
            </div>
            {account.website && (
              <a href={account.website} target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">
                فتح الموقع <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        ))}
        {donorAccounts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold">لا توجد حسابات مضافة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderGrantsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            المنح المرفوعة للجمعية
          </h3>
          <p className="text-sm text-slate-500 mt-1">متابعة طلبات المنح والمبادرات المقدمة للجهات.</p>
        </div>
        <button onClick={() => setShowAddGrant(!showAddGrant)} className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 shadow-sm whitespace-nowrap">
          <Plus className="w-5 h-5" /> إضافة منحة
        </button>
      </div>

      {showAddGrant && (
        <form onSubmit={handleAddGrant} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md animate-fade-in grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">الجهة المرفوع لها</label>
            <input required type="text" value={grantForm.entityName} onChange={e => setGrantForm({...grantForm, entityName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">اسم المبادرة / المنحة</label>
            <input required type="text" value={grantForm.initiative} onChange={e => setGrantForm({...grantForm, initiative: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المطلوب (ريال)</label>
            <input required type="number" min="0" value={grantForm.amount} onChange={e => setGrantForm({...grantForm, amount: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold" />
          </div>
          <button type="submit" disabled={isPending} className="w-full bg-primary text-white py-2.5 rounded-xl font-bold shadow hover:bg-primary/90 disabled:opacity-50 h-[42px]">
            حفظ المنحة
          </button>
        </form>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm font-black">
              <tr>
                <th className="p-4">الجهة المرفوع لها</th>
                <th className="p-4">اسم المبادرة</th>
                <th className="p-4">المبلغ المطلوب</th>
                <th className="p-4">حالة الطلب</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grantApplications.map(grant => (
                <tr key={grant.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-4 font-bold text-slate-800">{(grant as any).entityName || "غير محدد"}</td>
                  <td className="p-4 font-bold text-slate-800">{grant.initiativeName}</td>
                  <td className="p-4 font-bold text-slate-600">{grant.requestedAmount.toLocaleString('en-US')} ريال</td>
                  <td className="p-4">
                    <select 
                      value={grant.status} 
                      onChange={(e) => handleUpdateGrantStatus(grant.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border-none outline-none appearance-none cursor-pointer ${
                        grant.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                        grant.status === "REJECTED" ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <option value="PENDING">تحت الدراسة</option>
                      <option value="APPROVED">مقبول</option>
                      <option value="REJECTED">مرفوض</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button onClick={() => {
                      if (confirm("هل أنت متأكد من الحذف؟")) startTransition(() => {
                        deleteGrantApplication(grant.id, charity.id);
                        setGrantApplications(prev => prev.filter(g => g.id !== grant.id));
                      });
                    }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {grantApplications.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">لا توجد منح مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 transition-colors" dir="rtl">
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Tabs Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            {charity.logoUrl ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0">
                <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <CircleDollarSign className="w-7 h-7" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-800 mb-1">{charity.name}</h1>
              <p className="text-slate-500 text-sm font-bold">الإدارة المالية والموارد</p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full no-scrollbar">
            <button 
              onClick={() => setActiveTab("DONORS")} 
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === "DONORS" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              حسابات المانحين
            </button>
            <button 
              onClick={() => setActiveTab("GRANTS")} 
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === "GRANTS" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              المنح المرفوعة
            </button>
            <button 
              onClick={() => setActiveTab("STATUS")} 
              className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${activeTab === "STATUS" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              الوضع المالي
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Tab */}
      <div className="animate-fade-in">
        {activeTab === "STATUS" && renderStatusTab()}
        {activeTab === "DONORS" && renderDonorsTab()}
        {activeTab === "GRANTS" && renderGrantsTab()}
      </div>
    </div>
  );
}
