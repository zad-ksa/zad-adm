"use client";

import { useState, useTransition } from "react";
import {
  Coins,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Calendar,
  Layers,
  HandCoins,
  History,
  MessageSquare,
  Check,
  X
} from "lucide-react";
import {
  addFinancialTransactionAction
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

type ActionType = "CONTRACT_UPDATE" | "PAID_UPDATE" | "DISBURSEMENT" | "UPDATE_REVENUE";

export default function FinanceClient({
  charity,
  initialLogs,
  initialInstallments,
}: {
  charity: Charity;
  initialLogs: any[];
  initialInstallments: any[];
}) {
  const [logs, setLogs] = useState<FinancialLog[]>(initialLogs || []);
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

  const [installmentModal, setInstallmentModal] = useState<{ isOpen: boolean; id: string | null; isPaid: boolean }>({ isOpen: false, id: null, isPaid: false });

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

  const promptToggleInstallment = (id: string, isPaid: boolean) => {
    setInstallmentModal({ isOpen: true, id, isPaid });
  };

  const confirmToggleInstallment = async () => {
    if (!installmentModal.id) return;
    startTransition(async () => {
      const res = await toggleInstallmentPaid(installmentModal.id!, installmentModal.isPaid);
      if (res.success && res.installment) {
        setInstallments((prev) => prev.map(i => i.id === installmentModal.id ? { ...i, isPaid: installmentModal.isPaid } : i));

        const amountChange = installmentModal.isPaid ? res.installment.amount : -res.installment.amount;
        setCurrentFinance(prev => ({ ...prev, paidAmount: Math.max(0, prev.paidAmount + amountChange) }));

        setLogs(prev => [{
          id: Date.now().toString(),
          charityId: charity.id,
          type: "DISBURSEMENT",
          amount: installmentModal.isPaid ? res.installment.amount : -res.installment.amount,
          notes: installmentModal.isPaid ? "سداد قسط مستحق" : "إلغاء سداد قسط",
          createdAt: new Date()
        } as unknown as FinancialLog, ...prev]);

        showNotification("success", "تم تحديث حالة الدفعة");
        setInstallmentModal({ isOpen: false, id: null, isPaid: false });
      } else {
        showNotification("error", (res as any).error || "حدث خطأ");
      }
    });
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "CONTRACT_UPDATE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-black border border-blue-100 dark:border-blue-500/20">تحديث العقد</span>;
      case "PAID_UPDATE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-black border border-purple-100 dark:border-purple-500/20">تحديث المدفوع</span>;
      case "ADD_GRANT": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black border border-emerald-100 dark:border-emerald-500/20">إضافة منحة</span>;
      case "DISBURSEMENT": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-black border border-amber-100 dark:border-amber-500/20">صرف مالي</span>;
      default: return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black border border-slate-100 dark:border-slate-600">عملية مالية</span>;
    }
  };

  return (
    <div className="space-y-8 transition-colors animate-fade-in" dir="rtl">
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

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {charity.logoUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center p-0.5 shrink-0">
                <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 shrink-0">
                <CircleDollarSign className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-base font-black text-slate-800 dark:text-slate-100 mb-0.5">{charity.name} - الوضع المالي</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">الإدارة المالية والسجل المالي للمشروع</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500 group-hover:w-2.5 transition-all"></div>
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">الإيراد السنوي</p>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {currentFinance.annualRevenue ? currentFinance.annualRevenue.toLocaleString('en-US') : "0"} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500 group-hover:w-2.5 transition-all"></div>
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">قيمة العقد</p>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {currentFinance.contractValue.toLocaleString('en-US')} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 group-hover:w-2.5 transition-all"></div>
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
              <HandCoins className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">إجمالي المنح</p>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {currentFinance.grants.toLocaleString('en-US')} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500 group-hover:w-2.5 transition-all"></div>
            <div className="w-8 h-8 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">المبلغ المدفوع</p>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {currentFinance.paidAmount.toLocaleString('en-US')} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3 hover:shadow-md transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 group-hover:w-2.5 transition-all"></div>
            <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">المبلغ المتبقي</p>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                {remainingAmount.toLocaleString('en-US')} <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">ريال</span>
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Installments Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700/50 pb-3">
              <Layers className="w-4 h-4 text-primary" />
              دفعات العقد (الأقساط)
            </h3>
            <div className="space-y-4">
              {installments.map((installment) => (
                <div key={installment.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${installment.isPaid ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-4">
                    <button
                      disabled={isPending}
                      onClick={() => promptToggleInstallment(installment.id, !installment.isPaid)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${installment.isPaid ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 border-2 border-slate-200 dark:border-slate-600 hover:border-emerald-400 hover:text-emerald-500'}`}
                    >
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </button>
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg">
                        {installment.amount.toLocaleString('en-US')} <span className="text-sm font-bold text-slate-400 dark:text-slate-500">ريال</span>
                      </h4>
                      {installment.dueDate && (
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          تاريخ الاستحقاق: {new Date(installment.dueDate).toLocaleDateString("ar-SA")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-black ${installment.isPaid ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                      {installment.isPaid ? 'تم الدفع' : 'غير مدفوع'}
                    </span>
                  </div>
                </div>
              ))}
              {installments.length === 0 && (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="font-bold text-sm">لا توجد دفعات مسجلة حالياً</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700/50 pb-3">
              <History className="w-4 h-4 text-primary" />
              سجل الحركات المالية
            </h3>
            <div className="relative pr-6 border-r-2 border-slate-100 dark:border-slate-700 space-y-8 mr-2">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-slate-800 bg-blue-500 shadow-sm"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getLogTypeBadge(log.type)}
                        <span className="text-base font-black text-slate-800 dark:text-slate-100">
                          {log.amount.toLocaleString('en-US')} ريال
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{log.notes}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold shrink-0">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(log.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm font-bold text-slate-400 dark:text-slate-500">لا يوجد سجل حركات</p>}
            </div>
          </div>
        </div>
      </div>

      {installmentModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 text-center">
            <div className="p-8">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner border ${installmentModal.isPaid ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border-emerald-100 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-500 border-amber-100 dark:border-amber-500/20'}`}>
                {installmentModal.isPaid ? <Check className="w-10 h-10" strokeWidth={3} /> : <X className="w-10 h-10" strokeWidth={3} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">
                {installmentModal.isPaid ? 'تأكيد سداد القسط' : 'إلغاء سداد القسط'}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                {installmentModal.isPaid
                  ? 'هل أنت متأكد من تسجيل هذا القسط كمدفوع؟'
                  : 'هل أنت متأكد من إلغاء سداد هذا القسط؟'}
              </p>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg inline-block">
                {installmentModal.isPaid
                  ? 'سيتم إضافة المبلغ إلى السجل المالي وتحديث إجمالي المدفوعات.'
                  : 'سيتم خصم المبلغ من السجل المالي وتحديث إجمالي المدفوعات.'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setInstallmentModal({ isOpen: false, id: null, isPaid: false })}
                className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={isPending}
              >
                تراجع
              </button>
              <button
                onClick={confirmToggleInstallment}
                disabled={isPending}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 ${
                  installmentModal.isPaid ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                }`}
              >
                {isPending ? 'جاري التنفيذ...' : 'نعم، تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
