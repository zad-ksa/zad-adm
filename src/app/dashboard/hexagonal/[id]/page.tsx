import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تفاصيل التحليل السداسي | زاد التنموية",
};

interface QuestionMeta {
  title: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  lightBgClass: string;
}

const METADATA: Record<string, QuestionMeta> = {
  q1: {
    title: "نقاط القوة التي تمتلكها الجمعية",
    icon: "💪",
    colorClass: "text-[#00b050]",
    bgClass: "bg-[#00b050]/10",
    borderClass: "border-[#00b050]/20",
    lightBgClass: "bg-[#00b050]/5",
  },
  q2: {
    title: "نقاط الضعف لدى الجمعية",
    icon: "⚠️",
    colorClass: "text-rose-600",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
    lightBgClass: "bg-rose-500/5",
  },
  q3: {
    title: "الفرص التي يمكن ان تستثمرها الجمعية",
    icon: "🌟",
    colorClass: "text-sky-600",
    bgClass: "bg-sky-500/10",
    borderClass: "border-sky-500/20",
    lightBgClass: "bg-sky-500/5",
  },
  q4: {
    title: "المخاطر التي يمكن ان تشكل خطرا على الجمعية",
    icon: "🛑",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
    lightBgClass: "bg-amber-500/5",
  },
  q5: {
    title: "عوامل النجاح التي لابد من توفرها في الجمعية",
    icon: "🔑",
    colorClass: "text-[#ffc000]",
    bgClass: "bg-[#ffc000]/10",
    borderClass: "border-[#ffc000]/20",
    lightBgClass: "bg-[#ffc000]/5",
  },
  q6: {
    title: "الميزة التنافسية للجمعية",
    icon: "🏆",
    colorClass: "text-violet-600",
    bgClass: "bg-violet-500/10",
    borderClass: "border-violet-500/20",
    lightBgClass: "bg-violet-500/5",
  },
};

export default async function HexagonalDetails({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const response = await prisma.hexagonalResponse.findUnique({
    where: { id },
  });

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans" dir="rtl">
        <div className="text-center bg-white p-12 rounded-2xl border border-slate-100 shadow-sm max-w-md w-full mx-4">
          <div className="text-5xl mb-6 opacity-30">🔍</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">التقرير غير موجود</h1>
          <p className="text-slate-500 font-medium mb-8">عذراً، لم نتمكن من العثور على التقرير المطلوب.</p>
          <Link href="/dashboard" className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all inline-block shadow-sm hover:shadow">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  const answers = response.answers as Record<string, string[]>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans" dir="rtl">
      <Header title={response.charityName} />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href={`/dashboard/charity/${encodeURIComponent(response.charityName)}`} 
            className="inline-flex items-center text-slate-500 hover:text-primary font-bold transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100 text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2 rotate-180"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            العودة لملف الجمعية الموحد
          </Link>
        </div>

        {/* Charity Info Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-10 relative">
           {/* Decorative background element */}
           <div className="absolute top-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

           <div className="p-8 md:p-10 relative z-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary font-bold text-3xl border border-secondary/20 shadow-inner">
                    {response.charityName.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] bg-secondary/10 text-secondary font-bold px-2.5 py-0.5 rounded uppercase tracking-wider">
                         تقرير التحليل السداسي
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight mb-2">{response.charityName}</h1>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 border border-slate-100">
                      <span className="text-xs text-slate-400">بواسطة:</span>
                      <span className="text-xs font-bold text-slate-600">{response.authorizedTitle}</span>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-auto bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400">🕒</span>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">تاريخ التعبئة</div>
                  </div>
                  <div className="font-bold text-slate-800">
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
 
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary text-xl font-bold">
            📊
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">تفاصيل أبعاد التحليل السداسي</h2>
        </div>
 
        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(METADATA).map(([key, meta]) => {
            const list = answers[key] || [];
            
            return (
              <div 
                key={key} 
                className={`bg-white rounded-2xl p-8 border ${meta.borderClass} shadow-sm relative overflow-hidden`}
              >
                {/* Subtle colored background decoration */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50 ${meta.bgClass} pointer-events-none`}></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${meta.bgClass} border ${meta.borderClass}`}>
                      {meta.icon}
                    </div>
                    <h3 className={`font-bold text-lg ${meta.colorClass} tracking-tight leading-tight`}>
                      {meta.title}
                    </h3>
                  </div>

                  <ul className="space-y-3">
                    {list.length > 0 ? (
                      list.map((item, idx) => (
                        <li key={idx} className={`flex gap-3 items-start p-3 rounded-xl ${meta.lightBgClass}`}>
                          <span className={`w-6 h-6 rounded-lg ${meta.bgClass} ${meta.colorClass} flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 border ${meta.borderClass}`}>
                            {idx + 1}
                          </span>
                          <span className="text-[15px] font-medium text-slate-700 leading-relaxed pt-0.5">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 text-sm font-medium text-center py-8 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed">
                        لا يوجد بنود مدخلة لهذا البعد
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
