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

// Custom SVG Icons
const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ChartLineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const FileEditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
  </svg>
);

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-secondary">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const ClipboardLargeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-slate-300 mx-auto mb-4">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
  </svg>
);

const StrengthIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-emerald-600">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" className="fill-emerald-500/5" />
  </svg>
);

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-600">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" className="fill-amber-500/5" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-sky-500">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" className="fill-sky-500/5" />
  </svg>
);

const ThreatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-rose-500">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-rose-500/5" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-teal-600">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" className="fill-teal-500/5" />
  </svg>
);

const TrophyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-yellow-600">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" className="fill-yellow-500/5" />
    <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
  </svg>
);

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
      <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm mt-6">
        <ChartBarIcon />
        <h3 className="text-xl font-bold text-slate-700 mb-2">لا توجد بيانات متاحة</h3>
        <p className="font-medium text-slate-500">لم يتم العثور على أية نتائج استبيانات لهذه الجمعية حتى الآن.</p>
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
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
            <ChartLineIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            نتائج استبيان الجاهزية للتخطيط الاستراتيجي
          </h2>
        </div>
        
        {hasReadiness ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-6 rounded-full bg-primary inline-block"></span>
                تحليل متوسط الجاهزية للمحاور
              </h3>
              
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 text-base">المتوسط العام للجاهزية</span>
                    <p className="text-xs text-slate-500 font-medium">بناءً على {participantCount} مشاركات</p>
                  </div>
                  <div className={`px-5 py-2.5 rounded-xl text-xl font-bold shadow-sm
                    ${
                      overallAveragePercentage >= 80 ? "bg-[#00b050]/10 text-[#00b050]" :
                      overallAveragePercentage >= 60 ? "bg-[#92d050]/10 text-[#71a638]" :
                      overallAveragePercentage >= 40 ? "bg-[#ffc000]/10 text-[#c29300]" :
                      "bg-[#ff0000]/10 text-[#ff0000]"
                    }
                  `}>
                    {overallAveragePercentage}%
                  </div>
                </div>

                <div className="space-y-5">
                  {sectionAverages.map((sec) => (
                    <div key={sec.index} className="space-y-2 group">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-700 group-hover:text-slate-900 transition-colors">{sec.index}. {sec.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold
                          ${
                            sec.averagePercentage >= 80 ? "bg-[#00b050]/10 text-[#00b050]" :
                            sec.averagePercentage >= 60 ? "bg-[#92d050]/10 text-[#71a638]" :
                            sec.averagePercentage >= 40 ? "bg-[#ffc000]/10 text-[#c29300]" :
                            "bg-[#ff0000]/10 text-[#ff0000]"
                          }
                        `}>{sec.averagePercentage}%</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out
                            ${
                              sec.averagePercentage >= 80 ? "bg-[#00b050]" :
                              sec.averagePercentage >= 60 ? "bg-[#92d050]" :
                              sec.averagePercentage >= 40 ? "bg-[#ffc000]" :
                              "bg-[#ff0000]"
                            }
                          `}
                          style={{ width: `${sec.averagePercentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-6 rounded-full bg-slate-400 inline-block"></span>
                  المشاركون
                </h3>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{participantCount} استبيان</span>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {responses.map((res) => (
                  <Link
                    href={`/dashboard/${res.id}`}
                    key={res.id}
                    className="block bg-white rounded-xl p-5 border border-slate-100 hover:border-primary/50 shadow-sm hover:shadow transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm mb-1">
                          {res.authorizedName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium bg-slate-50 inline-block px-2 py-0.5 rounded">{res.authorizedTitle}</p>
                      </div>
                      
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm
                        ${
                          res.scorePercentage >= 80 ? "bg-[#00b050]/10 text-[#00b050]" :
                          res.scorePercentage >= 60 ? "bg-[#92d050]/10 text-[#71a638]" :
                          res.scorePercentage >= 40 ? "bg-[#ffc000]/10 text-[#c29300]" :
                          "bg-[#ff0000]/10 text-[#ff0000]"
                        }
                      `}>
                        {res.scorePercentage}%
                      </div>
                    </div>
                    
                    <div className="text-[11px] font-medium text-slate-400 flex justify-between items-center border-t border-slate-50 pt-3">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        {new Date(res.createdAt).toLocaleDateString("ar-SA", {
                          month: "short",
                          day: "numeric",
                          timeZone: "Asia/Riyadh"
                        })}
                      </span>
                      <span className="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        التفاصيل
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm">
            <FileEditIcon />
            <p className="font-bold">لم يقم أي مشارك بتعبئة استبيان الجاهزية للتخطيط الاستراتيجي لهذه الجمعية بعد.</p>
          </div>
        )}
      </div>

      {/* Section 2: Hexagonal Analysis Reports */}
      <div className="pt-8">
        <div className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-4">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary font-bold">
            <ClipboardIcon />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            تقارير التحليل السداسي للجمعية
          </h2>
        </div>

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
                  className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-secondary/50 shadow-sm hover:shadow transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6 border-b border-slate-50 pb-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider bg-secondary/10 text-secondary font-bold px-3 py-1 rounded-full">
                          التحليل السداسي
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm mt-3 group-hover:text-secondary transition-colors">
                          <span className="text-slate-400 font-normal mr-1">بواسطة:</span> {res.authorizedTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-[11px] text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <StrengthIcon />
                        <span className="font-bold text-slate-700">{strengthsCount} <span className="text-[9px] text-slate-400 font-normal">قوة</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <WarningIcon />
                        <span className="font-bold text-slate-700">{weaknessesCount} <span className="text-[9px] text-slate-400 font-normal">ضعف</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <StarIcon />
                        <span className="font-bold text-slate-700">{oppCount} <span className="text-[9px] text-slate-400 font-normal">فرص</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <ThreatIcon />
                        <span className="font-bold text-slate-700">{threatCount} <span className="text-[9px] text-slate-400 font-normal">مخاطر</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <KeyIcon />
                        <span className="font-bold text-slate-700">{successCount} <span className="text-[9px] text-slate-400 font-normal">نجاح</span></span>
                      </div>
                      <div className="flex flex-col gap-1.5 items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <TrophyIcon />
                        <span className="font-bold text-slate-700">{compCount} <span className="text-[9px] text-slate-400 font-normal">تميز</span></span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/hexagonal/${res.id}`}
                    className="w-full text-center py-3 bg-secondary/5 hover:bg-secondary text-secondary hover:text-white font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2"
                  >
                    عرض بنود التحليل السداسي
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-100 shadow-sm">
            <ClipboardLargeIcon />
            <p className="font-bold">لم يقم أي مشارك بتعبئة تقرير التحليل السداسي لهذه الجمعية بعد.</p>
          </div>
        )}
      </div>
    </div>
  );
}
