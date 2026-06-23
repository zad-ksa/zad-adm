"use client";

import { useState, useEffect } from "react";
import { Plus, Link as LinkIcon, FileText, Scale, Cpu, Eye, EyeOff, Trash2, Building } from "lucide-react";
import { addRegulation, deleteRegulation, toggleRegulationVisibility } from "@/app/actions/governance";

type CharityRegulationVisibility = {
  id: string;
  charityId: string;
  regulationId: string;
  isVisible: boolean;
};

type Regulation = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
  link: string;
  charityVisibilities: CharityRegulationVisibility[];
};

export default function GovernanceRegulationsManager({
  charityId,
  regulations,
  isAdmin = false
}: {
  charityId: string;
  regulations: Regulation[];
  isAdmin?: boolean;
}) {
  const [localRegulations, setLocalRegulations] = useState(regulations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReg, setNewReg] = useState({ title: "", description: "", category: "الإشراف والحوكمة", link: "" });

  useEffect(() => {
    setLocalRegulations(regulations);
  }, [regulations]);

  const handleAddRegulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.title || !newReg.link) return;
    
    setIsSubmitting(true);
    try {
      await addRegulation(newReg.title, newReg.category, newReg.link, newReg.description);
      setIsModalOpen(false);
      setNewReg({ title: "", description: "", category: "الإشراف والحوكمة", link: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (regId: string, currentIsVisible: boolean) => {
    // تحديث واجهة المستخدم فورياً (Optimistic Update)
    setLocalRegulations(prev => prev.map(reg => {
      if (reg.id === regId) {
        const newVisibilities = [...reg.charityVisibilities];
        const existingIndex = newVisibilities.findIndex(v => v.charityId === charityId);
        if (existingIndex >= 0) {
          newVisibilities[existingIndex] = { ...newVisibilities[existingIndex], isVisible: !currentIsVisible };
        } else {
          newVisibilities.push({ id: 'temp-' + Date.now(), charityId, regulationId: regId, isVisible: !currentIsVisible });
        }
        return { ...reg, charityVisibilities: newVisibilities };
      }
      return reg;
    }));

    try {
      await toggleRegulationVisibility(charityId, regId, currentIsVisible);
    } catch (error) {
      // استرجاع الحالة السابقة في حال فشل الطلب
      setLocalRegulations(regulations);
    }
  };

  const handleDelete = async (regId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه اللائحة من النظام بشكل نهائي لجميع الجمعيات؟")) {
      // تحديث واجهة المستخدم فورياً
      setLocalRegulations(prev => prev.filter(reg => reg.id !== regId));
      try {
        await deleteRegulation(regId);
      } catch (error) {
        // استرجاع الحالة السابقة في حال فشل الطلب
        setLocalRegulations(regulations);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-emerald-500" />
        لوائح الحوكمة
      </h3>

      {localRegulations.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد لوائح مسجلة في النظام بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localRegulations.map((reg, index) => {
              const isVisible = !reg.charityVisibilities.some(v => v.charityId === charityId && v.isVisible === false);
              
              if (!isVisible && !isAdmin) return null;

              return (
                <div 
                  key={reg.id} 
                  className={`group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl px-6 pt-8 pb-6 shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl flex flex-col gap-4 ${
                    !isVisible ? "opacity-60 grayscale" : ""
                  }`}
                >
                  {/* Background expanding circle */}
                  <span
                    className="absolute top-0 right-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 dark:opacity-30 transition-all duration-500 transform group-hover:scale-[20]"
                  ></span>
                  
                  <div className="relative z-10 flex items-center gap-4 w-full">
                    {/* Number Circle */}
                    <span
                      className="shrink-0 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 transform group-hover:bg-gradient-to-r group-hover:from-emerald-400 group-hover:to-teal-400 text-white font-bold text-xl shadow-md"
                    >
                      {index + 1}
                    </span>
                    
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug transition-colors duration-500 group-hover:text-emerald-900 dark:group-hover:text-emerald-100" title={reg.title}>
                        {reg.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 transition-colors duration-500
                          ${reg.category === "الإشراف والحوكمة" 
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/50 group-hover:text-emerald-900 dark:group-hover:text-emerald-100" 
                            : reg.category === "التحول الرقمي"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 group-hover:text-blue-900 dark:group-hover:text-blue-100"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-800/50 group-hover:text-purple-900 dark:group-hover:text-purple-100"
                          }`}
                        >
                          {reg.category === "الإشراف والحوكمة" ? <Scale className="w-3 h-3" /> : 
                           reg.category === "التحول الرقمي" ? <Cpu className="w-3 h-3" /> : 
                           <Building className="w-3 h-3" />}
                          {reg.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex-1 mt-2">
                    {reg.description ? (
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 transition-colors duration-500 group-hover:text-emerald-800 dark:group-hover:text-emerald-200/90 leading-relaxed" title={reg.description}>
                        {reg.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic transition-colors duration-500 group-hover:text-emerald-700 dark:group-hover:text-emerald-300/70">
                        لا يوجد وصف لهذه اللائحة
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-4 mt-auto border-t border-slate-100 dark:border-slate-700 transition-colors duration-500 group-hover:border-emerald-100 dark:group-hover:border-emerald-800/50">
                    <a 
                      href={reg.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-2 transition-colors duration-500 group-hover:text-emerald-900 dark:group-hover:text-emerald-100"
                    >
                      <span>عرض اللائحة</span>
                      <LinkIcon className="w-4 h-4" />
                    </a>

                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle(reg.id, isVisible); }}
                            title={isVisible ? "إخفاء عن هذه الجمعية" : "إظهار لهذه الجمعية"}
                            className={`p-2 rounded-lg transition-colors duration-500 ${
                              isVisible 
                                ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/50 group-hover:text-emerald-900 dark:group-hover:text-emerald-100 group-hover:hover:bg-emerald-200 dark:group-hover:hover:bg-emerald-700/50" 
                                : "text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 group-hover:hover:bg-slate-300 dark:group-hover:hover:bg-slate-500"
                            }`}
                          >
                            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(reg.id); }}
                            title="حذف اللائحة من النظام بالكامل"
                            className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors duration-500 group-hover:bg-red-500/20 group-hover:text-red-100 group-hover:hover:bg-red-500/40 group-hover:hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      {isAdmin && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-8 left-8 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 z-50 group"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
        </button>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">إضافة لائحة جديدة للمنصة</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">ستكون هذه اللائحة متاحة لجميع الجمعيات بشكل افتراضي.</p>
            </div>
            
            <form onSubmit={handleAddRegulation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  عنوان اللائحة
                </label>
                <input
                  required
                  type="text"
                  value={newReg.title}
                  onChange={e => setNewReg({...newReg, title: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  placeholder="مثال: لائحة تنظيم التبرعات"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={newReg.description}
                  onChange={e => setNewReg({...newReg, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white resize-none"
                  placeholder="اكتب وصفاً مختصراً للائحة..."
                  rows={3}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  القسم
                </label>
                <select
                  value={newReg.category}
                  onChange={e => setNewReg({...newReg, category: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                >
                  <option value="الإشراف والحوكمة">الإشراف والحوكمة</option>
                  <option value="التحول الرقمي">التحول الرقمي</option>
                  <option value="القطاع غير الربحي">القطاع غير الربحي</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  الرابط (المركز الوطني)
                </label>
                <input
                  required
                  type="url"
                  value={newReg.link}
                  onChange={e => setNewReg({...newReg, link: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                  placeholder="https://ncnp.gov.sa/..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ اللائحة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
