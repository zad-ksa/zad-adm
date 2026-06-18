"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { addCharityClientAccount } from "@/app/actions/charityAccounts";

export default function CreateCharityAccountModal({ charityId, charityName }: { charityId: string, charityName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await addCharityClientAccount({
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
        charityId: charityId,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
          setFormData({ name: "", phone: "", password: "" });
        }, 2000);
      } else {
        setError(result.error || "حدث خطأ أثناء إنشاء الحساب");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-sm"
      >
        <UserPlus className="w-5 h-5" />
        <span className="hidden sm:inline">إنشاء حساب للجمعية</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">إنشاء حساب دخول جديد</h3>
                <p className="text-sm text-slate-500 mt-1">يمنح هذا الحساب العضو وصولاً مباشراً لصفحة الجمعية فقط.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm border border-emerald-100 font-bold text-center">
                  تم إنشاء الحساب بنجاح! 🎉
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                  placeholder="اسم المستخدم"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الجوال (اسم المستخدم للدخول)</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white text-left"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white text-left"
                  dir="ltr"
                  placeholder="كلمة مرور قوية"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || success}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
