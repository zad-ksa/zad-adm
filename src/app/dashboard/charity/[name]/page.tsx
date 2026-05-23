import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Link from "next/link";
import { surveyData } from "@/data/surveyData";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { name: string } }): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  return {
    title: `${decodedName} | زاد التنموية`,
  };
}

export default async function CharityGroupedReport({ params }: { params: { name: string } }) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);

  // Fetch all responses and filter in JS to prevent trailing space mismatches
  const allResponses = await prisma.surveyResponse.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const allHexResponses = await prisma.hexagonalResponse.findMany({
    orderBy: {
      createdAt: "desc",
    },
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

  const latestReadiness = hasReadiness ? responses[0] : null;
  const latestHexagonal = hasHexagonal ? hexagonalResponses[0] : null;
  const participantCount = responses.length;

  // Calculate overall average score percentage
  let overallAveragePercentage = 0;
  if (hasReadiness) {
    const totalPercentageSum = responses.reduce((acc, r) => acc + r.scorePercentage, 0);
    overallAveragePercentage = Math.round(totalPercentageSum / participantCount);
  }

  // Calculate average percentage per section (محور)
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

  // Calculate latest activity date across both survey types
  const dates = [
    ...responses.map(r => new Date(r.createdAt)),
    ...hexagonalResponses.map(h => new Date(h.createdAt))
  ];
  const latestActivity = dates.length > 0 
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : new Date();

  return (
    <div className="min-h-screen bg-slate-50 pb-12 text-right" dir="rtl">
      <Header title={decodedName} />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-primary hover:underline font-bold mb-8 transition-colors">
          <span className="ml-2">← العودة للوحة التحكم</span>
        </Link>

        {/* Charity Summary Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-8 relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
           <div className="p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800 mb-2">{decodedName}</h1>
                  <p className="text-slate-500">التقرير المجمع الخاص بكافة المشاركات والتحليلات للجمعية</p>
                </div>
                
                {hasReadiness && (
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-500 mb-1">المتوسط العام للجاهزية</div>
                    <div className={`px-6 py-3 rounded-2xl text-2xl font-bold
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
                )}
             </div>

             <div className="mb-6 flex justify-end">
                <Link
                  href={`/dashboard/charity/${encodeURIComponent(decodedName)}/performance`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-sm flex items-center gap-2"
                >
                  <span>📊</span> مقياس الأداء
                </Link>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <div className="text-sm text-slate-400 mb-1">تاريخ التأسيس</div>
                  <div className="font-semibold text-slate-700">
                    {latestReadiness ? latestReadiness.establishmentDate : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">رقم التصريح</div>
                  <div className="font-semibold text-slate-700">
                    {latestReadiness ? latestReadiness.licenseNumber : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">آخر نشاط بالجمعية</div>
                  <div className="font-semibold text-slate-700">
                    {latestActivity.toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "Asia/Riyadh",
                    })}
                  </div>
                </div>
             </div>
           </div>
        </div>

        {/* Section 1: Readiness Survey Results */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span>📈</span> نتائج استبيان الجاهزية للتخطيط الاستراتيجي
          </h2>
          
          {hasReadiness ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Section Averages (2/3 width on desktop) */}
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-lg font-bold text-slate-700">تحليل متوسط الجاهزية للمحاور</h3>
                
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
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
                      
                      {/* Progress bar */}
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

              {/* Participant Submissions (1/3 width on desktop) */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-700">المشاركون ({participantCount})</h3>
                
                <div className="space-y-4">
                  {responses.map((res) => (
                    <Link
                      href={`/dashboard/${res.id}`}
                      key={res.id}
                      className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-primary hover:shadow-md transition-all group"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                            {res.authorizedName}
                          </h4>
                          <p className="text-xs text-slate-500">{res.authorizedTitle}</p>
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
                            hour: "2-digit",
                            minute: "2-digit",
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
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
              لم يقم أي مشارك بتعبئة استبيان الجاهزية للتخطيط الاستراتيجي لهذه الجمعية بعد.
            </div>
          )}
        </div>

        {/* Section 2: Hexagonal Analysis Reports */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span>📋</span> تقارير التحليل السداسي للجمعية
          </h2>

          {hasHexagonal ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-secondary transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs bg-secondary/10 text-secondary-foreground font-bold px-2.5 py-1 rounded-full">
                            التحليل السداسي
                          </span>
                          <h3 className="font-bold text-slate-800 text-lg mt-2 group-hover:text-secondary transition-colors">
                            بواسطة: {res.authorizedTitle}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Asia/Riyadh"
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>💪 قوة: <span className="font-bold text-slate-700">{strengthsCount}</span></div>
                        <div>⚠️ ضعف: <span className="font-bold text-slate-700">{weaknessesCount}</span></div>
                        <div>🌟 فرص: <span className="font-bold text-slate-700">{oppCount}</span></div>
                        <div>🛑 مخاطر: <span className="font-bold text-slate-700">{threatCount}</span></div>
                        <div>🔑 نجاح: <span className="font-bold text-slate-700">{successCount}</span></div>
                        <div>🏆 تميز: <span className="font-bold text-slate-700">{compCount}</span></div>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/hexagonal/${res.id}`}
                      className="w-full text-center py-3 bg-secondary hover:bg-secondary/95 text-white font-bold rounded-xl transition-all shadow-md shadow-secondary/15 hover:shadow-secondary/25 text-sm"
                    >
                      عرض بنود التحليل السداسي ←
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
              لم يقم أي مشارك بتعبئة تقرير التحليل السداسي لهذه الجمعية بعد.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

