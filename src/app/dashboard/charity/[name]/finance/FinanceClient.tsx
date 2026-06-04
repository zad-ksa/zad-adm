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
  Calendar,
  Layers,
  ArrowDownRight,
  HandCoins,
  History,
  MessageSquare
} from "lucide-react";
import { addFinancialTransactionAction } from "@/app/actions/charity";

interface FinancialLog {
  id: string;
  charityId: string;
  type: string; // "CONTRACT_UPDATE" | "PAID_UPDATE" | "ADD_GRANT" | "DISBURSEMENT"
  amount: number;
  notes: string | null;
  createdAt: Date | string;
}

interface Charity {
  id: string;
  name: string;
  logoUrl: string | null;
  contractValue: number;
  paidAmount: number;
  grants: number;
}

type ActionType = "CONTRACT_UPDATE" | "PAID_UPDATE" | "ADD_GRANT" | "DISBURSEMENT";

export default function FinanceClient({
  charity,
  initialLogs
}: {
  charity: Charity;
  initialLogs: any[];
}) {
  const [logs, setLogs] = useState<FinancialLog[]>(initialLogs);
  const [currentFinance, setCurrentFinance] = useState({
    contractValue: charity.contractValue,
    paidAmount: charity.paidAmount,
    grants: charity.grants,
  });

  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");

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

  // Calculations
  const remainingAmount = Math.max(0, currentFinance.contractValue - currentFinance.paidAmount);
  const disbursementPercentage = currentFinance.contractValue > 0 
    ? Math.min(100, (currentFinance.paidAmount / currentFinance.contractValue) * 100)
    : 0;

  // Handle transaction submission
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAction || amount === "") return;

    if (activeAction === "DISBURSEMENT" && Number(amount) + currentFinance.paidAmount > currentFinance.contractValue) {
      if (!confirm("تنبيه: مبلغ الصرف هذا سيجعل إجمالي المدفوع يتجاوز قيمة العقد. هل تريد الاستمرار؟")) {
        return;
      }
    }

    startTransition(async () => {
      const res = await addFinancialTransactionAction(
        charity.id,
        activeAction,
        Number(amount),
        notes
      );

      if (res.success && res.charity && res.log) {
        setCurrentFinance({
          contractValue: res.charity.contractValue,
          paidAmount: res.charity.paidAmount,
          grants: res.charity.grants,
        });
        setLogs((prev) => [res.log as unknown as FinancialLog, ...prev]);
        setAmount("");
        setNotes("");
        setActiveAction(null);
        showNotification("success", "تم تسجيل العملية المالية وإدراجها في السجل بنجاح");
      } else {
        showNotification("error", res.message || "حدث خطأ أثناء إجراء العملية");
      }
    });
  };

  const getActionTitle = (type: ActionType) => {
    switch (type) {
      case "CONTRACT_UPDATE": return "تحديث قيمة العقد";
      case "PAID_UPDATE": return "تحديث إجمالي المدفوع";
      case "ADD_GRANT": return "إضافة منحة جديدة";
      case "DISBURSEMENT": return "صرف مالي جديد";
    }
  };

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case "CONTRACT_UPDATE":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">تحديث العقد</span>;
      case "PAID_UPDATE":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-black border border-purple-100">تحديث المدفوع</span>;
      case "ADD_GRANT":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black border border-emerald-100">إضافة منحة</span>;
      case "DISBURSEMENT":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-black border border-amber-100">صرف مالي</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg text-xs font-black border border-slate-100">عملية مالية</span>;
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Notifications */}
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
              <p className="text-slate-500 text-sm font-semibold">إدارة القيود والحركات المالية التفصيلية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Finance Cards, Progress & History Log (2/3 width) */}
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
                <HandCoins className="w-6 h-6" />
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
              <div className="absolute top-0 right-0 w-2 h-full bg-purple-500 group-hover:w-3 transition-all"></div>
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
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

          {/* Financial Transactions Timeline Log */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
              <History className="w-5 h-5 text-primary" />
              سجل الحركات والعمليات المالية ({logs.length})
            </h3>

            <div className="relative pr-6 border-r-2 border-slate-100 space-y-8 mr-2">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Circle dot on the timeline */}
                  <div className={`absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125 ${
                    log.type === "CONTRACT_UPDATE" ? "bg-blue-500" :
                    log.type === "PAID_UPDATE" ? "bg-purple-500" :
                    log.type === "ADD_GRANT" ? "bg-emerald-500" :
                    "bg-amber-500" // DISBURSEMENT
                  }`}></div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group-hover:border-slate-200 group-hover:bg-slate-50 transition-all">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {getLogTypeBadge(log.type)}
                        <span className={`text-base font-black ${
                          log.type === "ADD_GRANT" || log.type === "DISBURSEMENT" ? "text-emerald-600" : "text-slate-800"
                        }`}>
                          {log.type === "ADD_GRANT" || log.type === "DISBURSEMENT" ? "+" : "="} {log.amount.toLocaleString()} ريال
                        </span>
                      </div>
                      
                      {log.notes && (
                        <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-100/80 w-fit">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.notes}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold shrink-0">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        {new Date(log.createdAt).toLocaleDateString("ar-SA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <div className="text-3xl mb-2 opacity-40">📊</div>
                  <p className="font-bold text-sm text-slate-700 mb-1">لا توجد عمليات مسجلة بالسجل المالي</p>
                  <p className="text-xs text-slate-450 font-medium">استخدم الأزرار الجانبية لإجراء أول العمليات المالية وحفظ قيودها.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Side: Quick Actions Panel (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-slate-850 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              العمليات المالية السريعة
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Button 1: إضافة منحة */}
              <button
                onClick={() => {
                  setActiveAction(activeAction === "ADD_GRANT" ? null : "ADD_GRANT");
                  setAmount("");
                  setNotes("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-between border transition-all duration-300 cursor-pointer ${
                  activeAction === "ADD_GRANT"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100"
                    : "bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5" />
                  إضافة منحة جديدة
                </span>
                <span className="text-xs">➕</span>
              </button>

              {/* Button 2: صرف مالي */}
              <button
                onClick={() => {
                  setActiveAction(activeAction === "DISBURSEMENT" ? null : "DISBURSEMENT");
                  setAmount("");
                  setNotes("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-between border transition-all duration-300 cursor-pointer ${
                  activeAction === "DISBURSEMENT"
                    ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100"
                    : "bg-amber-50/50 hover:bg-amber-50 text-amber-700 border-amber-100"
                }`}
              >
                <span className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5" />
                  تسجيل صرف جديد (صرف)
                </span>
                <span className="text-xs">💸</span>
              </button>

              {/* Button 3: تحديث قيمة العقد */}
              <button
                onClick={() => {
                  setActiveAction(activeAction === "CONTRACT_UPDATE" ? null : "CONTRACT_UPDATE");
                  setAmount("");
                  setNotes("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-between border transition-all duration-300 cursor-pointer ${
                  activeAction === "CONTRACT_UPDATE"
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                    : "bg-blue-50/50 hover:bg-blue-50 text-blue-700 border-blue-105"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  تحديث قيمة العقد
                </span>
                <span className="text-xs">📝</span>
              </button>

              {/* Button 4: تحديث المدفوع */}
              <button
                onClick={() => {
                  setActiveAction(activeAction === "PAID_UPDATE" ? null : "PAID_UPDATE");
                  setAmount("");
                  setNotes("");
                }}
                className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-between border transition-all duration-300 cursor-pointer ${
                  activeAction === "PAID_UPDATE"
                    ? "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-100"
                    : "bg-purple-50/50 hover:bg-purple-50 text-purple-700 border-purple-105"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  تحديث إجمالي المدفوع
                </span>
                <span className="text-xs">💵</span>
              </button>
            </div>

            {/* Render form dynamically based on activeAction */}
            {activeAction && (
              <div className="bg-slate-50/60 border border-slate-100 p-5 rounded-2xl space-y-4 animate-fade-in mt-4">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-primary" />
                  {getActionTitle(activeAction)}
                </h4>

                <form onSubmit={handleSubmitTransaction} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-1.5">المبلغ (ريال)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="أدخل قيمة المبلغ..."
                      className="w-full bg-white border border-slate-150 rounded-xl px-4.5 py-3 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-400 mb-1.5">سبب العملية / ملاحظات</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أدخل تفاصيل إضافية للعملية أو سبب الحركة..."
                      rows={3}
                      className="w-full bg-white border border-slate-150 rounded-xl px-4.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 text-slate-800 transition-all font-bold resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || amount === ""}
                    className="w-full bg-primary hover:bg-primary/95 text-white py-3 rounded-xl font-bold text-sm shadow transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>تأكيد العملية وتسجيلها</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
