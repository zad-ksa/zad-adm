"use client";

import { useState, useTransition } from "react";
import { Building2, Plus, Edit2, Trash2, Globe, Calendar, FileText, Loader2, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { addCharity, updateCharity, deleteCharity } from "@/app/actions/charity";

export default function ManageCharitiesClient({ initialCharities }: { initialCharities: any[] }) {
  const [charities, setCharities] = useState(initialCharities);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT" | "DELETE">("ADD");
  const [selectedCharity, setSelectedCharity] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    establishmentDate: "",
    licenseNumber: "",
    domain: "",
    logoUrl: ""
  });

  const openAddModal = () => {
    setModalMode("ADD");
    setSelectedCharity(null);
    setFormData({ name: "", establishmentDate: "", licenseNumber: "", domain: "", logoUrl: "" });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (charity: any) => {
    setModalMode("EDIT");
    setSelectedCharity(charity);
    setFormData({
      name: charity.name || "",
      establishmentDate: charity.establishmentDate || "",
      licenseNumber: charity.licenseNumber || "",
      domain: charity.domain || "",
      logoUrl: charity.logoUrl || ""
    });
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (charity: any) => {
    setModalMode("DELETE");
    setSelectedCharity(charity);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isPending) return;
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (modalMode === "DELETE") {
      startTransition(async () => {
        const res = await deleteCharity(selectedCharity.id);
        if (res.success) {
          setCharities(charities.filter(c => c.id !== selectedCharity.id));
          setSuccess("تم حذف الجمعية بنجاح");
          setTimeout(() => closeModal(), 1500);
        } else {
          setError(res.message || "حدث خطأ");
        }
      });
      return;
    }

    if (!formData.name.trim()) {
      setError("اسم الجمعية مطلوب");
      return;
    }

    startTransition(async () => {
      if (modalMode === "ADD") {
        const res = await addCharity(formData);
        if (res.success) {
          setCharities([res.data, ...charities]);
          setSuccess("تمت الإضافة بنجاح");
          setTimeout(() => closeModal(), 1500);
        } else {
          setError(res.message || "حدث خطأ");
        }
      } else if (modalMode === "EDIT") {
        const res = await updateCharity(selectedCharity.id, formData);
        if (res.success) {
          setCharities(charities.map(c => c.id === selectedCharity.id ? res.data : c));
          setSuccess("تم التحديث بنجاح");
          setTimeout(() => closeModal(), 1500);
        } else {
          setError(res.message || "حدث خطأ");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16 font-sans selection:bg-white/20 selection:text-white" dir="rtl">
      {/* Header section */}
      <div className="px-8 pt-16 pb-8 border-b border-white/5 bg-black/20 backdrop-blur-3xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-black text-white tracking-tight mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8 opacity-80" />
              إدارة الجمعيات المتعاقدة
            </h1>
            <p className="text-slate-400 text-[clamp(0.875rem,1.5vw,1rem)] tracking-tight max-w-2xl">
              منصة التحكم المركزية لإضافة وتعديل وحذف ملفات الجمعيات في زاد. تم التصميم بأسلوب Bento Grid لتحقيق أقصى درجات الوضوح والعملية.
            </p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="max-w-7xl mx-auto px-8 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          
          {/* Add Charity Block (Prominent) */}
          <button 
            onClick={openAddModal}
            className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 group relative overflow-hidden bg-slate-900 border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all duration-500 ease-out flex flex-col items-center justify-center text-center cursor-pointer shadow-[0_0_0_rgba(255,255,255,0)] hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">إضافة جمعية جديدة</h2>
            <p className="text-sm text-slate-400 max-w-sm">قم بتسجيل جمعية جديدة في النظام وإعداد المساحة المخصصة لها.</p>
          </button>

          {/* Stats Block */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 bg-slate-900 border border-white/10 rounded-3xl p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <p className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-1">إجمالي الجمعيات</p>
            <p className="text-[clamp(3rem,5vw,4.5rem)] font-black text-white leading-none tracking-tighter">
              {charities.length}
            </p>
          </div>

          {/* Dynamic Charity Blocks */}
          {charities.map((charity) => (
            <div key={charity.id} className="col-span-1 bg-black border border-white/10 hover:border-white/20 rounded-3xl p-6 flex flex-col relative group transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:-translate-y-1">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(charity)} className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => openDeleteModal(charity)} className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight mb-3 line-clamp-2 leading-tight">
                  {charity.name}
                </h3>
                <div className="space-y-2 text-xs font-medium text-slate-500">
                  {charity.domain && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="truncate" dir="ltr">{charity.domain}</span>
                    </div>
                  )}
                  {charity.licenseNumber && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5" />
                      <span>ترخيص: {charity.licenseNumber}</span>
                    </div>
                  )}
                  {charity.establishmentDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تأسيس: {charity.establishmentDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Minimalistic Vercel-Style Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-slate-900 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-3xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
            
            <button onClick={closeModal} disabled={isPending} className="absolute top-6 left-6 text-slate-500 hover:text-white transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>

            {modalMode === "DELETE" ? (
              <form onSubmit={handleSubmit}>
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight mb-2">حذف الجمعية</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  هل أنت متأكد من رغبتك في حذف <strong className="text-white">{selectedCharity?.name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه. قد تفشل العملية إذا كانت الجمعية مرتبطة ببيانات مالية أو مشاريع قائمة.
                </p>
                
                {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                {success && <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>{success}</div>}

                <div className="flex gap-4">
                  <button type="submit" disabled={isPending} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center disabled:opacity-50">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
                  </button>
                  <button type="button" onClick={closeModal} disabled={isPending} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold text-sm transition-colors border border-white/10 disabled:opacity-50">
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                    {modalMode === "ADD" ? "إضافة جمعية جديدة" : "تعديل بيانات الجمعية"}
                  </h2>
                  <p className="text-slate-400 text-sm">أدخل البيانات الأساسية للجمعية أدناه.</p>
                </div>

                {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                {success && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>{success}</div>}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم الجمعية *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      disabled={isPending}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                      placeholder="مثال: جمعية البر الخيرية"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ التأسيس</label>
                      <input
                        type="text"
                        value={formData.establishmentDate}
                        onChange={e => setFormData({...formData, establishmentDate: e.target.value})}
                        disabled={isPending}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                        placeholder="مثال: 1440 هـ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">رقم الترخيص</label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                        disabled={isPending}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                        placeholder="رقم ترخيص الموارد"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">النطاق (Domain)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.domain}
                      onChange={e => setFormData({...formData, domain: e.target.value})}
                      disabled={isPending}
                      className="w-full text-left bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
                      placeholder="albir.org.sa"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isPending} className="w-full bg-white hover:bg-slate-200 text-black py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {modalMode === "ADD" ? "إضافة وتسجيل" : "حفظ التعديلات"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
