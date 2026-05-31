import { useState } from "react";
import { Building2, UserCircle, ClipboardList, ArrowLeft } from "@/components/Icons";

export interface RegistrationData {
  charityName: string;
  establishmentDate: string;
  licenseNumber: string;
  authorizedName: string;
  authorizedTitle: string;
}

interface RegistrationFormProps {
  onComplete: (data: RegistrationData) => void;
}

export default function RegistrationForm({ onComplete }: RegistrationFormProps) {
  const [formData, setFormData] = useState<RegistrationData>({
    charityName: "",
    establishmentDate: "-",
    licenseNumber: "-",
    authorizedName: "-",
    authorizedTitle: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="glassmorphism rounded-3xl p-8 sm:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto shadow-xl" dir="rtl">
      <div className="mb-8 text-center">
        {/* Site-specific styled icon badge */}
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 text-primary">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">بيانات الجمعية</h2>
        <p className="text-slate-500 text-sm">يرجى تعبئة البيانات التالية للبدء في استبيان الجاهزية</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الجمعية بالكامل (حسب السجل)</label>
          <div className="relative">
            <input
              required
              type="text"
              name="charityName"
              value={formData.charityName}
              onChange={handleChange}
              className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-slate-800"
              placeholder="مثال: جمعية البر الأهلية"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">صفة معبي الاستبيان</label>
          <div className="relative">
            <select
              required
              name="authorizedTitle"
              value={formData.authorizedTitle}
              onChange={handleChange}
              className="w-full pr-11 pl-10 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none bg-white text-slate-800 appearance-none font-medium"
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
            {/* Custom dropdown arrow for clean styling */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/95 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>البدء في الاستبيان</span>
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </form>
    </div>
  );
}

