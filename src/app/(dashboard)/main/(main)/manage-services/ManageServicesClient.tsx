"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Edit, Trash2, Layers, Search, CheckCircle2, AlertCircle, Building2, ChevronDown, ChevronUp, X, Check, ArrowRight } from "lucide-react";
import { addServiceToCharities, renameServiceGlobally, deleteServiceGlobally } from "@/app/actions/services";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEPARTMENTS = [
  { value: "", label: "لا يتبع لأي قسم (خدمة عامة)" },
  { value: "STRATEGY", label: "الاستراتيجية" },
  { value: "GOVERNANCE", label: "الحوكمة" },
  { value: "FINANCE", label: "المالية" },
  { value: "PROGRAMS", label: "البرامج والمشاريع" },
  { value: "HR", label: "الموارد البشرية" }
];

type CharityItem = { id: string; name: string };

type ServiceGroup = {
  name: string;
  department: string | null;
  charityCount: number;
  charities: CharityItem[];
  serviceIds: string[];
};

export default function ManageServicesClient({
  initialServices,
  charities,
}: {
  initialServices: ServiceGroup[];
  charities: CharityItem[];
}) {
  const router = useRouter();
  const [services, setServices] = useState<ServiceGroup[]>(initialServices);
  const [isPending, startTransition] = useTransition();
  
  const [search, setSearch] = useState("");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  // Modal state
  const [modalState, setModalState] = useState<{isOpen: boolean, mode: "add" | "edit", originalName: string | null}>({ isOpen: false, mode: "add", originalName: null });
  const [form, setForm] = useState({ name: "", department: "" });
  const [selectedCharityIds, setSelectedCharityIds] = useState<string[]>([]);
  
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

  const openAdd = () => {
    setForm({ name: "", department: "" });
    setSelectedCharityIds([]);
    setModalState({ isOpen: true, mode: "add", originalName: null });
  };

  const openEdit = (svc: ServiceGroup) => {
    setForm({ name: svc.name, department: svc.department || "" });
    setModalState({ isOpen: true, mode: "edit", originalName: svc.name });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: "add", originalName: null });
    setSelectedCharityIds([]);
  };

  const toggleCharity = (id: string) => {
    setSelectedCharityIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCharityIds.length === charities.length) {
      setSelectedCharityIds([]);
    } else {
      setSelectedCharityIds(charities.map(c => c.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (modalState.mode === "edit" && modalState.originalName) {
          // تعديل الاسم عند كل الجمعيات
          await renameServiceGlobally(modalState.originalName, form.name, form.department || null);
          setServices(prev => prev.map(s => 
            s.name === modalState.originalName 
              ? { ...s, name: form.name, department: form.department || null } 
              : s
          ));
          showNotification("success", "تم تعديل الخدمة عند جميع الجمعيات بنجاح");
        } else {
          // إضافة خدمة جديدة
          if (selectedCharityIds.length === 0) {
            showNotification("error", "يرجى تحديد جمعية واحدة على الأقل");
            return;
          }
          await addServiceToCharities(form.name, form.department || null, selectedCharityIds);
          
          const newCharities = selectedCharityIds
            .map(cId => charities.find(c => c.id === cId))
            .filter(Boolean) as CharityItem[];

          setServices(prev => [{
            name: form.name,
            department: form.department || null,
            charityCount: selectedCharityIds.length,
            charities: newCharities,
            serviceIds: [],
          }, ...prev]);
          showNotification("success", `تمت إضافة الخدمة لـ ${selectedCharityIds.length} جمعية بنجاح`);
        }
        closeModal();
        router.refresh();
      } catch (error: any) {
        showNotification("error", error.message || "حدث خطأ أثناء الحفظ");
      }
    });
  };

  const handleDelete = (name: string, count: number) => {
    if (!confirm(`تحذير: سيتم حذف خدمة "${name}" من ${count} جمعية! هل أنت متأكد؟`)) return;
    startTransition(async () => {
      try {
        await deleteServiceGlobally(name);
        setServices(prev => prev.filter(s => s.name !== name));
        showNotification("success", `تم حذف الخدمة "${name}" من جميع الجمعيات`);
        router.refresh();
      } catch (error: any) {
        showNotification("error", "فشل الحذف");
      }
    });
  };

  const filteredServices = useMemo(() => 
    services.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
    [services, search]
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Notifications */}
      {successMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            <Link 
              href="/main/admin" 
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
              title="العودة للوحة التحكم"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-slate-200 dark:text-slate-700 text-lg">|</span>
            <Layers className="w-5 h-5 text-primary shrink-0" />
            إدارة الخدمات
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mr-11">
            الخدمات الحالية المقدمة للجمعيات — أضف، عدّل أو احذف
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة خدمة جديدة
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ابحث عن اسم الخدمة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Services Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredServices.map(svc => {
          const isExpanded = expandedName === svc.name;
          
          // Curated premium color systems by department
          const deptColors: Record<string, { border: string; bg: string; text: string; dot: string; glow: string }> = {
            STRATEGY: {
              border: "border-r-4 border-r-blue-500",
              bg: "bg-blue-50/40 dark:bg-blue-950/20",
              text: "text-blue-700 dark:text-blue-300",
              dot: "bg-blue-500",
              glow: "group-hover:shadow-blue-500/10"
            },
            GOVERNANCE: {
              border: "border-r-4 border-r-violet-500",
              bg: "bg-violet-50/40 dark:bg-violet-950/20",
              text: "text-violet-700 dark:text-violet-300",
              dot: "bg-violet-500",
              glow: "group-hover:shadow-violet-500/10"
            },
            FINANCE: {
              border: "border-r-4 border-r-emerald-500",
              bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
              text: "text-emerald-700 dark:text-emerald-300",
              dot: "bg-emerald-500",
              glow: "group-hover:shadow-emerald-500/10"
            },
            PROGRAMS: {
              border: "border-r-4 border-r-amber-500",
              bg: "bg-amber-50/40 dark:bg-amber-950/20",
              text: "text-amber-700 dark:text-amber-300",
              dot: "bg-amber-500",
              glow: "group-hover:shadow-amber-500/10"
            },
            HR: {
              border: "border-r-4 border-r-rose-500",
              bg: "bg-rose-50/40 dark:bg-rose-950/20",
              text: "text-rose-700 dark:text-rose-300",
              dot: "bg-rose-500",
              glow: "group-hover:shadow-rose-500/10"
            }
          };

          const activeColor = deptColors[svc.department || ""] || {
            border: "border-r-4 border-r-slate-400 dark:border-r-slate-500",
            bg: "bg-slate-50 dark:bg-slate-800/40",
            text: "text-slate-600 dark:text-slate-300",
            dot: "bg-slate-400 dark:bg-slate-500",
            glow: "group-hover:shadow-slate-500/5"
          };

          return (
            <div 
              key={svc.name} 
              className={`group bg-white dark:bg-slate-800/90 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between ${activeColor.border} hover:-translate-y-0.5`}
            >
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Category Pill & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeColor.bg} ${activeColor.text}`}>
                      <span className={`w-1 h-1 rounded-full ${activeColor.dot}`} />
                      {DEPARTMENTS.find(d => d.value === svc.department)?.label || "خدمة عامة"}
                    </span>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-0.5 opacity-85 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEdit(svc)} 
                        className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                        title="تعديل الخدمة"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(svc.name, svc.charityCount)} 
                        disabled={isPending} 
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                        title="حذف الخدمة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-relaxed">
                    {svc.name}
                  </h3>
                </div>

                {/* Bottom section / Expand trigger */}
                <div className="pt-2 border-t border-slate-100/60 dark:border-slate-700/20 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedName(isExpanded ? null : svc.name)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-all group/btn"
                  >
                    <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-primary transition-colors" />
                    <span>متاح لـ</span>
                    <span className="bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-md text-slate-700 dark:text-slate-200 font-extrabold group-hover/btn:bg-primary group-hover/btn:text-white transition-all">
                      {svc.charityCount}
                    </span>
                    <span>جمعية</span>
                    {svc.charityCount > 0 && (
                      isExpanded 
                        ? <ChevronUp className="w-3 h-3 text-slate-400 group-hover/btn:text-primary transition-transform duration-200" /> 
                        : <ChevronDown className="w-3 h-3 text-slate-400 group-hover/btn:text-primary transition-transform duration-200" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible content (list of charities) */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100/60 dark:border-slate-700/20 animate-fade-in-up">
                  {svc.charities.length > 0 ? (
                    <>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5">الجمعيات المتاح لها هذه الخدمة:</p>
                      <div className="flex flex-wrap gap-1">
                        {svc.charities.map(c => (
                          <span 
                            key={c.id} 
                            className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700/50 px-2 py-0.5 rounded text-[10px] font-medium hover:border-primary/20 hover:text-primary dark:hover:text-primary transition-all"
                          >
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-400 italic">لا توجد جمعيات مرتبطة بهذه الخدمة حالياً</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="col-span-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-12 text-center shadow-sm">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 font-extrabold text-xs">لا توجد خدمات {search ? "مطابقة للبحث" : "مسجلة حالياً"}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {modalState.mode === "edit" ? "تعديل الخدمة" : "إضافة خدمة جديدة"}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة *</label>
                  <input
                    type="text" required
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-sm font-bold"
                    placeholder="مثال: التدريب الصيفي"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">القسم التابع له</label>
                  <select
                    value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-sm font-bold"
                  >
                    {DEPARTMENTS.map(d => (
                       <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Charity Selection — only for new services */}
                {modalState.mode === "add" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">اختر الجمعيات *</label>
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        {selectedCharityIds.length === charities.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                      </button>
                    </div>
                    
                    {charities.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div className="max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-700/50">
                          {charities.map(c => {
                            const isSelected = selectedCharityIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                                  isSelected 
                                    ? "bg-primary/5 dark:bg-primary/10" 
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                                  isSelected 
                                    ? "bg-primary border-primary text-white" 
                                    : "border-slate-300 dark:border-slate-600"
                                }`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isSelected}
                                  onChange={() => toggleCharity(c.id)}
                                />
                                <div className="flex items-center gap-2 min-w-0">
                                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{c.name}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {/* Selection count */}
                        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500">
                          تم تحديد {selectedCharityIds.length} من {charities.length} جمعية
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        لا توجد جمعيات مسجلة في النظام
                      </p>
                    )}
                  </div>
                )}

                {modalState.mode === "edit" && (
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-3 py-2">
                    ⚠️ سيتم تطبيق التعديل على جميع الجمعيات المرتبطة بهذه الخدمة تلقائياً.
                  </p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-3 shrink-0">
                <button 
                  type="submit" 
                  disabled={isPending || !form.name.trim() || (modalState.mode === "add" && selectedCharityIds.length === 0)} 
                  className="flex-[2] bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm"
                >
                  {isPending ? "جاري الحفظ..." : modalState.mode === "edit" ? "حفظ التعديلات" : "إضافة الخدمة"}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-bold transition-colors text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
