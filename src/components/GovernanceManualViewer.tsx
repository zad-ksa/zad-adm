"use client";

import { useState } from "react";
import { updateCharitySize, updateCharityRevenueAndSize } from "@/app/actions/governance";
import { CharitySize } from "@/data/governanceManual";
import { Building, CheckCircle2, Landmark, TrendingUp, Gem, Loader2, Calculator } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface ProgressItem {
  indicatorId: string;
  status: string;
  proofUrl: string | null;
}

export default function GovernanceManualViewer({
  charityId,
  charityName,
  initialSize,
  annualRevenue,
  progress,
}: {
  charityId: string;
  charityName: string;
  initialSize: CharitySize | null;
  annualRevenue?: number | null;
  progress: ProgressItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [revenueInput, setRevenueInput] = useState<string>(annualRevenue ? annualRevenue.toString() : "");
  const [isUpdatingSize, setIsUpdatingSize] = useState(false);

  const forceSelect = searchParams.get('change_size');

  useEffect(() => {
    if (initialSize && !forceSelect) {
      router.replace(`/main/governance/${encodeURIComponent(charityName)}/standards?size=${initialSize}`);
    }
  }, [initialSize, forceSelect, charityName, router]);

  const navigateToStandards = (selectedSize: CharitySize) => {
    router.push(`/main/governance/${encodeURIComponent(charityName)}/standards?size=${selectedSize}`);
  };

  const handleSizeSelect = async (selectedSize: CharitySize) => {
    setIsUpdatingSize(true);
    const res = await updateCharitySize(charityId, selectedSize);
    if (res.success) {
      navigateToStandards(selectedSize);
    } else {
      alert(res.error);
      setIsUpdatingSize(false);
    }
  };

  const handleRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueInput || isNaN(Number(revenueInput))) return;
    
    setIsUpdatingSize(true);
    const numRevenue = Number(revenueInput);
    const res = await updateCharityRevenueAndSize(charityId, numRevenue);
    if (res.success && res.size) {
      navigateToStandards(res.size as CharitySize);
    } else {
      alert(res.error);
      setIsUpdatingSize(false);
    }
  };

  const sizes = [
    {
      id: "MICRO",
      title: "الجمعيات متناهية الصغر",
      desc: "إجمالي المصروفات السنوية لا يتجاوز 500 ألف ريال سعودي.",
      icon: <Building className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["معيار الامتثال والالتزام الأساسي", "مؤشرات الشفافية المبسطة"]
    },
    {
      id: "SMALL",
      title: "الجمعيات الصغيرة",
      desc: "إجمالي المصروفات من 500 ألف إلى 2 مليون ريال سعودي.",
      icon: <Building className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["الامتثال والالتزام الأساسي", "الشفافية المبسطة"]
    },
    {
      id: "MEDIUM",
      title: "الجمعيات المتوسطة",
      desc: "إجمالي المصروفات من 2 مليون إلى 8 مليون ريال سعودي.",
      icon: <Landmark className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["معيار السلامة المالية", "سياسات حوكمة متقدمة"]
    },
    {
      id: "LARGE",
      title: "الجمعيات الكبيرة",
      desc: "إجمالي المصروفات من 8 مليون إلى 30 مليون ريال سعودي.",
      icon: <TrendingUp className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["مراجعة داخلية مستقلة إلزامية", "لجان منبثقة (مراجعة، مكافآت)"]
    },
    {
      id: "MEGA",
      title: "الجمعيات متناهية الكبر",
      desc: "إجمالي المصروفات يتجاوز 30 مليون ريال سعودي.",
      icon: <Gem className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />,
      features: ["حوكمة مؤسسية شاملة", "تدقيق مالي عالي المستوى"]
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12" dir="rtl">
      {isUpdatingSize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="font-bold text-slate-700 dark:text-slate-200">جاري التوجيه للمعايير...</p>
          </div>
        </div>
      )}

      {/* Auto Selection Section */}
      <div className="bg-white dark:bg-[#111] p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-2">
              <Calculator className="w-4 h-4" />
              <span className="text-xs font-bold tracking-wide">الخيار الموصى به</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">التحديد التلقائي لحجم الجمعية</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              أدخل إيرادات/مصروفات الجمعية السنوية ليقوم النظام بتحديد الفئة المناسبة وعرض الشواهد المتعلقة بها فوراً.
            </p>
          </div>
          
          <form onSubmit={handleRevenueSubmit} className="flex w-full md:w-auto gap-3">
            <input 
              type="number" 
              placeholder="إجمالي الإيرادات السنوية..." 
              value={revenueInput}
              onChange={(e) => setRevenueInput(e.target.value)}
              className="flex-1 md:w-64 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white transition-all font-medium placeholder:text-slate-400"
              required
            />
            <button 
              type="submit" 
              disabled={isUpdatingSize}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 hover:-translate-y-0.5 transition-all shadow-sm active:translate-y-0 disabled:opacity-50"
            >
              استعراض المعايير
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        <span className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-2">أو اختر التصنيف يدوياً</span>
        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[minmax(180px,auto)]">
        {sizes.map((size) => (
          <button 
            key={size.id}
            onClick={() => handleSizeSelect(size.id as CharitySize)}
            disabled={isUpdatingSize}
            className="md:col-span-4 relative rounded-3xl overflow-hidden bg-white dark:bg-[#111] ring-1 ring-slate-200 dark:ring-slate-800/80 shadow-sm hover:shadow-md hover:ring-primary/40 dark:hover:ring-primary/50 transition-all duration-300 p-6 flex flex-col gap-4 group text-right w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300 relative z-10">
              {size.icon}
            </div>

            <div className="relative z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">{size.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 min-h-[32px]">
                {size.desc}
              </p>
              <ul className="space-y-2">
                {size.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
