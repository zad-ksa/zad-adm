"use client";

import { useState, useTransition } from "react";
import { Plus, Edit, Trash2, Layers, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { createServiceTemplate, updateServiceTemplate, deleteServiceTemplate } from "@/app/actions/services";
import { useRouter } from "next/navigation";

const DEPARTMENTS = [
  { value: "", label: "لا يتبع لأي قسم (خدمة عامة)" },
  { value: "STRATEGY", label: "الاستراتيجية" },
  { value: "GOVERNANCE", label: "الحوكمة" },
  { value: "FINANCE", label: "المالية" },
  { value: "PROGRAMS", label: "البرامج والمشاريع" },
  { value: "HR", label: "الموارد البشرية" }
];

export default function ManageServicesClient({
  initialTemplates,
}: {
  initialTemplates: any[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isPending, startTransition] = useTransition();
  
  const [search, setSearch] = useState("");

  const [modalState, setModalState] = useState<{isOpen: boolean, isEdit: boolean, id: string | null}>({ isOpen: false, isEdit: false, id: null });
  const [form, setForm] = useState({ name: "", department: "" });
  
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
    setModalState({ isOpen: true, isEdit: false, id: null });
  };

  const openEdit = (tpl: any) => {
    setForm({ 
      name: tpl.name, 
      department: tpl.department || ""
    });
    setModalState({ isOpen: true, isEdit: true, id: tpl.id });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (modalState.isEdit && modalState.id) {
          const updated = await updateServiceTemplate(modalState.id, form.name, form.department || null);
          setTemplates(prev => prev.map(t => t.id === updated.id ? { ...t, name: form.name, department: form.department || null } : t));
          showNotification("success", "تم تعديل القالب وتطبيقه على جميع الجمعيات بنجاح");
        } else {
          const created = await createServiceTemplate(form.name, form.department || null);
          setTemplates([{ ...created, stages: [] }, ...templates]);
          showNotification("success", "تمت إضافة القالب وتعميمه على الجمعيات بنجاح");
        }
        setModalState({ isOpen: false, isEdit: false, id: null });
        router.refresh();
      } catch (error: any) {
        showNotification("error", error.message || "حدث خطأ أثناء الحفظ");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("تحذير: سيتم حذف هذا القالب، وسيؤدي ذلك إلى حذف الخدمة من جميع الجمعيات! هل أنت متأكد؟")) return;
    startTransition(async () => {
      try {
        await deleteServiceTemplate(id);
        setTemplates(prev => prev.filter(t => t.id !== id));
        showNotification("success", "تم حذف القالب من جميع الجمعيات");
        router.refresh();
      } catch (error: any) {
        showNotification("error", "فشل الحذف");
      }
    });
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            إدارة قوالب الخدمات
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة المخططات الزمنية المركزية التي تطبق على جميع الجمعيات تلقائياً
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة قالب خدمة جديد
        </button>
      </div>

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

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="p-4 whitespace-nowrap">اسم قالب الخدمة</th>
                <th className="p-4 whitespace-nowrap">القسم التابع له</th>
                <th className="p-4 whitespace-nowrap text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredTemplates.map(tpl => (
                <tr key={tpl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-black text-slate-800 dark:text-slate-200">{tpl.name}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md text-xs font-bold">
                      {DEPARTMENTS.find(d => d.value === tpl.department)?.label || "لا يتبع لقسم"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(tpl)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tpl.id)} disabled={isPending} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTemplates.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد قوالب مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setModalState({ isOpen: false, isEdit: false, id: null })}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                {modalState.isEdit ? "تعديل القالب (يطبق على كل الجمعيات)" : "إضافة قالب خدمة جديد"}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                <p className="text-[11px] font-bold text-slate-400 mt-2">
                  هذا القالب سيُنسخ تلقائياً كخدمة لكل جمعية مسجلة في النظام.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={isPending || !form.name.trim()} className="flex-[2] bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm">
                  {isPending ? "جاري الحفظ..." : "حفظ وتعميم التغييرات"}
                </button>
                <button type="button" onClick={() => setModalState({ isOpen: false, isEdit: false, id: null })} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-bold transition-colors text-sm">
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
