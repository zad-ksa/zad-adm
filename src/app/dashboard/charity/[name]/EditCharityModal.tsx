"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCharity } from "@/app/actions/charity";
import { X, Loader2, AlertCircle } from "@/components/Icons";
import { Image as ImageIcon } from "lucide-react";

interface EditCharityModalProps {
  charity: {
    name: string;
    licenseNumber: string | null;
    establishmentDate: string | null;
    logoUrl: string | null;
    domain?: string | null;
  };
  onClose: () => void;
}

export default function EditCharityModal({ charity, onClose }: EditCharityModalProps) {
  const [name, setName] = useState(charity.name);
  const [licenseNumber, setLicenseNumber] = useState(charity.licenseNumber || "");
  const [establishmentDate, setEstablishmentDate] = useState(charity.establishmentDate || "");
  const [domain, setDomain] = useState(charity.domain || "");
  const [logoPreview, setLogoPreview] = useState<string | null>(charity.logoUrl);
  const [error, setError] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("حجم الملف يجب أن يكون أقل من 2 ميجابايت");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("اسم الجمعية مطلوب");
      return;
    }

    startTransition(async () => {
      const result = await updateCharity(charity.name, {
        name,
        licenseNumber: licenseNumber || undefined,
        establishmentDate: establishmentDate || undefined,
        domain: domain || undefined,
        logoUrl: logoPreview,
      });
      if (result.success) {
        onClose();
        // Redirect to new path if name changed, otherwise refresh page
        if (result.name && result.name.toLowerCase() !== charity.name.toLowerCase()) {
          router.push(`/dashboard/charity/${encodeURIComponent(result.name)}`);
        } else {
          router.refresh();
        }
      } else {
        setError(result.message || "حدث خطأ أثناء حفظ التعديلات");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300"
        onClick={() => { if (!isPending) onClose(); }}
      />
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden relative z-10 transform transition-all duration-300 scale-100 max-h-[90vh] flex flex-col font-sans" dir="rtl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-slate-800">تعديل ملف الجمعية</h3>
          <button 
            onClick={onClose} 
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start text-sm text-red-700 font-bold">
              <AlertCircle className="w-5 h-5 ml-2 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Logo Uploader */}
          <div className="flex flex-col items-center gap-4">
            <label className="block text-sm font-bold text-slate-700 w-full text-right">
              شعار الجمعية
            </label>
            
            <div className="relative group">
              <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center relative shadow-inner group-hover:border-primary/40 transition-colors">
                {logoPreview ? (
                  <img src={logoPreview} alt="شعار الجمعية" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-slate-300" />
                )}
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="absolute -bottom-2 -left-2 bg-primary text-white p-2 rounded-xl shadow hover:bg-primary/95 transition-all text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50"
              >
                تغيير
              </button>
            </div>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
            <p className="text-[11px] text-slate-400 font-medium">الحد الأقصى لحجم الملف: 2 ميجابايت (PNG, JPG, SVG)</p>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label htmlFor="charity-name" className="block text-sm font-bold text-slate-700 mb-2">
                اسم الجمعية
              </label>
              <input
                id="charity-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 focus:bg-white text-slate-800 text-sm font-bold"
                placeholder="أدخل اسم الجمعية"
              />
            </div>

            <div>
              <label htmlFor="charity-domain" className="block text-sm font-bold text-slate-700 mb-2">
                مجال العمل
              </label>
              <input
                id="charity-domain"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 focus:bg-white text-slate-800 text-sm font-bold"
                placeholder="مثال: رعاية الأيتام، التنمية الأسرية"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="license-number" className="block text-sm font-bold text-slate-700 mb-2">
                  رقم التصريح
                </label>
                <input
                  id="license-number"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 focus:bg-white text-slate-800 text-sm font-bold"
                  placeholder="رقم الترخيص"
                />
              </div>

              <div>
                <label htmlFor="est-date" className="block text-sm font-bold text-slate-700 mb-2">
                  تاريخ التأسيس
                </label>
                <input
                  id="est-date"
                  type="text"
                  value={establishmentDate}
                  onChange={(e) => setEstablishmentDate(e.target.value)}
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none bg-slate-50 focus:bg-white text-slate-800 text-sm font-bold"
                  placeholder="مثال: 1440هـ أو 2019م"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-bold transition-all text-sm cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/95 font-bold transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-sm hover:shadow"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
