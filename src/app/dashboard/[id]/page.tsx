import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import { surveyData, Section, Question } from "@/data/surveyData";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تفاصيل استبيان الجاهزية | زاد التنموية",
};

export default async function CharityDetails({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  const response = await prisma.surveyResponse.findUnique({
    where: { id },
  });

  if (!response) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 font-sans transition-colors">
        <div className="text-center bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm max-w-md w-full mx-4 transition-colors">
          <div className="text-5xl mb-6 opacity-30">🔍</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight transition-colors">الجمعية غير موجودة</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 transition-colors">عذراً، لم نتمكن من العثور على بيانات الاستبيان المطلوبة.</p>
          <Link href="/dashboard" className="bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-primary/90 transition-all inline-block shadow-sm hover:shadow">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  // Calculate scores per section
  const answers = response.answers as Record<string, string>;
  const sectionScores = surveyData.map((section: Section) => {
    let secScore = 0;
    let secMaxScore = 0;

    section.questions.forEach((q: Question) => {
      const selectedOptionId = answers[q.id];
      const option = q.options.find(o => o.id === selectedOptionId);
      if (option) {
        secScore += option.score;
      }
      secMaxScore += Math.max(...q.options.map((o) => o.score));
    });

    const percentage = secMaxScore > 0 ? Math.round((secScore / secMaxScore) * 100) : 0;
    
    return {
      title: section.title,
      score: secScore,
      maxScore: secMaxScore,
      percentage,
      questions: section.questions
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 font-sans transition-colors" dir="rtl">
      <Header title={response.charityName} />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary font-bold transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2 rotate-180"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            العودة للوحة التحكم
          </Link>
        </div>

        {/* Charity Info Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-10 relative transition-colors">
           {/* Decorative corner element */}
           <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-colors"></div>
           
           <div className="p-8 md:p-10 relative z-10">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-bold text-3xl border border-primary/20 dark:border-primary/30 shadow-inner transition-colors">
                    {response.charityName.substring(0, 1)}
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1.5 tracking-tight transition-colors">{response.charityName}</h1>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 dark:text-slate-500">بواسطة:</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{response.authorizedName} <span className="font-normal text-slate-400 dark:text-slate-500">({response.authorizedTitle})</span></span>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-auto bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center md:min-w-[160px] transition-colors">
                  <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider transition-colors">النتيجة العامة</div>
                  <div className={`px-5 py-2 rounded-xl text-2xl font-bold w-full text-center shadow-sm border transition-colors
                    ${
                      response.scorePercentage >= 85 ? "bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20" :
                      response.scorePercentage >= 70 ? "bg-[#ffc000]/10 text-[#c29300] border-[#ffc000]/20" :
                      "bg-[#ff0000]/10 text-[#ff0000] border-[#ff0000]/20"
                    }
                  `}>
                    {response.scorePercentage}%
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 border-t border-slate-50 dark:border-slate-700 pt-8 transition-colors">
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400 dark:text-slate-500">📅</span>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">تاريخ التأسيس</div>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors">{response.establishmentDate}</div>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400 dark:text-slate-500">📄</span>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">رقم التصريح</div>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors">{response.licenseNumber}</div>
                </div>
                <div className="col-span-2 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-400 dark:text-slate-500">🕒</span>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 transition-colors">تاريخ الإرسال</div>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 transition-colors">
                    {new Date(response.createdAt).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Riyadh",
                    })}
                  </div>
                </div>
             </div>
           </div>
        </div>

        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-200 dark:border-slate-700 transition-colors">
          <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary text-xl font-bold transition-colors">
            📝
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors">تفاصيل إجابات المحاور</h2>
        </div>

        {/* Sections Breakdown */}
        <div className="space-y-6">
          {sectionScores.map((sec, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
              {/* Section Header */}
              <div className="bg-slate-50/80 dark:bg-slate-900/50 px-6 md:px-8 py-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 transition-colors">
                  <span className="bg-primary/10 dark:bg-primary/20 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors">{i + 1}</span>
                  {sec.title}
                </h3>
                <div className={`px-4 py-1.5 rounded-lg text-sm font-bold border shadow-sm transition-colors
                  ${
                    sec.percentage >= 85 ? "bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20" :
                    sec.percentage >= 70 ? "bg-[#ffc000]/10 text-[#c29300] border-[#ffc000]/20" :
                    "bg-[#ff0000]/10 text-[#ff0000] border-[#ff0000]/20"
                  }
                `}>
                  النتيجة: {sec.percentage}%
                </div>
              </div>
              
              {/* Questions */}
              <div className="divide-y divide-slate-50 dark:divide-slate-700/50 transition-colors">
                {sec.questions.map((q, qIndex) => {
                  const selectedId = answers[q.id];
                  const selectedOption = q.options.find(o => o.id === selectedId);
                  
                  return (
                    <div key={q.id} className="p-6 md:p-8 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <p className="font-bold text-slate-700 dark:text-slate-200 mb-5 leading-relaxed text-[15px] transition-colors">
                        <span className="text-slate-400 dark:text-slate-500 ml-2 font-mono transition-colors">{i + 1}.{qIndex + 1}</span>
                        {q.text}
                      </p>
                      
                      <div className="flex items-start bg-primary/5 dark:bg-primary/10 p-5 rounded-xl border border-primary/10 dark:border-primary/20 transition-colors">
                        <div className="text-primary ml-3 shrink-0 mt-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider transition-colors">الإجابة المختارة</div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base transition-colors">
                            {selectedOption ? selectedOption.text : <span className="text-red-500 dark:text-red-400 font-medium">لم يتم الإجابة</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
