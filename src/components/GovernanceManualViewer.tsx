"use client";

import { useState } from "react";
import { updateCharitySize, updateCharityRevenueAndSize } from "@/app/actions/governance";
import { CharitySize, governanceManuals } from "@/data/governanceManual";
import { ArrowRight, Building, FileText, CheckCircle2 } from "lucide-react";

interface ProgressItem {
  indicatorId: string;
  status: string;
  proofUrl: string | null;
}

export default function GovernanceManualViewer({
  charityId,
  initialSize,
  annualRevenue,
  progress,
}: {
  charityId: string;
  initialSize: CharitySize | null;
  annualRevenue?: number | null;
  progress: ProgressItem[];
}) {
  const [size, setSize] = useState<CharitySize | null>(initialSize);
  const [revenue, setRevenue] = useState<number | null>(annualRevenue || null);
  const [revenueInput, setRevenueInput] = useState<string>("");
  const [isUpdatingSize, setIsUpdatingSize] = useState(false);

  const handleSizeSelect = async (selectedSize: CharitySize) => {
    setIsUpdatingSize(true);
    const res = await updateCharitySize(charityId, selectedSize);
    if (res.success) {
      setSize(selectedSize);
    } else {
      alert(res.error);
    }
    setIsUpdatingSize(false);
  };

  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueInput || isNaN(Number(revenueInput))) return;
    
    setIsUpdatingSize(true);
    const numRevenue = Number(revenueInput);
    const res = await updateCharityRevenueAndSize(charityId, numRevenue);
    if (res.success && res.size) {
      setSize(res.size as CharitySize);
      setRevenue(numRevenue);
    } else {
      alert(res.error);
    }
    setIsUpdatingSize(false);
  };

  if (!size) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
        <Building className="w-16 h-16 text-primary/40 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">تحديد حجم الجمعية</h3>
        <p className="text-sm text-slate-500 mb-6">
          لتتمكن من عرض دليل الحوكمة المناسب لك، يرجى تحديد حجم الجمعية بناءً على المعايير المعتمدة.
        </p>
        
        <div className="max-w-md mx-auto mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4">التحديد التلقائي (موصى به)</h4>
          <form onSubmit={handleRevenueSubmit} className="flex gap-2">
            <input 
              type="number" 
              placeholder="أدخل إيرادات الجمعية السنوية" 
              value={revenueInput}
              onChange={(e) => setRevenueInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              required
            />
            <button 
              type="submit" 
              disabled={isUpdatingSize}
              className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50"
            >
              تحديد
            </button>
          </form>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-500">أو حدد الحجم يدوياً</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { id: "MICRO", label: "متناهية الصغر" },
            { id: "SMALL", label: "صغيرة" },
            { id: "MEDIUM", label: "متوسطة" },
            { id: "LARGE", label: "كبيرة" },
            { id: "MEGA", label: "متناهية الكبر" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => handleSizeSelect(s.id as CharitySize)}
              disabled={isUpdatingSize}
              className="p-4 border border-slate-200 rounded-xl hover:bg-primary/5 hover:border-primary text-slate-700 font-bold transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Building className="w-5 h-5" />
              </div>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const manual = governanceManuals[size] || [];
  const categoriesMap: Record<CharitySize, { name: string; max: number | null }> = {
    MICRO: { name: "متناهية الصغر", max: 500000 },
    SMALL: { name: "صغيرة", max: 2000000 },
    MEDIUM: { name: "متوسطة", max: 8000000 },
    LARGE: { name: "كبيرة", max: 30000000 },
    MEGA: { name: "متناهية الكبر", max: null },
  };

  const currentCategory = categoriesMap[size];
  
  // Find next category based on current size
  const sizesOrder: CharitySize[] = ["MICRO", "SMALL", "MEDIUM", "LARGE", "MEGA"];
  const currentIndex = sizesOrder.indexOf(size);
  const nextSize = sizesOrder[currentIndex + 1];
  const nextCategory = nextSize ? categoriesMap[nextSize] : null;

  let isApproachingNext = false;
  if (revenue && currentCategory.max !== null && nextCategory) {
    const thresholdAmount = currentCategory.max * 0.9; // 90% threshold
    if (revenue >= thresholdAmount) {
      isApproachingNext = true;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
        <div>
          <h3 className="font-bold text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            دليل الحوكمة
          </h3>
          <p className="text-xs text-primary/70 mt-1">يتم عرض الدليل المخصص للجمعيات: {currentCategory.name}</p>
        </div>
        <button 
          onClick={() => setSize(null)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
        >
          تغيير الحجم أو الإيراد
        </button>
      </div>

      {isApproachingNext && nextCategory && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-4 items-start shadow-sm">
          <div className="text-amber-500 mt-1 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-amber-800">تنبيه استباقي للاستعداد</h4>
            <p className="text-sm text-amber-700 mt-1 mb-2 leading-relaxed">
              نلاحظ أن إيرادات جمعيتكم ({new Intl.NumberFormat('ar-SA').format(revenue!)}) تقترب من حاجز الانتقال ({new Intl.NumberFormat('ar-SA').format(currentCategory.max!)} ريال). 
              عند تجاوز هذا الرقم ستنتقل جمعيتكم إلى فئة <strong>"{nextCategory.name}"</strong>.
            </p>
            <p className="text-sm font-semibold text-amber-800 bg-amber-100/50 inline-block px-2 py-1 rounded">
              يرجى الاطلاع على معايير الجمعيات الـ {nextCategory.name} للاستعداد المبكر للحوكمة القادمة.
            </p>
          </div>
        </div>
      )}

      {manual.length === 0 ? (
        <div className="text-center p-8 text-slate-500 dark:text-slate-400">جاري إعداد محتوى هذا الدليل...</div>
      ) : (
        <div className="space-y-8">
          {manual.map((standard) => (
            <div key={standard.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-5 border-b border-slate-200 dark:border-slate-700">
                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">{standard.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{standard.description}</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {standard.practices.map((practice) => (
                  <div key={practice.id} className="p-5 sm:p-6 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    <div className="mb-4">
                      <h5 className="font-extrabold text-slate-800 dark:text-slate-200 text-base border-r-4 border-primary pr-3 leading-none">
                        {practice.title}
                      </h5>
                      {practice.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 pr-4">{practice.description}</p>
                      )}
                    </div>
                    
                    <div className="space-y-4 mt-3 pr-1 sm:pr-4">
                      {practice.questions.map((q, idx) => (
                        <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-3 w-full">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                                {q.question}
                              </p>
                              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30 text-xs flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold block mb-0.5 text-emerald-900 dark:text-emerald-200">شاهد التحقق:</span>
                                  <span className="leading-relaxed">{q.proof.replace(/^شاهد التحقق:\s*/, "")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
