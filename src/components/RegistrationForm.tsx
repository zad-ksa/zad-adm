import { useState } from "react";

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
    <div className="glassmorphism rounded-3xl p-8 sm:p-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto shadow-xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">بيانات الجمعية</h2>
        <p className="text-slate-500">يرجى تعبئة البيانات التالية للبدء في استبيان الجاهزية</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">اسم الجمعية بالكامل (حسب السجل)</label>
          <input
            required
            type="text"
            name="charityName"
            value={formData.charityName}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="مثال: جمعية البر الأهلية"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">صفة معبي الاستبيان</label>
          <select
            required
            name="authorizedTitle"
            value={formData.authorizedTitle}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none bg-white text-slate-800"
          >
            <option value="" disabled>اختر الصفة...</option>
            <option value="عضو جمعية عمومية">عضو جمعية عمومية</option>
            <option value="عضو مجلس إدارة">عضو مجلس إدارة</option>
            <option value="موظف بدوام كامل">موظف بدوام كامل</option>
            <option value="موظف بدوام جزئي">موظف بدوام جزئي</option>
            <option value="متطوع">متطوع</option>
          </select>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            البدء في الاستبيان
          </button>
        </div>
      </form>
    </div>
  );
}
