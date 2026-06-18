"use client";

import { useState } from "react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReg, setNewReg] = useState({ title: "", description: "", category: "الإشراف والحوكمة", link: "" });

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
    await toggleRegulationVisibility(charityId, regId, currentIsVisible);
  };

  const handleDelete = async (regId: string) => {
    if (confirm("هل أنت متأكد من حذف هذه اللائحة من النظام بشكل نهائي لجميع الجمعيات؟")) {
      await deleteRegulation(regId);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-emerald-500" />
        لوائح الحوكمة
      </h3>

      {regulations.length === 0 ? (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>لا توجد لوائح مسجلة في النظام بعد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {regulations.map((reg) => {
              const isVisible = !reg.charityVisibilities.some(v => v.charityId === charityId && v.isVisible === false);
              
              if (!isVisible && !isAdmin) return null;

              return (
                <div 
                  key={reg.id} 
                className={`flex flex-col gap-3 p-5 rounded-xl border transition-all ${
                  isVisible 
                    ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700" 
                    : "bg-slate-100/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60 grayscale"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{reg.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                        reg.category === "الإشراف والحوكمة" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" 
                          : reg.category === "التحول الرقمي"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                          : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
                      }`}>
                        {reg.category === "الإشراف والحوكمة" ? <Scale className="w-3 h-3" /> : 
                         reg.category === "التحول الرقمي" ? <Cpu className="w-3 h-3" /> : 
                         <Building className="w-3 h-3" />}
                        {reg.category}
                      </span>
                    </div>
                    {reg.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {reg.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggle(reg.id, isVisible)}
                          title={isVisible ? "إخفاء عن هذه الجمعية" : "إظهار لهذه الجمعية"}
                          className={`p-2 rounded-lg transition-colors ${
                            isVisible 
                              ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40" 
                              : "text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
                          }`}
                        >
                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(reg.id)}
                          title="حذف اللائحة من النظام بالكامل"
                          className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isVisible && (
                  <a 
                    href={reg.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-auto text-sm text-primary hover:underline font-medium inline-flex items-center gap-1 w-fit"
                  >
                    <LinkIcon className="w-3 h-3" />
                    عرض اللائحة في المركز الوطني
                  </a>
                )}
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
