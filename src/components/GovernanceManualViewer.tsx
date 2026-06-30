"use client";

import { useState } from "react";
import { updateCharitySize } from "@/app/actions/governance";
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
  progress,
}: {
  charityId: string;
  initialSize: CharitySize | null;
  progress: ProgressItem[];
}) {
  const [size, setSize] = useState<CharitySize | null>(initialSize);
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

  if (!size) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center shadow-sm">
        <Building className="w-16 h-16 text-primary/40 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">تحديد حجم الجمعية</h3>
        <p className="text-sm text-slate-500 mb-6">
          لتتمكن من عرض دليل الحوكمة المناسب لك، يرجى تحديد حجم الجمعية بناءً على المعايير المعتمدة.
        </p>
        
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
  const sizeLabels: Record<CharitySize, string> = {
    MICRO: "متناهية الصغر",
    SMALL: "صغيرة",
    MEDIUM: "متوسطة",
    LARGE: "كبيرة",
    MEGA: "متناهية الكبر"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
        <div>
          <h3 className="font-bold text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            دليل الحوكمة
          </h3>
          <p className="text-xs text-primary/70 mt-1">يتم عرض الدليل المخصص للجمعيات: {sizeLabels[size]}</p>
        </div>
        <button 
          onClick={() => setSize(null)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
        >
          تغيير الحجم
        </button>
      </div>

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
