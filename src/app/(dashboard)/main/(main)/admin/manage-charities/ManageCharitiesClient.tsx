"use client";

import { useState, useTransition } from "react";
import { Building2, Plus, Edit2, Trash2, Globe, Calendar, FileText, Loader2, X, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { addCharity, updateCharity, deleteCharity } from "@/app/actions/charity";
import Link from "next/link";
import Image from "next/image";

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 pb-16 font-sans selection:bg-primary/20 selection:text-primary dark:selection:bg-primary/20 dark:selection:text-primary" dir="rtl">
      {/* Header section */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/main/admin" className="flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-xs mb-4 transition-colors w-fit bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg">
              <ArrowRight className="w-3.5 h-3.5" />
              العودة للوحة التحكم
            </Link>
            <h1 className="text-[clamp(1.25rem,2vw,1.75rem)] font-black text-primary tracking-tight mb-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 opacity-90" />
              إدارة الجمعيات المتعاقدة
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[clamp(0.75rem,1vw,0.875rem)] tracking-tight max-w-2xl leading-relaxed">
              منصة التحكم المركزية لإضافة وتعديل وحذف ملفات الجمعيات في زاد.
            </p>
          </div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
          
          {/* Add Charity Block (Prominent) */}
          <button 
            onClick={openAddModal}
            className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 hover:border-primary/40 transition-all duration-500 ease-out flex flex-col items-center justify-center text-center cursor-pointer shadow-[0_0_0_rgba(255,255,255,0)] dark:hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] hover:shadow-[0_0_30px_rgba(var(--primary),0.05)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="w-12 h-12 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-500">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-primary tracking-tight mb-1">إضافة جمعية جديدة</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">قم بتسجيل جمعية جديدة في النظام وإعداد المساحة المخصصة لها.</p>
          </button>

          {/* Stats Block */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 row-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -left-12 -top-12 w-40 h-40 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">إجمالي الجمعيات</p>
            <p className="text-[clamp(2.5rem,4vw,3.5rem)] font-black text-primary leading-none tracking-tighter">
              {charities.length}
            </p>
          </div>

          {/* Dynamic Charity Blocks */}
          {charities.map((charity) => (
            <div key={charity.id} className="col-span-1 bg-white dark:bg-black border border-slate-200 dark:border-white/10 hover:border-primary/30 rounded-3xl p-5 flex flex-col relative group transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_0_15px_rgba(255,255,255,0.03)] hover:-translate-y-0.5">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-8 h-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-lg flex items-center justify-center overflow-hidden relative shrink-0">
                    {charity.logoUrl ? (
                      <Image 
                        src={charity.logoUrl} 
                        alt={charity.name} 
                        fill 
                        className="object-contain p-1"
                        unoptimized
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-primary opacity-80" />
                    )}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(charity)} className="p-1 text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-md transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openDeleteModal(charity)} className="p-1 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold text-primary tracking-tight mb-2 line-clamp-2 leading-tight">
                  {charity.name}
                </h3>
                <div className="space-y-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-500">
                  {charity.domain && (
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-primary/60" />
                      <span className="truncate" dir="ltr">{charity.domain}</span>
                    </div>
                  )}
                  {charity.licenseNumber && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-primary/60" />
                      <span>ترخيص: {charity.licenseNumber}</span>
                    </div>
                  )}
                  {charity.establishmentDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-primary/60" />
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
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_60px_rgba(0,0,0,0.5)] rounded-3xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
            
            <button onClick={closeModal} disabled={isPending} className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>

            {modalMode === "DELETE" ? (
              <form onSubmit={handleSubmit}>
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">حذف الجمعية</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  هل أنت متأكد من رغبتك في حذف <strong className="text-slate-900 dark:text-white">{selectedCharity?.name}</strong>؟ هذا الإجراء لا يمكن التراجع عنه. قد تفشل العملية إذا كانت الجمعية مرتبطة ببيانات مالية أو مشاريع قائمة.
                </p>
                
                {error && <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                {success && <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>{success}</div>}

                <div className="flex gap-4">
                  <button type="submit" disabled={isPending} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center disabled:opacity-50">
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تأكيد الحذف"}
                  </button>
                  <button type="button" onClick={closeModal} disabled={isPending} className="flex-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white py-3 rounded-xl font-bold text-sm transition-colors border border-slate-200 dark:border-white/10 disabled:opacity-50">
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-primary tracking-tight mb-1">
                    {modalMode === "ADD" ? "إضافة جمعية جديدة" : "تعديل بيانات الجمعية"}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">أدخل البيانات الأساسية للجمعية أدناه.</p>
                </div>

                {error && <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
                {success && <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>{success}</div>}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">اسم الجمعية *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      disabled={isPending}
                      className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 dark:focus:border-primary/50 focus:bg-white dark:focus:bg-white/5 transition-all"
                      placeholder="مثال: جمعية البر الخيرية"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">تاريخ التأسيس</label>
                      <input
                        type="text"
                        value={formData.establishmentDate}
                        onChange={e => setFormData({...formData, establishmentDate: e.target.value})}
                        disabled={isPending}
                        className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 dark:focus:border-primary/50 focus:bg-white dark:focus:bg-white/5 transition-all"
                        placeholder="مثال: 1440 هـ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">رقم الترخيص</label>
                      <input
                        type="text"
                        value={formData.licenseNumber}
                        onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                        disabled={isPending}
                        className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 dark:focus:border-primary/50 focus:bg-white dark:focus:bg-white/5 transition-all"
                        placeholder="رقم ترخيص الموارد"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">النطاق (Domain)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={formData.domain}
                      onChange={e => setFormData({...formData, domain: e.target.value})}
                      disabled={isPending}
                      className="w-full text-left bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 dark:focus:border-primary/50 focus:bg-white dark:focus:bg-white/5 transition-all"
                      placeholder="albir.org.sa"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={isPending} className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20">
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
