"use client";

import { useState, useTransition } from "react";
import { StatStrip, PageHeader } from "@/components/console/layout";
import { charityCrumbs } from "@/lib/crumbs";
import {
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Calendar,
  Layers,
  History,
  MessageSquare,
  Check,
  X
} from "lucide-react";
import { toggleInstallmentPaid } from "@/app/actions/contracts";
import { ConfirmDialog } from "@/components/console/ConfirmDialog";

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
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

          <PageHeader
            crumbs={charityCrumbs(charity.name, { label: "الوضع المالي" })}
            icon={
              charity.logoUrl ? (
                <span className="block w-7 h-7 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                  <img src={charity.logoUrl} alt="" className="w-full h-full object-contain" />
                </span>
              ) : (
                <CircleDollarSign className="w-6 h-6" />
              )
            }
            title="الوضع المالي"
            description="الإدارة المالية والسجل المالي للمشروع"
          />

      <div className="space-y-5">
        <StatStrip
          items={[
            { label: "الإيراد السنوي", value: (currentFinance.annualRevenue || 0).toLocaleString("en-US"), unit: "ريال" },
            { label: "قيمة العقد", value: currentFinance.contractValue.toLocaleString("en-US"), unit: "ريال" },
            { label: "إجمالي المنح", value: currentFinance.grants.toLocaleString("en-US"), unit: "ريال" },
            { label: "المبلغ المدفوع", value: currentFinance.paidAmount.toLocaleString("en-US"), unit: "ريال", dot: "active" },
            {
              label: "المبلغ المتبقي",
              value: remainingAmount.toLocaleString("en-US"),
              unit: "ريال",
              dot: remainingAmount > 0 ? "warn" : undefined,
            },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Installments Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700/50 pb-3">
              <Layers className="w-4 h-4 text-primary" />
              دفعات العقد (الأقساط)
            </h3>
            <div className="space-y-4">
              {installments.map((installment) => (
                <div key={installment.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${installment.isPaid ? 'bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'}`}>
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
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
        <ConfirmDialog
          title={installmentModal.isPaid ? "تأكيد سداد القسط" : "إلغاء سداد القسط"}
          message={
            installmentModal.isPaid
              ? "سيُسجَّل القسط مدفوعاً، ويُضاف المبلغ إلى السجل المالي وإجمالي المدفوعات."
              : "سيُلغى سداد القسط، ويُخصم المبلغ من السجل المالي وإجمالي المدفوعات."
          }
          confirmLabel={installmentModal.isPaid ? "نعم، تأكيد السداد" : "نعم، إلغاء السداد"}
          tone={installmentModal.isPaid ? "primary" : "danger"}
          isPending={isPending}
          onConfirm={confirmToggleInstallment}
          onCancel={() => setInstallmentModal({ isOpen: false, id: null, isPaid: false })}
        />
      )}
    </div>
  );
}
