"use client";

import { useState } from "react";
import { addCharity } from "@/app/actions/charity";

export default function AddCharityModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const establishmentDate = formData.get("establishmentDate") as string;
    const licenseNumber = formData.get("licenseNumber") as string;

    if (!name.trim()) {
      setError("اسم الجمعية مطلوب");
      setLoading(false);
      return;
    }

    const res = await addCharity({ name, establishmentDate, licenseNumber });

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">إضافة جمعية جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">اسم الجمعية *</label>
            <input 
              type="text" 
              name="name" 
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="مثال: جمعية البر الخيرية"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">تاريخ التأسيس (اختياري)</label>
            <input 
              type="text" 
              name="establishmentDate" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="مثال: 1420 هـ"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">رقم التصريح (اختياري)</label>
            <input 
              type="text" 
              name="licenseNumber" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="مثال: 1234"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "جاري الإضافة..." : "إضافة الجمعية"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
