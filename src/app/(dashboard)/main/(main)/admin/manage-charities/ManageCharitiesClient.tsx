"use client";

import { useState, useTransition } from "react";
import { btn, cx, MONO } from "@/components/console/ui";
import { EmptyState, PageHeader } from "@/components/console/layout";
import { Building2, Plus, Edit2, Trash2, Globe, Calendar, FileText, Loader2, X, AlertTriangle, ShieldCheck } from "lucide-react";
import { addCharity, updateCharity, deleteCharity } from "@/app/actions/charity";
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
    <div className="space-y-6 pb-16" dir="rtl">
      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "إدارة الجمعيات المتعاقدة" }]}
        icon={<Building2 className="w-6 h-6" />}
        title="إدارة الجمعيات المتعاقدة"
        description={`${charities.length} جمعية — أضف ملفات الجمعيات وعدّلها واحذفها.`}
        actions={
          <button type="button" onClick={openAddModal} className={btn.primary}>
            <Plus className="size-4" />
            إضافة جمعية جديدة
          </button>
        }
      />

      {charities.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="لا توجد جمعيات بعد"
            description="أضف أول جمعية متعاقدة لتظهر هنا وفي تبويب الجمعيات."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {charities.map((charity) => (
            <li
              key={charity.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                  {charity.logoUrl ? (
                    <Image src={charity.logoUrl} alt="" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <Building2 className="size-4 text-slate-400" />
                  )}
                </span>
                {/* ظاهرةٌ دائماً: كانت تظهر عند مرور الفأرة وحده، فلا تصلها
                    لمسةٌ على الجوال ولا لوحة مفاتيح. */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(charity)}
                    aria-label={`تعديل ${charity.name}`}
                    title="تعديل"
                    className={btn.ghost}
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDeleteModal(charity)}
                    aria-label={`حذف ${charity.name}`}
                    title="حذف"
                    className={cx(btn.ghost, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <h3 className="line-clamp-2 text-[15px] font-semibold leading-6 text-slate-900 dark:text-slate-100">
                {charity.name}
              </h3>

              <dl className="space-y-1 text-[12.5px] text-slate-500 dark:text-slate-400">
                {charity.domain && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="size-3.5 shrink-0" />
                    <dd className="truncate" dir="ltr">{charity.domain}</dd>
                  </div>
                )}
                {charity.licenseNumber && (
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-3.5 shrink-0" />
                    <dd>ترخيص: <span className={MONO}>{charity.licenseNumber}</span></dd>
                  </div>
                )}
                {charity.establishmentDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    <dd>تأسيس: {charity.establishmentDate}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

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
