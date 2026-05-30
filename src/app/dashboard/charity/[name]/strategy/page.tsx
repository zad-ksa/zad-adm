import { prisma } from "@/lib/db";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} - الاستراتيجية | زاد التنموية`,
  };
}

export default async function StrategySurveysPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch all responses and filter in JS to prevent trailing space mismatches
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const allHexResponses = await prisma.hexagonalResponse.findMany({
    orderBy: { createdAt: "desc" },
  });

  const responses = allResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const hexagonalResponses = allHexResponses.filter(
    (res) => res.charityName.trim().toLowerCase() === decodedName.trim().toLowerCase()
  );

  const hasReadiness = responses.length > 0;
  const hasHexagonal = hexagonalResponses.length > 0;

  if (!hasReadiness && !hasHexagonal) {
    return (
      <div className="text-center py-12 text-slate-500">
        لم يتم العثور على أية نتائج استبيانات لهذه الجمعية حتى الآن.
      </div>
    );
  }

  const participantCount = responses.length;

  // Calculate overall average score percentage
  let overallAveragePercentage = 0;
  if (hasReadiness) {
    const totalPercentageSum = responses.reduce((acc, r) => acc + r.scorePercentage, 0);
    overallAveragePercentage = Math.round(totalPercentageSum / participantCount);
  }

  // Calculate average percentage per section
  const sectionAverages = surveyData.map((section, idx) => {
    let totalSecScore = 0;
    let maxSecScore = 0;

    section.questions.forEach((q) => {
      maxSecScore += Math.max(...q.options.map(o => o.score));
    });

    responses.forEach((res) => {
      const answers = res.answers as Record<string, string>;
      section.questions.forEach((q) => {
        const selectedOptionId = answers[q.id];
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          totalSecScore += option.score;
        }
      });
    });

    const totalMaxSecScore = maxSecScore * participantCount;
    const averagePercentage = totalMaxSecScore > 0 ? Math.round((totalSecScore / totalMaxSecScore) * 100) : 0;

    return {
      index: idx + 1,
      title: section.title,
      averagePercentage,
    };
  });

  return (
    <div className="space-y-12">
      {/* Section 1: Readiness Survey Results */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>📈</span> نتائج استبيان الجاهزية للتخطيط الاستراتيجي
        </h2>
        
        {hasReadiness ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-slate-700">تحليل متوسط الجاهزية للمحاور</h3>
              
              <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-4 border border-slate-200">
                  <span className="font-bold text-slate-700 text-sm">المتوسط العام للجاهزية</span>
                  <div className={`px-4 py-2 rounded-xl text-lg font-bold
                    ${
                      overallAveragePercentage >= 80 ? "bg-green-100 text-green-700" :
                      overallAveragePercentage >= 60 ? "bg-blue-100 text-blue-700" :
                      overallAveragePercentage >= 40 ? "bg-orange-100 text-orange-700" :
                      "bg-red-100 text-red-700"
                    }
                  `}>
                    {overallAveragePercentage}%
                  </div>
                </div>

                {sectionAverages.map((sec) => (
                  <div key={sec.index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-800">{sec.index}. {sec.title}</span>
                      <span className={`
                        ${
                          sec.averagePercentage >= 80 ? "text-green-600" :
                          sec.averagePercentage >= 60 ? "text-blue-600" :
                          sec.averagePercentage >= 40 ? "text-orange-600" :
                          "text-red-600"
                        }
                      `}>{sec.averagePercentage}%</span>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500
                          ${
                            sec.averagePercentage >= 80 ? "bg-green-500" :
                            sec.averagePercentage >= 60 ? "bg-blue-500" :
                            sec.averagePercentage >= 40 ? "bg-orange-500" :
                            "bg-red-500"
                          }
                        `}
                        style={{ width: `${sec.averagePercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-700">المشاركون ({participantCount})</h3>
              
              <div className="space-y-4">
                {responses.map((res) => (
                  <Link
                    href={`/dashboard/${res.id}`}
                    key={res.id}
                    className="block bg-white rounded-xl p-5 border border-slate-200 hover:border-primary transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm">
                          {res.authorizedName}
                        </h4>
                        <p className="text-[11px] text-slate-400">{res.authorizedTitle}</p>
                      </div>
                      
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold
                        ${
                          res.scorePercentage >= 80 ? "bg-green-500/10 text-green-700" :
                          res.scorePercentage >= 60 ? "bg-blue-500/10 text-blue-700" :
                          res.scorePercentage >= 40 ? "bg-orange-500/10 text-orange-700" :
                          "bg-red-500/10 text-red-700"
                        }
                      `}>
                        {res.scorePercentage}%
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 flex justify-between items-center border-t border-slate-50 pt-3">
                      <span>
                        {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Riyadh"
                        })}
                      </span>
                      <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                        عرض الإجابات ←
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            لم يقم أي مشارك بتعبئة استبيان الجاهزية للتخطيط الاستراتيجي لهذه الجمعية بعد.
          </div>
        )}
      </div>

      {/* Section 2: Hexagonal Analysis Reports */}
      <div className="pt-8 border-t border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span>📋</span> تقارير التحليل السداسي للجمعية
        </h2>

        {hasHexagonal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hexagonalResponses.map((res) => {
              const answers = res.answers as Record<string, string[]>;
              const strengthsCount = answers.q1?.length || 0;
              const weaknessesCount = answers.q2?.length || 0;
              const oppCount = answers.q3?.length || 0;
              const threatCount = answers.q4?.length || 0;
              const successCount = answers.q5?.length || 0;
              const compCount = answers.q6?.length || 0;

              return (
                <div 
                  key={res.id} 
                  className="bg-white rounded-xl p-6 border border-slate-200 hover:border-secondary transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs bg-secondary/15 text-secondary-foreground font-bold px-2.5 py-1 rounded-full">
                          التحليل السداسي
                        </span>
                        <h3 className="font-bold text-slate-800 text-base mt-2 group-hover:text-secondary transition-colors">
                          بواسطة: {res.authorizedTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div>💪 قوة: <span className="font-bold text-slate-600">{strengthsCount}</span></div>
                      <div>⚠️ ضعف: <span className="font-bold text-slate-600">{weaknessesCount}</span></div>
                      <div>🌟 فرص: <span className="font-bold text-slate-600">{oppCount}</span></div>
                      <div>🛑 مخاطر: <span className="font-bold text-slate-600">{threatCount}</span></div>
                      <div>🔑 نجاح: <span className="font-bold text-slate-600">{successCount}</span></div>
                      <div>🏆 تميز: <span className="font-bold text-slate-600">{compCount}</span></div>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/hexagonal/${res.id}`}
                    className="w-full text-center py-2.5 bg-secondary hover:bg-secondary/95 text-white font-bold rounded-xl transition-all text-xs"
                  >
                    عرض بنود التحليل السداسي ←
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
            لم يقم أي مشارك بتعبئة تقرير التحليل السداسي لهذه الجمعية بعد.
          </div>
        )}
      </div>
    </div>
  );
}
