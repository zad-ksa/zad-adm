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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">الجمعية غير موجودة</h1>
          <Link href="/dashboard" className="text-primary hover:underline">
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
    <div className="min-h-screen bg-slate-50 pb-12">
      <Header title={response.charityName} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline font-bold mb-8 transition-colors">
          <span className="mr-2">← العودة للوحة التحكم</span>
        </Link>

        {/* Charity Info Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8 relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
           <div className="p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 mb-2">{response.charityName}</h1>
                  <p className="text-slate-500">تم التقييم بواسطة: {response.authorizedName} ({response.authorizedTitle})</p>
                </div>
                
                <div className="mt-4 md:mt-0 text-center">
                  <div className="text-sm font-bold text-slate-500 mb-1">النتيجة العامة</div>
                  <div className={`px-6 py-3 rounded-2xl text-2xl font-bold
                    ${
                      response.scorePercentage >= 80 ? "bg-green-100 text-green-700" :
                      response.scorePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                      response.scorePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }
                  `}>
                    {response.scorePercentage}%
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">تاريخ التأسيس</div>
                  <div className="font-semibold text-slate-700">{response.establishmentDate}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">رقم التصريح</div>
                  <div className="font-semibold text-slate-700">{response.licenseNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">تاريخ الإرسال</div>
                  <div className="font-semibold text-slate-700">
                    {new Date(response.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </div>
             </div>
           </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-6">تفاصيل إجابات المحاور</h2>

        {/* Sections Breakdown */}
        <div className="space-y-8">
          {sectionScores.map((sec, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Section Header */}
              <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">
                  {i + 1}. {sec.title}
                </h3>
                <div className={`px-3 py-1 rounded-full text-sm font-bold
                  ${
                    sec.percentage >= 80 ? "bg-green-100 text-green-700" :
                    sec.percentage >= 60 ? "bg-blue-100 text-blue-700" :
                    sec.percentage >= 40 ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  }
                `}>
                  النتيجة: {sec.percentage}%
                </div>
              </div>
              
              {/* Questions */}
              <div className="divide-y divide-slate-100">
                {sec.questions.map((q, qIndex) => {
                  const selectedId = answers[q.id];
                  const selectedOption = q.options.find(o => o.id === selectedId);
                  
                  return (
                    <div key={q.id} className="p-6 hover:bg-slate-50 transition-colors">
                      <p className="font-semibold text-slate-800 mb-3 leading-relaxed">
                        <span className="text-primary ml-2">{qIndex + 1}.</span>
                        {q.text}
                      </p>
                      
                      <div className="flex items-start bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div className="text-blue-500 ml-3 shrink-0">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-500 mb-1">الإجابة المختارة:</div>
                          <div className="font-bold text-blue-900">
                            {selectedOption ? selectedOption.text : "لم يتم الإجابة"}
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
