"use client";

import { useState, useTransition, useMemo } from "react";
import { PageHeader } from "@/components/console/layout";
import { confirmAction } from "@/components/console/confirmBus";
import { Plus, Edit, Trash2, Layers, Search, CheckCircle2, AlertCircle, Building2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { addServiceToCharities, renameServiceGlobally, deleteServiceGlobally } from "@/app/actions/services";
import { setServiceEmployees } from "@/app/actions/serviceAccess";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

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
  employees,
  accessMap,
}: {
  initialServices: ServiceGroup[];
  charities: CharityItem[];
  employees: { id: string; name: string }[];
  accessMap: Record<string, string[]>;
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
  // من يصل إلى الخدمة المفتوحة للتعديل. فارغة = مفتوحة للجميع.
  const [grantedIds, setGrantedIds] = useState<string[]>([]);
  
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
    setGrantedIds(accessMap[svc.name] ?? []);
    setModalState({ isOpen: true, mode: "edit", originalName: svc.name });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: "add", originalName: null });
    setSelectedCharityIds([]);
    setGrantedIds([]);
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
      // الاسم مقصوصاً، كما يحفظه الخادم — وإلا بحث منح الخدمة عن اسمٍ بفراغٍ
      // لا وجود له.
      const name = form.name.trim();
      try {
        if (modalState.mode === "edit" && modalState.originalName) {
          // تعديل الاسم عند كل الجمعيات
          const renamed = await renameServiceGlobally(modalState.originalName, name, form.department || null);
          // الاسم المأخوذ يُرجَع خطأً قيمةً — «توجد خدمة بهذا الاسم».
          if (renamed?.error) {
            showNotification("error", renamed.error);
            return;
          }
          // بعد إعادة التسمية، لأن المنح مفتاحه الاسم — والاسم قد تغيّر للتوّ.
          const granted = await setServiceEmployees(name, grantedIds);
          if (!granted.success) {
            showNotification("error", granted.error);
            return;
          }
          setServices(prev => prev.map(s => 
            s.name === modalState.originalName 
              ? { ...s, name, department: form.department || null } 
              : s
          ));
          showNotification("success", "تم تعديل الخدمة عند جميع الجمعيات بنجاح");
        } else {
          // إضافة خدمة جديدة
          if (selectedCharityIds.length === 0) {
            showNotification("error", "يرجى تحديد جمعية واحدة على الأقل");
            return;
          }
          const added = await addServiceToCharities(name, form.department || null, selectedCharityIds);
          if (added?.error) {
            showNotification("error", added.error);
            return;
          }
          
          const newCharities = selectedCharityIds
            .map(cId => charities.find(c => c.id === cId))
            .filter(Boolean) as CharityItem[];

          setServices(prev => [{
            name,
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

  const handleDelete = async (name: string, count: number) => {
    if (!(await confirmAction({ title: `تحذير: سيتم حذف خدمة "${name}" من ${count} جمعية! هل أنت متأكد؟` }))) return;
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
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-6 left-6 z-50 bg-red-500 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      <PageHeader
        crumbs={[{ label: "لوحة التحكم", href: "/main/admin" }, { label: "إدارة الخدمات" }]}
        icon={<Layers className="w-6 h-6" />}
        title="إدارة الخدمات"
        description="الخدمات الحالية المقدمة للجمعيات — أضف، عدّل أو احذف"
        actions={
          <button
            onClick={openAdd}
            className={btn.primary}
          >
            <Plus className="w-4 h-4" />
            إضافة خدمة جديدة
          </button>
        }
      />

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="ابحث عن اسم الخدمة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:text-slate-200"
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
              className={`group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-all duration-300 overflow-hidden flex flex-col justify-between hover:border-primary/30 ${activeColor.border}`}
            >
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Category Pill & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeColor.bg} ${activeColor.text}`}>
                      <span className={`w-1 h-1 rounded-full ${activeColor.dot}`} />
                      {(accessMap[svc.name]?.length ?? 0) === 0
                        ? "مفتوحة للجميع"
                        : `${accessMap[svc.name].length} موظف مصرَّح`}
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
          <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Layers className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-400 font-extrabold text-xs">لا توجد خدمات {search ? "مطابقة للبحث" : "مسجلة حالياً"}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalState.isOpen && (
        <Dialog
title={<>{modalState.mode === "edit" ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</>}
onClose={closeModal}
onSubmit={handleSubmit}
footer={
<>
<button 
                  type="button" 
                  onClick={closeModal} 
                  className={btn.secondary}
                >
                  إلغاء
                </button>
<button 
                  type="submit" 
                  disabled={isPending || !form.name.trim() || (modalState.mode === "add" && selectedCharityIds.length === 0)} 
                  className={btn.primary}
                >
                  {isPending ? "جاري الحفظ..." : modalState.mode === "edit" ? "حفظ التعديلات" : "إضافة الخدمة"}
                </button>
</>
}
>
<div className="space-y-4">
<div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اسم الخدمة *</label>
                  <input
                    type="text" required
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all dark:text-white text-sm font-bold"
                    placeholder="مثال: التدريب الصيفي"
                  />
                </div>

                {/* كان هنا «القسم التابع له». حُذف لأنه لم يكن تصنيفاً: قيمته
                    تُقارَن بدور الموظف (session.role === service.department) —
                    أي صلاحية مقنّعة، وكانت null في الخدمات الاثنتين والسبعين
                    كلها فلم تمنح أحداً شيئاً يوماً. مكانه الآن منحٌ صريح. */}
                {modalState.mode === "edit" && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      الموظفون الذين يصلون إلى هذه الخدمة
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
                      {employees.length === 0 && (
                        <p className="px-3 py-3 text-xs text-slate-400">لا موظفون نشطون.</p>
                      )}
                      {employees.map(emp => {
                        const on = grantedIds.includes(emp.id);
                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => setGrantedIds(prev => on ? prev.filter(x => x !== emp.id) : [...prev, emp.id])}
                            className={`w-full px-3 py-2 flex items-center gap-2.5 text-right transition-colors ${on ? "bg-primary/5 dark:bg-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-700/40"}`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"}`}>
                              {on && <Check className="w-3 h-3" />}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{emp.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                      {grantedIds.length === 0
                        ? "لم يُحدَّد أحد — الخدمة ظاهرة لكل من يملك «عرض الخدمات»، في حدود جمعياته المُسندة."
                        : `مقصورة على ${grantedIds.length} موظفاً، كلٌّ في حدود جمعياته المُسندة.`}
                    </p>
                  </div>
                )}

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
</div>
</Dialog>
      )}
    </div>
  );
}
