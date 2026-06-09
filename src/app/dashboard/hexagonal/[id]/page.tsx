import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Metadata } from "next";
import { 
  Award, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  Key, 
  Rocket,
  Clock
} from "@/components/Icons";
import { Search, BarChart3 } from "lucide-react";
import HexagonalLayoutClient from "./HexagonalLayoutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تفاصيل التحليل السداسي | زاد التنموية",
};

interface QuestionMeta {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  lightBgClass: string;
}

const METADATA: Record<string, QuestionMeta> = {
  q1: {
    title: "نقاط القوة التي تمتلكها الجمعية",
    icon: Award,
    colorClass: "text-[#00b050]",
    bgClass: "bg-[#00b050]/10",
    borderClass: "border-[#00b050]/20 dark:border-[#00b050]/30",
    lightBgClass: "bg-[#00b050]/5 dark:bg-[#00b050]/10",
  },
  q2: {
    title: "نقاط الضعف لدى الجمعية",
    icon: AlertTriangle,
    colorClass: "text-rose-600 dark:text-rose-500",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20 dark:border-rose-500/30",
    lightBgClass: "bg-rose-500/5 dark:bg-rose-500/10",
  },
  q3: {
    title: "الفرص التي يمكن ان تستثمرها الجمعية",
    icon: Sparkles,
    colorClass: "text-sky-600 dark:text-sky-500",
    bgClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20 dark:border-sky-500/30",
    lightBgClass: "bg-sky-500/5 dark:bg-sky-500/10",
  },
  q4: {
    title: "المخاطر التي يمكن ان تشكل خطرا على الجمعية",
    icon: ShieldAlert,
    colorClass: "text-amber-600 dark:text-amber-500",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20 dark:border-amber-500/30",
    lightBgClass: "bg-amber-500/5 dark:bg-amber-500/10",
  },
  q5: {
    title: "عوامل النجاح التي لابد من توفرها في الجمعية",
    icon: Key,
    colorClass: "text-[#ffc000]",
    bgClass: "bg-[#ffc000]/10",
    borderClass: "border-[#ffc000]/20 dark:border-[#ffc000]/30",
    lightBgClass: "bg-[#ffc000]/5 dark:bg-[#ffc000]/10",
  },
  q6: {
    title: "الميزة التنافسية للجمعية",
    icon: Rocket,
    colorClass: "text-violet-600 dark:text-violet-500",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20 dark:border-violet-500/30",
    lightBgClass: "bg-violet-500/5 dark:bg-violet-500/10",
  },
};

export default async function HexagonalDetails({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const response = await prisma.hexagonalResponse.findUnique({
    where: { id },
  });

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans transition-colors" dir="rtl">
        <div className="text-center bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm max-w-md w-full mx-4 flex flex-col items-center transition-colors">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 opacity-80 border border-slate-200 dark:border-slate-600 transition-colors">
            <Search className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight transition-colors">التقرير غير موجود</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 transition-colors">عذراً، لم نتمكن من العثور على التقرير المطلوب.</p>
          <Link href="/dashboard" className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all inline-block shadow-sm hover:shadow">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // Fetch the charity details to get logoUrl
  const charity = await prisma.charity.findUnique({
    where: { name: response.charityName }
  });
  const logoUrl = charity?.logoUrl || null;

  // Fetch all hexagonal responses for this charity to list in sidebar
  const responses = await prisma.hexagonalResponse.findMany({
    where: { charityName: response.charityName },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorizedTitle: true,
      createdAt: true,
    }
  });

  const answers = response.answers as Record<string, string[]>;

  return (
    <HexagonalLayoutClient
      charityName={response.charityName}
      logoUrl={logoUrl}
      currentResponseId={response.id}
      responses={responses}
    >
      {/* Charity Info Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-10 relative transition-colors">
         {/* Decorative background element */}
         <div className="absolute top-0 left-0 w-32 h-32 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-colors"></div>

         <div className="p-8 md:p-10 relative z-10">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-secondary/10 dark:bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary font-bold text-3xl border border-secondary/20 dark:border-secondary/30 shadow-inner transition-colors">
                  {response.charityName.substring(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] bg-secondary/10 dark:bg-secondary/20 text-secondary font-bold px-2.5 py-0.5 rounded uppercase tracking-wider transition-colors">
                       تقرير التحليل السداسي
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-2 transition-colors">{response.charityName}</h1>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 transition-colors">
                    <span className="text-xs text-slate-400 dark:text-slate-500 transition-colors">بواسطة:</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{response.authorizedTitle}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-auto bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 transition-colors" />
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">تاريخ التعبئة</div>
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors">
                  {new Date(response.createdAt).toLocaleDateString("ar-SA", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Riyadh"
                  })}
                </div>
              </div>
           </div>
         </div>
      </div>

      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-700 transition-colors">
        <div className="w-10 h-10 bg-secondary/10 dark:bg-secondary/20 rounded-xl flex items-center justify-center text-secondary border border-secondary/20 dark:border-secondary/30 shadow-inner transition-colors">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">تفاصيل أبعاد التحليل السداسي</h2>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(METADATA).map(([key, meta]) => {
          const list = answers[key] || [];
          
          return (
            <div 
              key={key} 
              className={`bg-white dark:bg-slate-800 rounded-2xl p-8 border ${meta.borderClass} shadow-sm relative overflow-hidden transition-colors`}
            >
              {/* Subtle colored background decoration */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50 ${meta.bgClass} pointer-events-none transition-colors`}></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100 dark:border-slate-700 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bgClass} border ${meta.borderClass} transition-colors`}>
                    <meta.icon className={`w-6 h-6 ${meta.colorClass}`} />
                  </div>
                  <h3 className={`font-bold text-lg ${meta.colorClass} tracking-tight leading-tight transition-colors`}>
                    {meta.title}
                  </h3>
                </div>

                <ul className="space-y-3">
                  {list.length > 0 ? (
                    list.map((item, idx) => (
                      <li key={idx} className={`flex gap-3 items-start p-3 rounded-xl ${meta.lightBgClass} transition-colors`}>
                        <span className={`w-6 h-6 rounded-lg ${meta.bgClass} ${meta.colorClass} flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 border ${meta.borderClass} transition-colors`}>
                          {idx + 1}
                        </span>
                        <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed pt-0.5 transition-colors">{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 dark:text-slate-500 text-sm font-medium text-center py-8 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-700/50 border-dashed transition-colors">
                      لا يوجد بنود مدخلة لهذا البعد
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </HexagonalLayoutClient>
  );
}
