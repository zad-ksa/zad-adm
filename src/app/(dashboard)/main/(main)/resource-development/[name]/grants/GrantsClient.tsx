"use client";

import { useState, useTransition } from "react";
import { FileText, Plus, Trash2, CheckCircle2, AlertCircle, TrendingUp, Check, X, Calendar, Edit, HandCoins } from "lucide-react";
import { addGrantApplication, updateGrantApplicationStatus, deleteGrantApplication } from "@/app/actions/charity";

interface GrantApplication {
  id: string;
  initiativeName: string;
  requestedAmount: number;
  status: string; // PENDING, APPROVED, REJECTED, CLOSED
  entityName?: string;
  installmentsCount?: number | null;
  installmentsNotes?: string | null;
  beneficiariesCount?: number | null;
  collectedAmount?: number | null;
  closureDate?: Date | string | null;
  createdAt: Date | string;
}

interface DonorAccount {
  id: string;
  donorName: string;
}

export default function GrantsClient({
  charityId,
  charityName,
  initialGrantApplications,
  donorAccounts,
}: {
  charityId: string;
  charityName: string;
  initialGrantApplications: any[];
  donorAccounts: any[];
}) {
  const [grantApplications, setGrantApplications] = useState<GrantApplication[]>(initialGrantApplications || []);
  const [showAddGrant, setShowAddGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({ initiative: "", amount: "", entityName: "", status: "PENDING" });
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "CLOSED" | "REJECTED">("PENDING");

  const [grantApprovalModal, setGrantApprovalModal] = useState<{ isOpen: boolean; grantId: string | null }>({ isOpen: false, grantId: null });
  const [approvalForm, setApprovalForm] = useState({
    amount: "",
    beneficiariesCount: "",
    collectedAmount: ""
  });

  const [closureModal, setClosureModal] = useState<{ isOpen: boolean; grantId: string | null }>({ isOpen: false, grantId: null });
  const [closureDate, setClosureDate] = useState("");

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

  const handleAddGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addGrantApplication(charityId, grantForm.initiative, Number(grantForm.amount), grantForm.entityName, grantForm.status);
      if (res.success && res.grant) {
        setGrantApplications((prev) => [res.grant as unknown as GrantApplication, ...prev]);
        setGrantForm({ initiative: "", amount: "", entityName: "", status: "PENDING" });
        setShowAddGrant(false);
        showNotification("success", "تم إضافة المنحة بنجاح");

        // If it was added as APPROVED directly, we need to open the approval modal immediately for extra details
        if (grantForm.status === "APPROVED") {
          setActiveTab("APPROVED");
          setGrantApprovalModal({ isOpen: true, grantId: res.grant.id });
          setApprovalForm(prev => ({ ...prev, amount: grantForm.amount }));
        } else {
          setActiveTab(grantForm.status as any);
        }

      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const handleStatusChangeRequest = (id: string, status: "PENDING" | "APPROVED" | "REJECTED" | "CLOSED") => {
    if (status === "APPROVED") {
      const grant = grantApplications.find(g => g.id === id);
      setApprovalForm({
        amount: grant?.requestedAmount.toString() || "",
        beneficiariesCount: grant?.beneficiariesCount?.toString() || "",
        collectedAmount: grant?.collectedAmount?.toString() || ""
      });
      setGrantApprovalModal({ isOpen: true, grantId: id });
    } else {
      updateStatusDirectly(id, status);
    }
  };

  const updateStatusDirectly = async (id: string, status: "PENDING" | "REJECTED" | "CLOSED") => {
    startTransition(async () => {
      const res = await updateGrantApplicationStatus(id, charityId, status);
      if (res.success) {
        setGrantApplications((prev) => prev.map(g => g.id === id ? { ...g, status } : g));
        showNotification("success", "تم تحديث حالة المنحة");
        setActiveTab(status);
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const confirmGrantApproval = async () => {
    if (!grantApprovalModal.grantId || !approvalForm.amount) {
      showNotification("error", "يرجى تعبئة الحقول الإلزامية");
      return;
    }

    const amountNum = Number(approvalForm.amount);
    const benCount = approvalForm.beneficiariesCount ? Number(approvalForm.beneficiariesCount) : undefined;
    const collected = approvalForm.collectedAmount ? Number(approvalForm.collectedAmount) : undefined;

    if (isNaN(amountNum) || amountNum <= 0) {
      showNotification("error", "المبلغ المعتمد غير صالح");
      return;
    }

    startTransition(async () => {
      const res = await updateGrantApplicationStatus(
        grantApprovalModal.grantId!,
        charityId,
        "APPROVED",
        amountNum,
        null,
        null,
        benCount,
        collected
      );

      if (res.success) {
        setGrantApplications((prev) => prev.map(g => g.id === grantApprovalModal.grantId ? {
          ...g,
          status: "APPROVED",
          installmentsCount: null,
          installmentsNotes: null,
          beneficiariesCount: benCount,
          collectedAmount: collected
        } : g));

        showNotification("success", "تم اعتماد المنحة بنجاح");
        setGrantApprovalModal({ isOpen: false, grantId: null });
        setActiveTab("APPROVED");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const confirmClosure = async () => {
    if (!closureModal.grantId || !closureDate) {
      showNotification("error", "يرجى تحديد تاريخ الإغلاق");
      return;
    }

    startTransition(async () => {
      const dateObj = new Date(closureDate);
      const res = await updateGrantApplicationStatus(
        closureModal.grantId!,
        charityId,
        "CLOSED",
        undefined, undefined, undefined, undefined, undefined,
        dateObj
      );

      if (res.success) {
        setGrantApplications((prev) => prev.map(g => g.id === closureModal.grantId ? {
          ...g,
          status: "CLOSED",
          closureDate: dateObj
        } : g));

        showNotification("success", "تم إغلاق المنحة ونقلها للمغلقة");
        setClosureModal({ isOpen: false, grantId: null });
        setClosureDate("");
        setActiveTab("CLOSED");
      } else {
        showNotification("error", res.message || "حدث خطأ");
      }
    });
  };

  const pendingGrants = grantApplications.filter(g => g.status === "PENDING");
  const approvedGrants = grantApplications.filter(g => g.status === "APPROVED");
  const closedGrants = grantApplications.filter(g => g.status === "CLOSED");
  const rejectedGrants = grantApplications.filter(g => g.status === "REJECTED");

  const getFilteredGrants = () => {
    if (activeTab === "PENDING") return pendingGrants;
    if (activeTab === "APPROVED") return approvedGrants;
    if (activeTab === "CLOSED") return closedGrants;
    return rejectedGrants;
  };

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
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

      {/* Header with Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 dark:text-slate-100 mb-0.5">{charityName} - إدارة المنح</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">متابعة دقيقة لطلبات المنح ومراحل الاعتماد والإغلاق</p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-100 dark:border-amber-500/20 shadow-sm">
              <div className="bg-amber-100 dark:bg-amber-500/20 p-1 rounded-md shrink-0"><FileText className="w-3.5 h-3.5" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold opacity-80">المنح المرفوعة (قيد المعالجة)</span>
                <span className="text-sm font-black">{pendingGrants.length}</span>
              </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
              <div className="bg-emerald-100 dark:bg-emerald-500/20 p-1 rounded-md shrink-0"><CheckCircle2 className="w-3.5 h-3.5" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold opacity-80">المنح المقبولة (النشطة)</span>
                <span className="text-sm font-black">{approvedGrants.length}</span>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-600 shadow-sm">
              <div className="bg-slate-200 dark:bg-slate-600 p-1 rounded-md shrink-0"><Check className="w-3.5 h-3.5" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold opacity-80">المنح المغلقة</span>
                <span className="text-sm font-black">{closedGrants.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto">
        <div className="flex gap-1">
          <button onClick={() => setActiveTab("PENDING")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === "PENDING" ? "bg-primary text-white shadow-md" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            المنح المرفوعة ({pendingGrants.length})
          </button>
          <button onClick={() => setActiveTab("APPROVED")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === "APPROVED" ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            المنح المقبولة ({approvedGrants.length})
          </button>
          <button onClick={() => setActiveTab("CLOSED")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === "CLOSED" ? "bg-slate-700 text-white shadow-md" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            المنح المغلقة ({closedGrants.length})
          </button>
          <button onClick={() => setActiveTab("REJECTED")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === "REJECTED" ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            المنح المرفوضة ({rejectedGrants.length})
          </button>
        </div>
        <button onClick={() => setShowAddGrant(!showAddGrant)} className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 hover:bg-primary/90 shadow-sm whitespace-nowrap text-xs shrink-0 ml-2">
          <Plus className="w-3.5 h-3.5" /> إضافة منحة جديدة
        </button>
      </div>

      {showAddGrant && (
        <form onSubmit={handleAddGrant} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">الجهة المانحة</label>
            {donorAccounts.length > 0 ? (
              <select required value={grantForm.entityName} onChange={e => setGrantForm({...grantForm, entityName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold dark:text-slate-100">
                <option value="">اختر الجهة...</option>
                {donorAccounts.map(d => (
                  <option key={d.id} value={d.donorName}>{d.donorName}</option>
                ))}
              </select>
            ) : (
              <input required type="text" placeholder="اكتب اسم الجهة" value={grantForm.entityName} onChange={e => setGrantForm({...grantForm, entityName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold dark:text-slate-100" />
            )}
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">اسم المشروع</label>
            <input required type="text" value={grantForm.initiative} onChange={e => setGrantForm({...grantForm, initiative: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold dark:text-slate-100" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">التكلفة الإجمالية (ريال)</label>
            <input required type="number" min="0" value={grantForm.amount} onChange={e => setGrantForm({...grantForm, amount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold dark:text-slate-100" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">حالة الطلب الأولية</label>
            <select value={grantForm.status} onChange={e => setGrantForm({...grantForm, status: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-bold text-slate-700 dark:text-slate-200">
              <option value="PENDING">قيد المعالجة (مرفوعة)</option>
              <option value="APPROVED">مقبولة</option>
              <option value="REJECTED">مرفوضة</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button type="submit" disabled={isPending} className="w-full bg-primary text-white py-2.5 rounded-xl font-bold shadow hover:bg-primary/90 disabled:opacity-50 h-[42px] flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> حفظ المنحة
            </button>
          </div>
        </form>
      )}

      {/* Grants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {getFilteredGrants().map(grant => (
          <div key={grant.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
            <div className={`h-1.5 w-full absolute top-0 left-0 ${
              grant.status === 'APPROVED' ? 'bg-emerald-400' :
              grant.status === 'CLOSED' ? 'bg-slate-600' :
              grant.status === 'REJECTED' ? 'bg-red-400' : 'bg-amber-400'
            }`}></div>

            <div className="p-5 flex-1 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg leading-tight mb-1">{grant.initiativeName}</h3>
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-lg w-fit">
                    <HandCoins className="w-3.5 h-3.5" />
                    {grant.entityName || "جهة غير محددة"}
                  </p>
                </div>
                <button onClick={() => {
                  if (confirm("هل أنت متأكد من الحذف؟")) startTransition(() => {
                    deleteGrantApplication(grant.id, charityId);
                    setGrantApplications(prev => prev.filter(g => g.id !== grant.id));
                  });
                }} className="text-slate-300 dark:text-slate-600 hover:text-red-500 bg-slate-50 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">المبلغ المطلوب / الإجمالي</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{grant.requestedAmount.toLocaleString('en-US')} <span className="text-[10px]">ريال</span></p>
                </div>
                {grant.collectedAmount != null && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">التحصيل</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{grant.collectedAmount.toLocaleString('en-US')} <span className="text-[10px]">ريال</span></p>
                  </div>
                )}
                {grant.beneficiariesCount != null && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">عدد المستفيدين</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{grant.beneficiariesCount.toLocaleString('en-US')}</p>
                  </div>
                )}
              </div>

              {grant.closureDate && (
                <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-xl border border-slate-200 dark:border-slate-600 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">تاريخ الإغلاق:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{new Date(grant.closureDate).toLocaleDateString('ar-SA')}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex gap-2">
                <select
                  value={grant.status}
                  onChange={(e) => handleStatusChangeRequest(grant.id, e.target.value as any)}
                  className={`flex-1 text-xs font-bold px-3 py-2.5 rounded-xl border-none outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 ${
                    grant.status === "APPROVED" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300" :
                    grant.status === "REJECTED" ? "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300" :
                    grant.status === "CLOSED" ? "bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200" :
                    "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  <option value="PENDING">قيد المعالجة (مرفوعة)</option>
                  <option value="APPROVED">قبول المنحة</option>
                  <option value="CLOSED" disabled>مغلقة</option>
                  <option value="REJECTED">رفض المنحة</option>
                </select>

                {grant.status === "APPROVED" && (
                  <button
                    onClick={() => {
                      setClosureModal({ isOpen: true, grantId: grant.id });
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> إغلاق المشروع
                  </button>
                )}

                {grant.status === "APPROVED" && (
                  <button onClick={() => handleStatusChangeRequest(grant.id, "APPROVED")} className="px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-primary hover:border-primary/30 rounded-xl transition-all">
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {getFilteredGrants().length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 border-dashed">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-bold">لا توجد منح في هذا القسم</p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {grantApprovalModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100 dark:border-emerald-500/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <button onClick={() => { setGrantApprovalModal({ isOpen: false, grantId: null }); }} className="p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">تأكيد قبول واعتماد المنحة</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                الرجاء استكمال البيانات التالية للمنحة لتنتقل إلى قسم المنح المقبولة بشكل سليم. (المبلغ هو الحقل الإلزامي الوحيد)
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">المبلغ المعتمد النهائي (ريال) *</label>
                  <input
                    type="number" min="1" required autoFocus
                    value={approvalForm.amount}
                    onChange={(e) => setApprovalForm({...approvalForm, amount: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-500 font-black text-emerald-700 dark:text-emerald-400"
                    placeholder="المبلغ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">التحصيل (المبلغ المتحصل عليه)</label>
                    <input
                      type="number" min="0"
                      value={approvalForm.collectedAmount}
                      onChange={(e) => setApprovalForm({...approvalForm, collectedAmount: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-slate-100"
                      placeholder="اختياري"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">عدد المستفيدين</label>
                    <input
                      type="number" min="0"
                      value={approvalForm.beneficiariesCount}
                      onChange={(e) => setApprovalForm({...approvalForm, beneficiariesCount: e.target.value})}
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-slate-100"
                      placeholder="اختياري"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
              <button
                onClick={() => { setGrantApprovalModal({ isOpen: false, grantId: null }); }}
                className="flex-1 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                disabled={isPending}
              >
                إلغاء
              </button>
              <button
                onClick={confirmGrantApproval}
                disabled={isPending || !approvalForm.amount}
                className="flex-[2] py-3.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {isPending ? 'جاري الاعتماد...' : 'تأكيد وحفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closure Modal */}
      {closureModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="p-8 text-center">
              <div className="w-20 h-20 mx-auto bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200 dark:border-slate-600">
                <Check className="w-10 h-10" strokeWidth={3} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">إغلاق المشروع</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                سيتم إغلاق المنحة بالكامل ونقلها إلى قسم المنح المغلقة للحفظ والأرشفة. يرجى تحديد تاريخ الإغلاق.
              </p>

              <div className="text-right">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">تاريخ الإغلاق *</label>
                <input
                  type="date"
                  value={closureDate}
                  onChange={(e) => setClosureDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-slate-500 font-black text-slate-800 dark:text-slate-100 text-right"
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 flex gap-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => { setClosureModal({ isOpen: false, grantId: null }); setClosureDate(""); }}
                className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                disabled={isPending}
              >
                إلغاء
              </button>
              <button
                onClick={confirmClosure}
                disabled={isPending || !closureDate}
                className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg disabled:opacity-50"
              >
                {isPending ? 'جاري الإغلاق...' : 'تأكيد الإغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
