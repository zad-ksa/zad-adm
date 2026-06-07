import { useState, useEffect } from "react";
import { Building2, UserCircle, ClipboardList, ArrowLeft, ChevronDownIcon } from "@/components/Icons";

export interface RegistrationData {
  charityName: string;
  establishmentDate: string;
  licenseNumber: string;
  authorizedName: string;
  authorizedTitle: string;
}

interface RegistrationFormProps {
  onComplete: (data: RegistrationData) => void;
  prefilledCharityName?: string;
  prefilledCharityLogo?: string;
}

export default function RegistrationForm({ onComplete, prefilledCharityName, prefilledCharityLogo }: RegistrationFormProps) {
  const [formData, setFormData] = useState<RegistrationData>({
    charityName: prefilledCharityName || "",
    establishmentDate: "-",
    licenseNumber: "-",
    authorizedName: "-",
    authorizedTitle: "",
  });

  useEffect(() => {
    if (prefilledCharityName) {
      setFormData((prev) => ({ ...prev, charityName: prefilledCharityName }));
    }
  }, [prefilledCharityName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 w-full animate-in fade-in duration-300 max-w-xl mx-auto shadow-sm" dir="rtl">
      <div className="mb-8 text-center">
        {/* Professional flat representation of Charity Logo or Icon Badge */}
        {prefilledCharityLogo ? (
          <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 border border-slate-200 p-2.5 transition-all duration-200">
            <img 
              src={prefilledCharityLogo} 
              alt={formData.charityName || "شعار الجمعية"} 
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-14 h-14 bg-primary/5 text-primary border border-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7" />
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-2">بيانات الجمعية</h2>
        <p className="text-slate-500 text-sm">يرجى تعبئة البيانات التالية للبدء في استبيان الجاهزية</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">اسم الجمعية بالكامل (حسب السجل)</label>
          <div className="relative">
            <input
              required
              type="text"
              name="charityName"
              value={formData.charityName}
              onChange={handleChange}
              disabled={!!prefilledCharityName}
              className={`w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary transition-all outline-none text-slate-800 ${prefilledCharityName ? 'bg-slate-100/70 cursor-not-allowed opacity-80' : ''}`}
              placeholder="مثال: جمعية البر الأهلية"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">صفة معبي الاستبيان</label>
          <div className="relative">
            <select
              required
              name="authorizedTitle"
              value={formData.authorizedTitle}
              onChange={handleChange}
              className="w-full pr-11 pl-10 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary transition-all outline-none text-slate-800 appearance-none font-medium"
            >
              <option value="" disabled>اختر الصفة...</option>
              <option value="عضو جمعية عمومية">عضو جمعية عمومية</option>
              <option value="عضو مجلس إدارة">عضو مجلس إدارة</option>
              <option value="موظف بدوام كامل">موظف بدوام كامل</option>
              <option value="موظف بدوام جزئي">موظف بدوام جزئي</option>
              <option value="متطوع">متطوع</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <UserCircle className="w-5 h-5" />
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>البدء في الاستبيان</span>
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </form>
    </div>
  );
}

