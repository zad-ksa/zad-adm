"use client";

import { useState } from "react";
import { updateCharitySize } from "@/app/actions/governance";
import { CharitySize, governanceManuals } from "@/data/governanceManual";
import { ArrowRight, Building, FileText } from "lucide-react";

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
              disabled={isUpdatingSize || (s.id !== "MICRO")} // Disable others for now since we only have Micro data
              className="p-4 border border-slate-200 rounded-xl hover:bg-primary/5 hover:border-primary text-slate-700 font-bold transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                <Building className="w-5 h-5" />
              </div>
              {s.label}
              {s.id !== "MICRO" && <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">قريباً</span>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const manual = governanceManuals[size] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
        <div>
          <h3 className="font-bold text-primary flex items-center gap-2">
            <FileText className="w-5 h-5" />
            دليل الحوكمة
          </h3>
          <p className="text-xs text-primary/70 mt-1">يتم عرض الدليل المخصص للجمعيات: {size === "MICRO" ? "متناهية الصغر" : size}</p>
        </div>
        <button 
          onClick={() => setSize(null)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
        >
          تغيير الحجم
        </button>
      </div>

      {manual.length === 0 ? (
        <div className="text-center p-8 text-slate-500">جاري إعداد محتوى هذا الدليل...</div>
      ) : (
        <div className="space-y-8">
          {manual.map((standard) => (
            <div key={standard.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                <h4 className="font-extrabold text-slate-800">{standard.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{standard.description}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {standard.practices.map((practice) => (
                  <div key={practice.id} className="p-4 sm:p-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h5 className="font-bold text-slate-700 text-sm">{practice.title}</h5>
                        {practice.description && <p className="text-xs text-slate-500 mt-1">{practice.description}</p>}
                      </div>
                    </div>
                    
                    <ul className="space-y-2 mt-3">
                      {practice.points.map((point, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>

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
