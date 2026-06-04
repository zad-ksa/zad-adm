"use client";

import { useState, useTransition } from "react";
import { 
  Coins, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  ClipboardList,
  Percent,
  CircleDollarSign,
  ArrowDownLeft,
  ChevronRight
} from "lucide-react";
import { updateCharityFinanceAction } from "@/app/actions/charity";

interface Charity {
  id: string;
  name: string;
  logoUrl: string | null;
  contractValue: number;
  paidAmount: number;
  grants: number;
}

export default function FinanceClient({
  charity,
}: {
  charity: Charity;
}) {
  const [contractValue, setContractValue] = useState<number | "">(charity.contractValue);
  const [paidAmount, setPaidAmount] = useState<number | "">(charity.paidAmount);
  const [grants, setGrants] = useState<number | "">(charity.grants);

  const [currentFinance, setCurrentFinance] = useState({
    contractValue: charity.contractValue,
    paidAmount: charity.paidAmount,
    grants: charity.grants,
  });

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

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

  // Calculations
  const remainingAmount = Math.max(0, currentFinance.contractValue - currentFinance.paidAmount);
  const disbursementPercentage = currentFinance.contractValue > 0 
    ? Math.min(100, (currentFinance.paidAmount / currentFinance.contractValue) * 100)
    : 0;

  // Handle Form Submit
  const handleUpdateFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contractValue === "" || paidAmount === "" || grants === "") return;

    if (Number(paidAmount) > Number(contractValue)) {
      showNotification("error", "لا يمكن للمبلغ المدفوع أن يتجاوز قيمة العقد الكلية");
      return;
    }

    startTransition(async () => {
      const res = await updateCharityFinanceAction(charity.id, {
        contractValue: Number(contractValue),
        paidAmount: Number(paidAmount),
        grants: Number(grants),
      });

      if (res.success && res.charity) {
        setCurrentFinance({
          contractValue: res.charity.contractValue,
          paidAmount: res.charity.paidAmount,
          grants: res.charity.grants,
        });
        setShowEditForm(false);
        showNotification("success", "تم تحديث البيانات المالية بنجاح");
      } else {
        showNotification("error", res.message || "حدث خطأ أثناء حفظ التعديلات");
      }
    });
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in font-bold text-sm">
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

      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {charity.logoUrl ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-white flex items-center justify-center">
                <img src={charity.logoUrl} alt={charity.name} className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                <CircleDollarSign className="w-8 h-8" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">{charity.name}</h1>
              <p className="text-slate-500 text-sm font-semibold">إدارة البيانات والمؤشرات المالية</p>
            </div>
          </div>

          <button
            onClick={() => setShowEditForm(!showEditForm)}
            className="bg-primary hover:bg-primary/95 text-white py-3 px-5 rounded-xl font-bold text-sm shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center"
          >
            <Sparkles className="w-4 h-4" />
            <span>تحديث البيانات المالية</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Finance Cards and Progress (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Top Row Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: قيمة العقد */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 group-hover:w-3 transition-all"></div>
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">قيمة العقد الكلية</p>
                <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                  {currentFinance.contractValue.toLocaleString()} <span className="text-sm font-bold text-slate-400">ريال</span>
                </h3>
              </div>
            </div>

            {/* Card 2: المنح */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 group-hover:w-3 transition-all"></div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">إجمالي المنح</p>
                <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                  {currentFinance.grants.toLocaleString()} <span className="text-sm font-bold text-slate-400">ريال</span>
                </h3>
              </div>
            </div>

            {/* Card 3: المدفوع */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-violet-500 group-hover:w-3 transition-all"></div>
              <div className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">المبلغ المدفوع</p>
                <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                  {currentFinance.paidAmount.toLocaleString()} <span className="text-sm font-bold text-slate-400">ريال</span>
                </h3>
              </div>
            </div>

            {/* Card 4: المتبقي */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 group-hover:w-3 transition-all"></div>
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1">المبلغ المتبقي</p>
                <h3 className="text-2xl font-black text-slate-850 tracking-tight">
                  {remainingAmount.toLocaleString()} <span className="text-sm font-bold text-slate-400">ريال</span>
                </h3>
              </div>
            </div>

          </div>

          {/* Disbursement Percentage Card */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary" />
                نسبة الصرف الفعلي
              </h3>
              <span className={`px-3 py-1.5 rounded-full text-xs font-black shadow-sm ${
                disbursementPercentage >= 100 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                disbursementPercentage >= 50 ? "bg-blue-50 text-blue-700 border border-blue-100" :
                "bg-amber-50 text-amber-700 border border-amber-100"
              }`}>
                {disbursementPercentage.toFixed(1)}% مكتمل
              </span>
            </div>

            {/* Progress Bar container */}
            <div className="space-y-4">
              <div className="w-full bg-slate-50 border border-slate-100 h-6 rounded-full overflow-hidden p-1 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-700 relative ${
                    disbursementPercentage >= 100 ? "bg-emerald-500" :
                    disbursementPercentage >= 50 ? "bg-blue-500" :
                    "bg-amber-500"
                  }`}
                  style={{ width: `${disbursementPercentage}%` }}
                >
                  {disbursementPercentage > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white leading-none">
                      {disbursementPercentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                <span>0 ريال (بداية الصرف)</span>
                <span>{currentFinance.contractValue.toLocaleString()} ريال (القيمة الإجمالية)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Edit Form (1/3 width, hidden by default unless clicked) */}
        <div className={`lg:col-span-1 ${showEditForm ? "block" : "hidden lg:block opacity-45 pointer-events-none"}`}>
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-5">
            <h3 className="text-lg font-black text-slate-850 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              تحديث البيانات المالية
            </h3>
            
            <form onSubmit={handleUpdateFinance} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">قيمة العقد الكلية (ريال)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="مثال: 500000"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">المبلغ المدفوع حتى الآن (ريال)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="مثال: 200000"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 mb-2">إجمالي المنح (ريال)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={grants}
                  onChange={(e) => setGrants(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="مثال: 150000"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 focus:bg-white text-slate-800 transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || contractValue === "" || paidAmount === "" || grants === ""}
                className="w-full bg-primary hover:bg-primary/95 text-white py-3 px-4 rounded-xl font-bold text-sm shadow-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                <span>حفظ التعديلات المالية</span>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
