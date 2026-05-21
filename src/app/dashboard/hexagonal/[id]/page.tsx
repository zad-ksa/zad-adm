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
}

const METADATA: Record<string, QuestionMeta> = {
  q1: {
    title: "نقاط القوة التي تمتلكها الجمعية",
    icon: "💪",
    colorClass: "text-emerald-700",
    bgClass: "bg-emerald-50/50",
    borderClass: "border-emerald-100",
  },
  q2: {
    title: "نقاط الضعف لدى الجمعية",
    icon: "⚠️",
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50/50",
    borderClass: "border-rose-100",
  },
  q3: {
    title: "الفرص التي يمكن ان تستثمرها الجمعية",
    icon: "🌟",
    colorClass: "text-sky-700",
    bgClass: "bg-sky-50/50",
    borderClass: "border-sky-100",
  },
  q4: {
    title: "المخاطر التي يمكن ان تشكل خطرا على الجمعية",
    icon: "🛑",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50/50",
    borderClass: "border-amber-100",
  },
  q5: {
    title: "عوامل النجاح التي لابد من توفرها في الجمعية",
    icon: "🔑",
    colorClass: "text-yellow-700",
    bgClass: "bg-yellow-50/50",
    borderClass: "border-yellow-100",
  },
  q6: {
    title: "الميزة التنافسية للجمعية",
    icon: "🏆",
    colorClass: "text-violet-700",
    bgClass: "bg-violet-50/50",
    borderClass: "border-violet-100",
  },
};

export default async function HexagonalDetails({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const response = await prisma.hexagonalResponse.findUnique({
    where: { id },
  });

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-right" dir="rtl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">التقرير غير موجود</h1>
          <Link href="/dashboard" className="text-primary hover:underline font-bold">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  const answers = response.answers as Record<string, string[]>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 text-right" dir="rtl">
      <Header title={response.charityName} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href={`/dashboard/charity/${encodeURIComponent(response.charityName)}`} 
          className="inline-flex items-center text-primary hover:underline font-bold mb-8 transition-colors"
        >
          <span className="mr-2">← العودة لملف الجمعية الموحد</span>
        </Link>

        {/* Charity Info Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8 relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
           <div className="p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <span className="text-xs bg-secondary/15 text-secondary-foreground font-bold px-3 py-1 rounded-full">
                     تقرير التحليل السداسي
                  </span>
                  <h1 className="text-3xl font-bold text-slate-800 mt-3 mb-2">{response.charityName}</h1>
                  <p className="text-slate-500">تم إعداد التحليل بواسطة: <strong className="text-slate-700">{response.authorizedTitle}</strong></p>
                </div>
                
                <div className="text-slate-400 text-sm">
                  <div className="text-slate-400 mb-1">تاريخ التعبئة</div>
                  <div className="font-semibold text-slate-700">
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

        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>📊</span> تفاصيل أبعاد التحليل السداسي
        </h2>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(METADATA).map(([key, meta]) => {
            const list = answers[key] || [];
            
            return (
              <div 
                key={key} 
                className={`bg-white rounded-2xl p-6 shadow-sm border ${meta.borderClass} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                    <span className="text-2xl">{meta.icon}</span>
                    <h3 className={`font-bold text-base ${meta.colorClass}`}>
                      {meta.title}
                    </h3>
                  </div>

                  <ul className="space-y-3">
                    {list.length > 0 ? (
                      list.map((item, idx) => (
                        <li key={idx} className="flex gap-3 items-start text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-sm leading-relaxed">{item}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 text-xs italic text-center py-4">
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
