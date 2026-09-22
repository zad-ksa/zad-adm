"use client";

import { uploadFile } from "@/lib/clientUpload";
import { useState, useRef } from "react";
import { addCharity } from "@/app/actions/charity";
import { Image as ImageIcon } from "lucide-react";
import { Dialog } from "@/components/console/Dialog";
import { btn } from "@/components/console/ui";

export default function AddCharityModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
        return;
      }
      
      const objectUrl = URL.createObjectURL(file);
      setLogoPreview(objectUrl);
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const establishmentDate = formData.get("establishmentDate") as string;
    const licenseNumber = formData.get("licenseNumber") as string;
    const domain = formData.get("domain") as string;

    if (!name.trim()) {
      setError("اسم الجمعية مطلوب");
      setLoading(false);
      return;
    }

    let uploadedLogoUrl = null;
    if (selectedFile) {
      try {
        const data = await uploadFile(selectedFile, "charity_logo");
        uploadedLogoUrl = data.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل رفع الشعار");
        setLoading(false);
        return;
      }
    }

    const res = await addCharity({ 
      name, 
      establishmentDate, 
      licenseNumber, 
      domain,
      logoUrl: uploadedLogoUrl
    });

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <Dialog
      title="إضافة جمعية جديدة"
      onClose={onClose}
      busy={loading}
      onSubmit={handleSubmit}
      closeOnBackdrop={false}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={loading} className={btn.secondary}>
            إلغاء
          </button>
          <button type="submit" disabled={loading} className={btn.primary}>
            {loading ? "جاري الإضافة..." : "إضافة الجمعية"}
          </button>
        </>
      }
    >
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-semibold border border-red-100 dark:border-red-800/50">
              {error}
            </div>
          )}

          {/* Logo Uploader */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 w-full text-right">
              شعار الجمعية
            </label>

            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex items-center justify-center relative shadow-inner group-hover:border-primary/40 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="شعار الجمعية" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="absolute -bottom-1 -left-1 bg-primary text-white px-2 py-1 rounded-lg shadow hover:bg-primary/95 transition-all text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {logoPreview ? "تغيير" : "رفع"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">الحد الأقصى لحجم الملف: 2 ميجابايت (PNG, JPG, SVG)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">اسم الجمعية *</label>
            <input
              type="text"
              name="name"
              required
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800 dark:text-slate-100"
              placeholder="مثال: جمعية البر الخيرية"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">مجال العمل (اختياري)</label>
            <input
              type="text"
              name="domain"
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800 dark:text-slate-100"
              placeholder="مثال: رعاية الأيتام، التنمية الأسرية"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">تاريخ التأسيس (اختياري)</label>
            <input
              type="text"
              name="establishmentDate"
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800 dark:text-slate-100"
              placeholder="مثال: 1420 هـ"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">رقم التصريح (اختياري)</label>
            <input
              type="text"
              name="licenseNumber"
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800 dark:text-slate-100"
              placeholder="مثال: 1234"
            />
          </div>

        </div>
    </Dialog>
  );
}
