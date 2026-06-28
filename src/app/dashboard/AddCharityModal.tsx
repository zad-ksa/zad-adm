"use client";

import { useState, useRef } from "react";
import { addCharity } from "@/app/actions/charity";
import { Image as ImageIcon } from "lucide-react";

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
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const data = await uploadRes.json();
        uploadedLogoUrl = data.url;
      } catch (err) {
        setError("فشل رفع الشعار، يرجى المحاولة مرة أخرى");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-base font-bold text-slate-800">إضافة جمعية جديدة</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg w-8 h-8 flex items-center justify-center transition-colors cursor-pointer select-none">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          {/* Logo Uploader */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <label className="block text-sm font-semibold text-slate-700 w-full text-right">
              شعار الجمعية
            </label>
            
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative shadow-inner group-hover:border-primary/40 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="شعار الجمعية" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-300" />
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
            <p className="text-[10px] text-slate-400 font-medium">الحد الأقصى لحجم الملف: 2 ميجابايت (PNG, JPG, SVG)</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">اسم الجمعية *</label>
            <input 
              type="text" 
              name="name" 
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800"
              placeholder="مثال: جمعية البر الخيرية"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">مجال العمل (اختياري)</label>
            <input 
              type="text" 
              name="domain" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800"
              placeholder="مثال: رعاية الأيتام، التنمية الأسرية"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">تاريخ التأسيس (اختياري)</label>
            <input 
              type="text" 
              name="establishmentDate" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800"
              placeholder="مثال: 1420 هـ"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">رقم التصريح (اختياري)</label>
            <input 
              type="text" 
              name="licenseNumber" 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all text-slate-800"
              placeholder="مثال: 1234"
            />
          </div>

          <div className="pt-4 flex gap-3 shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/95 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]"
            >
              {loading ? "جاري الإضافة..." : "إضافة الجمعية"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all cursor-pointer select-none active:scale-[0.98]"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
