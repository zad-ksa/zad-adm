"use client";

import React, { useState, useTransition } from "react";
import { FileSignature, Calendar, DollarSign, AlertCircle, CheckCircle2, TrendingUp, Users, Settings, Loader2 } from "lucide-react";
import ManageInstallmentsModal from "./ManageInstallmentsModal";
import { toggleInstallmentPaid } from "@/app/actions/contracts";

type Installment = {
  id: string;
  amount: number;
  dueDate: Date | null;
  isLinkedToFirstGrant: boolean;
  isPaid: boolean;
};

type ContractData = {
  id: string; // charity id
  charityName: string;
  totalValue: number;
  creationDate: string;
  status: string;
  installments: Installment[];
};

type Props = {
  contractsData: ContractData[];
  totalContractsCount: number;
  activeContractsCount: number;
  totalValue: number;
  dueThisMonth: (Installment & { charityName: string; contractId: string })[];
  dueAmountThisMonth: number;
  currentMonth: string;
  currentYear: string;
  totalPaidValue: number;
  canEdit: boolean;
};

export default function ContractsClient({
  contractsData,
  totalContractsCount,
  activeContractsCount,
  totalValue,
  dueThisMonth,
  dueAmountThisMonth,
  currentMonth,
  currentYear,
  totalPaidValue,
  canEdit
}: Props) {
  const [selectedCharityId, setSelectedCharityId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleQuickPay = (id: string) => {
    startTransition(async () => {
      await toggleInstallmentPaid(id, true);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSignature className="w-7 h-7 text-primary" />
            إدارة العقود
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            لوحة تحكم شاملة لمتابعة العقود، تفاصيلها، والأقساط المستحقة للجمعيات.
          </p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">إجمالي العقود</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalContractsCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
              <FileSignature className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="text-emerald-500 ml-1">{activeContractsCount} نشط</span>
            من إجمالي العقود
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">القيمة الإجمالية للعقود</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalValue.toLocaleString()} ر.س</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            <TrendingUp className="w-3 h-3 text-emerald-500 ml-1" />
            نمو مستمر في الشراكات
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">إجمالي المبالغ المسددة</p>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalPaidValue.toLocaleString()} ر.س</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            مجموع الأقساط المحصلة فعلياً
          </div>
        </div>



        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">قيمة مستحقات الشهر</p>
              <h3 className="text-2xl font-bold text-red-500">{dueAmountThisMonth.toLocaleString()} ر.س</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-bold text-slate-500 dark:text-slate-400">
            المبالغ المطلوبة خلال الشهر الحالي
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Contracts List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              قائمة العقود مع الجمعيات
            </h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4 font-bold">الجمعية</th>
                  <th className="px-6 py-4 font-bold">القيمة الإجمالية</th>
                  <th className="px-6 py-4 font-bold">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 font-bold text-center">الحالة</th>
                  {canEdit && <th className="px-6 py-4 font-bold text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contractsData.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100">
                      {contract.charityName}
                    </td>
                    <td className="px-6 py-4 text-emerald-600 dark:text-emerald-400 font-bold">
                      {contract.totalValue.toLocaleString()} ر.س
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {contract.creationDate}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        contract.status === "active" 
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                      }`}>
                        {contract.status === "active" ? "نشط" : "مكتمل"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedCharityId(contract.id)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors inline-flex items-center gap-1"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          إدارة الأقساط
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Installments Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-full">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              أقساط هذا الشهر ({currentMonth}/{currentYear})
              <span className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 py-0.5 px-2 rounded-full text-xs font-bold mr-auto">
                {dueThisMonth.length} أقساط
              </span>
            </h3>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            {dueThisMonth.length > 0 ? (
              <div className="space-y-4">
                {dueThisMonth.map((installment, index) => (
                  <div key={index} className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {installment.charityName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">قيمة القسط</span>
                        <span className="text-base font-bold text-red-500">{installment.amount.toLocaleString()} ر.س</span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">تاريخ الاستحقاق</span>
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('en-CA') : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 text-center">
                <CheckCircle2 className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-sm font-medium">لا توجد أقساط مستحقة لهذا الشهر</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* All Installments per contract - Detailed view */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            تفاصيل الأقساط الدورية لكل عقد
          </h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractsData.map(contract => (
             <div key={contract.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/20">
               <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
                 <h4 className="font-bold text-slate-800 dark:text-slate-200">{contract.charityName}</h4>
                 {canEdit && (
                   <button 
                      onClick={() => setSelectedCharityId(contract.id)}
                      className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md transition-colors"
                    >
                      تعديل
                    </button>
                 )}
               </div>
               <div className="space-y-3">
                 {contract.installments.length === 0 && (
                    <span className="text-xs text-slate-500">لا توجد أقساط</span>
                 )}
                 {contract.installments.map((inst, idx) => (
                   <div key={idx} className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                        {inst.isLinkedToFirstGrant && !inst.dueDate 
                          ? <span className="text-amber-500 font-bold text-[10px]">بانتظار المنحة الأولى</span>
                          : inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-CA') : ""}
                     </span>
                     <div className="flex items-center gap-3">
                       <span className="font-bold text-slate-700 dark:text-slate-300">{inst.amount.toLocaleString()}</span>
                       {inst.isPaid ? (
                         <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                       ) : (
                         <span className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600"></span>
                       )}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          ))}
        </div>
      </div>

      {(() => {
        if (!selectedCharityId) return null;
        const selectedContract = contractsData.find(c => c.id === selectedCharityId);
        if (!selectedContract) return null;
        
        return (
          <ManageInstallmentsModal 
            charityId={selectedContract.id}
            charityName={selectedContract.charityName}
            totalValue={selectedContract.totalValue}
            installments={selectedContract.installments}
            onClose={() => setSelectedCharityId(null)}
          />
        );
      })()}
    </div>
  );
}
